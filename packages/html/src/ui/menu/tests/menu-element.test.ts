import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuCheckboxItemElement } from '../menu-checkbox-item-element';
import { MenuElement } from '../menu-element';
import { MenuItemElement } from '../menu-item-element';

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) customElements.define(tagName, Base);
}

defineElement(MenuElement.tagName, MenuElement);
defineElement(MenuItemElement.tagName, MenuItemElement);
defineElement(MenuCheckboxItemElement.tagName, MenuCheckboxItemElement);

async function frame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function settle(...elements: Array<MenuElement | MenuItemElement | MenuCheckboxItemElement>): Promise<void> {
  await Promise.all(elements.map((element) => element.updateComplete));
  await Promise.resolve();
  await Promise.all(elements.map((element) => element.updateComplete));
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('MenuElement', () => {
  it('opens from an external commandfor trigger and exposes the base contract', async () => {
    const trigger = document.createElement('button');
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    menu.id = 'settings';
    trigger.setAttribute('commandfor', menu.id);
    document.body.append(trigger, menu);
    await settle(menu);

    trigger.click();
    await settle(menu);

    expect(menu.open).toBe(true);
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('popover')).toBe('manual');
    expect(menu.hasAttribute('data-open')).toBe(true);
    expect(menu.hasAttribute('data-menu-view')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('publishes Menu available-size aliases from Popover positioning', async () => {
    const trigger = document.createElement('button');
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    menu.id = 'settings';
    menu.open = true;
    menu.side = 'top';
    menu.boundary = 'viewport';
    trigger.setAttribute('commandfor', menu.id);

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 10, 40, 20));
    vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 60));
    vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 200));
    Object.defineProperty(menu, 'offsetWidth', { configurable: true, value: 100 });
    Object.defineProperty(menu, 'offsetHeight', { configurable: true, value: 60 });
    Object.defineProperty(menu, 'scrollHeight', { configurable: true, value: 60 });

    document.body.append(trigger, menu);
    await settle(menu);
    await frame();

    expect(menu.getAttribute('data-side')).toBe('bottom');
    expect(menu.style.getPropertyValue('--media-menu-available-width')).toBe(
      menu.style.getPropertyValue('--media-popover-available-width')
    );
    expect(menu.style.getPropertyValue('--media-menu-available-height')).toBe(
      menu.style.getPropertyValue('--media-popover-available-height')
    );
    expect(menu.style.getPropertyValue('--media-menu-available-width')).not.toBe('');
    expect(menu.style.getPropertyValue('--media-menu-available-height')).not.toBe('');
  });

  it('allows a controlled consumer to reject an open request', async () => {
    const trigger = document.createElement('button');
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    menu.id = 'settings';
    trigger.setAttribute('commandfor', menu.id);
    menu.addEventListener('open-change', (event) => event.preventDefault());
    document.body.append(trigger, menu);
    await settle(menu);

    trigger.click();
    await settle(menu);

    expect(menu.open).toBe(false);
    expect(menu.hasAttribute('data-open')).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('commits default-open without first emitting a request', async () => {
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    const onOpenChange = vi.fn();
    menu.defaultOpen = true;
    menu.addEventListener('open-change', onOpenChange);
    document.body.append(menu);
    await settle(menu);

    expect(menu.open).toBe(true);
    expect(menu.hasAttribute('data-open')).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('honors a canceled select event before closing', async () => {
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    const item = document.createElement(MenuItemElement.tagName) as MenuItemElement;
    menu.open = true;
    item.textContent = 'Keep open';
    item.addEventListener('select', (event) => event.preventDefault());
    menu.append(item);
    document.body.append(menu);
    await settle(menu, item);

    item.click();
    await settle(menu, item);

    expect(menu.open).toBe(true);
  });

  it('closes the menu that owns an ordinary selected item', async () => {
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    const item = document.createElement(MenuItemElement.tagName) as MenuItemElement;
    menu.open = true;
    item.textContent = 'Done';
    menu.append(item);
    document.body.append(menu);
    await settle(menu, item);

    item.click();
    await settle(menu, item);
    await frame();

    expect(menu.open).toBe(false);
  });

  it('treats an unbound commandfor menu as an independent popup', async () => {
    const parent = document.createElement(MenuElement.tagName) as MenuElement;
    const child = document.createElement(MenuElement.tagName) as MenuElement;
    const item = document.createElement(MenuItemElement.tagName) as MenuItemElement;
    parent.open = true;
    child.id = 'quality';
    item.setAttribute('commandfor', child.id);
    item.textContent = 'Quality';
    parent.append(item, child);
    document.body.append(parent);
    await settle(parent, item, child);

    item.click();
    await settle(parent, item, child);

    expect(child.open).toBe(true);
    expect(child.hasAttribute('data-menu-view')).toBe(false);
    expect(child.getAttribute('popover')).toBe('manual');
  });

  it('keeps checkbox selections open', async () => {
    const menu = document.createElement(MenuElement.tagName) as MenuElement;
    const item = document.createElement(MenuCheckboxItemElement.tagName) as MenuCheckboxItemElement;
    menu.open = true;
    item.textContent = 'Autoplay';
    menu.append(item);
    document.body.append(menu);
    await settle(menu, item);

    item.click();
    await settle(menu, item);

    expect(item.checked).toBe(true);
    expect(menu.open).toBe(true);
  });
});
