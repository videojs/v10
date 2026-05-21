import { flush } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import { createPopupGroup } from '../popup-group';
import { createTestPopover } from './popover-helpers';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('createPopover', () => {
  it('starts closed', () => {
    const { popover } = createTestPopover();
    expect(popover.input.current).toEqual({ active: false, status: 'idle', transitioning: false });
  });

  describe('open/close', () => {
    it('updates input state and calls onOpenChange when opening', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();

      expect(popover.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: 'click' });
    });

    it('transitions to starting status when opening', () => {
      const { popover } = createTestPopover();

      popover.open();

      expect(popover.input.current).toEqual({ active: true, status: 'starting', transitioning: true });
    });

    it('calls onOpenChange when closing', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      onOpenChange.mockClear();

      popover.close();

      // active stays true until close animation completes
      expect(popover.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'click' });
    });

    it('transitions to ending status when closing', () => {
      const { popover } = createTestPopover();

      popover.open();
      popover.close();

      expect(popover.input.current).toEqual({ active: true, status: 'ending', transitioning: true });
    });

    it('does not call onOpenChange if already open', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      onOpenChange.mockClear();

      popover.open();

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('does not call onOpenChange if already closed', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.close();

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('supports custom reason', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open('hover');

      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: 'hover' });
    });

    it('supports imperative close reason', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      onOpenChange.mockClear();

      popover.close('imperative-action');

      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'imperative-action' });
    });

    it('ignores imperative close while already closed', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.close('imperative-action');

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('does not auto-close the first popover when another opens without a shared group', () => {
      const first = createTestPopover();
      const second = createTestPopover();

      first.popover.open();
      first.onOpenChange.mockClear();

      second.popover.open();

      expect(first.onOpenChange).not.toHaveBeenCalled();
      expect(first.popover.input.current.active).toBe(true);
      expect(second.popover.input.current.active).toBe(true);
    });

    it('closes the previously open grouped popover when another opens', () => {
      const group = createPopupGroup();
      const first = createTestPopover({ group: () => group });
      const second = createTestPopover({ group: () => group });

      first.popover.open();
      first.onOpenChange.mockClear();

      second.popover.open();

      expect(first.onOpenChange).toHaveBeenCalledWith(false, { reason: 'group-open' });
      expect(second.onOpenChange).toHaveBeenCalledWith(true, { reason: 'click' });
    });

    it('does not close popovers in a different group', () => {
      const firstGroup = createPopupGroup();
      const secondGroup = createPopupGroup();
      const first = createTestPopover({ group: () => firstGroup });
      const second = createTestPopover({ group: () => secondGroup });

      first.popover.open();
      first.onOpenChange.mockClear();

      second.popover.open();

      expect(first.onOpenChange).not.toHaveBeenCalled();
    });

    it('clears the grouped popover when destroyed', () => {
      const group = createPopupGroup();
      const first = createTestPopover({ group: () => group });
      const second = createTestPopover({ group: () => group });

      first.popover.open();
      first.popover.destroy();
      first.onOpenChange.mockClear();

      second.popover.open();

      expect(first.onOpenChange).not.toHaveBeenCalled();
      expect(second.onOpenChange).toHaveBeenCalledWith(true, { reason: 'click' });
    });
  });

  describe('onOpenChangeComplete', () => {
    it('fires after open animation completes', () => {
      const onOpenChangeComplete = vi.fn();
      const { popover } = createTestPopover({ onOpenChangeComplete });

      popover.open();

      // Not called synchronously
      expect(onOpenChangeComplete).not.toHaveBeenCalled();
    });
  });

  describe('triggerProps', () => {
    it('opens on click when closed', () => {
      const { popover, onOpenChange } = createTestPopover();
      const event = { preventDefault: vi.fn() } as unknown as UIEvent;

      popover.triggerProps.onClick(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(popover.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    });

    it('closes on click when open', () => {
      const { popover, onOpenChange } = createTestPopover();
      const event = { preventDefault: vi.fn() } as unknown as UIEvent;

      popover.open();
      onOpenChange.mockClear();

      popover.triggerProps.onClick(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      // active stays true until close animation completes
      expect(popover.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
    });

    it('defers reopen until close settles when clicked during close animation', async () => {
      const { popover, onOpenChange } = createTestPopover();
      const event = { preventDefault: vi.fn() } as unknown as UIEvent;

      popover.open();
      popover.close();
      onOpenChange.mockClear();

      popover.triggerProps.onClick(event);

      expect(event.preventDefault).toHaveBeenCalledTimes(1);
      expect(popover.input.current.active).toBe(true);
      expect(popover.input.current.status).toBe('ending');
      expect(onOpenChange).not.toHaveBeenCalled();

      await vi.waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
      });

      expect(popover.input.current.active).toBe(true);
      expect(popover.input.current.status).not.toBe('ending');
    });

    it('does not open on click on touch devices when openOnHover is enabled', () => {
      const matchMedia = vi.fn(() => ({
        matches: false,
      }));
      vi.stubGlobal('matchMedia', matchMedia);

      const { popover, onOpenChange } = createTestPopover({
        openOnHover: () => true,
      });
      const event = { preventDefault: vi.fn() } as unknown as UIEvent;

      popover.triggerProps.onClick(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(popover.input.current.active).toBe(false);

      vi.unstubAllGlobals();
    });

    it('does not open via focus on touch devices when openOnHover is enabled', () => {
      const matchMedia = vi.fn(() => ({
        matches: false,
      }));
      vi.stubGlobal('matchMedia', matchMedia);

      const { popover, onOpenChange } = createTestPopover({
        openOnHover: () => true,
      });

      popover.triggerProps.onFocusIn({ relatedTarget: null, preventDefault: vi.fn(), stopPropagation: vi.fn() });

      expect(onOpenChange).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('does not open via focus when pointer is not fine', () => {
      const matchMedia = vi.fn((query: string) => ({
        matches: query === '(hover: hover)',
      }));
      vi.stubGlobal('matchMedia', matchMedia);

      const { popover, onOpenChange } = createTestPopover({
        openOnHover: () => true,
      });

      popover.triggerProps.onFocusIn({ relatedTarget: null, preventDefault: vi.fn(), stopPropagation: vi.fn() });

      expect(onOpenChange).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('opens via focus when hover and fine pointer are supported', () => {
      const matchMedia = vi.fn((query: string) => ({
        matches: query === '(hover: hover)' || query === '(pointer: fine)',
      }));
      vi.stubGlobal('matchMedia', matchMedia);

      const { popover, onOpenChange } = createTestPopover({
        openOnHover: () => true,
      });

      popover.triggerProps.onFocusIn({ relatedTarget: null, preventDefault: vi.fn(), stopPropagation: vi.fn() });

      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: 'focus' });

      vi.unstubAllGlobals();
    });
  });

  describe('element setters', () => {
    it('sets trigger element', () => {
      const { popover } = createTestPopover();
      const el = document.createElement('button');

      popover.setTriggerElement(el);
      popover.setTriggerElement(null);
      // Should not throw
    });

    it('sets and clears popup element', () => {
      const { popover } = createTestPopover();
      const el = document.createElement('div');

      popover.setPopupElement(el);
      popover.setPopupElement(null);
      // Should not throw
    });
  });

  describe('outside-click', () => {
    it('does not close when clicking inside the popup', () => {
      const { popover, onOpenChange } = createTestPopover();
      const popup = document.createElement('div');
      const child = document.createElement('button');
      popup.appendChild(child);
      document.body.appendChild(popup);

      popover.setPopupElement(popup);
      popover.open();
      flush();
      onOpenChange.mockClear();

      child.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(onOpenChange).not.toHaveBeenCalled();

      popover.destroy();
      popup.remove();
    });

    it('does not blur-close during a pointer interaction that started inside the popup', () => {
      const { popover, onOpenChange } = createTestPopover();
      const popup = document.createElement('div');
      const child = document.createElement('button');
      const outside = document.createElement('button');
      popup.appendChild(child);
      document.body.append(popup, outside);

      popover.setPopupElement(popup);
      popover.open();
      flush();
      onOpenChange.mockClear();

      child.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      popover.popupProps.onFocusOut({
        relatedTarget: outside,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });

      expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything());

      popover.destroy();
      popup.remove();
      outside.remove();
    });

    it('does not blur-close after an inside pointer interaction spans a frame', async () => {
      const { popover, onOpenChange } = createTestPopover();
      const popup = document.createElement('div');
      const child = document.createElement('button');
      const outside = document.createElement('button');
      popup.appendChild(child);
      document.body.append(popup, outside);

      popover.setPopupElement(popup);
      popover.open();
      flush();
      onOpenChange.mockClear();

      child.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
      await nextFrame();
      popover.popupProps.onFocusOut({
        relatedTarget: outside,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });

      expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything());

      popover.destroy();
      popup.remove();
      outside.remove();
    });

    it('blur-closes when focus leaves the popup without an inside pointer interaction', async () => {
      const { popover, onOpenChange } = createTestPopover();
      const popup = document.createElement('div');
      const outside = document.createElement('button');
      document.body.append(popup, outside);

      popover.setPopupElement(popup);
      popover.open();
      flush();
      await nextFrame();
      await nextFrame();
      onOpenChange.mockClear();

      popover.popupProps.onFocusOut({
        relatedTarget: outside,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });

      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'blur' }));

      popover.destroy();
      popup.remove();
      outside.remove();
    });

    it('closes on peer trigger pointerdown without a shared PopupGroup (lost-click-prone path)', () => {
      const first = createTestPopover();
      const second = createTestPopover();
      const t1 = document.createElement('button');
      const t2 = document.createElement('button');
      const p1 = document.createElement('div');
      document.body.appendChild(t1);
      document.body.appendChild(t2);
      document.body.appendChild(p1);

      first.popover.setTriggerElement(t1);
      first.popover.setPopupElement(p1);
      second.popover.setTriggerElement(t2);

      first.popover.open();
      flush();
      first.onOpenChange.mockClear();
      second.onOpenChange.mockClear();

      t2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(first.onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'outside-click' }));

      const click = { preventDefault: vi.fn() } as unknown as UIEvent;
      second.popover.triggerProps.onClick(click);

      expect(second.onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));

      first.popover.destroy();
      second.popover.destroy();
      t1.remove();
      t2.remove();
      p1.remove();
    });

    it('skips outside-dismiss on peer trigger pointerdown when sharing a PopupGroup', () => {
      const group = createPopupGroup();
      const first = createTestPopover({ group: () => group });
      const second = createTestPopover({ group: () => group });
      const t1 = document.createElement('button');
      const t2 = document.createElement('button');
      const p1 = document.createElement('div');
      document.body.appendChild(t1);
      document.body.appendChild(t2);
      document.body.appendChild(p1);

      first.popover.setTriggerElement(t1);
      first.popover.setPopupElement(p1);
      second.popover.setTriggerElement(t2);

      first.popover.open();
      flush();
      first.onOpenChange.mockClear();
      second.onOpenChange.mockClear();

      t2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(first.onOpenChange).not.toHaveBeenCalled();

      const click = { preventDefault: vi.fn() } as unknown as UIEvent;
      second.popover.triggerProps.onClick(click);

      expect(first.onOpenChange).toHaveBeenCalledWith(false, { reason: 'group-open' });
      expect(second.onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));

      first.popover.destroy();
      second.popover.destroy();
      t1.remove();
      t2.remove();
      p1.remove();
    });

    it('does not blur-close when focus moves to another registered group trigger', () => {
      const group = createPopupGroup();
      const first = createTestPopover({ group: () => group });
      const second = createTestPopover({ group: () => group });
      const t1 = document.createElement('button');
      const t2 = document.createElement('button');
      const p2 = document.createElement('div');
      document.body.appendChild(t1);
      document.body.appendChild(t2);
      document.body.appendChild(p2);

      first.popover.setTriggerElement(t1);
      second.popover.setTriggerElement(t2);
      second.popover.setPopupElement(p2);

      second.popover.open();
      flush();
      second.onOpenChange.mockClear();

      second.popover.popupProps.onFocusOut({
        relatedTarget: t1,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });

      expect(second.onOpenChange).not.toHaveBeenCalledWith(false, expect.anything());

      first.popover.destroy();
      second.popover.destroy();
      t1.remove();
      t2.remove();
      p2.remove();
    });

    it('closes when clicking outside the popup', () => {
      const { popover, onOpenChange } = createTestPopover();
      const popup = document.createElement('div');
      const outside = document.createElement('div');
      document.body.appendChild(popup);
      document.body.appendChild(outside);

      popover.setPopupElement(popup);
      popover.open();
      flush();
      onOpenChange.mockClear();

      outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'outside-click' }));

      popover.destroy();
      popup.remove();
      outside.remove();
    });

    it('does not close when clicking inside the trigger', () => {
      const { popover, onOpenChange } = createTestPopover();
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);

      popover.setTriggerElement(trigger);
      popover.open();
      flush();
      onOpenChange.mockClear();

      trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(onOpenChange).not.toHaveBeenCalledWith(false, expect.anything());

      popover.destroy();
      trigger.remove();
    });

    it('uses composedPath to detect clicks inside a Shadow DOM popup', () => {
      const { popover, onOpenChange } = createTestPopover();
      const host = document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });
      const popup = document.createElement('div');
      const child = document.createElement('button');
      popup.appendChild(child);
      shadow.appendChild(popup);
      document.body.appendChild(host);

      popover.setPopupElement(popup);
      popover.open();
      flush();
      onOpenChange.mockClear();

      // Clicking the child inside the shadow tree — event.target at
      // document level is the shadow host, but composedPath includes popup.
      child.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(onOpenChange).not.toHaveBeenCalled();

      popover.destroy();
      host.remove();
    });

    it('skips outside-dismiss on peer trigger pointerdown when sharing a PopupGroup', () => {
      const group = createPopupGroup();
      const first = createTestPopover({ group: () => group });
      const second = createTestPopover({ group: () => group });
      const t1 = document.createElement('button');
      const t2 = document.createElement('button');
      const p1 = document.createElement('div');
      document.body.appendChild(t1);
      document.body.appendChild(t2);
      document.body.appendChild(p1);

      first.popover.setTriggerElement(t1);
      first.popover.setPopupElement(p1);
      second.popover.setTriggerElement(t2);

      first.popover.open();
      flush();
      first.onOpenChange.mockClear();
      second.onOpenChange.mockClear();

      t2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      expect(first.onOpenChange).not.toHaveBeenCalled();

      const click = { preventDefault: vi.fn() } as unknown as UIEvent;
      second.popover.triggerProps.onClick(click);

      expect(first.onOpenChange).toHaveBeenCalledWith(false, { reason: 'group-open' });
      expect(second.onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));

      first.popover.destroy();
      second.popover.destroy();
      t1.remove();
      t2.remove();
      p1.remove();
    });

    it('does not blur-close before group-open when peer trigger is pointerdowned', () => {
      const group = createPopupGroup();
      const first = createTestPopover({ group: () => group });
      const second = createTestPopover({ group: () => group });
      const t1 = document.createElement('button');
      const t2 = document.createElement('button');
      const p1 = document.createElement('div');
      document.body.appendChild(t1);
      document.body.appendChild(t2);
      document.body.appendChild(p1);

      first.popover.setTriggerElement(t1);
      first.popover.setPopupElement(p1);
      second.popover.setTriggerElement(t2);

      first.popover.open();
      flush();
      first.onOpenChange.mockClear();
      second.onOpenChange.mockClear();

      t2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));

      first.popover.popupProps.onFocusOut({
        relatedTarget: null,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      });

      expect(first.onOpenChange).not.toHaveBeenCalled();

      const click = { preventDefault: vi.fn() } as unknown as UIEvent;
      second.popover.triggerProps.onClick(click);

      expect(first.onOpenChange).toHaveBeenCalledWith(false, { reason: 'group-open' });

      first.popover.destroy();
      second.popover.destroy();
      t1.remove();
      t2.remove();
      p1.remove();
    });
  });

  describe('destroy', () => {
    it('prevents further open/close calls', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.destroy();
      popover.open();

      expect(onOpenChange).not.toHaveBeenCalled();
      expect(popover.input.current.active).toBe(false);
    });
  });

  describe('subscriber notification', () => {
    it('notifies subscribers when opened', () => {
      const { popover } = createTestPopover();
      const callback = vi.fn();

      popover.input.subscribe(callback);

      popover.open();
      flush();

      expect(callback).toHaveBeenCalled();
      expect(popover.input.current.active).toBe(true);
    });
  });
});
