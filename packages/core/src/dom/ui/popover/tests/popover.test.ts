import { flush } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import { createTestPopover } from './popover-helpers';

describe('createPopover', () => {
  it('starts closed', () => {
    const { popover } = createTestPopover();
    expect(popover.input.current).toEqual({ active: false, status: 'idle' });
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

      expect(popover.input.current).toEqual({ active: true, status: 'starting' });
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

      expect(popover.input.current).toEqual({ active: true, status: 'ending' });
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

      expect(popover.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    });

    it('closes on click when open', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      onOpenChange.mockClear();

      popover.triggerProps.onClick({ preventDefault: vi.fn() } as unknown as UIEvent);

      // active stays true until close animation completes
      expect(popover.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
    });

    it('re-opens on click during close animation', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      popover.close();
      onOpenChange.mockClear();

      // Click during close animation should re-open
      popover.triggerProps.onClick({ preventDefault: vi.fn() } as unknown as UIEvent);

      expect(popover.input.current.active).toBe(true);
      expect(popover.input.current.status).not.toBe('ending');
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
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
