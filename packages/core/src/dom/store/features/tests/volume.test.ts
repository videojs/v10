import { createStore } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import type { StorageAdapter } from '../../../storage';
import { createMockVideo } from '../../../tests/test-helpers';
import { createVolumeFeature, volumeFeature } from '../volume';

describe('volumeFeature', () => {
  describe('attach', () => {
    it('syncs volume state on attach', () => {
      const video = createMockVideo({
        volume: 0.8,
        muted: false,
      });

      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.volume).toBe(0.8);
      expect(store.state.muted).toBe(false);
    });

    it('sets volumeAvailability on attach', () => {
      const video = createMockVideo({});
      const store = createStore<PlayerTarget>()(volumeFeature);
      store.attach({ media: video, container: null });

      // Should be 'available' or 'unsupported' based on browser capability
      expect(['available', 'unsupported']).toContain(store.state.volumeAvailability);
    });

    it('updates on volumechange event', () => {
      const video = createMockVideo({ volume: 1, muted: false });

      const store = createStore<PlayerTarget>()(volumeFeature);
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
    describe('setVolume', () => {
      it('sets volume on target', async () => {
        const video = createMockVideo({});
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        const result = await store.setVolume(0.7);

        expect(video.volume).toBe(0.7);
        expect(result).toBe(0.7);
      });

      it('clamps volume to min 0', async () => {
        const video = createMockVideo({});
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        await store.setVolume(-0.5);

        expect(video.volume).toBe(0);
      });

      it('clamps volume to max 1', async () => {
        const video = createMockVideo({});
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        await store.setVolume(1.5);

        expect(video.volume).toBe(1);
      });

      it('unmutes when setting volume above 0 while muted', async () => {
        const video = createMockVideo({ muted: true, volume: 0.5 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        await store.setVolume(0.7);

        expect(video.volume).toBe(0.7);
        expect(video.muted).toBe(false);
      });

      it('does not unmute when setting volume to 0', async () => {
        const video = createMockVideo({ muted: true, volume: 0.5 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        await store.setVolume(0);

        expect(video.volume).toBe(0);
        expect(video.muted).toBe(true);
      });

      it('does not change muted when already unmuted', async () => {
        const video = createMockVideo({ muted: false, volume: 0.5 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        await store.setVolume(0.8);

        expect(video.volume).toBe(0.8);
        expect(video.muted).toBe(false);
      });
    });

    describe('toggleMuted', () => {
      it('mutes when unmuted with volume > 0', async () => {
        const video = createMockVideo({ muted: false, volume: 0.8 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        const result = await store.toggleMuted();

        expect(video.muted).toBe(true);
        expect(video.volume).toBe(0.8);
        expect(result).toBe(true);
      });

      it('unmutes when muted with volume > 0', async () => {
        const video = createMockVideo({ muted: true, volume: 0.6 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        const result = await store.toggleMuted();

        expect(video.muted).toBe(false);
        expect(video.volume).toBe(0.6);
        expect(result).toBe(false);
      });

      it('restores volume to 0.25 when unmuting at volume 0', async () => {
        const video = createMockVideo({ muted: true, volume: 0 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        await store.toggleMuted();

        expect(video.muted).toBe(false);
        expect(video.volume).toBe(0.25);
      });

      it('unmutes and restores volume when volume is 0 and not muted', async () => {
        const video = createMockVideo({ muted: false, volume: 0 });
        const store = createStore<PlayerTarget>()(volumeFeature);
        store.attach({ media: video, container: null });

        const result = await store.toggleMuted();

        expect(video.muted).toBe(false);
        expect(video.volume).toBe(0.25);
        expect(result).toBe(false);
      });
    });
  });
});

describe('createVolumeFeature', () => {
  function makeAdapter(initial: Record<string, string> = {}): StorageAdapter & { store: Record<string, string> } {
    const store: Record<string, string> = { ...initial };
    return {
      store,
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
    };
  }

  describe('attach with adapter', () => {
    it('restores stored volume on attach', () => {
      const adapter = makeAdapter({ 'vjs-pref-volume': '0.4' });
      const video = createMockVideo({ volume: 1, muted: false });

      const store = createStore<PlayerTarget>()(createVolumeFeature(adapter));
      store.attach({ media: video, container: null });

      expect(video.volume).toBe(0.4);
      expect(store.state.volume).toBe(0.4);
    });

    it('restores stored muted on attach', () => {
      const adapter = makeAdapter({ 'vjs-pref-muted': 'true' });
      const video = createMockVideo({ volume: 1, muted: false });

      const store = createStore<PlayerTarget>()(createVolumeFeature(adapter));
      store.attach({ media: video, container: null });

      expect(video.muted).toBe(true);
      expect(store.state.muted).toBe(true);
    });

    it('ignores missing stored values', () => {
      const adapter = makeAdapter({});
      const video = createMockVideo({ volume: 0.7, muted: false });

      const store = createStore<PlayerTarget>()(createVolumeFeature(adapter));
      store.attach({ media: video, container: null });

      expect(store.state.volume).toBe(0.7);
      expect(store.state.muted).toBe(false);
    });

    it('ignores invalid stored volume', () => {
      const adapter = makeAdapter({ 'vjs-pref-volume': 'not-a-number' });
      const video = createMockVideo({ volume: 0.6, muted: false });

      const store = createStore<PlayerTarget>()(createVolumeFeature(adapter));
      store.attach({ media: video, container: null });

      expect(store.state.volume).toBe(0.6);
    });

    it('clamps stored volume to 0–1', () => {
      const adapter = makeAdapter({ 'vjs-pref-volume': '1.5' });
      const video = createMockVideo({ volume: 1, muted: false });

      const store = createStore<PlayerTarget>()(createVolumeFeature(adapter));
      store.attach({ media: video, container: null });

      expect(video.volume).toBe(1);
    });

    it('writes to adapter on volumechange', () => {
      const adapter = makeAdapter({});
      const video = createMockVideo({ volume: 1, muted: false });

      const store = createStore<PlayerTarget>()(createVolumeFeature(adapter));
      store.attach({ media: video, container: null });

      video.volume = 0.3;
      video.muted = true;
      video.dispatchEvent(new Event('volumechange'));

      expect(adapter.store['vjs-pref-volume']).toBe('0.3');
      expect(adapter.store['vjs-pref-muted']).toBe('true');
    });

    it('writes initial state to adapter on attach', () => {
      const adapter = makeAdapter({});
      const video = createMockVideo({ volume: 0.8, muted: false });

      createStore<PlayerTarget>()(createVolumeFeature(adapter)).attach({ media: video, container: null });

      expect(adapter.store['vjs-pref-volume']).toBe('0.8');
      expect(adapter.store['vjs-pref-muted']).toBe('false');
    });
  });

  it('behaves identically to volumeFeature when no adapter provided', () => {
    const video = createMockVideo({ volume: 0.5, muted: true });

    const store = createStore<PlayerTarget>()(createVolumeFeature());
    store.attach({ media: video, container: null });

    expect(store.state.volume).toBe(0.5);
    expect(store.state.muted).toBe(true);
  });

  it('getItem returning null for a key is handled silently', () => {
    const adapter: StorageAdapter = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };
    const video = createMockVideo({ volume: 0.9, muted: false });

    const store = createStore<PlayerTarget>()(createVolumeFeature(adapter));
    expect(() => store.attach({ media: video, container: null })).not.toThrow();
    expect(store.state.volume).toBe(0.9);
  });
});
