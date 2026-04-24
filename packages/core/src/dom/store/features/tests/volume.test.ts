import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideoHost } from '../../../tests/test-helpers';
import { volumeFeature } from '../volume';

describe('volumeFeature', () => {
  describe('attach', () => {
    it('syncs volume state on attach', () => {
      const { host } = createMockVideoHost({
        volume: 0.8,
        muted: false,
      });

      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: host, container: null });

      expect(store.state.volume).toBe(0.8);
      expect(store.state.muted).toBe(false);
    });

    it('sets volumeAvailability on attach', () => {
      const { host } = createMockVideoHost({});
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: host, container: null });

      // Should be 'available' or 'unsupported' based on browser capability
      expect(['available', 'unsupported']).toContain(store.state.volumeAvailability);
    });

    it('updates on volumechange event', () => {
      const { host, video } = createMockVideoHost({ volume: 1, muted: false });

      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: host, container: null });

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
    describe('setVolume', () => {
      it('sets volume on target', async () => {
        const { host, video } = createMockVideoHost({});
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        const result = await store.setVolume(0.7);

        expect(video.volume).toBe(0.7);
        expect(result).toBe(0.7);
      });

      it('clamps volume to min 0', async () => {
        const { host, video } = createMockVideoHost({});
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        await store.setVolume(-0.5);

        expect(video.volume).toBe(0);
      });

      it('clamps volume to max 1', async () => {
        const { host, video } = createMockVideoHost({});
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        await store.setVolume(1.5);

        expect(video.volume).toBe(1);
      });

      it('unmutes when setting volume above 0 while muted', async () => {
        const { host, video } = createMockVideoHost({ muted: true, volume: 0.5 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        await store.setVolume(0.7);

        expect(video.volume).toBe(0.7);
        expect(video.muted).toBe(false);
      });

      it('does not unmute when setting volume to 0', async () => {
        const { host, video } = createMockVideoHost({ muted: true, volume: 0.5 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        await store.setVolume(0);

        expect(video.volume).toBe(0);
        expect(video.muted).toBe(true);
      });

      it('does not change muted when already unmuted', async () => {
        const { host, video } = createMockVideoHost({ muted: false, volume: 0.5 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        await store.setVolume(0.8);

        expect(video.volume).toBe(0.8);
        expect(video.muted).toBe(false);
      });
    });

    describe('toggleMuted', () => {
      it('mutes when unmuted with volume > 0', async () => {
        const { host, video } = createMockVideoHost({ muted: false, volume: 0.8 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        const result = await store.toggleMuted();

        expect(video.muted).toBe(true);
        expect(video.volume).toBe(0.8);
        expect(result).toBe(true);
      });

      it('unmutes when muted with volume > 0', async () => {
        const { host, video } = createMockVideoHost({ muted: true, volume: 0.6 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        const result = await store.toggleMuted();

        expect(video.muted).toBe(false);
        expect(video.volume).toBe(0.6);
        expect(result).toBe(false);
      });

      it('restores volume to 0.25 when unmuting at volume 0', async () => {
        const { host, video } = createMockVideoHost({ muted: true, volume: 0 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        await store.toggleMuted();

        expect(video.muted).toBe(false);
        expect(video.volume).toBe(0.25);
      });

      it('unmutes and restores volume when volume is 0 and not muted', async () => {
        const { host, video } = createMockVideoHost({ muted: false, volume: 0 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: host, container: null });

        const result = await store.toggleMuted();

        expect(video.muted).toBe(false);
        expect(video.volume).toBe(0.25);
        expect(result).toBe(false);
      });
    });
  });
});
