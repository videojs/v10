import { createState, type State, type WritableState } from '@videojs/store';
import { resolveCSSLength } from '@videojs/utils/dom';
import { MenuCSSVars } from '../../../core/ui/menu/menu-css-vars';
import { getMenuTransitionPanelState, type MenuTransitionPanelState } from '../../../core/ui/menu/menu-transition';
import { PopoverCSSVars } from '../../../core/ui/popover/popover-css-vars';
import { forceLayout } from '../../utils/layout';
import { waitForAnimations as waitForElementAnimations } from '../transition';
import type { MenuApi } from './create-menu';

export interface MenuTransitionViewApi {
  readonly menu: MenuApi;
  readonly state: State<MenuTransitionPanelState>;
  readonly triggerElement: HTMLElement | null;
  readonly panelElement: HTMLElement | null;
  setTriggerElement(element: HTMLElement | null): void;
  setPanelElement(element: HTMLElement | null): void;
  destroy(): void;
}

export interface MenuTransitionSize {
  width: number | null;
  height: number | null;
}

const DEFAULT_MIN_WIDTH = 160;

/** Measures a rendered panel without mutating it. */
export function getMenuTransitionSize(
  container: HTMLElement,
  panel: HTMLElement,
  minWidth = DEFAULT_MIN_WIDTH
): MenuTransitionSize {
  const availableValue =
    container.style.getPropertyValue(MenuCSSVars.availableWidth) ||
    container.style.getPropertyValue(PopoverCSSVars.availableWidth) ||
    getComputedStyle(container).getPropertyValue(MenuCSSVars.availableWidth) ||
    getComputedStyle(container).getPropertyValue(PopoverCSSVars.availableWidth);
  const resolvedAvailableWidth = resolveCSSLength(container, availableValue);
  const availableWidth =
    Number.isFinite(resolvedAvailableWidth) && resolvedAvailableWidth > 0 ? resolvedAvailableWidth : null;
  const rect = panel.getBoundingClientRect();
  const naturalWidth = Math.ceil(Math.max(minWidth, rect.width, panel.scrollWidth));

  return {
    width: Math.ceil(availableWidth ? Math.min(naturalWidth, Math.max(minWidth, availableWidth)) : naturalWidth),
    height: Math.ceil(Math.max(rect.height, panel.scrollHeight)),
  };
}

export interface MenuTransitionOptions {
  waitForAnimations?: (element: HTMLElement) => Promise<void>;
  onViewEnter?: (view: MenuTransitionViewApi) => void;
  onViewExit?: (view: MenuTransitionViewApi) => void;
}

export interface MenuTransitionApi {
  readonly activeView: MenuTransitionViewApi | null;
  readonly rootState: State<MenuTransitionPanelState>;
  readonly size: State<MenuTransitionSize>;
  setRootPanelElement(element: HTMLElement | null): void;
  setSize(size: MenuTransitionSize): void;
  registerView(menu: MenuApi): MenuTransitionViewApi;
  reset(): void;
  destroy(): void;
}

interface ViewRecord {
  api: MenuTransitionViewApi;
  menu: MenuApi;
  state: WritableState<MenuTransitionPanelState>;
  trigger: HTMLElement | null;
  panel: HTMLElement | null;
  activationOrder: number;
  unsubscribe: () => void;
}

function setPanelPhase(
  state: WritableState<MenuTransitionPanelState>,
  phase: MenuTransitionPanelState['phase'],
  direction: MenuTransitionPanelState['direction']
): void {
  state.replace(getMenuTransitionPanelState(phase, direction));
}

/** Coordinates menu-bound panel state while platform adapters own rendered DOM output. */
export function createMenuTransition(options: MenuTransitionOptions = {}): MenuTransitionApi {
  const waitForAnimations = options.waitForAnimations ?? waitForElementAnimations;
  const rootState = createState(getMenuTransitionPanelState('active', 'back'));
  const size = createState<MenuTransitionSize>({ width: null, height: null });
  const views = new Set<ViewRecord>();
  const viewsByMenu = new Map<MenuApi, ViewRecord>();
  let rootPanel: HTMLElement | null = null;
  let activeRecord: ViewRecord | null = null;
  let activationOrder = 0;
  let transitionId = 0;
  let raf1 = 0;
  let raf2 = 0;
  let focusRaf = 0;

  function cancelFrames(): void {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    cancelAnimationFrame(focusRaf);
    raf1 = 0;
    raf2 = 0;
    focusRaf = 0;
  }

  function initializePanels(): void {
    setPanelPhase(rootState, activeRecord ? 'hidden' : 'active', activeRecord ? 'forward' : 'back');

    for (const view of views) {
      setPanelPhase(view.state, view === activeRecord ? 'active' : 'hidden', 'forward');
    }
  }

  function scheduleEnterComplete(
    id: number,
    enteringState: WritableState<MenuTransitionPanelState>,
    entering: HTMLElement,
    outgoingState: WritableState<MenuTransitionPanelState> | null,
    outgoing: HTMLElement | null,
    direction: MenuTransitionPanelState['direction']
  ): void {
    forceLayout(entering);
    raf1 = requestAnimationFrame(() => {
      if (id !== transitionId) return;
      raf2 = requestAnimationFrame(async () => {
        if (id !== transitionId) return;
        setPanelPhase(enteringState, 'active', direction);
        forceLayout(entering);
        if (outgoing) await waitForAnimations(outgoing);
        if (id !== transitionId) return;
        if (outgoingState) setPanelPhase(outgoingState, 'hidden', direction);
      });
    });
  }

  function activate(view: ViewRecord): void {
    if (activeRecord === view) return;
    const previous = activeRecord;
    if (previous && previous !== view) previous.menu.close('imperative-action');

    activeRecord = view;
    view.activationOrder = ++activationOrder;
    if (
      __DEV__ &&
      Array.from(views).filter(({ menu }) => menu.input.current.active && menu.input.current.status !== 'ending')
        .length > 1
    ) {
      console.warn(
        '[vjs-menu-transition] Multiple controlled child menus are open; showing the most recently opened view.'
      );
    }

    transitionId++;
    cancelFrames();
    const id = transitionId;
    const entering = view.panel;
    const outgoingState = previous?.state ?? rootState;
    const outgoing = previous?.panel ?? rootPanel;

    if (!entering) return;
    setPanelPhase(outgoingState, 'exiting', 'forward');
    setPanelPhase(view.state, 'entering', 'forward');
    scheduleEnterComplete(id, view.state, entering, outgoingState, outgoing, 'forward');
    focusRaf = requestAnimationFrame(() => {
      focusRaf = 0;
      if (id === transitionId) options.onViewEnter?.(view.api);
    });
  }

  function deactivate(view: ViewRecord): void {
    if (activeRecord !== view) return;
    const fallback = Array.from(views)
      .filter(
        (candidate) =>
          candidate !== view && candidate.menu.input.current.active && candidate.menu.input.current.status !== 'ending'
      )
      .sort((a, b) => b.activationOrder - a.activationOrder)[0];

    if (fallback) {
      activeRecord = fallback;
      transitionId++;
      cancelFrames();
      initializePanels();
      options.onViewEnter?.(fallback.api);
      return;
    }

    activeRecord = null;
    transitionId++;
    cancelFrames();
    const id = transitionId;
    const outgoing = view.panel;
    const entering = rootPanel;

    if (!entering) return;
    setPanelPhase(view.state, 'exiting', 'back');
    setPanelPhase(rootState, 'entering', 'back');
    scheduleEnterComplete(id, rootState, entering, view.state, outgoing, 'back');

    if (outgoing) {
      waitForAnimations(outgoing).then(() => {
        if (id === transitionId) options.onViewExit?.(view.api);
      });
    }
  }

  function sync(view: ViewRecord): void {
    const { active, status } = view.menu.input.current;
    if (active && status !== 'ending') activate(view);
    else if (activeRecord === view && (status === 'ending' || !active)) deactivate(view);
  }

  function registerView(menu: MenuApi): MenuTransitionViewApi {
    const existing = viewsByMenu.get(menu);
    if (existing) {
      if (__DEV__) console.warn('[vjs-menu-transition] A child Menu root can only be registered once.');
      return existing.api;
    }

    let record!: ViewRecord;
    const state = createState(getMenuTransitionPanelState('hidden', 'forward'));
    const api: MenuTransitionViewApi = {
      menu,
      state,
      get triggerElement() {
        return record.trigger;
      },
      get panelElement() {
        return record.panel;
      },
      setTriggerElement(element) {
        record.trigger = element;
      },
      setPanelElement(element) {
        record.panel = element;
        initializePanels();
        sync(record);
      },
      destroy() {
        if (!views.delete(record)) return;
        viewsByMenu.delete(record.menu);
        record.unsubscribe();
        if (activeRecord === record) {
          activeRecord =
            Array.from(views)
              .filter(({ menu }) => menu.input.current.active && menu.input.current.status !== 'ending')
              .sort((a, b) => b.activationOrder - a.activationOrder)[0] ?? null;
          initializePanels();
        }
        record.trigger = null;
        record.panel = null;
      },
    };
    record = {
      api,
      menu,
      state,
      trigger: null,
      panel: null,
      activationOrder: 0,
      unsubscribe: () => {},
    };
    record.unsubscribe = menu.input.subscribe(() => sync(record));
    views.add(record);
    viewsByMenu.set(menu, record);
    sync(record);
    return api;
  }

  function reset(): void {
    transitionId++;
    cancelFrames();
    for (const view of views) {
      if (view.menu.input.current.active) view.menu.close('imperative-action');
    }
    if (!activeRecord?.menu.input.current.active) {
      activeRecord =
        Array.from(views)
          .filter(({ menu }) => menu.input.current.active && menu.input.current.status !== 'ending')
          .sort((a, b) => b.activationOrder - a.activationOrder)[0] ?? null;
    }
    initializePanels();
  }

  return {
    get activeView() {
      return activeRecord?.api ?? null;
    },
    rootState,
    size,
    setRootPanelElement(element) {
      rootPanel = element;
      initializePanels();
    },
    setSize(nextSize) {
      size.replace(nextSize);
    },
    registerView,
    reset,
    destroy() {
      transitionId++;
      cancelFrames();
      for (const view of views) view.unsubscribe();
      views.clear();
      viewsByMenu.clear();
      activeRecord = null;
      rootPanel = null;
    },
  };
}
