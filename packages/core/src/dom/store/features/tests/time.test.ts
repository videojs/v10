import { createStore } from '@videojs/store';
import { noop } from '@videojs/utils/function';
import { describe, expect, it, vi } from 'vitest';

import type { TimeState } from '../time';
import { timeFeature } from '../time';

const mockState = () =>
  ({
    currentTime: 0,
    duration: 0,
    seek: noop,
  }) as unknown as TimeState;

describe('timeFeature', () => {
  describe('getSnapshot', () => {
    it('captures current time state from video element', () => {
      const video = createMockVideo({
        currentTime: 30,
        duration: 120,
      });

      const snapshot = timeFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot).toEqual({
        currentTime: 30,
        duration: 120,
      });
    });

    it('handles NaN duration', () => {
      const video = createMockVideo({
        currentTime: 0,
        duration: Number.NaN,
      });

      const snapshot = timeFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
      });

      expect(snapshot.duration).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('calls update on timeupdate event', () => {
      const video = createMockVideo({ currentTime: 42 });
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('timeupdate'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on durationchange event', () => {
      const video = createMockVideo({ duration: 100 });
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('durationchange'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on seeked event', () => {
      const video = createMockVideo({ currentTime: 50 });
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('seeked'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on emptied event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('emptied'));

      expect(update).toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    describe('seek', () => {
      it('sets currentTime on target and waits for seeked event', async () => {
        const video = createMockVideo({});
        const store = createStore({ features: [timeFeature] });
        store.attach(video);

        const resultPromise = store.seek(45);

        expect(video.currentTime).toBe(45);

        // Simulate browser firing seeked event
        video.dispatchEvent(new Event('seeked'));

        const result = await resultPromise;
        expect(result).toBe(45);
      });
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    currentTime: number;
    duration: number;
  }>
): HTMLVideoElement {
  const video = document.createElement('video');

  if (overrides.currentTime !== undefined) {
    video.currentTime = overrides.currentTime;
  }
  if (overrides.duration !== undefined) {
    Object.defineProperty(video, 'duration', { value: overrides.duration, writable: false });
  }

  return video;
}
