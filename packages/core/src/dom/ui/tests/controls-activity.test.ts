import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createControlsActivity } from '../controls-activity';

const IDLE_DELAY = 2000;

describe('createControlsActivity', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe('idle timer', () => {
    it('sets inactive after idle delay', () => {
      const { setControls } = setup();

      vi.advanceTimersByTime(IDLE_DELAY);

      expect(setControls).toHaveBeenCalledWith(false, false);
    });

    it('keeps controlsVisible true when paused', () => {
      const { setControls } = setup({ paused: true });

      vi.advanceTimersByTime(IDLE_DELAY);

      expect(setControls).toHaveBeenCalledWith(false, true);
    });
  });

  describe('pointer activity', () => {
    it('resets idle on pointermove', () => {
      const { container, setControls } = setup();

      vi.advanceTimersByTime(IDLE_DELAY - 500);
      container.dispatchEvent(new Event('pointermove'));

      vi.advanceTimersByTime(500);
      expect(setControls).not.toHaveBeenCalledWith(false, false);

      vi.advanceTimersByTime(IDLE_DELAY - 500);
      expect(setControls).toHaveBeenCalledWith(false, false);
    });

    it('sets active on mouse pointerup', () => {
      const { container, setControls } = setup({ userActive: false });

      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'mouse' }));

      expect(setControls).toHaveBeenCalledWith(true, true);
    });

    it('sets active on keyup', () => {
      const { container, setControls } = setup({ userActive: false });

      container.dispatchEvent(new Event('keyup'));

      expect(setControls).toHaveBeenCalledWith(true, true);
    });

    it('sets active on focusin', () => {
      const { container, setControls } = setup({ userActive: false });

      container.dispatchEvent(new Event('focusin'));

      expect(setControls).toHaveBeenCalledWith(true, true);
    });

    it('sets inactive on mouseleave', () => {
      const { container, setControls } = setup();

      container.dispatchEvent(new Event('mouseleave'));

      expect(setControls).toHaveBeenCalledWith(false, false);
    });
  });

  describe('touch tap-to-toggle', () => {
    it('toggles controls on touch tap', () => {
      const { container, setControls, state } = setup({ controlsVisible: true });

      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch', target: container }));

      // Toggle: was visible → should hide
      expect(setControls).toHaveBeenCalledWith(false, false);

      // Now hidden → tap again to show
      state.controlsVisible = false;
      state.userActive = false;
      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch', target: container }));

      expect(setControls).toHaveBeenCalledWith(true, true);
    });

    it('does not toggle on long press', () => {
      const { container, setControls } = setup();

      container.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(300);
      container.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch', target: container }));

      // Long press → treated as activity (setActive), not toggle.
      // Since user is already active, setControls is not called — only idle timer resets.
      expect(setControls).not.toHaveBeenCalledWith(false, false);
    });
  });

  describe('playback state', () => {
    it('recomputes visibility when media pauses', () => {
      const { media, setControls, state } = setup();

      // Become inactive first
      vi.advanceTimersByTime(IDLE_DELAY);
      setControls.mockClear();
      state.userActive = false;

      // Pause
      Object.defineProperty(media, 'paused', { value: true, configurable: true });
      media.dispatchEvent(new Event('pause'));

      expect(setControls).toHaveBeenCalledWith(false, true);
    });
  });

  describe('cleanup', () => {
    it('stops tracking on destroy', () => {
      const { activity, container, setControls } = setup();

      activity.destroy();
      setControls.mockClear();

      vi.advanceTimersByTime(IDLE_DELAY);
      container.dispatchEvent(new Event('pointermove'));

      expect(setControls).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SetupOptions {
  paused?: boolean;
  userActive?: boolean;
  controlsVisible?: boolean;
}

function setup(options: SetupOptions = {}) {
  const container = document.createElement('div');
  const media = document.createElement('video') as HTMLVideoElement;
  Object.defineProperty(media, 'paused', { value: options.paused ?? false, configurable: true });

  const state = {
    userActive: options.userActive ?? true,
    controlsVisible: options.controlsVisible ?? true,
  };

  const setControls = vi.fn((userActive: boolean, controlsVisible: boolean) => {
    state.userActive = userActive;
    state.controlsVisible = controlsVisible;
  });

  const activity = createControlsActivity({
    getContainer: () => container,
    getMedia: () => media,
    getControlsVisible: () => state.controlsVisible,
    getUserActive: () => state.userActive,
    setControls,
  });

  return { container, media, state, setControls, activity };
}

function createPointerEvent(type: string, init?: { pointerType?: string; target?: EventTarget }): Event {
  const event = new Event(type, { bubbles: true });
  if (init?.pointerType) {
    Object.defineProperty(event, 'pointerType', { value: init.pointerType });
  }
  return event;
}
