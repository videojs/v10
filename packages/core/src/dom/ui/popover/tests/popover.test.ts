import { flush } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import { createTestPopover } from './popover-helpers';

describe('createPopover', () => {
  it('starts closed', () => {
    const { popover } = createTestPopover();
    expect(popover.interaction.current.open).toBe(false);
    expect(popover.interaction.current.transitionStatus).toBe('closed');
  });

  describe('open/close', () => {
    it('updates interaction state and calls onOpenChange when opening', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();

      expect(popover.interaction.current.open).toBe(true);
      expect(popover.interaction.current.transitionStatus).toBe('opening');
      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: 'click' });
    });

    it('updates interaction state and calls onOpenChange when closing', () => {
      const { popover, onOpenChange } = createTestPopover();

      popover.open();
      onOpenChange.mockClear();

      popover.close();

      // open stays true until transition completes (closing → closed)
      expect(popover.interaction.current.transitionStatus).toBe('closing');
      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'click' });
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

      expect(popover.interaction.current.transitionStatus).toBe('closing');
      expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: 'click' }));
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
