import { createStore, flush } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { controlsFeature } from '../controls';

const IDLE_DELAY = 2000;

describe('controlsFeature', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

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

    it('keeps controlsVisible true when paused', () => {
      const video = createMockVideo({ paused: true });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('setUserActivity', () => {
    it('sets active and resets idle timer', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);

      store.state.setUserActivity(true);
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('sets inactive and clears idle timer', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      store.state.setUserActivity(false);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });
  });

  describe('showControls / hideControls', () => {
    it('showControls sets active and visible', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      store.state.hideControls();
      flush();

      store.state.showControls();
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('hideControls sets inactive', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      store.state.hideControls();
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('hideControls keeps controlsVisible true when paused', () => {
      const video = createMockVideo({ paused: true });
      const { store } = createPlayerStore(video);

      store.state.hideControls();
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
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

      store.state.toggleControls();
      flush();

      const result = store.state.toggleControls();
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
      expect(result).toBe(true);
    });

    it('reschedules idle timer when showing', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      store.state.toggleControls();
      flush();

      store.state.toggleControls();
      flush();

      expect(store.state.controlsVisible).toBe(true);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.controlsVisible).toBe(false);
    });
  });

  describe('playback state interaction', () => {
    it('shows controls when media pauses', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.controlsVisible).toBe(false);

      Object.defineProperty(video, 'paused', { value: true, configurable: true });
      video.dispatchEvent(new Event('pause'));
      flush();

      expect(store.state.controlsVisible).toBe(true);
    });

    it('hides controls when media resumes and user is inactive', () => {
      const video = createMockVideo({ paused: true });
      const { store } = createPlayerStore(video);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);

      Object.defineProperty(video, 'paused', { value: false, configurable: true });
      video.dispatchEvent(new Event('play'));
      flush();

      expect(store.state.controlsVisible).toBe(false);
    });
  });

  describe('null container', () => {
    it('does not attach without container', () => {
      const video = createMockVideo({ paused: false });
      const { store } = createPlayerStore(video, null);

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('clears idle timer on detach', () => {
      const video = createMockVideo({ paused: false });
      const store = createStore<PlayerTarget>()(controlsFeature);
      const container = document.createElement('div');

      const detach = store.attach({ media: video, container });
      flush();

      detach();
      flush();

      vi.advanceTimersByTime(IDLE_DELAY);
      flush();

      expect(store.state.userActive).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPlayerStore(video?: HTMLVideoElement, container?: HTMLElement | null) {
  const store = createStore<PlayerTarget>()(controlsFeature);

  const media = video ?? createMockVideo({ paused: true });
  const cont = container === undefined ? document.createElement('div') : container;

  store.attach({ media, container: cont });
  flush();

  return { store, media, container: cont };
}
