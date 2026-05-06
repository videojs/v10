import { afterEach, describe, expect, it, vi } from 'vitest';

import { MenuCheckboxItemElement } from '../menu-checkbox-item-element';
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

  it('returns to the parent view when selecting an item in a nested menu', async () => {
    const root = createElement(MenuElement);
    const rootView = createElement(MenuViewElement);
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const item = createElement(MenuItemElement);
    const onSelect = vi.fn();

    root.open = true;
    trigger.id = 'child-trigger';
    trigger.commandfor = 'child-menu';
    child.id = 'child-menu';
    item.textContent = 'Auto';

    item.addEventListener('select', onSelect);
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
      expect(child.getAttribute('data-menu-view-state')).toBe('active');
    });

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(onSelect).toHaveBeenCalledTimes(1);

    await root.updateComplete;
    await child.updateComplete;
    await waitForAssertion(() => {
      expect(child.getAttribute('data-menu-view-state')).toBe('inactive');
    });
  });

  it('keeps the menu open when a checkbox item is toggled', async () => {
    const root = createElement(MenuElement);
    const checkbox = createElement(MenuCheckboxItemElement);
    const onCheckedChange = vi.fn();
    const onOpenChange = vi.fn();

    root.open = true;
    checkbox.textContent = 'Autoplay';

    checkbox.addEventListener('checked-change', onCheckedChange);
    root.addEventListener('open-change', onOpenChange);
    root.append(checkbox);
    document.body.append(root);

    await root.updateComplete;
    await checkbox.updateComplete;
    onOpenChange.mockClear();

    checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(checkbox.checked).toBe(true);
    expect(onCheckedChange).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ checked: true }) })
    );
    expect(root.open).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ open: false }) })
    );
  });

  it('closes when focus moves outside the root menu', async () => {
    const root = createElement(MenuElement);
    const item = createElement(MenuItemElement);
    const outside = document.createElement('button');
    const onOpenChange = vi.fn();

    root.open = true;
    item.textContent = 'Auto';

    root.addEventListener('open-change', onOpenChange);
    root.append(item);
    document.body.append(root, outside);

    await root.updateComplete;
    await item.updateComplete;
    onOpenChange.mockClear();

    root.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));

    await root.updateComplete;

    expect(root.open).toBe(false);
    expect(onOpenChange).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ open: false, reason: 'blur' }) })
    );
  });

  it('returns to the parent view without closing the root menu when Escape is pressed in a nested menu', async () => {
    const root = createElement(MenuElement);
    const rootView = createElement(MenuViewElement);
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const item = createElement(MenuItemElement);
    const onOpenChange = vi.fn();

    root.open = true;
    trigger.id = 'child-trigger';
    trigger.commandfor = 'child-menu';
    child.id = 'child-menu';
    item.textContent = 'Auto';

    root.addEventListener('open-change', onOpenChange);
    rootView.append(trigger);
    child.append(item);
    root.append(rootView, child);
    document.body.append(root);

    await root.updateComplete;
    await rootView.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await item.updateComplete;

    onOpenChange.mockClear();
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;
    await waitForAssertion(() => {
      expect(child.getAttribute('data-menu-view-state')).toBe('active');
    });

    child.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;
    await waitForAssertion(() => {
      expect(child.getAttribute('data-menu-view-state')).toBe('inactive');
    });

    expect(root.open).toBe(true);
    expect(onOpenChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ open: false }) })
    );
  });

  it('allows Escape from an inactive sibling nested menu to close the root menu', async () => {
    const root = createElement(MenuElement);
    const rootView = createElement(MenuViewElement);
    const qualityTrigger = createElement(MenuItemElement);
    const speedTrigger = createElement(MenuItemElement);
    const quality = createElement(MenuElement);
    const speed = createElement(MenuElement);
    const qualityItem = createElement(MenuItemElement);
    const speedItem = createElement(MenuItemElement);
    const onOpenChange = vi.fn();

    root.open = true;
    qualityTrigger.id = 'quality-trigger';
    qualityTrigger.commandfor = 'quality-menu';
    speedTrigger.id = 'speed-trigger';
    speedTrigger.commandfor = 'speed-menu';
    quality.id = 'quality-menu';
    speed.id = 'speed-menu';
    qualityItem.textContent = 'Auto';
    speedItem.textContent = 'Normal';

    root.addEventListener('open-change', onOpenChange);
    rootView.append(qualityTrigger, speedTrigger);
    quality.append(qualityItem);
    speed.append(speedItem);
    root.append(rootView, quality, speed);
    document.body.append(root);

    await root.updateComplete;
    await rootView.updateComplete;
    await qualityTrigger.updateComplete;
    await speedTrigger.updateComplete;
    await quality.updateComplete;
    await speed.updateComplete;
    await qualityItem.updateComplete;
    await speedItem.updateComplete;
    onOpenChange.mockClear();

    qualityTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await quality.updateComplete;
    await waitForAssertion(() => {
      expect(quality.getAttribute('data-menu-view-state')).toBe('active');
    });

    speedTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    quality.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    await root.updateComplete;
    await quality.updateComplete;
    await speed.updateComplete;
    await waitForAssertion(() => {
      expect(root.open).toBe(false);
      expect(onOpenChange).toHaveBeenCalledWith(
        expect.objectContaining({ detail: expect.objectContaining({ open: false, reason: 'escape' }) })
      );
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
