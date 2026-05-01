import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuItemDataAttrs } from '../../../../core/ui/menu/menu-item-data-attrs';
import type { UIKeyboardEvent } from '../../event';
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createMenu', () => {
  let items: HTMLButtonElement[] = [];

  beforeEach(() => {
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
    expect(menu.input.current).toEqual({ active: false, status: 'idle' });
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

      expect(menu.input.current).toEqual({ active: true, status: 'starting' });
    });

    it('closes and calls onOpenChange', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.open();
      onOpenChange.mockClear();

      menu.close();

      expect(menu.input.current.active).toBe(true); // stays active during close animation
      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'click' });
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
  });

  // -------------------------------------------------------------------------
  // triggerProps
  // -------------------------------------------------------------------------

  describe('triggerProps', () => {
    it('opens on click when closed', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.triggerProps.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as UIEvent);

      expect(menu.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    });

    it('closes on click when open', () => {
      const { menu, onOpenChange } = createTestMenu();

      menu.open();
      onOpenChange.mockClear();

      menu.triggerProps.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as UIEvent);

      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
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

    it('keeps navigation order in DOM order when an item registers later', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      const c = addItem('Gamma');
      menu.registerItem(a);
      menu.registerItem(c);
      c.before(b);
      menu.registerItem(b);
      menu.highlight(a);

      menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown'));

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
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

    it('ArrowDown calls preventDefault and stopPropagation', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      const event = makeKeyEvent('ArrowDown');
      menu.contentProps.onKeyDown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('stops propagation for handled navigation keys', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      for (const key of ['ArrowUp', 'Home', 'End', 'Enter', ' ']) {
        const event = makeKeyEvent(key);
        menu.contentProps.onKeyDown(event);

        expect(event.stopPropagation).toHaveBeenCalled();
      }
    });

    it('does nothing when no items are registered', () => {
      const { menu } = createTestMenu();

      expect(() => menu.contentProps.onKeyDown(makeKeyEvent('ArrowDown'))).not.toThrow();
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

    it('stops propagation for type-ahead characters', () => {
      const { menu } = createTestMenu();
      const element = addItem('Alpha');
      menu.registerItem(element);

      const event = makeKeyEvent('a');
      menu.contentProps.onKeyDown(event);

      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('searches type-ahead matches in DOM order when an item registers later', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const b = addItem('Beta');
      const br = addItem('Bravo');
      menu.registerItem(a);
      menu.registerItem(br);
      br.before(b);
      menu.registerItem(b);
      menu.highlight(a);

      menu.contentProps.onKeyDown(makeKeyEvent('b'));

      expect(b.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
    });

    it('cycles same-letter matches when the same key repeats quickly', () => {
      const { menu } = createTestMenu();
      const a = addItem('Alpha');
      const al = addItem('Almond');
      const b = addItem('Beta');
      menu.registerItem(a);
      menu.registerItem(al);
      menu.registerItem(b);

      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');

      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      expect(al.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');

      menu.contentProps.onKeyDown(makeKeyEvent('a'));
      expect(a.getAttribute(MenuItemDataAttrs.highlighted)).toBe('');
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
