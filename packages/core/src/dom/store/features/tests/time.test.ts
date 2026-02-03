import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';

import type { PlayerTarget } from '../../../media/types';
import { timeFeature } from '../time';

describe('timeFeature', () => {
  describe('attach', () => {
    it('syncs time state on attach', () => {
      const video = createMockVideo({
        currentTime: 30,
        duration: 120,
      });

      const store = createStore<PlayerTarget>()(timeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.currentTime).toBe(30);
      expect(store.state.duration).toBe(120);
    });

    it('handles NaN duration', () => {
      const video = createMockVideo({
        currentTime: 0,
        duration: Number.NaN,
      });

      const store = createStore<PlayerTarget>()(timeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.duration).toBe(0);
    });

    it('updates on timeupdate event', () => {
      const video = createMockVideo({ currentTime: 0 });

      const store = createStore<PlayerTarget>()(timeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.currentTime).toBe(0);

      // Update mock currentTime
      video.currentTime = 42;
      video.dispatchEvent(new Event('timeupdate'));

      expect(store.state.currentTime).toBe(42);
    });

    it('updates on durationchange event', () => {
      const video = createMockVideo({ duration: 0 });

      const store = createStore<PlayerTarget>()(timeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.duration).toBe(0);

      // Update mock duration
      Object.defineProperty(video, 'duration', { value: 100, writable: false, configurable: true });
      video.dispatchEvent(new Event('durationchange'));

      expect(store.state.duration).toBe(100);
    });

    it('updates on seeked event', () => {
      const video = createMockVideo({ currentTime: 0 });

      const store = createStore<PlayerTarget>()(timeFeature);
      store.attach({ media: video, container: null });

      // Update mock currentTime
      video.currentTime = 50;
      video.dispatchEvent(new Event('seeked'));

      expect(store.state.currentTime).toBe(50);
    });

    it('updates on emptied event', () => {
      const video = createMockVideo({
        currentTime: 30,
        duration: 120,
      });

      const store = createStore<PlayerTarget>()(timeFeature);
      store.attach({ media: video, container: null });

      // Update mock to empty state
      video.currentTime = 0;
      Object.defineProperty(video, 'duration', { value: Number.NaN, writable: false, configurable: true });
      video.dispatchEvent(new Event('emptied'));

      expect(store.state.currentTime).toBe(0);
      expect(store.state.duration).toBe(0);
    });
  });

  describe('actions', () => {
    describe('seek', () => {
      it('sets currentTime on target and waits for seeked event', async () => {
        const video = createMockVideo({});
        const store = createStore<PlayerTarget>()(timeFeature);
        store.attach({ media: video, container: null });

        const resultPromise = store.seek(45);

        expect(video.currentTime).toBe(45);

        // Simulate browser firing seeked event
        video.dispatchEvent(new Event('seeked'));

        const result = await resultPromise;
        expect(result).toBe(45);
      });

      it('aborts pending seek on detach', async () => {
        const video = createMockVideo({});
        const store = createStore<PlayerTarget>()(timeFeature);
        const detach = store.attach({ media: video, container: null });

        const resultPromise = store.seek(45);

        expect(video.currentTime).toBe(45);

        // Detach before seeked event fires
        detach();

        // Should resolve with current time (seek was aborted)
        const result = await resultPromise;
        expect(result).toBe(45);
      });

      it('supersedes previous seek when new seek starts', async () => {
        const video = createMockVideo({});
        const store = createStore<PlayerTarget>()(timeFeature);
        store.attach({ media: video, container: null });

        // Start first seek
        const seek1Promise = store.seek(10);

        // Start second seek before first completes (supersedes)
        const seek2Promise = store.seek(20);

        expect(video.currentTime).toBe(20);

        // First seek should resolve immediately (aborted)
        const result1 = await seek1Promise;
        expect(result1).toBe(20); // Returns current position

        // Fire seeked for second seek
        video.dispatchEvent(new Event('seeked'));

        const result2 = await seek2Promise;
        expect(result2).toBe(20);
      });
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    currentTime: number;
    duration: number;
    readyState: number;
  }> = {}
): HTMLVideoElement {
  const video = document.createElement('video');

  if (overrides.currentTime !== undefined) {
    video.currentTime = overrides.currentTime;
  }
  if (overrides.duration !== undefined) {
    Object.defineProperty(video, 'duration', { value: overrides.duration, writable: false, configurable: true });
  }
  // Default to HAVE_METADATA so seek tests work without waiting for loadedmetadata
  Object.defineProperty(video, 'readyState', {
    value: overrides.readyState ?? HTMLMediaElement.HAVE_METADATA,
    writable: false,
    configurable: true,
  });

  return video;
}
