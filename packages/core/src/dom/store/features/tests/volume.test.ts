import { describe, expect, it, vi } from 'vitest';

import { volumeFeature } from '../volume';

describe('volumeFeature', () => {
  describe('feature structure', () => {
    it('has unique id symbol', () => {
      expect(volumeFeature.id).toBeTypeOf('symbol');
    });

    it('has correct initial state', () => {
      expect(volumeFeature.initialState).toEqual({
        volume: 1,
        muted: false,
      });
    });

    it('has all request handlers', () => {
      expect(volumeFeature.request.changeVolume).toBeDefined();
      expect(volumeFeature.request.toggleMute).toBeDefined();
    });
  });

  describe('getSnapshot', () => {
    it('captures volume state from video element', () => {
      const video = createMockVideo({
        volume: 0.8,
        muted: false,
      });

      const snapshot = volumeFeature.getSnapshot({
        target: video,
        initialState: volumeFeature.initialState,
      });

      expect(snapshot).toEqual({
        volume: 0.8,
        muted: false,
      });
    });
  });

  describe('subscribe', () => {
    it('calls update on volumechange event', () => {
      const video = createMockVideo({ volume: 0.5, muted: true });
      const update = vi.fn();
      const controller = new AbortController();

      volumeFeature.subscribe({ target: video, update, signal: controller.signal });
      video.dispatchEvent(new Event('volumechange'));

      expect(update).toHaveBeenCalled();
    });
  });

  describe('request handlers', () => {
    describe('changeVolume', () => {
      it('sets volume on target', () => {
        const video = createMockVideo({});

        const result = volumeFeature.request.changeVolume.handler(0.7, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.volume).toBe(0.7);
        expect(result).toBe(0.7);
      });

      it('clamps volume to min 0', () => {
        const video = createMockVideo({});

        volumeFeature.request.changeVolume.handler(-0.5, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.volume).toBe(0);
      });

      it('clamps volume to max 1', () => {
        const video = createMockVideo({});

        volumeFeature.request.changeVolume.handler(1.5, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.volume).toBe(1);
      });
    });

    describe('toggleMute', () => {
      it('toggles mute from false to true', () => {
        const video = createMockVideo({ muted: false });

        const result = volumeFeature.request.toggleMute.handler(undefined, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.muted).toBe(true);
        expect(result).toBe(true);
      });

      it('toggles mute from true to false', () => {
        const video = createMockVideo({ muted: true });

        const result = volumeFeature.request.toggleMute.handler(undefined, {
          target: video,
          signal: new AbortController().signal,
          meta: null,
        });

        expect(video.muted).toBe(false);
        expect(result).toBe(false);
      });
    });
  });
});

function createMockVideo(
  overrides: Partial<{
    volume: number;
    muted: boolean;
  }>,
): HTMLVideoElement {
  const video = document.createElement('video');

  if (overrides.volume !== undefined) {
    video.volume = overrides.volume;
  }
  if (overrides.muted !== undefined) {
    video.muted = overrides.muted;
  }

  return video;
}
