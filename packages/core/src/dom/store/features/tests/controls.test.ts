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

  describe('setActive', () => {
    it('sets user as active', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);

      store.state.setActive();
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('resets idle timer', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      // Advance partway through idle delay
      vi.advanceTimersByTime(IDLE_DELAY - 500);

      store.state.setActive();
      flush();

      // Advance past original delay
      vi.advanceTimersByTime(500);
      flush();

      expect(store.state.userActive).toBe(true);

      // Now wait full delay from the setActive call
      vi.advanceTimersByTime(IDLE_DELAY - 500);
      flush();

      expect(store.state.userActive).toBe(false);
    });
  });

  describe('setInactive', () => {
    it('sets user as inactive', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      store.state.setInactive();
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('keeps controlsVisible true when paused', () => {
      const video = createMockVideo({ paused: true });
      const { store } = createPlayerStore(video);

      store.state.setInactive();
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
      const { store } = createPlayerStore(video);

      // Keep user active
      store.state.setActive();
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
    it('hides controls when visible and playing', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      const result = store.state.toggleControls();
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
      expect(result).toBe(false);
    });

    it('shows controls when hidden', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      // First toggle to hide
      store.state.toggleControls();
      flush();

      expect(store.state.controlsVisible).toBe(false);

      // Second toggle to show
      const result = store.state.toggleControls();
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
      expect(result).toBe(true);
    });

    it('reschedules idle timer when showing controls', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      // Hide controls
      store.state.toggleControls();
      flush();

      // Show controls
      store.state.toggleControls();
      flush();

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

      const result = store.state.toggleControls();
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
      expect(result).toBe(true);
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
