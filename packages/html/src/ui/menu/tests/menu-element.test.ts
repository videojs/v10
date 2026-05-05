import { afterEach, describe, expect, it } from 'vitest';

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
});
