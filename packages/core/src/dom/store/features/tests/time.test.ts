import { describe, expect, it, vi } from 'vitest';

import { timeFeature } from '../time';

describe('timeFeature', () => {
  describe('feature structure', () => {
    it('has unique id symbol', () => {
      expect(timeFeature.id).toBeTypeOf('symbol');
    });

    it('has correct initial state', () => {
      expect(timeFeature.initialState).toEqual({
        currentTime: 0,
        duration: 0,
      });
    });

    it('has seek request handler', () => {
      expect(timeFeature.request.seek).toBeDefined();
      expect(timeFeature.request.seek).toMatchObject({
        key: 'seek',
        guard: [],
        handler: expect.any(Function),
      });
    });
  });

  describe('getSnapshot', () => {
    it('captures current time state from video element', () => {
      const video = createMockVideo({
        currentTime: 30,
        duration: 120,
      });

      const snapshot = timeFeature.getSnapshot({
        target: video,
        initialState: timeFeature.initialState,
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
        initialState: timeFeature.initialState,
      });

      expect(snapshot.duration).toBe(0);
    });
  });

  describe('subscribe', () => {
    it('calls update on timeupdate event', () => {
      const video = createMockVideo({ currentTime: 42 });
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({ target: video, update, signal: controller.signal });
      video.dispatchEvent(new Event('timeupdate'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on durationchange event', () => {
      const video = createMockVideo({ duration: 100 });
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({ target: video, update, signal: controller.signal });
      video.dispatchEvent(new Event('durationchange'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on seeked event', () => {
      const video = createMockVideo({ currentTime: 50 });
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({ target: video, update, signal: controller.signal });
      video.dispatchEvent(new Event('seeked'));

      expect(update).toHaveBeenCalled();
    });

    it('calls update on emptied event', () => {
      const video = createMockVideo({});
      const update = vi.fn();
      const controller = new AbortController();

      timeFeature.subscribe({ target: video, update, signal: controller.signal });
      video.dispatchEvent(new Event('emptied'));

      expect(update).toHaveBeenCalled();
    });
  });

  describe('request handlers', () => {
    describe('seek', () => {
      it('sets currentTime on target and waits for seeked event', async () => {
        const video = createMockVideo({});

        const resultPromise = timeFeature.request.seek.handler(45, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.currentTime).toBe(45);

        // Simulate browser firing seeked event
        video.dispatchEvent(new Event('seeked'));

        const result = await resultPromise;
        expect(result).toBe(45);
      });

      it('rejects if signal is aborted before seeked', async () => {
        const video = createMockVideo({});
        const controller = new AbortController();

        const resultPromise = timeFeature.request.seek.handler(30, {
          target: video,
          signal: controller.signal,
          meta: null,
        });

        controller.abort();

        await expect(resultPromise).rejects.toThrow();
      });
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    currentTime: number;
    duration: number;
  }>,
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
