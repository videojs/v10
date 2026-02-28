import { flush } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import { createTestPopover } from './popover-helpers';

describe('createPopover', () => {
  it('starts closed', () => {
    const { popover } = createTestPopover();
    expect(popover.interaction.current.open).toBe(false);
  });

  describe('open/close', () => {
    it('updates interaction state and calls onOpenChange when opening', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();

      expect(popover.interaction.current.open).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: 'click' });
    });

    it('sets data-starting-style on popup element when opening', () => {
      const { popover } = createTestPopover();
      const el = document.createElement('div');
      popover.setPopupElement(el);

      popover.open();

      expect(el.hasAttribute('data-starting-style')).toBe(true);
    });

    it('calls onOpenChange when closing', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      onOpenChange.mockClear();

      popover.close();

      // open stays true until close animation completes
      expect(popover.interaction.current.open).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'click' });
    });

    it('sets data-ending-style on popup element when closing', () => {
      const { popover } = createTestPopover();
      const el = document.createElement('div');
      popover.setPopupElement(el);

      popover.open();
      popover.close();

      expect(el.hasAttribute('data-ending-style')).toBe(true);
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
      const el = document.createElement('div');
      popover.setPopupElement(el);

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

      expect(popover.interaction.current.open).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: 'click' }));
    });

    it('closes on click when open', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      onOpenChange.mockClear();

      popover.triggerProps.onClick({ preventDefault: vi.fn() } as unknown as UIEvent);

      // open stays true until close animation completes
      expect(popover.interaction.current.open).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
    });

    it('re-opens on click during close animation', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      popover.close();
      onOpenChange.mockClear();

      // Click during close animation should re-open
      popover.triggerProps.onClick({ preventDefault: vi.fn() } as unknown as UIEvent);

      expect(popover.interaction.current.open).toBe(true);
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

    it('sets popup element with popover attribute', () => {
      const { popover } = createTestPopover();
      const el = document.createElement('div');

      popover.setPopupElement(el);
      expect(el.getAttribute('popover')).toBe('manual');
    });
  });

  describe('destroy', () => {
    it('prevents further open/close calls', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.destroy();
      popover.open();

      expect(onOpenChange).not.toHaveBeenCalled();
      expect(popover.interaction.current.open).toBe(false);
    });
  });

  describe('subscriber notification', () => {
    it('notifies subscribers when opened', () => {
      const { popover } = createTestPopover();
      const callback = vi.fn();

      popover.interaction.subscribe(callback);

      popover.open();
      flush();

      expect(callback).toHaveBeenCalled();
      expect(popover.interaction.current.open).toBe(true);
    });
  });
});
