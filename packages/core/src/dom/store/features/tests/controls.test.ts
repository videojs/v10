import { createStore, flush } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { controlsFeature } from '../controls';

const IDLE_DELAY = 2000;

describe('controlsFeature', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts with userActive: true and controlsVisible: true', () => {
      const { store } = createPlayerStore();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('idle timeout', () => {
    it('sets inactive after idle delay when playing', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('sets userActive false but keeps controlsVisible true when paused', () => {
      const video = createMockVideo({ paused: true });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('activity detection', () => {
    it('resets idle timer on pointermove', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      // Advance partway through idle delay
      vi.advanceTimersByTime(IDLE_DELAY - 500);

      container!.dispatchEvent(new Event('pointermove'));
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);

      // Advance past original delay — still active since timer was reset
      vi.advanceTimersByTime(500);
      flush();

      expect(store.state.userActive).toBe(true);

      // Now wait full delay from the pointermove
      vi.advanceTimersByTime(IDLE_DELAY - 500);
      flush();

      expect(store.state.userActive).toBe(false);
    });

    it('sets active on keyup', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);

      container!.dispatchEvent(new Event('keyup'));
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('reactivates on pointermove after idle', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);

      container!.dispatchEvent(new Event('pointermove'));
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('sets active on focusin', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);

      container!.dispatchEvent(new Event('focusin'));
      flush();

      expect(store.state.userActive).toBe(true);
    });

    it('sets inactive immediately on mouseleave', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('mouseleave'));
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('keeps controlsVisible true on mouseleave when paused', () => {
      const video = createMockVideo({ paused: true });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('mouseleave'));
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('playback state interaction', () => {
    it('shows controls when media pauses', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.controlsVisible).toBe(false);

      // Pause media
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
      video.dispatchEvent(new Event('pause'));
      flush();

      expect(store.state.controlsVisible).toBe(true);
    });

    it('hides controls when media resumes and user is inactive', () => {
      const video = createMockVideo({ paused: true });
      const { store } = createPlayerStore(video);

      // Let idle expire — user inactive, but visible because paused
      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);

      // Resume playback while user is still inactive
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.dispatchEvent(new Event('play'));
      flush();

      expect(store.state.controlsVisible).toBe(false);
    });

    it('schedules idle when playback resumes and user is active', () => {
      const video = createMockVideo({ paused: true });
      const { store, container } = createPlayerStore(video);

      // Trigger activity to keep user active
      container!.dispatchEvent(new Event('pointermove'));
      flush();

      // Resume playback
      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.dispatchEvent(new Event('play'));
      flush();

      expect(store.state.controlsVisible).toBe(true);

      // After idle delay, should hide
      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.controlsVisible).toBe(false);
    });
  });

  describe('toggleControls', () => {
    it('returns the new visibility synchronously', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      expect(store.state.toggleControls()).toBe(false);
      flushToggle();

      expect(store.state.toggleControls()).toBe(true);
    });

    it('hides controls when visible and playing', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      store.state.toggleControls();
      flushToggle();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('shows controls when hidden', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      // First toggle to hide
      store.state.toggleControls();
      flushToggle();

      expect(store.state.controlsVisible).toBe(false);

      // Second toggle to show
      store.state.toggleControls();
      flushToggle();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('reschedules idle timer when showing controls', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      // Hide controls
      store.state.toggleControls();
      flushToggle();

      // Show controls
      store.state.toggleControls();
      flushToggle();

      expect(store.state.controlsVisible).toBe(true);

      // Should hide again after idle delay
      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('keeps controlsVisible true when toggling off while paused', () => {
      const video = createMockVideo({ paused: true });
      const { store } = createPlayerStore(video);

      store.state.toggleControls();
      flushToggle();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('null container', () => {
    it('does not track activity without container', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video, null);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('stops listening when store is destroyed', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      store.destroy();

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(true);
    });

    it('clears idle timer on detach', () => {
      const video = createMockVideo({ paused: false });
      const store = createStore<PlayerTarget>()(controlsFeature);

      const container = createContainer();
      const detach = store.attach({ media: video, container });
      flush();

      detach();
      flush();

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('does not react to media events after detach', () => {
      const video = createMockVideo({ paused: false });
      const store = createStore<PlayerTarget>()(controlsFeature);

      const container = createContainer();
      const detach = store.attach({ media: video, container });
      flush();

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.controlsVisible).toBe(false);

      detach();
      flush();

      // Pause after detach — should not affect state
      Object.defineProperty(video, 'paused', { value: true, configurable: true });
      video.dispatchEvent(new Event('pause'));
      flush();

      // State was reset to initial on detach
      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flush the deferred rAF inside toggleControls + store batch. */
function flushToggle(): void {
  vi.advanceTimersToNextTimer();
  flush();
}

function createContainer(): HTMLElement {
  return document.createElement('div');
}

function createPlayerStore(video?: HTMLVideoElement, container?: HTMLElement | null) {
  const store = createStore<PlayerTarget>()(controlsFeature);

  const media = video ?? createMockVideo({ paused: true });
  const cont = container === undefined ? createContainer() : container;

  store.attach({ media, container: cont });
  flush();

  return { store, media, container: cont };
}
