import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuItemDataAttrs } from '../../../../core/ui/menu/menu-item-data-attrs';
import type { UIFocusEvent, UIKeyboardEvent } from '../../event';
import { createPopupGroup, type PopupGroup, resetSharedMenuPopupGroupForTests } from '../../popover/popup-group';
import { createTransition } from '../../transition';
import { completeMenuItemSelection, createMenu, getRootPositionOptions, isMenuNavigationKey } from '../create-menu';
import { createMenuViewTransition, PERSISTENT_MENU_VIEW_RESTING_STATE } from '../create-menu-view-transition';
import { cleanupElement, createItemElement, createTestMenu } from './create-menu-helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeyEvent(key: string, modifiers?: Partial<UIKeyboardEvent>): UIKeyboardEvent {
  return {
    key,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: document.body,
    currentTarget: document.body,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...modifiers,
  };
}

function makeFocusEvent(relatedTarget: EventTarget | null): UIFocusEvent {
  return {
    relatedTarget,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createMenu', () => {
  let items: HTMLButtonElement[] = [];

  beforeEach(() => {
    resetSharedMenuPopupGroupForTests();
    items = [];
  });

  afterEach(() => {
    for (const item of items) cleanupElement(item);
    items = [];
  });

  function addItem(text: string): HTMLButtonElement {
    const element = createItemElement(text);
    items.push(element);
    return element;
  }

  it('starts closed', () => {
    const { menu } = createTestMenu();
    expect(menu.input.current).toEqual({ active: false, status: 'idle', transitioning: false });
  });

  // -------------------------------------------------------------------------
  // open / close
  // -------------------------------------------------------------------------

  describe('open/close', () => {
    it('opens and calls onOpenChange', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.open();

      expect(menu.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: 'click' });
    });

    it('transitions to starting status when opening', () => {
      const { menu } = createTestMenu();

      menu.open();

      expect(menu.input.current).toEqual({ active: true, status: 'starting', transitioning: true });
    });

    it('closes and calls onOpenChange', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.open();
      onOpenChange.mockClear();

      menu.close();

      expect(menu.input.current.active).toBe(true); // stays active during close animation
      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'click' });
    });

    it('clears submenu navigation only after close animation completes', async () => {
      const onOpenChangeComplete = vi.fn();
      const { menu } = createTestMenu({ onOpenChangeComplete });

      menu.open();
      menu.push('sub-id', 'trigger-id');
      menu.close();

      expect(menu.navigationInput.current.stack).toEqual([{ menuId: 'sub-id', triggerId: 'trigger-id' }]);

      await vi.waitFor(() => expect(onOpenChangeComplete).toHaveBeenCalledWith(false));

      expect(menu.navigationInput.current.stack).toEqual([]);
      expect(menu.navigationInput.current.direction).toBe('forward');
    });

    it('syncs viewport size when opening after the root view connects later than the menu host', async () => {
      const { menu } = createTestMenu();
      const content = document.createElement('div');
      const rootView = document.createElement('div');

      content.style.setProperty('min-width', '11rem');
      document.body.append(content);
      menu.setContentElement(content);

      expect(content.style.getPropertyValue('--media-menu-width')).toBe('');
      expect(content.style.getPropertyValue('--media-menu-height')).toBe('');

      rootView.setAttribute('data-menu-view', '');
      rootView.setAttribute('data-menu-view-id', 'root');
      rootView.textContent = 'Speed\nCaptions';

      function isMeasuringOpenRoot(): boolean {
        return (
          rootView.hasAttribute('data-open') &&
          rootView.style.getPropertyValue('display') === 'block' &&
          rootView.style.getPropertyValue('width') === 'max-content'
        );
      }

      rootView.getBoundingClientRect = vi.fn(() =>
        isMeasuringOpenRoot()
          ? { width: 180, height: 74, top: 0, left: 0, right: 180, bottom: 74, x: 0, y: 0, toJSON: () => ({}) }
          : { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) }
      );

      Object.defineProperty(rootView, 'scrollWidth', {
        configurable: true,
        get: () => (isMeasuringOpenRoot() ? 180 : 0),
      });

      Object.defineProperty(rootView, 'scrollHeight', {
        configurable: true,
        get: () => (isMeasuringOpenRoot() ? 74 : 0),
      });

      content.append(rootView);

      menu.open();

      await vi.waitFor(() => {
        expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
        expect(content.style.getPropertyValue('--media-menu-height')).toBe('74px');
      });

      menu.setContentElement(null);
      menu.destroy();
      content.remove();
    });

    it('resets the root panel transition after close when a submenu was open', async () => {
      const onOpenChangeComplete = vi.fn();
      const { menu } = createTestMenu({ onOpenChangeComplete });
      const content = document.createElement('div');
      const rootView = document.createElement('div');

      rootView.setAttribute('data-menu-view', '');
      rootView.setAttribute('data-menu-view-id', 'root');
      content.append(rootView);
      document.body.append(content);

      const submenuView = document.createElement('div');
      submenuView.setAttribute('data-menu-view', '');
      const submenuTransition = createMenuViewTransition();

      menu.open();
      menu.setContentElement(content);
      const unbindSubmenu = menu.registerSubmenuView(submenuView, submenuTransition);

      menu.push('sub-id', 'trigger-id');
      submenuTransition.sync({ active: true, direction: 'forward', triggerId: 'trigger-id' });

      expect(menu.rootViewTransitionInput?.current.phase).not.toBe('hidden');

      menu.close();

      await vi.waitFor(() => expect(onOpenChangeComplete).toHaveBeenCalledWith(false));

      expect(menu.rootViewTransitionInput?.current).toEqual(PERSISTENT_MENU_VIEW_RESTING_STATE);

      unbindSubmenu();
      menu.setContentElement(null);
      menu.destroy();
      content.remove();
    });

    it('does not open when already open', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.open();
      onOpenChange.mockClear();

      menu.open();

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('does not close when already closed', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.close();

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('closes the previously open root menu when another opens (document-wide default group)', () => {
      const onFirst = vi.fn();
      const onSecond = vi.fn();
      const first = createMenu({
        transition: createTransition(),
        onOpenChange: onFirst,
        closeOnEscape: () => true,
        closeOnOutsideClick: () => true,
      });
      const second = createMenu({
        transition: createTransition(),
        onOpenChange: onSecond,
        closeOnEscape: () => true,
        closeOnOutsideClick: () => true,
      });

      first.open();
      onFirst.mockClear();

      second.open();

      expect(onFirst).toHaveBeenCalledWith(false, { reason: 'group-open' });
      expect(onSecond).toHaveBeenCalledWith(true, { reason: 'click' });
    });

    it('re-evaluates group resolver so menus join a later explicit PopupGroup', async () => {
      resetSharedMenuPopupGroupForTests();
      const explicit = createPopupGroup();
      let groupRef: PopupGroup | undefined;

      const onA = vi.fn();
      const onB = vi.fn();

      const first = createMenu({
        transition: createTransition(),
        onOpenChange: onA,
        closeOnEscape: () => true,
        closeOnOutsideClick: () => true,
        group: () => groupRef,
      });
      const second = createMenu({
        transition: createTransition(),
        onOpenChange: onB,
        closeOnEscape: () => true,
        closeOnOutsideClick: () => true,
        group: () => groupRef,
      });

      const t1 = document.createElement('button');
      const c1 = document.createElement('div');
      const t2 = document.createElement('button');
      const c2 = document.createElement('div');
      first.setTriggerElement(t1);
      first.setContentElement(c1);
      second.setTriggerElement(t2);
      second.setContentElement(c2);

      first.open();
      onA.mockClear();
      second.open();

      expect(onA).toHaveBeenCalledWith(false, { reason: 'group-open' });

      second.close();
      await vi.waitFor(() => expect(second.input.current.active).toBe(false));

      onA.mockClear();
      onB.mockClear();

      groupRef = explicit;

      first.open();
      second.open();

      expect(onA).toHaveBeenCalledWith(false, { reason: 'group-open' });

      first.destroy();
      second.destroy();
    });

    it('does not auto-close across different explicit PopupGroups', () => {
      const g1 = createPopupGroup();
      const g2 = createPopupGroup();
      const first = createTestMenu({ group: () => g1 });
      const second = createTestMenu({ group: () => g2 });

      first.menu.open();
      first.onOpenChange.mockClear();

      second.menu.open();

      expect(first.onOpenChange).not.toHaveBeenCalled();
      expect(first.menu.input.current.active).toBe(true);
      expect(second.menu.input.current.active).toBe(true);
    });

    it('closes the previously open root menu when another opens with the same explicit PopupGroup', () => {
      const group = createPopupGroup();
      const first = createTestMenu({ group: () => group });
      const second = createTestMenu({ group: () => group });

      first.menu.open();
      first.onOpenChange.mockClear();

      second.menu.open();

      expect(first.onOpenChange).toHaveBeenCalledWith(false, { reason: 'group-open' });
      expect(second.onOpenChange).toHaveBeenCalledWith(true, { reason: 'click' });
    });

    it('does not restore trigger focus after blur close', async () => {
      const { menu } = createTestMenu();
      const t1 = document.createElement('button');
      document.body.appendChild(t1);

      menu.setTriggerElement(t1);
      menu.open();
      menu.close('blur');

      const focusSpy = vi.spyOn(t1, 'focus');

      await vi.waitFor(() => expect(menu.input.current.active).toBe(false));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      expect(focusSpy).not.toHaveBeenCalled();

      menu.destroy();
      t1.remove();
    });

    it('restores trigger focus after outside-click close', async () => {
      const { menu } = createTestMenu();
      const t1 = document.createElement('button');
      document.body.appendChild(t1);
      menu.setTriggerElement(t1);
      menu.open();
      menu.close('outside-click');

      const focusSpy = vi.spyOn(t1, 'focus');

      await vi.waitFor(() => expect(menu.input.current.active).toBe(false));
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      await vi.waitFor(() => expect(focusSpy).toHaveBeenCalledTimes(1));

      menu.destroy();
      t1.remove();
    });

    it('highlights the first DOM item when items register after opening', () => {
      vi.useFakeTimers();

      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');

      menu.open();
      menu.registerItem(b);
      menu.registerItem(a);

      vi.runAllTimers();

      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');

      vi.useRealTimers();
    });

    it('highlights the checked item when opening', () => {
      vi.useFakeTimers();

      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      b.setAttribute('aria-checked', 'true');

      menu.registerItem(a);
      menu.registerItem(b);
      menu.open();

      vi.runAllTimers();

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
      expect(a.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(false);

      vi.useRealTimers();
    });

    it('highlights the checked item when items register after opening', () => {
      vi.useFakeTimers();

      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      b.setAttribute('aria-checked', 'true');

      menu.open();
      menu.registerItem(a);
      menu.registerItem(b);

      vi.runAllTimers();

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
      expect(a.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(false);

      vi.useRealTimers();
    });

    it('highlights the selected item when opening', () => {
      vi.useFakeTimers();

      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      b.setAttribute('aria-selected', 'true');

      menu.registerItem(a);
      menu.registerItem(b);
      menu.open();

      vi.runAllTimers();

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
      expect(a.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(false);

      vi.useRealTimers();
    });

    it('closes when focus moves outside the menu and trigger', () => {
      const { menu, onOpenChange } = createTestMenu();
      const trigger = document.createElement('button');
      const content = document.createElement('div');
      const outside = document.createElement('button');

      menu.setTriggerElement(trigger);
      menu.setContentElement(content);
      menu.open();
      onOpenChange.mockClear();

      menu.contentProps.onFocusOut(makeFocusEvent(outside));

      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'blur' });
    });

    it('peer root can open after first loses focus to the peer trigger without closing the peer', () => {
      const { menu: menuA, onOpenChange: onA } = createTestMenu();
      const { menu: menuB, onOpenChange: onB } = createTestMenu();

      const aT = document.createElement('button');
      const aC = document.createElement('div');
      const subItem = document.createElement('button');
      aC.appendChild(subItem);
      const bT = document.createElement('button');
      const bC = document.createElement('div');
      document.body.append(aT, aC, bT, bC);

      menuA.setTriggerElement(aT);
      menuA.setContentElement(aC);
      menuB.setTriggerElement(bT);
      menuB.setContentElement(bC);

      menuA.open();
      menuA.registerItem(subItem);
      subItem.focus();

      onA.mockClear();
      onB.mockClear();

      menuA.contentProps.onFocusOut(makeFocusEvent(bT));
      menuB.open('click');
      bT.focus();

      expect(onA).toHaveBeenCalledWith(false, { reason: 'blur' });
      expect(onB).toHaveBeenCalledWith(true, { reason: 'click' });
      expect(onB).not.toHaveBeenCalledWith(false, expect.anything());

      menuA.destroy();
      menuB.destroy();
      aT.remove();
      aC.remove();
      bT.remove();
      bC.remove();
    });

    it('keeps the menu open when focus moves inside the menu', () => {
      const { menu, onOpenChange } = createTestMenu();
      const content = document.createElement('div');
      const child = document.createElement('button');

      content.append(child);
      menu.setContentElement(content);
      menu.open();
      onOpenChange.mockClear();

      menu.contentProps.onFocusOut(makeFocusEvent(child));

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('keeps the menu open when focus returns to the trigger', () => {
      const { menu, onOpenChange } = createTestMenu();
      const trigger = document.createElement('button');
      const content = document.createElement('div');

      menu.setTriggerElement(trigger);
      menu.setContentElement(content);
      menu.open();
      onOpenChange.mockClear();

      menu.contentProps.onFocusOut(makeFocusEvent(trigger));

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('completeMenuItemSelection', () => {
    it('closes the menu when selection happens in a root menu', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.open();
      onOpenChange.mockClear();

      completeMenuItemSelection(menu);

      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'click' });
    });

    it('pops the parent menu when selection happens in a submenu', () => {
      const { menu } = createTestMenu();
      const { menu: parentMenu, onOpenChange: parentOpenChange } = createTestMenu();

      parentMenu.open();
      parentOpenChange.mockClear();
      parentMenu.push('quality-menu', 'quality-trigger');

      completeMenuItemSelection(menu, parentMenu);

      expect(parentMenu.navigationInput.current.stack).toEqual([]);
      expect(parentMenu.navigationInput.current.direction).toBe('back');
      expect(parentOpenChange).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // triggerProps
  // -------------------------------------------------------------------------

  describe('triggerProps', () => {
    it('opens on click when closed', () => {
      const { menu, onOpenChange } = createTestMenu();
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as UIEvent;

      menu.triggerProps.onClick(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(menu.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    });

    it('closes on click when open', () => {
      const { menu, onOpenChange } = createTestMenu();
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as UIEvent;

      menu.open();
      onOpenChange.mockClear();

      menu.triggerProps.onClick(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
    });

    it('defers reopen until close settles when trigger is clicked during close animation', async () => {
      const { menu, onOpenChange } = createTestMenu();
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as UIEvent;

      menu.open();
      menu.close();
      onOpenChange.mockClear();

      menu.triggerProps.onClick(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(menu.input.current.active).toBe(true);
      expect(menu.input.current.status).toBe('ending');
      expect(onOpenChange).not.toHaveBeenCalled();

      await vi.waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
      });

      expect(menu.input.current.active).toBe(true);
      expect(menu.input.current.status).not.toBe('ending');
    });

    it('does not focus the trigger after deferred reopen when the close animation completes', async () => {
      const { menu } = createTestMenu();
      const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as UIEvent;
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      const item = addItem('Alpha');
      menu.registerItem(item);

      menu.setTriggerElement(trigger);
      const focusSpy = vi.spyOn(trigger, 'focus');

      menu.open();
      menu.close();
      menu.triggerProps.onClick(event);

      await vi.waitFor(() => {
        expect(menu.input.current.active).toBe(true);
        expect(menu.input.current.status).not.toBe('ending');
      });

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 0);
          });
        });
      });

      expect(focusSpy).not.toHaveBeenCalled();
      expect(item.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(true);

      menu.destroy();
      trigger.remove();
    });

    it('handles navigation keys while the open trigger has focus', () => {
      const { menu } = createTestMenu();
      const element = addItem('Auto');
      menu.registerItem(element);
      menu.open();

      const event = makeKeyEvent('ArrowDown');
      menu.triggerProps.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(element.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(true);
    });

    it('swallows left and right keys while the menu is open', () => {
      const { menu } = createTestMenu();
      menu.open();

      const event = makeKeyEvent('ArrowRight');
      menu.triggerProps.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('lets Escape bubble while the menu is open', () => {
      const { menu } = createTestMenu();
      menu.open();

      const event = makeKeyEvent('Escape');
      menu.triggerProps.onKeyDown(event);

      expect(event.stopPropagation).not.toHaveBeenCalled();
    });

    it('lets navigation keys bubble while the menu is closed', () => {
      const { menu } = createTestMenu();

      const event = makeKeyEvent('ArrowRight');
      menu.triggerProps.onKeyDown(event);

      expect(event.stopPropagation).not.toHaveBeenCalled();
    });

    it('does not restore focus after imperative close', async () => {
      const { menu } = createTestMenu();
      const trigger = document.createElement('button');
      const focus = vi.spyOn(trigger, 'focus');

      menu.setTriggerElement(trigger);
      menu.open();
      menu.close('imperative-action');

      await vi.waitFor(() => {
        expect(menu.input.current.active).toBe(false);
      });

      expect(focus).not.toHaveBeenCalled();
    });

    it('does not restore focus when opening a second root menu leaves the first open', async () => {
      const first = createTestMenu();
      const second = createTestMenu();
      const trigger = document.createElement('button');
      const focus = vi.spyOn(trigger, 'focus');

      first.menu.setTriggerElement(trigger);
      first.menu.open();
      second.menu.open();

      await vi.waitFor(() => {
        expect(second.menu.input.current.active).toBe(true);
      });

      expect(first.menu.input.current.active).toBe(true);
      expect(focus).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // registerItem
  // -------------------------------------------------------------------------

  describe('registerItem', () => {
    it('sets tabIndex to -1 on registration', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');

      menu.registerItem(element);

      expect(element.tabIndex).toBe(-1);
    });

    it('sets data-item attribute on registration', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');

      menu.registerItem(element);

      expect(element.hasAttribute(MenuItemDataAttrs.item)).toBe(true);
    });

    it('removes item from navigation on cleanup', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');

      const cleanup = menu.registerItem(a);
      menu.registerItem(b);
      menu.open();
      menu.highlight(a);

      cleanup();

      // After cleanup, a is no longer in the set — ArrowDown should wrap to b
      const event = makeKeyEvent('ArrowDown');
      menu.contentProps.onKeyDown(event);

      expect(menu.input.current.active).toBe(true); // still open
    });

    it('removes highlight DOM state when highlighted item is unregistered', () => {
      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');

      const cleanup = menu.registerItem(element);
      menu.highlight(element);
      onHighlightChange.mockClear();

      cleanup();

      expect(element.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(false);
      expect(element.tabIndex).toBe(-1);
      expect(onHighlightChange).toHaveBeenCalledWith(null);
    });
  });

  // -------------------------------------------------------------------------
  // highlight
  // -------------------------------------------------------------------------

  describe('highlight', () => {
    it('sets data-highlighted attribute and tabIndex=0 on highlighted item', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      menu.highlight(element);

      expect(element.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
      expect(element.tabIndex).toBe(0);
    });

    it('removes data-highlighted and resets tabIndex on previously highlighted item', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);

      menu.highlight(a);
      menu.highlight(b);

      expect(a.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(false);
      expect(a.tabIndex).toBe(-1);
      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('calls onHighlightChange with the new element', () => {
      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      menu.highlight(element);

      expect(onHighlightChange).toHaveBeenCalledWith(element);
    });

    it('calls onHighlightChange with null when cleared', () => {
      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      menu.highlight(element);
      onHighlightChange.mockClear();

      menu.highlight(null);

      expect(onHighlightChange).toHaveBeenCalledWith(null);
    });

    it('is a no-op when same item is already highlighted', () => {
      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      menu.highlight(element);
      onHighlightChange.mockClear();

      menu.highlight(element);

      expect(onHighlightChange).not.toHaveBeenCalled();
    });

    it('can focus the same item that is already highlighted', () => {
      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      const focus = vi.spyOn(element, 'focus');
      menu.registerItem(element);
      menu.highlight(element, { focus: false });
      onHighlightChange.mockClear();

      menu.highlight(element);

      expect(focus).toHaveBeenCalledTimes(1);
      expect(onHighlightChange).not.toHaveBeenCalled();
    });

    it('highlights the first item in DOM order', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(b);
      menu.registerItem(a);

      menu.highlightFirstItem();

      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
      expect(b.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(false);
    });

    it('can highlight the first item without scrolling it into view', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      const focus = vi.spyOn(element, 'focus');
      menu.registerItem(element);

      menu.highlightFirstItem({ preventScroll: true });

      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it('can highlight an item without moving focus', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      const focus = vi.spyOn(element, 'focus');
      menu.registerItem(element);

      menu.highlight(element, { focus: false });

      expect(element.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
      expect(focus).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // contentProps — keyboard navigation
  // -------------------------------------------------------------------------

  describe('contentProps.onKeyDown', () => {
    it('ArrowDown highlights first item when nothing highlighted', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown'));

      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('ArrowDown follows DOM order when items register out of order', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(b);
      menu.registerItem(a);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown'));

      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('ArrowDown advances to next item', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.highlight(a);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown'));

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('ArrowDown wraps from last to first', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.highlight(b);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown'));

      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('ArrowDown uses the focused item as the origin when hover highlight differs', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      const c = addItem('Gamma');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.registerItem(c);
      menu.highlight(c, { focus: false });
      a.focus();

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown', { target: a }));

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
      expect(c.hasAttribute(MenuItemDataAttrs.highlighted)).toBe(false);
    });

    it('ArrowUp highlights last item when nothing highlighted', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowUp'));

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('ArrowUp moves to previous item', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.highlight(b);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowUp'));

      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('ArrowUp wraps from first to last', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.highlight(a);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowUp'));

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('Home highlights first item', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      const c = addItem('Gamma');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.registerItem(c);
      menu.highlight(c);

      menu.contentProps.onKeyDown(makeKeyEvent('Home'));

      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('End highlights last item', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      const c = addItem('Gamma');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.registerItem(c);
      menu.highlight(a);

      menu.contentProps.onKeyDown(makeKeyEvent('End'));

      expect(c.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('Enter calls click on highlighted item', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      const onClick = vi.fn();
      element.addEventListener('click', onClick);
      menu.registerItem(element);
      menu.highlight(element);

      menu.contentProps.onKeyDown(makeKeyEvent('Enter'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('Enter activates the focused item when hover highlight differs', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      const c = addItem('Gamma');
      const onFocusedClick = vi.fn();
      const onHighlightedClick = vi.fn();
      a.addEventListener('click', onFocusedClick);
      c.addEventListener('click', onHighlightedClick);
      menu.registerItem(a);
      menu.registerItem(b);
      menu.registerItem(c);
      menu.highlight(c, { focus: false });
      a.focus();

      menu.contentProps.onKeyDown(makeKeyEvent('Enter', { target: a }));

      expect(onFocusedClick).toHaveBeenCalledTimes(1);
      expect(onHighlightedClick).not.toHaveBeenCalled();
    });

    it('Space calls click on highlighted item', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      const onClick = vi.fn();
      element.addEventListener('click', onClick);
      menu.registerItem(element);
      menu.highlight(element);

      menu.contentProps.onKeyDown(makeKeyEvent(' '));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('ArrowDown calls preventDefault', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      const event = makeKeyEvent('ArrowDown');
      menu.contentProps.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('does nothing when no items are registered', () => {
      const { menu } = createTestMenu();

      expect(() => menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown'))).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Submenu navigation
  // -------------------------------------------------------------------------

  describe('submenu navigation', () => {
    it('pushes and pops submenu entries', () => {
      const { menu } = createTestMenu();

      menu.push('quality-menu', 'quality-trigger');
      menu.pop();

      expect(menu.navigationInput.current).toEqual({ stack: [], direction: 'back' });
    });

    it('ignores duplicate pushes for the active submenu', () => {
      const { menu } = createTestMenu();

      menu.push('quality-menu', 'quality-trigger');
      menu.push('quality-menu', 'quality-trigger');
      menu.pop();

      expect(menu.navigationInput.current.stack).toEqual([]);
    });

    it('does not emit a navigation update when popping at root', () => {
      const { menu } = createTestMenu();
      const listener = vi.fn();
      const cleanup = menu.navigationInput.subscribe(listener);

      menu.pop();

      expect(listener).not.toHaveBeenCalled();
      cleanup();
    });
  });

  // -------------------------------------------------------------------------
  // Type-ahead
  // -------------------------------------------------------------------------

  describe('type-ahead', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('highlights item matching typed character', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(b);

      menu.contentProps.onKeyDown(makeKeyEvent('b'));

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('cycles through matching items when the same character is pressed repeatedly', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      const br = addItem('Bravo');
      const bu = addItem('Button');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.registerItem(br);
      menu.registerItem(bu);

      menu.contentProps.onKeyDown(makeKeyEvent('b'));
      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');

      menu.contentProps.onKeyDown(makeKeyEvent('b'));
      expect(br.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');

      menu.contentProps.onKeyDown(makeKeyEvent('b'));
      expect(bu.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('accumulates characters for multi-char match', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const al = addItem('Almond');
      menu.registerItem(a);
      menu.registerItem(al);
      menu.highlight(a);

      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      menu.contentProps.onKeyDown(makeKeyEvent('l'));
      menu.contentProps.onKeyDown(makeKeyEvent('m'));

      expect(al.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('clears buffer after 500ms so next key starts a fresh search', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Almond');
      menu.registerItem(a);
      menu.registerItem(b);

      // First 'a': nothing highlighted → searchStart=0 → Alpha wins
      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');

      vi.advanceTimersByTime(600);

      // Buffer cleared. Alpha still highlighted (idx=0) → searchStart=1 → Almond wins
      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('after buffer clears search resumes from item after current highlight', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Almond');
      menu.registerItem(a);
      menu.registerItem(b);
      menu.highlight(a);

      // Pressing 'a' with Alpha highlighted (idx=0) → searchStart=1 → Almond
      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');

      vi.advanceTimersByTime(600);

      // Buffer cleared. Almond highlighted (idx=1) → searchStart=2 → wraps → Alpha
      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('ignores printable chars with modifier keys', () => {
      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);
      onHighlightChange.mockClear();

      menu.contentProps.onKeyDown(makeKeyEvent('a', { ctrlKey: true }));

      expect(onHighlightChange).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // destroy
  // -------------------------------------------------------------------------

  describe('destroy', () => {
    it('can be destroyed without errors', () => {
      const { menu } = createTestMenu();

      expect(() => menu.destroy()).not.toThrow();
    });

    it('is idempotent', () => {
      const { menu } = createTestMenu();

      menu.destroy();
      expect(() => menu.destroy()).not.toThrow();
    });

    it('cancels the open RAF so highlight/focus do not fire after destroy', () => {
      vi.useFakeTimers();

      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      menu.open();
      menu.destroy();
      onHighlightChange.mockClear();

      // Flush all pending timers and animation frames
      vi.runAllTimers();

      expect(onHighlightChange).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('clears a pending typeahead timer on destroy', () => {
      vi.useFakeTimers();

      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      menu.destroy();
      onHighlightChange.mockClear();

      vi.advanceTimersByTime(600);

      expect(onHighlightChange).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // open/close race conditions
  // -------------------------------------------------------------------------

  describe('open/close race conditions', () => {
    it('does not highlight when close is called before the open RAF fires', () => {
      vi.useFakeTimers();

      const { menu, onHighlightChange } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      menu.open();
      menu.close();
      onHighlightChange.mockClear();

      vi.runAllTimers();

      expect(onHighlightChange).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});

describe('isMenuNavigationKey', () => {
  it('matches keys owned by menu navigation and type-ahead', () => {
    expect(isMenuNavigationKey(makeKeyEvent('ArrowDown'))).toBe(true);
    expect(isMenuNavigationKey(makeKeyEvent('ArrowLeft'))).toBe(true);
    expect(isMenuNavigationKey(makeKeyEvent('Escape'))).toBe(true);
    expect(isMenuNavigationKey(makeKeyEvent('a'))).toBe(true);
  });

  it('ignores keys that should be allowed to bubble', () => {
    expect(isMenuNavigationKey(makeKeyEvent('Tab'))).toBe(false);
    expect(isMenuNavigationKey(makeKeyEvent('a', { metaKey: true }))).toBe(false);
  });
});

describe('getRootPositionOptions', () => {
  it('returns positioning options when side and align are available', () => {
    expect(getRootPositionOptions('bottom', 'start')).toEqual({ side: 'bottom', align: 'start' });
  });

  it('returns null when root positioning is unavailable', () => {
    expect(getRootPositionOptions(undefined, 'start')).toBeNull();
    expect(getRootPositionOptions('bottom', undefined)).toBeNull();
  });
});
