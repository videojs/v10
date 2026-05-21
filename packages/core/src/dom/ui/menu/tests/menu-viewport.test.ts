import { createState, flush, type WritableState } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMenuViewTransition,
  getMenuViewTransitionAttrs,
  type MenuViewTransitionApi,
  type MenuViewTransitionState,
  PERSISTENT_MENU_VIEW_RESTING_STATE,
} from '../create-menu-view-transition';
import {
  createMenuViewport,
  getMenuViewportAttrs,
  getMenuViewportElement,
  type MenuViewportApi,
} from '../menu-viewport';

const viewports = new WeakMap<HTMLElement, MenuViewportApi>();
const viewBindings = new WeakMap<HTMLElement, MenuViewTransitionApi>();

function getViewport(content: HTMLElement): MenuViewportApi {
  let viewport = viewports.get(content);

  if (!viewport) {
    viewport = createMenuViewport(content);
    viewports.set(content, viewport);
  }

  return viewport;
}

function createMockTransition(state: MenuViewTransitionState): MenuViewTransitionApi {
  const input = createState(state) as WritableState<MenuViewTransitionState>;

  return {
    input,
    persistent: false,
    setElement: () => {},
    sync: () => {},
    reset: () => {},
    destroy: () => {},
  };
}

interface ViewportSyncOptions {
  hasActiveSubmenu?: boolean;
  view?: HTMLElement | null;
  viewState?: MenuViewTransitionState | null;
}

function syncMenuViewport(content: HTMLElement | null, sync: ViewportSyncOptions = {}): void {
  if (!content) return;

  const viewport = getViewport(content);
  const { hasActiveSubmenu = false, view = null, viewState = null } = sync;

  if (!view || !viewState) {
    viewport.syncRoot(hasActiveSubmenu);
    flush();
    return;
  }

  let transition = viewBindings.get(view);

  if (!transition) {
    transition = createMockTransition(viewState);
    viewBindings.set(view, transition);
    viewport.bindChild(view, transition);
  }

  (transition.input as WritableState<MenuViewTransitionState>).patch(viewState);
  flush();
}

function getMenuViewAttrs({ root = false }: { root?: boolean } = {}) {
  return getMenuViewTransitionAttrs(PERSISTENT_MENU_VIEW_RESTING_STATE, { root, persistent: root });
}

function createElement(): HTMLElement {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return element;
}

function cleanupElement(element: HTMLElement): void {
  element.remove();
}

function applyAttrs(element: HTMLElement, attrs: object): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === undefined) {
      element.removeAttribute(key);
    } else {
      element.setAttribute(key, value === true ? '' : String(value));
    }
  }
}

function createRect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

function mockMenuViewSize(
  element: HTMLElement,
  {
    currentWidth,
    currentHeight,
    naturalWidth,
    naturalHeight,
  }: {
    currentWidth: number;
    currentHeight: number;
    naturalWidth: number;
    naturalHeight: number;
  }
): void {
  function isMeasuringNaturalSize(): boolean {
    return (
      element.style.getPropertyValue('width') === 'max-content' && element.style.getPropertyValue('height') === 'auto'
    );
  }

  element.getBoundingClientRect = vi.fn(() =>
    isMeasuringNaturalSize() ? createRect(naturalWidth, naturalHeight) : createRect(currentWidth, currentHeight)
  );

  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    get: () => (isMeasuringNaturalSize() ? naturalWidth : currentWidth),
  });

  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    get: () => (isMeasuringNaturalSize() ? naturalHeight : currentHeight),
  });
}

describe('createMenuViewport', () => {
  const elements: HTMLElement[] = [];

  afterEach(() => {
    for (const element of elements) cleanupElement(element);
    elements.length = 0;
  });

  function addElement(): HTMLElement {
    const element = createElement();
    elements.push(element);
    return element;
  }

  it('sets viewport size variables while an entering menu view holds its starting style', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewport(content);
    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
    expect(content.hasAttribute('data-transitioning')).toBe(true);
    expect(rootView.hasAttribute('data-open')).toBe(false);
  });

  it('resolves an explicit menu viewport from the menu content element', () => {
    const content = addElement();
    const viewport = document.createElement('div');

    applyAttrs(viewport, getMenuViewportAttrs());
    content.append(viewport);

    expect(getMenuViewportElement(content)).toBe(viewport);
  });

  it('resolves the menu content element when it is the viewport', () => {
    const content = addElement();

    applyAttrs(content, getMenuViewportAttrs());

    expect(getMenuViewportElement(content)).toBe(content);
  });

  it('toggles menu viewport data attributes for active and exiting phases', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });
    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(rootView.hasAttribute('data-open')).toBe(false);
    expect(rootView.hasAttribute('data-ending-style')).toBe(true);
    expect(rootView.getAttribute('data-direction')).toBe('forward');

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'exiting',
        direction: 'back',
        triggerId: 'trigger-1',
      },
    });

    expect(rootView.hasAttribute('data-open')).toBe(true);
    expect(rootView.hasAttribute('data-starting-style')).toBe(true);
    expect(rootView.hasAttribute('data-ending-style')).toBe(false);
    expect(rootView.getAttribute('data-direction')).toBe('back');
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
  });

  it('keeps root panel transition attributes until animations settle', async () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');
    let resolveAnimation!: () => void;
    const animation = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });

    rootView.getAnimations = vi.fn(() => [{ finished: animation } as unknown as Animation]);

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(rootView.hasAttribute('data-transitioning')).toBe(true);
    expect(rootView.hasAttribute('data-ending-style')).toBe(true);

    resolveAnimation();

    await vi.waitFor(() => {
      expect(rootView.hasAttribute('data-transitioning')).toBe(false);
      expect(rootView.hasAttribute('data-ending-style')).toBe(false);
    });
  });

  it('clears an exiting root panel once it is visually complete', async () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');
    const animation = new Promise<void>(() => {});
    const getComputedStyle = window.getComputedStyle.bind(window);
    const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      const style = getComputedStyle(element);

      if (element !== rootView) return style;

      return Object.assign(Object.create(style), {
        opacity: '0',
      }) as CSSStyleDeclaration;
    });

    rootView.getAnimations = vi.fn(() => [{ finished: animation } as unknown as Animation]);

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    try {
      syncMenuViewport(content, {
        view: menuView,
        viewState: {
          phase: 'active',
          direction: 'forward',
          triggerId: 'trigger-1',
        },
      });

      expect(rootView.hasAttribute('data-transitioning')).toBe(true);
      expect(rootView.hasAttribute('data-ending-style')).toBe(true);

      await vi.waitFor(() => {
        expect(rootView.hasAttribute('data-transitioning')).toBe(false);
        expect(rootView.hasAttribute('data-ending-style')).toBe(false);
      });
    } finally {
      getComputedStyleSpy.mockRestore();
    }
  });

  it('keeps the viewport transitioning while its size animation settles', async () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');
    let resolveAnimation!: () => void;
    const animation = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });

    content.getAnimations = vi.fn(() => [{ finished: animation } as unknown as Animation]);

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(content.hasAttribute('data-transitioning')).toBe(true);

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(content.hasAttribute('data-transitioning')).toBe(true);

    resolveAnimation();

    await vi.waitFor(() => {
      expect(content.hasAttribute('data-transitioning')).toBe(false);
    });
  });

  it('reapplies the viewport transitioning attribute while a child view is active', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    content.removeAttribute('data-transitioning');
    syncMenuViewport(content, { hasActiveSubmenu: true });

    expect(content.hasAttribute('data-transitioning')).toBe(true);
  });

  it('hides the root panel while a submenu view is active', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');
    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(rootView.hasAttribute('data-open')).toBe(false);
  });

  it('measures the root view natural size when exiting a larger submenu', () => {
    const content = addElement();
    const viewport = document.createElement('div');
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(viewport, getMenuViewportAttrs());
    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    viewport.append(rootView, menuView);
    content.append(viewport);

    mockMenuViewSize(rootView, {
      currentWidth: 220,
      currentHeight: 170,
      naturalWidth: 160,
      naturalHeight: 109,
    });
    mockMenuViewSize(menuView, {
      currentWidth: 220,
      currentHeight: 170,
      naturalWidth: 220,
      naturalHeight: 170,
    });

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'exiting',
        direction: 'back',
        triggerId: 'trigger-1',
      },
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('109px');
    expect(rootView.style.getPropertyValue('width')).toBe('');
    expect(rootView.style.getPropertyValue('height')).toBe('');
  });

  it('measures from the active sibling view when entering another submenu view', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const currentView = document.createElement('div');
    const nextView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    currentView.setAttribute('data-menu-view', '');
    nextView.setAttribute('data-menu-view', '');
    content.append(rootView, currentView, nextView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(currentView, {
      currentWidth: 220,
      currentHeight: 140,
      naturalWidth: 220,
      naturalHeight: 140,
    });
    mockMenuViewSize(nextView, {
      currentWidth: 260,
      currentHeight: 180,
      naturalWidth: 260,
      naturalHeight: 180,
    });

    syncMenuViewport(content, {
      view: currentView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });
    syncMenuViewport(content, {
      view: nextView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-2',
      },
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('220px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('140px');

    syncMenuViewport(content, {
      view: nextView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-2',
      },
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('260px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('180px');
  });

  it('ignores exiting sibling views when entering another submenu view', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const exitingView = document.createElement('div');
    const nextView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    applyAttrs(exitingView, {
      'data-menu-view': '',
      'data-open': '',
      'data-ending-style': '',
    });
    nextView.setAttribute('data-menu-view', '');
    content.append(rootView, exitingView, nextView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(exitingView, {
      currentWidth: 220,
      currentHeight: 140,
      naturalWidth: 220,
      naturalHeight: 140,
    });
    mockMenuViewSize(nextView, {
      currentWidth: 260,
      currentHeight: 180,
      naturalWidth: 260,
      naturalHeight: 180,
    });

    syncMenuViewport(content, {
      view: nextView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-2',
      },
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('100px');
  });

  it('does not restore the root panel while navigation targets a submenu but the child is still hidden', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    const rootTransition = createMenuViewTransition({ persistent: true });
    const resetSpy = vi.spyOn(rootTransition, 'reset');
    const viewport = createMenuViewport(content, rootTransition, {
      navigation: { hasActiveSubmenu: () => true, direction: () => 'forward' as const },
    });

    viewport.bindChild(
      menuView,
      createMockTransition({
        phase: 'hidden',
        direction: 'forward',
        triggerId: 'trigger-1',
      })
    );

    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('hides the root panel when navigation targets a submenu before the child leaves hidden', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    const rootTransition = createMenuViewTransition({ persistent: true });
    const viewport = createMenuViewport(content, rootTransition, {
      navigation: { hasActiveSubmenu: () => true, direction: () => 'forward' as const },
    });

    viewport.syncRoot(true);
    flush();

    expect(rootView.hasAttribute('data-open')).toBe(false);
  });

  it('does not restore the root view when a hidden child sibling still has an active view', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const hiddenView = document.createElement('div');
    const activeView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    hiddenView.setAttribute('data-menu-view', '');
    activeView.setAttribute('data-menu-view', '');
    content.append(rootView, hiddenView, activeView);

    mockMenuViewSize(rootView, {
      currentWidth: 260,
      currentHeight: 180,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(hiddenView, {
      currentWidth: 260,
      currentHeight: 180,
      naturalWidth: 220,
      naturalHeight: 140,
    });
    mockMenuViewSize(activeView, {
      currentWidth: 260,
      currentHeight: 180,
      naturalWidth: 260,
      naturalHeight: 180,
    });

    syncMenuViewport(content, {
      view: hiddenView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });
    syncMenuViewport(content, {
      view: activeView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-2',
      },
    });

    hiddenView.hidden = true;
    syncMenuViewport(content, {
      view: hiddenView,
      viewState: {
        phase: 'hidden',
        direction: 'back',
        triggerId: 'trigger-1',
      },
    });

    expect(rootView.hasAttribute('data-open')).toBe(false);
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('260px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('180px');
  });

  it('uses the same panel model for nested submenu viewports', () => {
    const parentView = addElement();
    const parentRootView = document.createElement('div');
    const childView = document.createElement('div');

    applyAttrs(parentView, { 'data-menu-view': '', 'data-submenu': '' });
    applyAttrs(parentRootView, getMenuViewAttrs({ root: true }));
    applyAttrs(childView, { 'data-menu-view': '' });
    parentView.append(parentRootView, childView);

    mockMenuViewSize(parentRootView, {
      currentWidth: 180,
      currentHeight: 120,
      naturalWidth: 180,
      naturalHeight: 120,
    });
    mockMenuViewSize(childView, {
      currentWidth: 240,
      currentHeight: 160,
      naturalWidth: 240,
      naturalHeight: 160,
    });

    syncMenuViewport(parentView);
    syncMenuViewport(parentView, {
      view: childView,
      viewState: {
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(parentView.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(parentView.style.getPropertyValue('--media-menu-height')).toBe('120px');

    syncMenuViewport(parentView, {
      view: childView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(parentRootView.hasAttribute('data-open')).toBe(false);
    expect(parentRootView.hasAttribute('data-ending-style')).toBe(true);
    expect(parentView.style.getPropertyValue('--media-menu-width')).toBe('240px');
    expect(parentView.style.getPropertyValue('--media-menu-height')).toBe('160px');
  });

  it('clears root panel transition style attributes when returning to the root view', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'active',
        direction: 'forward',
        triggerId: 'trigger-1',
      },
    });

    expect(rootView.hasAttribute('data-ending-style')).toBe(true);

    menuView.hidden = true;
    syncMenuViewport(content, {
      view: menuView,
      viewState: {
        phase: 'hidden',
        direction: 'back',
        triggerId: 'trigger-1',
      },
    });

    expect(rootView.hasAttribute('data-starting-style')).toBe(false);
    expect(rootView.hasAttribute('data-ending-style')).toBe(false);
    expect(rootView.hasAttribute('data-open')).toBe(true);
  });

  it('measures the root panel as open when restoring it from an inactive state', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    rootView.removeAttribute('data-open');
    menuView.setAttribute('data-menu-view', '');
    menuView.hidden = true;
    content.append(rootView, menuView);

    function isMeasuringOpenRoot(): boolean {
      return (
        rootView.hasAttribute('data-open') &&
        rootView.style.getPropertyValue('display') === 'block' &&
        rootView.style.getPropertyValue('width') === 'max-content' &&
        rootView.style.getPropertyValue('height') === 'auto'
      );
    }

    rootView.getBoundingClientRect = vi.fn(() => (isMeasuringOpenRoot() ? createRect(180, 74) : createRect(0, 0)));

    Object.defineProperty(rootView, 'scrollWidth', {
      configurable: true,
      get: () => (isMeasuringOpenRoot() ? 180 : 0),
    });

    Object.defineProperty(rootView, 'scrollHeight', {
      configurable: true,
      get: () => (isMeasuringOpenRoot() ? 74 : 0),
    });

    syncMenuViewport(content);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('74px');
    expect(rootView.hasAttribute('data-open')).toBe(true);
  });

  it('keeps the last valid root panel size when a restore measurement returns zero', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    let canMeasureRoot = true;

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    content.append(rootView);

    function isMeasuringOpenRoot(): boolean {
      return (
        rootView.hasAttribute('data-open') &&
        rootView.style.getPropertyValue('display') === 'block' &&
        rootView.style.getPropertyValue('width') === 'max-content' &&
        rootView.style.getPropertyValue('height') === 'auto'
      );
    }

    rootView.getBoundingClientRect = vi.fn(() =>
      canMeasureRoot && isMeasuringOpenRoot() ? createRect(180, 74) : createRect(0, 0)
    );

    Object.defineProperty(rootView, 'scrollWidth', {
      configurable: true,
      get: () => (canMeasureRoot && isMeasuringOpenRoot() ? 180 : 0),
    });

    Object.defineProperty(rootView, 'scrollHeight', {
      configurable: true,
      get: () => (canMeasureRoot && isMeasuringOpenRoot() ? 74 : 0),
    });

    syncMenuViewport(content);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('74px');

    canMeasureRoot = false;
    content.style.setProperty('--media-menu-width', '220px');
    content.style.setProperty('--media-menu-height', '160px');
    syncMenuViewport(content);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('74px');
  });

  it('does not write a zero height variable when the root panel measurement is empty', () => {
    const content = addElement();
    const rootView = document.createElement('div');

    applyAttrs(rootView, getMenuViewAttrs({ root: true }));
    content.append(rootView);

    rootView.getBoundingClientRect = vi.fn(() => createRect(0, 0));

    Object.defineProperty(rootView, 'scrollWidth', {
      configurable: true,
      get: () => 0,
    });

    Object.defineProperty(rootView, 'scrollHeight', {
      configurable: true,
      get: () => 0,
    });

    syncMenuViewport(content);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('');
  });
});
