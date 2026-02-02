import { createStore } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';

import type { PlayerTarget } from '../../../types';
import { playbackFeature } from '../playback';

describe('playbackFeature', () => {
  describe('attach', () => {
    it('syncs playback state on attach', () => {
      const video = createMockVideo({
        paused: false,
        ended: false,
        currentTime: 30,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.paused).toBe(false);
      expect(store.state.ended).toBe(false);
      expect(store.state.started).toBe(true);
      expect(store.state.waiting).toBe(false);
    });

    it('detects waiting state when buffering', () => {
      const video = createMockVideo({
        paused: false,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.waiting).toBe(true);
    });

    it('detects started from currentTime', () => {
      const video = createMockVideo({
        paused: true,
        currentTime: 5,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.started).toBe(true);
    });

    it('detects started from playing state', () => {
      const video = createMockVideo({
        paused: false,
        currentTime: 0,
      });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.started).toBe(true);
    });

    it('updates on play event', () => {
      const video = createMockVideo({ paused: true });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.paused).toBe(true);

      // Update mock to playing state
      Object.defineProperty(video, 'paused', { value: false, writable: false, configurable: true });
      video.dispatchEvent(new Event('play'));

      expect(store.state.paused).toBe(false);
    });

    it('updates on pause event', () => {
      const video = createMockVideo({ paused: false });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.paused).toBe(false);

      // Update mock to paused state
      Object.defineProperty(video, 'paused', { value: true, writable: false, configurable: true });
      video.dispatchEvent(new Event('pause'));

      expect(store.state.paused).toBe(true);
    });

    it('updates on ended event', () => {
      const video = createMockVideo({ ended: false });

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      expect(store.state.ended).toBe(false);

      // Update mock to ended state
      Object.defineProperty(video, 'ended', { value: true, writable: false, configurable: true });
      video.dispatchEvent(new Event('ended'));

      expect(store.state.ended).toBe(true);
    });

    it('stops listening when store is destroyed', () => {
      const video = createMockVideo({});

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      store.destroy();

      // Update mock to playing state
      Object.defineProperty(video, 'paused', { value: false, writable: false, configurable: true });
      video.dispatchEvent(new Event('play'));

      // State should not update after destroy
      expect(store.state.paused).toBe(true);
    });
  });

  describe('actions', () => {
    it('play() calls play on target', async () => {
      const video = createMockVideo({});
      video.play = vi.fn().mockResolvedValue(undefined);

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      await store.play();

      expect(video.play).toHaveBeenCalled();
    });

    it('pause() calls pause on target', () => {
      const video = createMockVideo({});
      video.pause = vi.fn();

      const store = createStore<PlayerTarget>()(playbackFeature);
      store.attach({ media: video, container: null });

      store.pause();

      expect(video.pause).toHaveBeenCalled();
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    paused: boolean;
    ended: boolean;
    currentTime: number;
    readyState: number;
  }>
): HTMLVideoElement {
  const video = document.createElement('video');

  if (overrides.paused !== undefined) {
    Object.defineProperty(video, 'paused', { value: overrides.paused, writable: false, configurable: true });
  }
  if (overrides.ended !== undefined) {
    Object.defineProperty(video, 'ended', { value: overrides.ended, writable: false, configurable: true });
  }
  if (overrides.currentTime !== undefined) {
    video.currentTime = overrides.currentTime;
  }
  if (overrides.readyState !== undefined) {
    Object.defineProperty(video, 'readyState', { value: overrides.readyState, writable: false, configurable: true });
  }

  return video;
}
