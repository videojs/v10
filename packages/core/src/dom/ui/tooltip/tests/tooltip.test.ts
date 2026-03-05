import { flush } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import { createTooltipGroup } from '../tooltip-group';
import { createTestTooltip } from './tooltip-helpers';

describe('createTooltip', () => {
  it('starts closed', () => {
    const { tooltip } = createTestTooltip();
    expect(tooltip.input.current).toEqual({ active: false, status: 'idle' });
  });

  describe('open/close', () => {
    it('updates input state and calls onOpenChange when opening', () => {
      const { tooltip, onOpenChange } = createTestTooltip();

      tooltip.open();

      expect(tooltip.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(true, { reason: 'hover' });
    });

    it('transitions to starting status when opening', () => {
      const { tooltip } = createTestTooltip();

      tooltip.open();

      expect(tooltip.input.current).toEqual({ active: true, status: 'starting' });
    });

    it('calls onOpenChange when closing', () => {
      const { tooltip, onOpenChange } = createTestTooltip();

      tooltip.open();
      onOpenChange.mockClear();

      tooltip.close();

      expect(tooltip.input.current.active).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false, { reason: 'hover' });
    });

    it('does not call onOpenChange if already open', () => {
      const { tooltip, onOpenChange } = createTestTooltip();

      tooltip.open();
      onOpenChange.mockClear();

      tooltip.open();

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('does not call onOpenChange if already closed', () => {
      const { tooltip, onOpenChange } = createTestTooltip();

      tooltip.close();

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('onOpenChangeComplete', () => {
    it('fires after open animation completes', () => {
      const onOpenChangeComplete = vi.fn();
      const { tooltip } = createTestTooltip({ onOpenChangeComplete });

      tooltip.open();

      // Not called synchronously — fires after transition resolves
      expect(onOpenChangeComplete).not.toHaveBeenCalled();
    });
  });

  describe('triggerProps', () => {
    it('does not expose onClick', () => {
      const { tooltip } = createTestTooltip();

      expect(tooltip.triggerProps).not.toHaveProperty('onClick');
    });

    it('exposes hover and focus handlers', () => {
      const { tooltip } = createTestTooltip();

      expect(tooltip.triggerProps.onPointerEnter).toBeTypeOf('function');
      expect(tooltip.triggerProps.onPointerLeave).toBeTypeOf('function');
      expect(tooltip.triggerProps.onFocusIn).toBeTypeOf('function');
      expect(tooltip.triggerProps.onFocusOut).toBeTypeOf('function');
    });

    it('does not open when disabled', () => {
      const { tooltip, onOpenChange } = createTestTooltip({
        disabled: () => true,
      });

      tooltip.triggerProps.onPointerEnter({
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        pointerType: 'mouse',
        buttons: 0,
        preventDefault: vi.fn(),
      });

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('does not open via focus when disabled', () => {
      const { tooltip, onOpenChange } = createTestTooltip({
        disabled: () => true,
      });

      tooltip.triggerProps.onFocusIn({ relatedTarget: null, preventDefault: vi.fn() });

      expect(onOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('popupProps', () => {
    it('onPointerEnter is no-op when disableHoverablePopup is true', () => {
      const { tooltip } = createTestTooltip({
        disableHoverablePopup: () => true,
      });

      tooltip.open();

      // Should not throw — just a no-op
      tooltip.popupProps.onPointerEnter({
        clientX: 0,
        clientY: 0,
        pointerId: 1,
        pointerType: 'mouse',
        buttons: 0,
        preventDefault: vi.fn(),
      });
    });
  });

  describe('group integration', () => {
    it('notifies group on open/close', () => {
      const group = createTooltipGroup();
      const notifyOpen = vi.spyOn(group, 'notifyOpen');
      const notifyClose = vi.spyOn(group, 'notifyClose');

      const { tooltip } = createTestTooltip({ group });

      tooltip.open();
      expect(notifyOpen).toHaveBeenCalled();

      tooltip.close();
      expect(notifyClose).toHaveBeenCalled();
    });
  });

  describe('element setters', () => {
    it('sets trigger element', () => {
      const { tooltip } = createTestTooltip();
      const el = document.createElement('button');

      tooltip.setTriggerElement(el);
      tooltip.setTriggerElement(null);
    });

    it('sets and clears popup element', () => {
      const { tooltip } = createTestTooltip();
      const el = document.createElement('div');

      tooltip.setPopupElement(el);
      tooltip.setPopupElement(null);
    });
  });

  describe('destroy', () => {
    it('prevents further open/close calls', () => {
      const { tooltip, onOpenChange } = createTestTooltip();

      tooltip.destroy();
      tooltip.open();

      expect(onOpenChange).not.toHaveBeenCalled();
      expect(tooltip.input.current.active).toBe(false);
    });
  });

  describe('subscriber notification', () => {
    it('notifies subscribers when opened', () => {
      const { tooltip } = createTestTooltip();
      const callback = vi.fn();

      tooltip.input.subscribe(callback);

      tooltip.open();
      flush();

      expect(callback).toHaveBeenCalled();
      expect(tooltip.input.current.active).toBe(true);
    });
  });
});
