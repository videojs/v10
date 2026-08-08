import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTransition } from '../../transition';
import { createMenu, type MenuApi } from '../create-menu';
import { createMenuTransition, getMenuTransitionSize } from '../create-menu-transition';

function rect(width: number, height: number): DOMRect {
  return new DOMRect(0, 0, width, height);
}

function mockSize(element: HTMLElement, width: number, height: number): void {
  element.getBoundingClientRect = vi.fn(() => rect(width, height));
  Object.defineProperties(element, {
    scrollWidth: { configurable: true, get: () => width },
    scrollHeight: { configurable: true, get: () => height },
  });
}

function createCommittedMenu(): MenuApi {
  let menu!: MenuApi;
  menu = createMenu({
    transition: createTransition(),
    onOpenChange: (open) => menu.syncOpen(open),
    closeOnEscape: () => true,
    closeOnOutsideClick: () => true,
  });
  return menu;
}

function createControlledMenu(onOpenChange = vi.fn()): MenuApi {
  return createMenu({
    transition: createTransition(),
    onOpenChange,
    closeOnEscape: () => true,
    closeOnOutsideClick: () => true,
  });
}

async function frames(count = 2): Promise<void> {
  for (let index = 0; index < count; index++) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

describe('createMenuTransition', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  function setup(menu = createCommittedMenu()) {
    const root = document.createElement('div');
    const child = document.createElement('div');
    const trigger = document.createElement('button');
    const item = document.createElement('button');
    root.append(trigger);
    child.append(item);
    document.body.append(root, child);
    const unregisterItem = menu.registerItem(item);
    const onViewEnter = vi.fn((view) => view.menu.highlightFirstItem({ preventScroll: true }));
    const onViewExit = vi.fn();
    const controller = createMenuTransition({ onViewEnter, onViewExit });
    controller.setRootPanelElement(root);
    const view = controller.registerView(menu);
    view.setTriggerElement(trigger);
    view.setPanelElement(child);
    cleanups.push(
      unregisterItem,
      () => menu.destroy(),
      () => controller.destroy()
    );
    return { root, child, trigger, item, menu, controller, view, onViewEnter, onViewExit };
  }

  it('publishes initial panel state without mutating platform elements', () => {
    const { root, child, trigger, controller, view } = setup();

    expect(controller.rootState.current).toMatchObject({ phase: 'active', viewState: 'active', open: true });
    expect(view.state.current).toMatchObject({ phase: 'hidden', viewState: 'inactive', open: false });
    expect(root.attributes).toHaveLength(0);
    expect(child.attributes).toHaveLength(0);
    expect(trigger.attributes).toHaveLength(0);
  });

  it('measures a rendered panel without changing its DOM', () => {
    const container = document.createElement('div');
    const panel = document.createElement('div');
    container.style.setProperty('--media-menu-available-width', '200px');
    mockSize(panel, 240, 120);
    const before = panel.getAttribute('style');

    expect(getMenuTransitionSize(container, panel)).toEqual({ width: 200, height: 120 });
    expect(panel.getAttribute('style')).toBe(before);
    expect(panel.hidden).toBe(false);
  });

  it('publishes size supplied by a platform adapter', () => {
    const { controller } = setup();

    controller.setSize({ width: 220, height: 110 });

    expect(controller.size.current).toEqual({ width: 220, height: 110 });
  });

  it('keeps outgoing state live while a committed child enters', async () => {
    const { controller, view, menu } = setup();

    menu.open();
    await Promise.resolve();

    expect(controller.rootState.current).toMatchObject({ phase: 'exiting', direction: 'forward', open: true });
    expect(view.state.current).toMatchObject({ phase: 'entering', direction: 'forward', open: true });

    await frames();

    expect(controller.rootState.current.phase).toBe('hidden');
    expect(view.state.current.phase).toBe('active');
  });

  it('returns to root state and delegates focus restoration', async () => {
    const { controller, view, menu, onViewExit } = setup();
    menu.open();
    await frames();

    menu.close();
    await Promise.resolve();

    expect(controller.rootState.current).toMatchObject({ phase: 'entering', direction: 'back' });
    expect(view.state.current).toMatchObject({ phase: 'exiting', direction: 'back' });
    await frames();
    await Promise.resolve();

    expect(view.state.current.phase).toBe('hidden');
    expect(onViewExit).toHaveBeenCalledWith(view);
  });

  it('does not navigate for a rejected controlled request', async () => {
    const request = vi.fn();
    const menu = createControlledMenu(request);
    const { controller, view } = setup(menu);

    menu.open();

    expect(request).toHaveBeenCalledWith(true, { reason: 'click' });
    expect(menu.input.current.active).toBe(false);
    expect(controller.rootState.current.phase).toBe('active');
    expect(view.state.current.phase).toBe('hidden');

    menu.syncOpen(true);
    await Promise.resolve();

    expect(view.state.current.phase).toBe('entering');
  });

  it('cancels stale forward work when navigation reverses rapidly', async () => {
    const { controller, view, menu } = setup();

    menu.open();
    menu.close();
    await frames(3);

    expect(controller.rootState.current.phase).toBe('active');
    expect(view.state.current.phase).toBe('hidden');
  });

  it('shows the most recently opened controlled child and falls back when it closes', async () => {
    const firstMenu = createControlledMenu();
    const { controller, view: firstView } = setup(firstMenu);
    const secondMenu = createControlledMenu();
    const secondPanel = document.createElement('div');
    const secondView = controller.registerView(secondMenu);
    secondView.setPanelElement(secondPanel);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cleanups.push(
      () => secondView.destroy(),
      () => secondMenu.destroy()
    );

    firstMenu.syncOpen(true);
    secondMenu.syncOpen(true);
    await Promise.resolve();

    expect(controller.activeView).toBe(secondView);
    expect(secondView.state.current.viewState).toBe('active');
    expect(firstView.state.current.viewState).toBe('inactive');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Multiple controlled child menus'));

    secondMenu.syncOpen(false);
    await Promise.resolve();

    expect(controller.activeView?.menu).toBe(firstMenu);
    expect(firstView.state.current.viewState).toBe('active');
    expect(secondView.state.current.phase).toBe('hidden');
  });

  it('warns when the same child root is registered twice', () => {
    const { menu, controller, view } = setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(controller.registerView(menu)).toBe(view);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('only be registered once'));
  });
});
