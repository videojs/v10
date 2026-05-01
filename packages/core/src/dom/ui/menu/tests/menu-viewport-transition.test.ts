import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getMenuRootViewAttrs,
  getMenuViewportAttrs,
  getMenuViewportElement,
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
  });
});
