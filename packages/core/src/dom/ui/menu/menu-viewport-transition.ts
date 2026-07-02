import { resolveCSSLength } from '@videojs/utils/dom';
import { PopoverCSSVars } from '../../../core/ui/popover/popover-css-vars';
import { TransitionDataAttrs } from '../../../core/ui/transition';
import { forceLayout } from '../../utils/layout';
import type { MenuViewTransitionState } from './create-menu-view-transition';

export interface MenuViewportTransitionOptions {
  minWidth?: number;
  availableWidth?: number | string;
}

export interface MenuViewportAttrs {
  'data-menu-viewport': '';
}

export interface MenuRootViewAttrs {
  'data-menu-root-view': '';
  'data-menu-view': '';
}

interface MenuViewSize {
  width: number;
  height: number;
}

interface InlineStyleSnapshotEntry {
  property: string;
  value: string;
  priority: string;
}

interface PendingMenuViewTransition {
  entering: HTMLElement;
  availableWidth: number | null;
  fromSize: MenuViewSize;
  toSize: MenuViewSize;
}

interface MenuViewportTransitionState {
  pending: PendingMenuViewTransition | null;
  phaseKeys: WeakMap<HTMLElement, string>;
}

const DEFAULT_MENU_VIEWPORT_MIN_WIDTH = 160;
const MENU_VIEW_ATTR = 'data-menu-view';
const MENU_VIEW_STATE_ATTR = 'data-menu-view-state';
const MENU_VIEW_ACTIVE_STATE = 'active';
const MENU_VIEW_INACTIVE_STATE = 'inactive';
const MENU_ROOT_VIEW_ATTR = 'data-menu-root-view';
const MENU_VIEWPORT_ATTR = 'data-menu-viewport';
const MENU_VIEW_LAYOUT_ATTRS = ['data-availability'];
const MENU_WIDTH_VAR = '--media-menu-width';
const MENU_HEIGHT_VAR = '--media-menu-height';
const MENU_VIEW_MEASURE_STYLE_PROPERTIES = [
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'min-width',
  'max-width',
];

const viewportTransitionStates = new WeakMap<HTMLElement, MenuViewportTransitionState>();

export function getMenuViewportAttrs(): MenuViewportAttrs {
  return {
    'data-menu-viewport': '',
  };
}

export function getMenuRootViewAttrs(): MenuRootViewAttrs {
  return {
    'data-menu-root-view': '',
    'data-menu-view': '',
  };
}

function getViewportTransitionState(content: HTMLElement): MenuViewportTransitionState {
  let state = viewportTransitionStates.get(content);

  if (!state) {
    state = {
      pending: null,
      phaseKeys: new WeakMap(),
    };
    viewportTransitionStates.set(content, state);
  }

  return state;
}

export function getMenuViewportElement(content: HTMLElement | null): HTMLElement | null {
  if (!content) return null;

  return content.querySelector<HTMLElement>(`:scope > [${MENU_VIEWPORT_ATTR}]`) ?? content;
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
  return viewport.querySelector<HTMLElement>(`:scope > [${MENU_ROOT_VIEW_ATTR}]`);
}

function getActiveMenuViewElement(viewport: HTMLElement): HTMLElement | null {
  return (
    Array.from(viewport.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.hasAttribute(MENU_VIEW_ATTR) &&
        !child.hasAttribute(MENU_ROOT_VIEW_ATTR) &&
        !child.hidden &&
        !child.hasAttribute(TransitionDataAttrs.transitionEnding)
    ) ?? null
  );
}

function resolveMinWidth(options: MenuViewportTransitionOptions | undefined): number {
  return options?.minWidth ?? DEFAULT_MENU_VIEWPORT_MIN_WIDTH;
}

function resolveAvailableWidth(
  content: HTMLElement,
  options: MenuViewportTransitionOptions | undefined
): number | null {
  const inlineWidth = content.style.getPropertyValue(PopoverCSSVars.availableWidth);
  const value =
    options?.availableWidth || inlineWidth || getComputedStyle(content).getPropertyValue(PopoverCSSVars.availableWidth);

  const width = typeof value === 'number' ? value : resolveCSSLength(content, value);

  return Number.isFinite(width) && width > 0 ? width : null;
}

function snapshotInlineStyle(element: HTMLElement): InlineStyleSnapshotEntry[] {
  return MENU_VIEW_MEASURE_STYLE_PROPERTIES.map((property) => ({
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }));
}

function restoreInlineStyle(element: HTMLElement, snapshot: InlineStyleSnapshotEntry[]): void {
  for (const { property, value, priority } of snapshot) {
    if (value) {
      element.style.setProperty(property, value, priority);
    } else {
      element.style.removeProperty(property);
    }
  }
}

function measureMenuView(
  content: HTMLElement,
  view: HTMLElement,
  minWidth: number,
  options?: MenuViewportTransitionOptions
): MenuViewSize {
  const snapshot = snapshotInlineStyle(view);
  const availableWidth = resolveAvailableWidth(content, options);

  try {
    view.style.setProperty('position', 'absolute');
    view.style.setProperty('top', '0px');
    view.style.setProperty('right', 'auto');
    view.style.setProperty('bottom', 'auto');
    view.style.setProperty('left', '0px');
    view.style.setProperty('width', 'max-content');
    view.style.setProperty('height', 'auto');
    view.style.setProperty('min-width', `${minWidth}px`);
    view.style.setProperty('max-width', 'none');
    forceLayout(view);

    let rect = view.getBoundingClientRect();
    const naturalWidth = Math.ceil(Math.max(minWidth, rect.width, view.scrollWidth));
    const width = Math.ceil(availableWidth ? Math.max(minWidth, Math.min(naturalWidth, availableWidth)) : naturalWidth);

    if (width !== naturalWidth) {
      view.style.setProperty('width', `${width}px`);
      view.style.setProperty('max-width', `${width}px`);
      forceLayout(view);
      rect = view.getBoundingClientRect();
    }

    return {
      width,
      height: Math.ceil(Math.max(rect.height, view.scrollHeight)),
    };
  } finally {
    restoreInlineStyle(view, snapshot);
    forceLayout(view);
  }
}

function setViewportSize(content: HTMLElement, size: MenuViewSize): void {
  content.style.setProperty(MENU_WIDTH_VAR, `${size.width}px`);
  content.style.setProperty(MENU_HEIGHT_VAR, `${size.height}px`);
}

function setMenuViewState(
  view: HTMLElement,
  state: typeof MENU_VIEW_ACTIVE_STATE | typeof MENU_VIEW_INACTIVE_STATE
): void {
  view.setAttribute(MENU_VIEW_STATE_ATTR, state);

  if (state === MENU_VIEW_ACTIVE_STATE) {
    view.setAttribute('data-open', '');
  } else {
    view.removeAttribute('data-open');
  }
}

function prepareEnteringMenuView(
  content: HTMLElement,
  rootView: HTMLElement,
  entering: HTMLElement,
  state: MenuViewportTransitionState,
  options?: MenuViewportTransitionOptions
): void {
  const minWidth = resolveMinWidth(options);
  const availableWidth = resolveAvailableWidth(content, options);
  const fromSize = measureMenuView(content, rootView, minWidth, options);
  const toSize = measureMenuView(content, entering, minWidth, options);

  state.pending = { entering, availableWidth, fromSize, toSize };
  setMenuViewState(rootView, MENU_VIEW_ACTIVE_STATE);
  setViewportSize(content, fromSize);
  forceLayout(content);
}

function startEnteringMenuView(
  content: HTMLElement,
  rootView: HTMLElement,
  entering: HTMLElement,
  state: MenuViewportTransitionState,
  options?: MenuViewportTransitionOptions
): void {
  const minWidth = resolveMinWidth(options);
  const availableWidth = resolveAvailableWidth(content, options);
  const current =
    state.pending?.entering === entering && state.pending.availableWidth === availableWidth
      ? state.pending
      : {
          entering,
          availableWidth,
          fromSize: measureMenuView(content, rootView, minWidth, options),
          toSize: measureMenuView(content, entering, minWidth, options),
        };

  state.pending = null;

  setViewportSize(content, current.fromSize);
  forceLayout(rootView);
  setMenuViewState(rootView, MENU_VIEW_INACTIVE_STATE);
  forceLayout(rootView);
  setViewportSize(content, current.toSize);
}

function startExitingMenuView(
  content: HTMLElement,
  rootView: HTMLElement,
  exiting: HTMLElement,
  transitionState: MenuViewportTransitionState,
  options?: MenuViewportTransitionOptions
): void {
  transitionState.pending = null;

  const minWidth = resolveMinWidth(options);
  const fromSize = measureMenuView(content, exiting, minWidth, options);
  const toSize = measureMenuView(content, rootView, minWidth, options);

  setViewportSize(content, fromSize);
  setMenuViewState(rootView, MENU_VIEW_INACTIVE_STATE);
  forceLayout(rootView);
  setMenuViewState(rootView, MENU_VIEW_ACTIVE_STATE);
  forceLayout(rootView);
  setViewportSize(content, toSize);
}

export function syncMenuViewRoot(
  content: HTMLElement | null,
  hasActiveChildView: boolean,
  options?: MenuViewportTransitionOptions
): void {
  if (!content) return;

  const viewport = getViewportElement(content);
  const rootView = getRootViewElement(viewport);

  if (!rootView) return;

  const activeView = getActiveMenuViewElement(viewport);

  if (activeView) {
    if (rootView.getAttribute(MENU_VIEW_STATE_ATTR) === MENU_VIEW_INACTIVE_STATE) {
      const size = measureMenuView(content, activeView, resolveMinWidth(options), options);
      setViewportSize(content, size);
    }

    return;
  }

  if (hasActiveChildView) return;

  const size = measureMenuView(content, rootView, resolveMinWidth(options), options);

  setMenuViewState(rootView, MENU_VIEW_ACTIVE_STATE);
  setViewportSize(content, size);
}

export function observeMenuViewContent(content: HTMLElement, onChange: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {};

  let rafId = 0;

  function scheduleChange(): void {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      onChange();
    });
  }

  const observer = new MutationObserver((records) => {
    const changed = records.some((record) => {
      if (record.type !== 'attributes') return true;

      const name = record.attributeName;
      if (!name) return true;

      return record.oldValue !== (record.target as Element).getAttribute(name);
    });

    if (changed) scheduleChange();
  });

  observer.observe(content, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: MENU_VIEW_LAYOUT_ATTRS,
  });

  return () => {
    cancelAnimationFrame(rafId);
    observer.disconnect();
  };
}

export function syncMenuViewTransition(
  content: HTMLElement | null,
  view: HTMLElement | null,
  viewState: MenuViewTransitionState,
  options?: MenuViewportTransitionOptions
): void {
  if (!content || !view) return;

  const viewport = getViewportElement(content, view);
  const rootView = getRootViewElement(viewport);

  if (!rootView) return;

  const state = getViewportTransitionState(content);
  const phaseKey = `${viewState.phase}:${viewState.direction}`;

  const shouldResyncActiveView =
    viewState.phase === 'active' && rootView.getAttribute(MENU_VIEW_STATE_ATTR) !== MENU_VIEW_INACTIVE_STATE;

  if (state.phaseKeys.get(view) === phaseKey && !shouldResyncActiveView) return;

  state.phaseKeys.set(view, phaseKey);

  if (viewState.phase === 'hidden') {
    state.phaseKeys.delete(view);
    syncMenuViewRoot(content, getActiveMenuViewElement(viewport) !== null, options);
    return;
  }

  if (viewState.phase === 'entering') {
    prepareEnteringMenuView(content, rootView, view, state, options);
    return;
  }

  if (viewState.phase === 'active') {
    startEnteringMenuView(content, rootView, view, state, options);
    return;
  }

  startExitingMenuView(content, rootView, view, state, options);
}
