import { createStore } from '@videojs/store';
import { noop } from '@videojs/utils/function';
import { describe, expect, it, vi } from 'vitest';

import type { VolumeState } from '../volume';
import { volumeFeature } from '../volume';

const mockState = () =>
  ({
    volume: 1,
    muted: false,
    changeVolume: noop,
    toggleMute: noop,
  }) as unknown as VolumeState;

describe('volumeFeature', () => {
  describe('getSnapshot', () => {
    it('captures volume state from video element', () => {
      const video = createMockVideo({
        volume: 0.8,
        muted: false,
      });

      const snapshot = volumeFeature.getSnapshot({
        target: video,
        get: mockState,
        initialState: mockState(),
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

      volumeFeature.subscribe({
        target: video,
        update,
        signal: controller.signal,
        get: mockState,
      });
      video.dispatchEvent(new Event('volumechange'));

      expect(update).toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    describe('changeVolume', () => {
      it('sets volume on target', async () => {
        const video = createMockVideo({});
        const store = createStore({ features: [volumeFeature] });
        store.attach(video);

        const result = await store.changeVolume(0.7);

        expect(video.volume).toBe(0.7);
        expect(result).toBe(0.7);
      });

      it('clamps volume to min 0', async () => {
        const video = createMockVideo({});
        const store = createStore({ features: [volumeFeature] });
        store.attach(video);

        await store.changeVolume(-0.5);

        expect(video.volume).toBe(0);
      });

      it('clamps volume to max 1', async () => {
        const video = createMockVideo({});
        const store = createStore({ features: [volumeFeature] });
        store.attach(video);

        await store.changeVolume(1.5);

        expect(video.volume).toBe(1);
      });
    });

    describe('toggleMute', () => {
      it('toggles mute from false to true', async () => {
        const video = createMockVideo({ muted: false });
        const store = createStore({ features: [volumeFeature] });
        store.attach(video);

        const result = await store.toggleMute();

        expect(video.muted).toBe(true);
        expect(result).toBe(true);
      });

      it('toggles mute from true to false', async () => {
        const video = createMockVideo({ muted: true });
        const store = createStore({ features: [volumeFeature] });
        store.attach(video);

        const result = await store.toggleMute();

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
  }>
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
