import { createStore, flush } from '@videojs/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlayerTarget } from '../../../media/types';
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

    it('sets inactive immediately on pointerleave', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('pointerleave'));
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('keeps controlsVisible true on pointerleave when paused', () => {
      const video = createMockVideo({ paused: true });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('pointerleave'));
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
    });
  });

  describe('touch tap-to-toggle', () => {
    it('hides controls on tap when visible and playing', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);

      container!.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch' }));
      flush();

      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(false);
    });

    it('keeps controls visible on tap when paused', () => {
      const video = createMockVideo({ paused: true });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);

      container!.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch' }));
      flush();

      // userActive goes false but controlsVisible stays true (paused)
      expect(store.state.userActive).toBe(false);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('shows controls on tap when hidden', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      // First tap to hide
      container!.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container!.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch' }));
      flush();

      expect(store.state.controlsVisible).toBe(false);

      // Second tap to show
      container!.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);
      container!.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch' }));
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('does not toggle on long press', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(300);

      container!.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'touch' }));
      flush();

      expect(store.state.userActive).toBe(true);
      expect(store.state.controlsVisible).toBe(true);
    });

    it('does not toggle for mouse clicks', () => {
      const video = createMockVideo({ paused: false });
      const { store, container } = createPlayerStore(video);

      container!.dispatchEvent(new Event('pointerdown'));
      vi.advanceTimersByTime(100);

      container!.dispatchEvent(createPointerEvent('pointerup', { pointerType: 'mouse' }));
      flush();

      expect(store.state.userActive).toBe(true);
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

function createMockVideo(
  overrides: Partial<{
    paused: boolean;
    ended: boolean;
    currentTime: number;
    readyState: number;
    tagName: string;
  }> = {}
): HTMLVideoElement {
  const video = document.createElement(overrides.tagName === 'AUDIO' ? 'audio' : 'video') as HTMLVideoElement;

  if (overrides.paused !== undefined) {
    Object.defineProperty(video, 'paused', { value: overrides.paused, configurable: true });
  }
  if (overrides.ended !== undefined) {
    Object.defineProperty(video, 'ended', { value: overrides.ended, configurable: true });
  }
  if (overrides.currentTime !== undefined) {
    video.currentTime = overrides.currentTime;
  }
  if (overrides.readyState !== undefined) {
    Object.defineProperty(video, 'readyState', { value: overrides.readyState, configurable: true });
  }

  return video;
}

function createContainer(): HTMLElement {
  return document.createElement('div');
}

function createPointerEvent(type: string, init?: { pointerType?: string }): Event {
  const event = new Event(type, { bubbles: true });
  (event as unknown as Record<string, unknown>).pointerType = init?.pointerType ?? '';
  return event;
}

function createPlayerStore(video?: HTMLVideoElement, container?: HTMLElement | null) {
  const store = createStore<PlayerTarget>()(controlsFeature);

  const media = video ?? createMockVideo({ paused: true });
  const cont = container === undefined ? createContainer() : container;

  store.attach({ media, container: cont });
  flush();

  return { store, media, container: cont };
}
