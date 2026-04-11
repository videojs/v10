import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlsActivity } from '../controls-activity';

describe('createControlsActivity', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('pointer activity', () => {
    it('calls setUserActivity(true) on pointermove', () => {
      const { container, setUserActivity } = setup();

      container.dispatchEvent(new Event('pointermove'));

      expect(setUserActivity).toHaveBeenCalledWith(true);
    });

    it('calls setUserActivity(true) on mouse pointerup', () => {
      const { container, setUserActivity } = setup();

      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'mouse' }));

      expect(setUserActivity).toHaveBeenCalledWith(true);
    });

    it('calls setUserActivity(true) on keyup', () => {
      const { container, setUserActivity } = setup();

      container.dispatchEvent(new Event('keyup'));

      expect(setUserActivity).toHaveBeenCalledWith(true);
    });

    it('calls setUserActivity(true) on focusin', () => {
      const { container, setUserActivity } = setup();

      container.dispatchEvent(new Event('focusin'));

      expect(setUserActivity).toHaveBeenCalledWith(true);
    });

    it('calls hideControls on mouseleave', () => {
      const { container, hideControls } = setup();

      container.dispatchEvent(new Event('mouseleave'));

      expect(hideControls).toHaveBeenCalledOnce();
    });
  });

  describe('touch tap-to-toggle', () => {
    it('calls toggleControls on touch tap', () => {
      const { container, toggleControls } = setup();

      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch' }));

      expect(toggleControls).toHaveBeenCalledOnce();
    });

    it('does not toggle on long press', () => {
      const { container, toggleControls, setUserActivity } = setup();

      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(300);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch' }));

      expect(toggleControls).not.toHaveBeenCalled();
      expect(setUserActivity).toHaveBeenCalledWith(true);
    });

    it('does not toggle for mouse clicks', () => {
      const { container, toggleControls, setUserActivity } = setup();

      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'mouse' }));

      expect(toggleControls).not.toHaveBeenCalled();
      expect(setUserActivity).toHaveBeenCalledWith(true);
    });
  });

  describe('cleanup', () => {
    it('stops tracking on destroy', () => {
      const { activity, container, setUserActivity } = setup();

      activity.destroy();
      setUserActivity.mockClear();

      container.dispatchEvent(new Event('pointermove'));

      expect(setUserActivity).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  const container = document.createElement('div');

  const setUserActivity = vi.fn();
  const hideControls = vi.fn();
  const toggleControls = vi.fn();

  const activity = createControlsActivity(container, {
    setUserActivity,
    hideControls,
    toggleControls,
  });

  return { container, setUserActivity, hideControls, toggleControls, activity };
}

function createPointerEvent(type: string, init?: { pointerType?: string }): Event {
  const event = new Event(type, { bubbles: true });
  if (init?.pointerType) {
    Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  }
  return event;
}
