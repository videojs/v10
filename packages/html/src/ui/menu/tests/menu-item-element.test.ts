import { afterEach, describe, expect, it } from 'vitest';
import { MenuItemElement } from '../menu-item-element';

if (!customElements.get(MenuItemElement.tagName)) {
  customElements.define(MenuItemElement.tagName, MenuItemElement);
}

describe('MenuItemElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('keeps setting-like attributes neutral without the optional settings integration', async () => {
    const item = document.createElement(MenuItemElement.tagName) as MenuItemElement;
    item.setAttribute('type', 'captions');
    item.commandfor = 'settings-captions-menu';
    document.body.append(item);

    await item.updateComplete;

    expect(item.getAttribute('type')).toBe('captions');
    expect(item.commandfor).toBe('settings-captions-menu');
    expect(item.hasAttribute('data-availability')).toBe(false);
    expect(item.hasAttribute('aria-disabled')).toBe(false);
  });
});
