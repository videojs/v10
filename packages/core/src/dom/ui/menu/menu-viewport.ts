import { TransitionDataAttrs } from '../../../core/ui/transition';
import { forceLayout } from '../../utils/layout';
import { type ContentSize, isContentSizeValid, measureContentSize } from '../../utils/measure';
import { scheduleTransitionSettle } from '../transition';
import {
  applyMenuViewTransitionAttrs,
  createMenuViewTransition,
  type MenuViewTransitionApi,
  type MenuViewTransitionDirection,
  type MenuViewTransitionState,
} from './create-menu-view-transition';

export interface MenuViewportNavigationContext {
  hasActiveSubmenu: () => boolean;
  direction: () => MenuViewTransitionDirection;
}

export interface CreateMenuViewportOptions {
  navigation?: MenuViewportNavigationContext;
}

/**
 * Menu viewport: sizes menu content from stacked views, coordinates root/child
 * transitions, and drives `--media-menu-width` / `--media-menu-height`.
 *
 * Child views own enter/exit via {@link MenuViewTransitionApi}; the viewport
 * measures panels, applies CSS variables, and keeps the persistent root panel in sync.
 */

export interface MenuViewportAttrs {
  'data-menu-viewport': '';
}

export interface MenuViewportApi {
  /**
   * When no submenu is on the navigation stack, remeasure and size for the root panel.
   * With an active submenu, only preserves `data-transitioning` during in-flight resizes.
   */
  syncRoot(hasActiveSubmenu: boolean): void;
  /** Subscribe to a submenu view transition and drive viewport/root coordination. */
  bindChild(view: HTMLElement, transition: MenuViewTransitionApi): () => void;
  destroy(): void;
}

interface MenuViewMeasureOptions {
  open?: boolean;
}

interface PendingMenuViewTransition {
  entering: HTMLElement;
  fromView: HTMLElement;
  fromSize: ContentSize;
  toSize: ContentSize;
}

interface MenuViewportState {
  content: HTMLElement;
  pending: PendingMenuViewTransition | null;
  rootSize: ContentSize | null;
  rootView: HTMLElement | null;
  rootTransition: MenuViewTransitionApi;
  ownsRootTransition: boolean;
  navigation: MenuViewportNavigationContext | null;
  viewportTransitionId: number;
  viewportTransitioning: boolean;
  childUnsubscribe: (() => void) | null;
  rootAttrsUnsubscribe: (() => void) | null;
  cancelViewportSettle: (() => void) | null;
  childPhaseKeys: WeakMap<HTMLElement, string>;
}

const FALLBACK_MEASURE_MIN_WIDTH = 160;
const MENU_VIEW_ATTR = 'data-menu-view';
const MENU_VIEW_ID_ATTR = 'data-menu-view-id';
const MENU_ROOT_VIEW_ID = 'root';
const MENU_VIEWPORT_ATTR = 'data-menu-viewport';
const MENU_WIDTH_VAR = '--media-menu-width';
const MENU_HEIGHT_VAR = '--media-menu-height';
const ROOT_VIEW_ATTR_OPTIONS = { root: true, persistent: true } as const;

/** Markup hook for the element that hosts stacked menu views and viewport CSS variables. */
export function getMenuViewportAttrs(): MenuViewportAttrs {
  return {
    'data-menu-viewport': '',
  };
}

/** Resolve the viewport from menu content — explicit child or the content element itself. */
export function getMenuViewportElement(content: HTMLElement | null): HTMLElement | null {
  if (!content) return null;

  return content.querySelector<HTMLElement>(`:scope > [${MENU_VIEWPORT_ATTR}]`) ?? content;
}

/**
 * Root menus always get a viewport. Submenu hosts only need one when they stack
 * another menu view inside (nested submenu), not when the host is the view itself.
 */
export function shouldCreateMenuViewport(element: HTMLElement, isSubmenu: boolean): boolean {
  if (element.hasAttribute(MENU_VIEWPORT_ATTR)) return true;
  if (!isSubmenu) return true;

  return element.querySelector(`:scope > [${MENU_VIEW_ATTR}]`) !== null;
}

function getViewportElement(content: HTMLElement, view?: HTMLElement | null): HTMLElement {
  const viewport = getMenuViewportElement(content);

  if (viewport && viewport !== content) {
    return viewport;
  }

  if (view?.parentElement && content.contains(view.parentElement)) {
    return view.parentElement;
  }

  return content;
}

function getRootViewElement(viewport: HTMLElement): HTMLElement | null {
  return viewport.querySelector<HTMLElement>(`:scope > [${MENU_VIEW_ID_ATTR}="${MENU_ROOT_VIEW_ID}"]`);
}

function isRootViewElement(view: HTMLElement): boolean {
  return view.getAttribute(MENU_VIEW_ID_ATTR) === MENU_ROOT_VIEW_ID;
}

/** Visible submenu panel, excluding the persistent root and views still in exit styling. */
function getActiveMenuViewElement(viewport: HTMLElement, exclude?: HTMLElement | null): HTMLElement | null {
  return (
    Array.from(viewport.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child !== exclude &&
        child.hasAttribute(MENU_VIEW_ATTR) &&
        !isRootViewElement(child) &&
        !child.hidden &&
        !child.hasAttribute(TransitionDataAttrs.transitionEnding)
    ) ?? null
  );
}

/** Read content `min-width` from computed style so measure matches skin constraints. */
function resolveMeasureMinWidth(content: HTMLElement): number {
  const minWidth = Number.parseFloat(getComputedStyle(content).minWidth);

  return Number.isFinite(minWidth) && minWidth > 0 ? minWidth : FALLBACK_MEASURE_MIN_WIDTH;
}

function measureMenuView(view: HTMLElement, minWidth: number, options: MenuViewMeasureOptions = {}): ContentSize {
  return measureContentSize(view, {
    minWidth,
    ...(options.open ? { measureAttribute: 'data-open' } : {}),
  });
}

function setViewportSize(content: HTMLElement, size: ContentSize): void {
  if (size.width > 0) {
    content.style.setProperty(MENU_WIDTH_VAR, `${size.width}px`);
  }

  if (size.height > 0) {
    content.style.setProperty(MENU_HEIGHT_VAR, `${size.height}px`);
  }
}

function getCurrentViewportSize(content: HTMLElement): ContentSize | null {
  const width = Number.parseFloat(content.style.getPropertyValue(MENU_WIDTH_VAR));
  const height = Number.parseFloat(content.style.getPropertyValue(MENU_HEIGHT_VAR));

  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

  const size = { width, height };

  return isContentSizeValid(size) ? size : null;
}

function measureRootMenuView(state: MenuViewportState, rootView: HTMLElement, minWidth: number): ContentSize {
  const size = measureMenuView(rootView, minWidth, { open: true });

  if (isContentSizeValid(size)) {
    state.rootSize = size;
    return size;
  }

  return state.rootSize ?? getCurrentViewportSize(state.content) ?? size;
}

/** Imperatively mirror root transition attrs (HTML custom elements; complements React bindings). */
function connectRootView(state: MenuViewportState, rootView: HTMLElement): void {
  if (state.rootView === rootView) return;

  state.rootAttrsUnsubscribe?.();
  state.rootView = rootView;
  state.rootTransition.setElement(rootView);

  const applyRootAttrs = (): void => {
    applyMenuViewTransitionAttrs(rootView, state.rootTransition.input.current, ROOT_VIEW_ATTR_OPTIONS);
  };

  applyRootAttrs();
  state.rootAttrsUnsubscribe = state.rootTransition.input.subscribe(applyRootAttrs);
}

/** Start root exit when navigation targets a submenu before the child view has left `hidden`. */
function hideRootForActiveNavigation(state: MenuViewportState): void {
  if (!state.navigation?.hasActiveSubmenu()) return;

  const viewport = getViewportElement(state.content);
  const rootView = getRootViewElement(viewport);

  if (!rootView) return;

  connectRootView(state, rootView);

  if (state.rootTransition.input.current.phase === 'active') {
    state.rootTransition.sync({
      active: false,
      direction: state.navigation.direction(),
      triggerId: null,
    });
  }
}

/** Drive the persistent root panel opposite the child (hide on forward enter, restore on back exit). */
function syncRootTransitionForChild(state: MenuViewportState, viewState: MenuViewTransitionState): void {
  const { direction } = viewState;
  const { rootTransition } = state;

  if (viewState.phase === 'active') {
    rootTransition.sync({ active: false, direction, triggerId: null });
    return;
  }

  if (rootTransition.persistent && rootTransition.input.current.phase === 'active') {
    rootTransition.sync({ active: false, direction, triggerId: null });
  }

  rootTransition.sync({ active: true, direction, triggerId: null });
}

function startViewportTransition(state: MenuViewportState): number {
  state.viewportTransitionId += 1;
  state.viewportTransitioning = true;
  state.content.setAttribute(TransitionDataAttrs.transitioning, '');
  return state.viewportTransitionId;
}

function clearViewportTransition(state: MenuViewportState, transitionId?: number): void {
  if (transitionId !== undefined && state.viewportTransitionId !== transitionId) return;
  if (!state.viewportTransitioning) return;

  state.viewportTransitioning = false;
  state.content.removeAttribute(TransitionDataAttrs.transitioning);
}

function scheduleViewportTransitionAttrsClear(state: MenuViewportState, transitionId: number): void {
  state.cancelViewportSettle?.();
  state.cancelViewportSettle = scheduleTransitionSettle(
    state.content,
    () => state.viewportTransitionId === transitionId,
    () => {
      clearViewportTransition(state, transitionId);
    },
    { includeCSSTransitions: true }
  );
}

/**
 * React to a child view phase: measure from→to sizes, set viewport CSS variables,
 * and start or clear `data-transitioning` on the content host.
 */
function syncChildViewPhase(state: MenuViewportState, view: HTMLElement, viewState: MenuViewTransitionState): void {
  const { content } = state;
  const minWidth = resolveMeasureMinWidth(content);
  const viewport = getViewportElement(content, view);
  const rootView = getRootViewElement(viewport);

  if (!rootView) return;

  connectRootView(state, rootView);

  if (viewState.phase === 'hidden') {
    state.childPhaseKeys.delete(view);

    if (getActiveMenuViewElement(viewport, view) === null) {
      if (!state.navigation?.hasActiveSubmenu()) {
        restoreRootPanelToResting(state);
      }
    } else {
      syncRoot(state, true);
    }
    return;
  }

  if (viewState.phase === 'entering') {
    const fromView = getActiveMenuViewElement(viewport, view) ?? rootView;
    const fromSize = measureMenuView(fromView, minWidth);
    const toSize = measureMenuView(view, minWidth);

    state.pending = { entering: view, fromView, fromSize, toSize };

    if (isRootViewElement(fromView)) {
      state.rootTransition.sync({ active: false, direction: viewState.direction, triggerId: null });
    }

    startViewportTransition(state);
    setViewportSize(content, fromSize);
    forceLayout(content);
    return;
  }

  if (viewState.phase === 'active') {
    const fromView = getActiveMenuViewElement(viewport, view) ?? rootView;
    const current =
      state.pending?.entering === view
        ? state.pending
        : {
            entering: view,
            fromView,
            fromSize: measureMenuView(fromView, minWidth),
            toSize: measureMenuView(view, minWidth),
          };

    state.pending = null;
    syncRootTransitionForChild(state, viewState);

    const viewportTransitionId = startViewportTransition(state);
    setViewportSize(content, current.fromSize);
    forceLayout(current.fromView);

    if (isRootViewElement(current.fromView)) {
      measureMenuView(rootView, minWidth, { open: true });
    }

    setViewportSize(content, current.toSize);
    scheduleViewportTransitionAttrsClear(state, viewportTransitionId);
    return;
  }

  if (viewState.phase === 'exiting') {
    state.pending = null;

    const hasActiveSiblingView = getActiveMenuViewElement(viewport, view) !== null;

    if (hasActiveSiblingView && view.hasAttribute(TransitionDataAttrs.transitionEnding)) {
      return;
    }

    const fromSize = measureMenuView(view, minWidth);
    const toSize = measureRootMenuView(state, rootView, minWidth);

    syncRootTransitionForChild(state, viewState);

    const viewportTransitionId = startViewportTransition(state);
    setViewportSize(content, fromSize);
    forceLayout(rootView);
    setViewportSize(content, toSize);
    scheduleViewportTransitionAttrsClear(state, viewportTransitionId);
  }
}

/** Last child left — reset root transition and viewport size to the root panel at rest. */
function restoreRootPanelToResting(state: MenuViewportState): void {
  const viewport = getViewportElement(state.content);
  const rootView = getRootViewElement(viewport);

  if (!rootView) return;

  const size = measureRootMenuView(state, rootView, resolveMeasureMinWidth(state.content));

  clearViewportTransition(state);
  state.rootTransition.reset();
  connectRootView(state, rootView);
  setViewportSize(state.content, size);
}

function syncRoot(state: MenuViewportState, hasActiveSubmenu: boolean): void {
  const { content } = state;

  if (hasActiveSubmenu) {
    hideRootForActiveNavigation(state);

    if (state.viewportTransitioning) {
      content.setAttribute(TransitionDataAttrs.transitioning, '');
    }
    return;
  }

  const viewport = getViewportElement(content);
  const rootView = getRootViewElement(viewport);

  // Skip while a child is still mounted or exiting — avoids snapping the viewport
  // to root size before the back animation finishes.
  if (!rootView || getActiveMenuViewElement(viewport)) return;

  const size = measureRootMenuView(state, rootView, resolveMeasureMinWidth(content));

  clearViewportTransition(state);
  setViewportSize(content, size);
}

/**
 * Create a viewport controller for menu content.
 *
 * @param content - Menu content host (carries viewport CSS variables).
 * @param rootTransition - Shared root panel transition from {@link createMenu}; when omitted, an internal persistent transition is created and destroyed with the viewport.
 */
export function createMenuViewport(
  content: HTMLElement,
  rootTransition?: MenuViewTransitionApi,
  options: CreateMenuViewportOptions = {}
): MenuViewportApi {
  const ownsRootTransition = rootTransition === undefined;

  const state: MenuViewportState = {
    content,
    pending: null,
    rootSize: null,
    rootView: null,
    rootTransition: rootTransition ?? createMenuViewTransition({ persistent: true }),
    ownsRootTransition,
    navigation: options.navigation ?? null,
    viewportTransitionId: 0,
    viewportTransitioning: false,
    childUnsubscribe: null,
    rootAttrsUnsubscribe: null,
    cancelViewportSettle: null,
    childPhaseKeys: new WeakMap(),
  };

  const initialRootView = getRootViewElement(getViewportElement(content));

  if (initialRootView) {
    connectRootView(state, initialRootView);
  }

  return {
    syncRoot(hasActiveSubmenu) {
      syncRoot(state, hasActiveSubmenu);
    },

    bindChild(view, transition) {
      state.childUnsubscribe?.();

      const syncChild = (): void => {
        const viewState = transition.input.current;
        const phaseKey = `${viewState.phase}:${viewState.direction}`;

        if (state.childPhaseKeys.get(view) === phaseKey) return;

        state.childPhaseKeys.set(view, phaseKey);
        syncChildViewPhase(state, view, viewState);
      };

      const unsubscribe = transition.input.subscribe(syncChild);
      state.childUnsubscribe = unsubscribe;
      syncChild();

      return () => {
        unsubscribe();
        if (state.childUnsubscribe === unsubscribe) {
          state.childUnsubscribe = null;
        }
        state.childPhaseKeys.delete(view);
      };
    },

    destroy() {
      state.viewportTransitionId += 1;
      state.childUnsubscribe?.();
      state.childUnsubscribe = null;
      state.rootAttrsUnsubscribe?.();
      state.rootAttrsUnsubscribe = null;
      state.cancelViewportSettle?.();
      state.cancelViewportSettle = null;

      if (state.ownsRootTransition) {
        state.rootTransition.destroy();
      }

      clearViewportTransition(state);
      state.pending = null;
      state.rootView = null;
    },
  };
}
