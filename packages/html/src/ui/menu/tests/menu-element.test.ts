import { afterEach, describe, expect, it, vi } from 'vitest';

import { MenuElement } from '../menu-element';
import { MenuItemElement } from '../menu-item-element';
import { MenuViewElement } from '../menu-view-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForAssertion(assertion: () => void): Promise<void> {
  let error: unknown;

  for (let index = 0; index < 10; index++) {
    try {
      assertion();
      return;
    } catch (caught) {
      error = caught;
      await nextFrame();
    }
  }

  throw error;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MenuElement', () => {
  it('marks root and nested menu views with generic view attributes', async () => {
    const root = createElement(MenuElement);
    const rootView = createElement(MenuViewElement);
    const child = createElement(MenuElement);

    root.open = true;
    child.id = 'child-menu';

    rootView.append(child);
    root.append(rootView);
    document.body.append(root);

    await root.updateComplete;
    await rootView.updateComplete;
    await child.updateComplete;

    expect(root.hasAttribute('data-menu-viewport')).toBe(true);
    expect(rootView.hasAttribute('data-menu-root-view')).toBe(true);
    expect(rootView.hasAttribute('data-menu-view')).toBe(true);
    expect(child.hasAttribute('data-menu-view')).toBe(true);
    expect(child.getAttribute('data-menu-view-state')).toBe('inactive');
    expect(child.hasAttribute('data-submenu')).toBe(true);
  });

  it('handles keyboard navigation in the active nested menu view', async () => {
    const root = createElement(MenuElement);
    const rootView = createElement(MenuViewElement);
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const item = createElement(MenuItemElement);

    root.open = true;
    trigger.id = 'child-trigger';
    trigger.commandfor = 'child-menu';
    child.id = 'child-menu';
    item.textContent = 'Auto';

    rootView.append(trigger);
    child.append(item);
    root.append(rootView, child);
    document.body.append(root);

    await root.updateComplete;
    await rootView.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await item.updateComplete;

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;

    child.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

    expect(item.hasAttribute('data-highlighted')).toBe(true);
    expect(trigger.hasAttribute('data-highlighted')).toBe(false);
  });

  it('highlights the first item when a nested menu view becomes active', async () => {
    const root = createElement(MenuElement);
    const rootView = createElement(MenuViewElement);
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const item = createElement(MenuItemElement);

    root.open = true;
    trigger.id = 'child-trigger';
    trigger.commandfor = 'child-menu';
    child.id = 'child-menu';
    item.textContent = 'Auto';

    rootView.append(trigger);
    child.append(item);
    root.append(rootView, child);
    document.body.append(root);

    await root.updateComplete;
    await rootView.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await item.updateComplete;

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;
    await waitForAssertion(() => {
      expect(item.hasAttribute('data-highlighted')).toBe(true);
    });
  });

  it('only stops propagation for nested menu-owned keyboard events', async () => {
    const root = createElement(MenuElement);
    const rootView = createElement(MenuViewElement);
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const item = createElement(MenuItemElement);
    const onRootKeyDown = vi.fn();

    root.open = true;
    trigger.id = 'child-trigger';
    trigger.commandfor = 'child-menu';
    child.id = 'child-menu';
    item.textContent = 'Auto';

    root.addEventListener('keydown', onRootKeyDown);
    rootView.append(trigger);
    child.append(item);
    root.append(rootView, child);
    document.body.append(root);

    await root.updateComplete;
    await rootView.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await item.updateComplete;

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;

    child.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(onRootKeyDown).not.toHaveBeenCalled();

    child.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(onRootKeyDown).toHaveBeenCalledTimes(1);
  });
});
