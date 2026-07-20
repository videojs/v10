import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getMenuRootViewAttrs,
  getMenuViewportAttrs,
  getMenuViewportElement,
  observeMenuViewContent,
  syncMenuViewRoot,
  syncMenuViewTransition,
} from '../menu-viewport-transition';

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
    element.setAttribute(key, String(value));
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

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForMutationFrame(): Promise<void> {
  await Promise.resolve();
  await nextFrame();
}

function mockMenuViewSize(
  element: HTMLElement,
  {
    currentWidth,
    currentHeight,
    naturalWidth,
    naturalHeight,
    constrainedWidth,
    constrainedHeight,
  }: {
    currentWidth: number;
    currentHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    constrainedWidth?: number;
    constrainedHeight?: number;
  }
): void {
  function isMeasuringNaturalSize(): boolean {
    return (
      element.style.getPropertyValue('width') === 'max-content' && element.style.getPropertyValue('height') === 'auto'
    );
  }

  function isMeasuringConstrainedSize(): boolean {
    return element.style.getPropertyValue('width') === `${constrainedWidth}px`;
  }

  function getSize(): { width: number; height: number } {
    if (isMeasuringNaturalSize()) {
      return { width: naturalWidth, height: naturalHeight };
    }

    if (constrainedWidth && constrainedHeight && isMeasuringConstrainedSize()) {
      return { width: constrainedWidth, height: constrainedHeight };
    }

    return { width: currentWidth, height: currentHeight };
  }

  element.getBoundingClientRect = vi.fn(() => {
    const size = getSize();
    return createRect(size.width, size.height);
  });

  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    get: () => getSize().width,
  });

  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    get: () => getSize().height,
  });
}

describe('menu-viewport-transition', () => {
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

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewRoot(content, false);
    syncMenuViewTransition(content, menuView, {
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
    expect(rootView.getAttribute('data-menu-view-state')).toBe('active');
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

  it('observes child and availability changes in menu content', async () => {
    const content = addElement();
    const item = document.createElement('div');
    const onChange = vi.fn();
    const cleanup = observeMenuViewContent(content, onChange);

    content.append(item);
    await waitForMutationFrame();

    expect(onChange).toHaveBeenCalledTimes(1);

    item.setAttribute('data-availability', 'available');
    await waitForMutationFrame();

    expect(onChange).toHaveBeenCalledTimes(2);

    item.setAttribute('data-availability', 'available');
    await waitForMutationFrame();

    expect(onChange).toHaveBeenCalledTimes(2);

    item.setAttribute('data-availability', 'unavailable');
    await waitForMutationFrame();

    expect(onChange).toHaveBeenCalledTimes(3);

    cleanup();
    item.setAttribute('data-availability', 'available');
    await waitForMutationFrame();

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('toggles menu viewport data attributes for active and exiting phases', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewTransition(content, menuView, {
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
    });
    syncMenuViewTransition(content, menuView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    expect(rootView.getAttribute('data-menu-view-state')).toBe('inactive');

    syncMenuViewTransition(content, menuView, {
      phase: 'exiting',
      direction: 'back',
      triggerId: 'trigger-1',
    });

    expect(rootView.getAttribute('data-menu-view-state')).toBe('active');
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
  });

  it('does not measure the root view for initially hidden child views', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuViews = Array.from({ length: 13 }, () => document.createElement('div'));

    applyAttrs(rootView, getMenuRootViewAttrs());
    rootView.getBoundingClientRect = vi.fn(() => createRect(160, 100));
    for (const menuView of menuViews) menuView.setAttribute('data-menu-view', '');
    content.append(rootView, ...menuViews);

    for (const menuView of menuViews) {
      syncMenuViewTransition(content, menuView, {
        phase: 'hidden',
        direction: 'forward',
        triggerId: null,
      });
    }

    expect(rootView.getBoundingClientRect).not.toHaveBeenCalled();
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('');
  });

  it('measures the root view height at the available menu width', () => {
    const content = addElement();
    const rootView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    content.style.setProperty('--media-popover-available-width', '180px');
    content.append(rootView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 80,
      naturalWidth: 260,
      naturalHeight: 80,
      constrainedWidth: 180,
      constrainedHeight: 128,
    });

    syncMenuViewRoot(content, false);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('128px');
    expect(rootView.getBoundingClientRect).toHaveBeenCalledTimes(2);
  });

  it('avoids duplicate reads when measuring a natural menu view size', () => {
    const content = addElement();
    const rootView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    content.append(rootView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 80,
      naturalWidth: 160,
      naturalHeight: 80,
    });

    syncMenuViewRoot(content, false);

    expect(rootView.getBoundingClientRect).toHaveBeenCalledTimes(1);
  });

  it('batches entering menu view measurements', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.style.setProperty('--media-popover-available-width', '180px');
    content.append(rootView, menuView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(menuView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 260,
      naturalHeight: 100,
      constrainedWidth: 180,
      constrainedHeight: 148,
    });

    syncMenuViewTransition(content, menuView, {
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    expect(rootView.getBoundingClientRect).toHaveBeenCalledTimes(1);
    expect(menuView.getBoundingClientRect).toHaveBeenCalledTimes(2);
  });

  it('measures an entering submenu height at the available menu width', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.style.setProperty('--media-popover-available-width', '180px');
    content.append(rootView, menuView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(menuView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 260,
      naturalHeight: 100,
      constrainedWidth: 180,
      constrainedHeight: 148,
    });

    syncMenuViewTransition(content, menuView, {
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
    });
    syncMenuViewTransition(content, menuView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('148px');
  });

  it('remeasures a pending submenu when the available menu width changes before active', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(menuView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 260,
      naturalHeight: 100,
      constrainedWidth: 180,
      constrainedHeight: 148,
    });

    syncMenuViewTransition(content, menuView, {
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    content.style.setProperty('--media-popover-available-width', '180px');

    syncMenuViewTransition(content, menuView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('148px');
  });

  it('resyncs an active submenu when the available menu width changes', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    mockMenuViewSize(rootView, {
      currentWidth: 160,
      currentHeight: 100,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(menuView, {
      currentWidth: 260,
      currentHeight: 100,
      naturalWidth: 260,
      naturalHeight: 100,
      constrainedWidth: 180,
      constrainedHeight: 148,
    });

    syncMenuViewTransition(content, menuView, {
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
    });
    syncMenuViewTransition(content, menuView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('260px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('100px');

    content.style.setProperty('--media-popover-available-width', '180px');
    syncMenuViewRoot(content, true);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('148px');
  });

  it('forces root view layout around the active submenu transition', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');
    const rootMeasurements: boolean[] = [];

    rootView.getBoundingClientRect = vi.fn(() => {
      rootMeasurements.push(rootView.getAttribute('data-menu-view-state') === 'inactive');
      return createRect(160, 100);
    });

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    syncMenuViewTransition(content, menuView, {
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    rootMeasurements.length = 0;

    syncMenuViewTransition(content, menuView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-1',
    });

    expect(rootMeasurements).toEqual([false, true]);
    expect(rootView.getAttribute('data-menu-view-state')).toBe('inactive');
  });

  it('measures the root view natural size when exiting a larger submenu', () => {
    const content = addElement();
    const viewport = document.createElement('div');
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(viewport, getMenuViewportAttrs());
    applyAttrs(rootView, getMenuRootViewAttrs());
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

    syncMenuViewTransition(content, menuView, {
      phase: 'exiting',
      direction: 'back',
      triggerId: 'trigger-1',
    });

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('109px');
    expect(rootView.style.getPropertyValue('width')).toBe('');
    expect(rootView.style.getPropertyValue('height')).toBe('');
    expect(menuView.getBoundingClientRect).toHaveBeenCalledTimes(1);
    expect(rootView.getBoundingClientRect).toHaveBeenCalledTimes(3);
  });

  it('resyncs the root view when a visible child view becomes hidden', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const menuView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
    menuView.setAttribute('data-menu-view', '');
    content.append(rootView, menuView);

    mockMenuViewSize(rootView, {
      currentWidth: 220,
      currentHeight: 170,
      naturalWidth: 160,
      naturalHeight: 100,
    });
    mockMenuViewSize(menuView, {
      currentWidth: 220,
      currentHeight: 170,
      naturalWidth: 220,
      naturalHeight: 170,
    });

    syncMenuViewTransition(content, menuView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-1',
    });
    menuView.hidden = true;

    syncMenuViewTransition(content, menuView, {
      phase: 'hidden',
      direction: 'back',
      triggerId: 'trigger-1',
    });

    expect(rootView.getAttribute('data-menu-view-state')).toBe('active');
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('160px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('100px');
  });

  it('does not restore the root view when a hidden child sibling still has an active view', () => {
    const content = addElement();
    const rootView = document.createElement('div');
    const hiddenView = document.createElement('div');
    const activeView = document.createElement('div');

    applyAttrs(rootView, getMenuRootViewAttrs());
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

    syncMenuViewTransition(content, hiddenView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-1',
    });
    syncMenuViewTransition(content, activeView, {
      phase: 'active',
      direction: 'forward',
      triggerId: 'trigger-2',
    });

    hiddenView.hidden = true;
    syncMenuViewTransition(content, hiddenView, {
      phase: 'hidden',
      direction: 'back',
      triggerId: 'trigger-1',
    });

    expect(rootView.getAttribute('data-menu-view-state')).toBe('inactive');
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('260px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('180px');
  });
});
