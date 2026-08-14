import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import type { MediaControlsState } from '@videojs/media';
import { createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { playerContext } from '../../../player/context';
import { ControlsElement } from '../../controls/controls-element';
import { MediaElement } from '../../media-element';
import { MenuCheckboxItemElement } from '../menu-checkbox-item-element';
import { MenuElement } from '../menu-element';
import { MenuGroupElement } from '../menu-group-element';
import { MenuGroupLabelElement } from '../menu-group-label-element';
import { MenuItemElement } from '../menu-item-element';
import { MenuItemIndicatorElement } from '../menu-item-indicator-element';
import { MenuRadioGroupElement } from '../menu-radio-group-element';
import { MenuRadioItemElement } from '../menu-radio-item-element';
import { MenuSeparatorElement } from '../menu-separator-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function createControlsStore(
  requestControlsLock: MediaControlsState['requestControlsLock'] = () => () => {}
): AnyPlayerStore {
  return createStore<unknown>()<MediaControlsState>({
    name: 'controls',
    state: ({ get, set }) => {
      return {
        userActive: true,
        controlsVisible: true,
        requestControlsLock,
        toggleControls() {
          const visible = !(get().controlsVisible as boolean);

          set({ userActive: visible, controlsVisible: visible });

          return visible;
        },
      };
    },
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  readonly releaseControlsLock = vi.fn();
  readonly requestControlsLock = vi.fn(() => this.releaseControlsLock);
  store = createControlsStore(this.requestControlsLock);

  readonly #provider = new ContextProvider(this, { context: playerContext, initialValue: this.store });

  override connectedCallback(): void {
    super.connectedCallback();
    this.#provider.setValue(this.store);
  }

  setVisible(visible: boolean): void {
    const state = this.store.state as MediaControlsState;

    if (state.controlsVisible === visible) return;

    state.toggleControls();
    flush();
  }
}

class TestMetadataRadioGroupElement extends MenuRadioGroupElement {
  publish(disabled: boolean, availability: 'available' | 'unavailable'): void {
    this.publishMenuMetadata(disabled, availability);
  }
}

defineElement('test-menu-player-provider', TestPlayerProviderElement);

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function setElementSize(element: HTMLElement, width: number, height: number): void {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: width });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: height });
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width, height } as DOMRect);
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

const menuStateAttrs = ['data-open', 'data-side', 'data-align', 'data-starting-style', 'data-ending-style'] as const;

function expectNoMenuStateAttrs(element: HTMLElement): void {
  for (const attr of menuStateAttrs) {
    expect(element.hasAttribute(attr), `${element.localName} should not have ${attr}`).toBe(false);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('MenuElement', () => {
  it('initializes from defaultOpen before the first update', async () => {
    const root = createElement(MenuElement);
    root.defaultOpen = true;
    document.body.append(root);

    await root.updateComplete;

    expect(root.open).toBe(true);
    expect(root.hasAttribute('data-open')).toBe(true);
  });

  it('requests open changes with a cancelable composed event before committing them', async () => {
    const host = document.createElement('div');
    const root = createElement(MenuElement);
    const onOpenChange = vi.fn((event: Event) => event.preventDefault());

    host.addEventListener('open-change', onOpenChange);
    host.append(root);
    document.body.append(host);
    await root.updateComplete;

    root.openMenu();
    await root.updateComplete;

    const event = onOpenChange.mock.calls[0]?.[0] as CustomEvent;

    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.detail).toEqual({ open: true, reason: 'imperative-action' });
    expect(root.open).toBe(false);
    expect(root.hasAttribute('data-open')).toBe(false);
  });

  it('exposes the positioned side on root content', async () => {
    const trigger = document.createElement('button');
    const root = createElement(MenuElement);
    const item = createElement(MenuItemElement);

    root.id = 'menu';
    root.open = true;
    root.side = 'top';
    root.boundary = 'viewport';
    trigger.setAttribute('commandfor', root.id);
    item.textContent = 'Auto';
    root.append(item);

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 10, 40, 20));
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 100, 60));
    vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300, 200));
    Object.defineProperty(root, 'offsetWidth', { configurable: true, value: 100 });
    Object.defineProperty(root, 'offsetHeight', { configurable: true, value: 5 });
    Object.defineProperty(root, 'scrollHeight', { configurable: true, value: 60 });
    root.style.setProperty('--media-menu-available-height', '5px');

    document.body.append(trigger, root);
    await root.updateComplete;

    expect(root.getAttribute('data-side')).toBe('bottom');
  });

  it('scopes menu state data attributes to menu elements', async () => {
    const root = createElement(MenuElement);
    const label = createElement(MenuGroupLabelElement);
    const group = createElement(MenuGroupElement);
    const item = createElement(MenuItemElement);
    const checkboxItem = createElement(MenuCheckboxItemElement);
    const radioGroup = createElement(MenuRadioGroupElement);
    const radioItem = createElement(MenuRadioItemElement);
    const indicator = createElement(MenuItemIndicatorElement);
    const separator = createElement(MenuSeparatorElement);
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const back = createElement(MenuItemElement);
    const childItem = createElement(MenuItemElement);

    root.open = true;
    root.side = 'top';
    root.align = 'end';
    label.textContent = 'Playback';
    item.textContent = 'Copy link';
    checkboxItem.textContent = 'Autoplay';
    radioGroup.value = 'auto';
    radioItem.value = 'auto';
    radioItem.textContent = 'Auto';
    indicator.checked = true;
    trigger.id = 'child-trigger';
    trigger.setAttribute('commandfor', 'child-menu');
    trigger.textContent = 'Quality';
    child.id = 'child-menu';
    back.textContent = 'Back';
    childItem.textContent = 'Auto';

    radioItem.append(indicator);
    radioGroup.append(radioItem);
    group.append(label, item, checkboxItem, radioGroup);
    child.append(back, childItem);
    root.append(group, separator, trigger, child);
    document.body.append(root);

    await root.updateComplete;
    await label.updateComplete;
    await group.updateComplete;
    await item.updateComplete;
    await checkboxItem.updateComplete;
    await radioGroup.updateComplete;
    await radioItem.updateComplete;
    await indicator.updateComplete;
    await separator.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await back.updateComplete;
    await childItem.updateComplete;

    expect(root.hasAttribute('data-open')).toBe(true);
    expect(root.getAttribute('data-side')).toBe('top');
    expect(root.getAttribute('data-align')).toBe('end');

    for (const element of [label, group, separator, item, checkboxItem, radioGroup, radioItem, indicator, trigger]) {
      expectNoMenuStateAttrs(element);
    }

    expect(item.hasAttribute('data-item')).toBe(true);
    expect(checkboxItem.hasAttribute('data-item')).toBe(true);
    expect(radioItem.hasAttribute('data-item')).toBe(true);
    expect(trigger.hasAttribute('data-item')).toBe(true);

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;
    await back.updateComplete;
    await waitForAssertion(() => {
      expect(child.hasAttribute('data-open')).toBe(true);
    });

    expect(child.hasAttribute('data-submenu')).toBe(true);
    expect(child.hasAttribute('data-open')).toBe(true);
    expect(child.hasAttribute('data-side')).toBe(false);
    expect(child.hasAttribute('data-align')).toBe(false);
    expectNoMenuStateAttrs(back);
    expectNoMenuStateAttrs(childItem);
  });

  it('identifies nested menus', async () => {
    const root = createElement(MenuElement);
    const child = createElement(MenuElement);

    root.open = true;
    child.id = 'child-menu';

    root.append(child);
    document.body.append(root);

    await root.updateComplete;
    await child.updateComplete;

    expect(child.hasAttribute('data-submenu')).toBe(true);
    expect(child.hidden).toBe(true);
  });

  it('relays radio-group metadata to a submenu trigger', async () => {
    const root = createElement(MenuElement);
    const trigger = createElement(MenuItemElement);
    const hint = document.createElement('span');
    const child = createElement(MenuElement);
    const group = createElement(TestMetadataRadioGroupElement);
    const selectedItem = createElement(MenuRadioItemElement);
    const selectedLabel = document.createElement('span');

    root.open = true;
    trigger.setAttribute('commandfor', 'child-menu');
    hint.dataset.part = 'hint';
    child.id = 'child-menu';
    group.value = 'selected';
    selectedItem.value = 'selected';
    selectedLabel.dataset.part = 'label';
    selectedLabel.textContent = 'Selected option';

    selectedItem.append(selectedLabel);
    group.append(selectedItem);
    child.append(group);
    trigger.append(hint);
    root.append(trigger, child);
    document.body.append(root);

    await root.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await group.updateComplete;
    await selectedItem.updateComplete;

    group.publish(false, 'available');
    await child.updateComplete;

    expect(hint.textContent).toBe('Selected option');
    expect(trigger.getAttribute('data-availability')).toBe('available');
    expect(trigger.hasAttribute('aria-disabled')).toBe(false);

    group.publish(true, 'unavailable');
    await child.updateComplete;

    expect(trigger.getAttribute('data-availability')).toBe('unavailable');
    expect(trigger.getAttribute('aria-disabled')).toBe('true');

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await child.updateComplete;

    expect(child.open).toBe(false);
  });

  it('preserves an explicitly disabled submenu trigger when metadata is available', async () => {
    const root = createElement(MenuElement);
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const group = createElement(TestMetadataRadioGroupElement);

    root.open = true;
    trigger.commandfor = 'child-menu';
    trigger.disabled = true;
    child.id = 'child-menu';
    child.append(group);
    root.append(trigger, child);
    document.body.append(root);

    await root.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await group.updateComplete;

    group.publish(false, 'available');
    await child.updateComplete;

    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });

  it('resets open descendant menus when their parent closes', async () => {
    const root = createElement(MenuElement);
    const child = createElement(MenuElement);
    const grandchild = createElement(MenuElement);
    root.open = true;
    child.id = 'child-menu';
    grandchild.id = 'grandchild-menu';
    child.append(grandchild);
    root.append(child);
    document.body.append(root);
    await root.updateComplete;
    await child.updateComplete;
    await grandchild.updateComplete;

    child.openMenu();
    await child.updateComplete;
    grandchild.openMenu();
    await grandchild.updateComplete;
    expect(child.open).toBe(true);
    expect(grandchild.open).toBe(true);

    root.close();

    await waitForAssertion(() => {
      expect(child.open).toBe(false);
      expect(grandchild.open).toBe(false);
    });
  });

  it('propagates the deepest submenu size to the root menu', async () => {
    const root = createElement(MenuElement);
    const rootItems = document.createElement('div');
    const child = createElement(MenuElement);
    const childItems = document.createElement('div');
    const grandchild = createElement(MenuElement);
    const grandchildItems = document.createElement('div');
    root.open = true;
    child.id = 'child-menu';
    grandchild.id = 'grandchild-menu';
    setElementSize(rootItems, 180, 100);
    setElementSize(childItems, 200, 150);
    setElementSize(grandchildItems, 220, 240);
    grandchild.append(grandchildItems);
    child.append(childItems, grandchild);
    root.append(rootItems, child);
    document.body.append(root);
    await root.updateComplete;
    await child.updateComplete;
    await grandchild.updateComplete;

    child.openMenu();
    await child.updateComplete;
    grandchild.openMenu();
    await grandchild.updateComplete;

    await waitForAssertion(() => {
      expect(child.style.getPropertyValue('--media-menu-width')).toBe('220px');
      expect(root.style.getPropertyValue('--media-menu-width')).toBe('220px');
      expect(child.style.getPropertyValue('--media-menu-height')).toBe('240px');
      expect(root.style.getPropertyValue('--media-menu-height')).toBe('240px');
    });
  });

  it('handles keyboard navigation in the active nested menu', async () => {
    const root = createElement(MenuElement);
    const rootItems = document.createElement('div');
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const item = createElement(MenuItemElement);

    root.open = true;
    trigger.id = 'child-trigger';
    trigger.commandfor = 'child-menu';
    child.id = 'child-menu';
    item.textContent = 'Auto';

    rootItems.append(trigger);
    child.append(item);
    root.append(rootItems, child);
    document.body.append(root);

    await root.updateComplete;
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

  it('highlights the first item when a nested menu becomes active', async () => {
    const root = createElement(MenuElement);
    const rootItems = document.createElement('div');
    const trigger = createElement(MenuItemElement);
    const child = createElement(MenuElement);
    const item = createElement(MenuItemElement);

    root.open = true;
    trigger.id = 'child-trigger';
    trigger.commandfor = 'child-menu';
    child.id = 'child-menu';
    item.textContent = 'Auto';

    rootItems.append(trigger);
    child.append(item);
    root.append(rootItems, child);
    document.body.append(root);

    await root.updateComplete;
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

  it('returns to the root items when selecting an item in a nested menu', async () => {
    const root = createElement(MenuElement);
    const rootItems = document.createElement('div');
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
    rootItems.append(trigger);
    child.append(item);
    root.append(rootItems, child);
    document.body.append(root);

    await root.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await item.updateComplete;

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;
    expect(child.hasAttribute('data-starting-style')).toBe(true);
    await waitForAssertion(() => {
      expect(child.hasAttribute('data-starting-style')).toBe(false);
    });
    expect(rootItems.hasAttribute('inert')).toBe(true);
    expect(rootItems.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('data-submenu-expanded')).toBe('true');

    item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(onSelect).toHaveBeenCalledTimes(1);

    await root.updateComplete;
    await child.updateComplete;
    expect(child.hasAttribute('data-ending-style')).toBe(true);
    expect(child.hasAttribute('data-open')).toBe(true);
    expect(child.hidden).toBe(false);
    expect(root.getAttribute('data-submenu-expanded')).toBe('false');
    await waitForAssertion(() => {
      expect(child.hidden).toBe(true);
    });
    expect(rootItems.hasAttribute('inert')).toBe(false);
    expect(rootItems.hasAttribute('aria-hidden')).toBe(false);
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

  it('wires group labels to group elements with aria-labelledby', async () => {
    const root = createElement(MenuElement);
    const group = createElement(MenuGroupElement);
    const radioGroup = createElement(MenuRadioGroupElement);
    const groupLabel = createElement(MenuGroupLabelElement);
    const radioLabel = createElement(MenuGroupLabelElement);

    root.open = true;
    groupLabel.textContent = 'Playback';
    radioLabel.textContent = 'Quality';

    group.append(groupLabel);
    radioGroup.append(radioLabel);
    root.append(group, radioGroup);
    document.body.append(root);

    await root.updateComplete;
    await group.updateComplete;
    await radioGroup.updateComplete;
    await groupLabel.updateComplete;
    await radioLabel.updateComplete;

    await waitForAssertion(() => {
      expect(group.getAttribute('aria-labelledby')).toBe(groupLabel.id);
      expect(radioGroup.getAttribute('aria-labelledby')).toBe(radioLabel.id);
    });
  });

  it('lets explicit group labels override generated aria-labelledby', async () => {
    const root = createElement(MenuElement);
    const ariaLabelGroup = createElement(MenuGroupElement);
    const ariaLabelledByGroup = createElement(MenuRadioGroupElement);
    const ariaLabel = createElement(MenuGroupLabelElement);
    const ariaLabelledByLabel = createElement(MenuGroupLabelElement);

    root.open = true;
    ariaLabelGroup.setAttribute('aria-label', 'Playback');
    ariaLabelledByGroup.setAttribute('aria-labelledby', 'external-label');

    ariaLabelGroup.append(ariaLabel);
    ariaLabelledByGroup.append(ariaLabelledByLabel);
    root.append(ariaLabelGroup, ariaLabelledByGroup);
    document.body.append(root);

    await root.updateComplete;
    await ariaLabelGroup.updateComplete;
    await ariaLabelledByGroup.updateComplete;
    await ariaLabel.updateComplete;
    await ariaLabelledByLabel.updateComplete;

    await waitForAssertion(() => {
      expect(ariaLabel.id).not.toBe('');
      expect(ariaLabelledByLabel.id).not.toBe('');
    });

    expect(ariaLabelGroup.getAttribute('aria-label')).toBe('Playback');
    expect(ariaLabelGroup.hasAttribute('aria-labelledby')).toBe(false);
    expect(ariaLabelledByGroup.getAttribute('aria-labelledby')).toBe('external-label');
  });

  it('highlights pointer-entered items without moving focus', async () => {
    const root = createElement(MenuElement);
    const item = createElement(MenuItemElement);

    root.append(item);
    document.body.append(root);

    await root.updateComplete;
    await item.updateComplete;

    const focus = vi.spyOn(item, 'focus');

    item.dispatchEvent(new Event('pointerenter'));

    expect(focus).not.toHaveBeenCalled();
    expect(item.hasAttribute('data-highlighted')).toBe(true);
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

  it('returns to the root items without closing the root menu when Escape is pressed in a nested menu', async () => {
    const root = createElement(MenuElement);
    const rootItems = document.createElement('div');
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
    rootItems.append(trigger);
    child.append(item);
    root.append(rootItems, child);
    document.body.append(root);

    await root.updateComplete;
    await trigger.updateComplete;
    await child.updateComplete;
    await item.updateComplete;

    onOpenChange.mockClear();
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;
    await waitForAssertion(() => {
      expect(child.hasAttribute('data-starting-style')).toBe(false);
    });
    expect(rootItems.hasAttribute('inert')).toBe(true);

    child.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));

    await root.updateComplete;
    await child.updateComplete;
    await waitForAssertion(() => {
      expect(child.hidden).toBe(true);
    });
    expect(rootItems.hasAttribute('inert')).toBe(false);

    expect(root.open).toBe(true);
    expect(
      onOpenChange.mock.calls.some(
        ([event]) => event.target === root && (event as CustomEvent<{ open: boolean }>).detail.open === false
      )
    ).toBe(false);
  });

  it('only stops propagation for nested menu-owned keyboard events', async () => {
    const root = createElement(MenuElement);
    const rootItems = document.createElement('div');
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
    rootItems.append(trigger);
    child.append(item);
    root.append(rootItems, child);
    document.body.append(root);

    await root.updateComplete;
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

  it('stops propagation for root menu keyboard navigation', async () => {
    const wrapper = document.createElement('div');
    const root = createElement(MenuElement);
    const item = createElement(MenuItemElement);
    const onWrapperKeyDown = vi.fn();

    root.open = true;
    item.textContent = 'Auto';

    wrapper.addEventListener('keydown', onWrapperKeyDown);
    root.append(item);
    wrapper.append(root);
    document.body.append(wrapper);

    await root.updateComplete;
    await item.updateComplete;

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

    expect(onWrapperKeyDown).not.toHaveBeenCalled();
    expect(item.hasAttribute('data-highlighted')).toBe(true);

    const handled = root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );

    expect(handled).toBe(false);
    expect(onWrapperKeyDown).not.toHaveBeenCalled();

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));

    expect(onWrapperKeyDown).toHaveBeenCalledTimes(1);
  });

  it('stops propagation for root trigger keyboard navigation while open', async () => {
    const wrapper = document.createElement('div');
    const trigger = document.createElement('button');
    const root = createElement(MenuElement);
    const item = createElement(MenuItemElement);
    const onWrapperKeyDown = vi.fn();

    root.id = 'root-menu';
    root.open = true;
    trigger.setAttribute('commandfor', 'root-menu');
    item.textContent = 'Auto';

    wrapper.addEventListener('keydown', onWrapperKeyDown);
    root.append(item);
    wrapper.append(trigger, root);
    document.body.append(wrapper);

    await root.updateComplete;
    await item.updateComplete;

    const handled = trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })
    );

    expect(handled).toBe(false);
    expect(onWrapperKeyDown).not.toHaveBeenCalled();

    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));

    expect(onWrapperKeyDown).not.toHaveBeenCalled();
    expect(item.hasAttribute('data-highlighted')).toBe(true);
  });

  it('closes an open root menu when parent controls hide', async () => {
    const provider = document.createElement('test-menu-player-provider') as TestPlayerProviderElement;
    const controls = createElement(ControlsElement);
    const trigger = document.createElement('button');
    const root = createElement(MenuElement);
    const item = createElement(MenuItemElement);
    const onOpenChange = vi.fn();
    const focus = vi.spyOn(trigger, 'focus');

    root.id = 'root-menu';
    root.open = true;
    trigger.setAttribute('commandfor', 'root-menu');
    item.textContent = 'Auto';

    root.addEventListener('open-change', onOpenChange);
    root.append(item);
    controls.append(trigger, root);
    document.body.append(provider);
    provider.append(controls);

    await controls.updateComplete;
    await root.updateComplete;
    await item.updateComplete;

    provider.setVisible(false);

    await waitForAssertion(() => {
      expect(root.open).toBe(false);
    });

    expect(onOpenChange).toHaveBeenCalledWith(
      expect.objectContaining({ detail: expect.objectContaining({ open: false, reason: 'imperative-action' }) })
    );
    expect(focus).not.toHaveBeenCalled();
  });

  it('holds a controls visibility lock while a root menu is open', async () => {
    const provider = document.createElement('test-menu-player-provider') as TestPlayerProviderElement;
    const root = createElement(MenuElement);

    root.open = true;
    provider.append(root);
    document.body.append(provider);

    await root.updateComplete;

    expect(root.hasAttribute('data-open')).toBe(true);

    await waitForAssertion(() => {
      expect(provider.requestControlsLock).toHaveBeenCalledTimes(1);
    });

    root.open = false;
    await root.updateComplete;

    await waitForAssertion(() => {
      expect(provider.releaseControlsLock).toHaveBeenCalledTimes(1);
    });
  });
});
