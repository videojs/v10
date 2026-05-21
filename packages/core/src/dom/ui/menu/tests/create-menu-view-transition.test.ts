import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMenuViewTransition,
  getMenuViewTransitionAttrs,
  PERSISTENT_MENU_VIEW_RESTING_STATE,
} from '../create-menu-view-transition';

function createElement(): HTMLElement {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return element;
}

function cleanupElement(element: HTMLElement): void {
  element.remove();
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

describe('createMenuViewTransition', () => {
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

  it('starts hidden', () => {
    const transition = createMenuViewTransition();

    expect(transition.input.current).toEqual({
      phase: 'hidden',
      direction: 'forward',
      triggerId: null,
      transitioning: false,
    });
  });

  it('moves from entering to active after the starting style frame', async () => {
    const element = addElement();
    const focusFirstItem = vi.fn();
    const transition = createMenuViewTransition({ focusFirstItem });

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    expect(transition.input.current).toMatchObject({
      phase: 'entering',
      direction: 'forward',
      triggerId: 'trigger-1',
      transitioning: true,
    });

    await nextFrame();
    await nextFrame();

    expect(transition.input.current.phase).toBe('active');

    await nextFrame();

    expect(focusFirstItem).toHaveBeenCalledWith(element);
    expect(transition.input.current.transitioning).toBe(false);
  });

  it('keeps transitioning true until enter animations settle', async () => {
    const element = addElement();
    let resolveAnimation = () => {};
    const animationFinished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const transition = createMenuViewTransition({ waitForAnimations: () => animationFinished });

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    await nextFrame();
    await nextFrame();

    expect(transition.input.current.phase).toBe('active');
    expect(transition.input.current.transitioning).toBe(true);

    resolveAnimation();
    await Promise.resolve();
    await Promise.resolve();

    expect(transition.input.current.transitioning).toBe(false);
  });

  it('keeps transitioning true until default CSS transitions settle', async () => {
    const element = addElement();
    const getComputedStyle = window.getComputedStyle.bind(window);
    const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
      const style = getComputedStyle(target);

      if (target !== element) return style;

      return Object.assign(Object.create(style), {
        transitionDelay: '0ms',
        transitionDuration: '30ms',
      }) as CSSStyleDeclaration;
    });
    const transition = createMenuViewTransition();

    try {
      transition.setElement(element);
      transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

      await nextFrame();
      await nextFrame();

      expect(transition.input.current.phase).toBe('active');
      expect(transition.input.current.transitioning).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 40));

      expect(transition.input.current.transitioning).toBe(false);
    } finally {
      getComputedStyleSpy.mockRestore();
    }
  });

  it('focuses the first menu view item without scrolling by default', async () => {
    const element = addElement();
    const item = document.createElement('button');
    const focus = vi.fn();
    const transition = createMenuViewTransition();

    item.setAttribute('data-item', '');
    item.focus = focus;
    element.append(item);

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    await nextFrame();
    await nextFrame();
    await nextFrame();

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('waits for exit animations before hiding', async () => {
    const element = addElement();
    let resolveAnimation = () => {};
    const animationFinished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const waitForAnimations = vi.fn(() => animationFinished);
    const transition = createMenuViewTransition({ waitForAnimations });

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    await nextFrame();
    await nextFrame();

    transition.sync({ active: false, direction: 'back' });

    expect(transition.input.current.phase).toBe('exiting');

    await nextFrame();
    await nextFrame();

    expect(waitForAnimations).toHaveBeenCalledWith(element);

    resolveAnimation();
    await Promise.resolve();
    await Promise.resolve();

    expect(transition.input.current.phase).toBe('hidden');
  });

  it('restores focus after a backward exit completes', async () => {
    const element = addElement();
    let resolveAnimation = () => {};
    const animationFinished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const restoreFocus = vi.fn();
    const transition = createMenuViewTransition({
      restoreFocus,
      waitForAnimations: () => animationFinished,
    });

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    await nextFrame();
    await nextFrame();

    transition.sync({ active: false, direction: 'back' });

    await nextFrame();
    await nextFrame();

    resolveAnimation();
    await Promise.resolve();
    await Promise.resolve();

    expect(restoreFocus).toHaveBeenCalledWith('trigger-1');
  });

  it('does not restore focus after a forward exit completes', async () => {
    const element = addElement();
    let resolveAnimation = () => {};
    const animationFinished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const restoreFocus = vi.fn();
    const transition = createMenuViewTransition({
      restoreFocus,
      waitForAnimations: () => animationFinished,
    });

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    await nextFrame();
    await nextFrame();

    transition.sync({ active: false, direction: 'forward' });
    await nextFrame();

    resolveAnimation();
    await Promise.resolve();
    await Promise.resolve();

    expect(restoreFocus).not.toHaveBeenCalled();
  });

  it('ignores a stale exit completion after reopening', async () => {
    const element = addElement();
    let resolveAnimation = () => {};
    const animationFinished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const transition = createMenuViewTransition({ waitForAnimations: () => animationFinished });

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    await nextFrame();
    await nextFrame();

    transition.sync({ active: false, direction: 'back' });
    await nextFrame();
    transition.sync({ active: true, direction: 'forward', triggerId: 'trigger-1' });

    resolveAnimation();
    await Promise.resolve();
    await Promise.resolve();
    await nextFrame();
    await nextFrame();

    expect(transition.input.current.phase).toBe('active');
    expect(element.hidden).toBe(false);
  });

  it('starts at the persistent resting state', () => {
    const transition = createMenuViewTransition({ persistent: true });

    expect(transition.input.current).toEqual(PERSISTENT_MENU_VIEW_RESTING_STATE);
    expect(transition.persistent).toBe(true);
  });

  it('keeps persistent panels in the DOM with data-open at rest', () => {
    expect(getMenuViewTransitionAttrs(PERSISTENT_MENU_VIEW_RESTING_STATE, { root: true, persistent: true })).toEqual({
      'data-menu-view': '',
      'data-menu-view-id': 'root',
      'data-direction': 'forward',
      'data-open': '',
      hidden: false,
    });
  });

  it('omits data-open while a persistent panel is exiting', () => {
    expect(
      getMenuViewTransitionAttrs(
        {
          phase: 'exiting',
          direction: 'forward',
          triggerId: null,
          transitioning: true,
        },
        { root: true, persistent: true }
      )
    ).toMatchObject({
      'data-ending-style': '',
      'data-open': undefined,
      hidden: false,
    });
  });

  it('returns to hidden with persistent attrs after a persistent exit completes', async () => {
    const element = addElement();
    let resolveAnimation = () => {};
    const animationFinished = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const transition = createMenuViewTransition({
      persistent: true,
      waitForAnimations: () => animationFinished,
    });

    transition.setElement(element);
    transition.sync({ active: true, direction: 'forward', triggerId: null });

    await nextFrame();
    await nextFrame();

    transition.sync({ active: false, direction: 'forward' });
    await nextFrame();
    await nextFrame();

    resolveAnimation();
    await Promise.resolve();
    await Promise.resolve();

    expect(transition.input.current.phase).toBe('hidden');
    expect(element.hidden).toBe(false);
  });

  it('maps phase state to generic menu view transition attributes', () => {
    expect(
      getMenuViewTransitionAttrs({
        phase: 'entering',
        direction: 'forward',
        triggerId: 'trigger-1',
        transitioning: true,
      })
    ).toEqual({
      'data-menu-view': '',
      'data-direction': 'forward',
      'data-transitioning': '',
      'data-starting-style': '',
      'data-open': '',
      'data-ending-style': undefined,
      hidden: false,
    });

    expect(
      getMenuViewTransitionAttrs({
        phase: 'exiting',
        direction: 'back',
        triggerId: 'trigger-1',
        transitioning: true,
      })
    ).toEqual({
      'data-menu-view': '',
      'data-direction': 'back',
      'data-transitioning': '',
      'data-starting-style': undefined,
      'data-open': '',
      'data-ending-style': '',
      hidden: false,
    });
  });
});
