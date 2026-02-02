import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';

import { volumeFeature } from '../volume';

describe('volumeFeature', () => {
  describe('attach', () => {
    it('syncs volume state on attach', () => {
      const video = createMockVideo({
        volume: 0.8,
        muted: false,
      });

      const store = createStore({ features: [volumeFeature] });
      store.attach({ media: video, container: null });

      expect(store.state.volume).toBe(0.8);
      expect(store.state.muted).toBe(false);
    });

    it('sets volumeAvailability on attach', () => {
      const video = createMockVideo({});
      const store = createStore({ features: [volumeFeature] });
      store.attach({ media: video, container: null });

      // Should be 'available' or 'unsupported' based on browser capability
      expect(['available', 'unsupported']).toContain(store.state.volumeAvailability);
    });

    it('updates on volumechange event', () => {
      const video = createMockVideo({ volume: 1, muted: false });

      const store = createStore({ features: [volumeFeature] });
      store.attach({ media: video, container: null });

      expect(store.state.volume).toBe(1);

      // Update mock volume
      video.volume = 0.5;
      video.muted = true;
      video.dispatchEvent(new Event('volumechange'));

      expect(store.state.volume).toBe(0.5);
      expect(store.state.muted).toBe(true);
    });
  });

  describe('actions', () => {
    describe('changeVolume', () => {
      it('sets volume on target', async () => {
        const video = createMockVideo({});
        const store = createStore({ features: [volumeFeature] });
        store.attach({ media: video, container: null });

        const result = await store.changeVolume(0.7);

        expect(video.volume).toBe(0.7);
        expect(result).toBe(0.7);
      });

      it('clamps volume to min 0', async () => {
        const video = createMockVideo({});
        const store = createStore({ features: [volumeFeature] });
        store.attach({ media: video, container: null });

        await store.changeVolume(-0.5);

        expect(video.volume).toBe(0);
      });

      it('clamps volume to max 1', async () => {
        const video = createMockVideo({});
        const store = createStore({ features: [volumeFeature] });
        store.attach({ media: video, container: null });

        await store.changeVolume(1.5);

        expect(video.volume).toBe(1);
      });
    });

    describe('toggleMute', () => {
      it('toggles mute from false to true', async () => {
        const video = createMockVideo({ muted: false });
        const store = createStore({ features: [volumeFeature] });
        store.attach({ media: video, container: null });

        const result = await store.toggleMute();

        expect(video.muted).toBe(true);
        expect(result).toBe(true);
      });

      it('toggles mute from true to false', async () => {
        const video = createMockVideo({ muted: true });
        const store = createStore({ features: [volumeFeature] });
        store.attach({ media: video, container: null });

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
