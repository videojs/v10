import { type MediaStreamType, MediaStreamTypes } from '@videojs/media';
import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vite-plus/test';

import type { PlayerTarget } from '../../../player';
import { createMockVideo } from '../../../tests/test-helpers';
import { streamTypeFeature } from '../stream-type';

describe('streamTypeFeature', () => {
  describe('fallback (no `streamType` property on media)', () => {
    it('defaults to `unknown` when duration is not known', () => {
      const video = createMockVideo({ duration: Number.NaN });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.UNKNOWN);
    });

    it('detects `live` from infinite duration', () => {
      const video = createMockVideo({ duration: Number.POSITIVE_INFINITY });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.LIVE);
    });

    it('detects `on-demand` from a finite duration', () => {
      const video = createMockVideo({ duration: 120 });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.ON_DEMAND);
    });

    it('updates on `durationchange`', () => {
      const video = createMockVideo({ duration: Number.NaN });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.UNKNOWN);

      Object.defineProperty(video, 'duration', { value: 120, configurable: true });
      video.dispatchEvent(new Event('durationchange'));

      expect(store.state.streamType).toBe(MediaStreamTypes.ON_DEMAND);
    });

    it('resets to `unknown` on `emptied`', () => {
      const video = createMockVideo({ duration: 120 });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media: video, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.ON_DEMAND);

      Object.defineProperty(video, 'duration', { value: Number.NaN, configurable: true });
      video.dispatchEvent(new Event('emptied'));

      expect(store.state.streamType).toBe(MediaStreamTypes.UNKNOWN);
    });
  });

  describe('native (media exposes `streamType`)', () => {
    it('reads `streamType` directly when available', () => {
      const streamType: MediaStreamType = MediaStreamTypes.LIVE;
      const media: HTMLVideoElement & { streamType: MediaStreamType } = Object.assign(createMockVideo(), {
        streamType,
      });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.LIVE);
    });

    it('syncs on `streamtypechange`', () => {
      const streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
      const media: HTMLVideoElement & { streamType: MediaStreamType } = Object.assign(createMockVideo(), {
        streamType,
      });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.UNKNOWN);

      media.streamType = MediaStreamTypes.LIVE;
      media.dispatchEvent(new Event('streamtypechange'));

      expect(store.state.streamType).toBe(MediaStreamTypes.LIVE);

      media.streamType = MediaStreamTypes.ON_DEMAND;
      media.dispatchEvent(new Event('streamtypechange'));

      expect(store.state.streamType).toBe(MediaStreamTypes.ON_DEMAND);
    });

    it('prefers native `streamType` over duration-based fallback', () => {
      // Build an object that has both a finite duration and a user-asserted
      // `streamType` — the feature should trust the explicit stream type.
      const media = Object.assign(createMockVideo({ duration: 120 }), {
        streamType: MediaStreamTypes.LIVE,
      });

      const store = createStore<PlayerTarget>()(streamTypeFeature);
      store.attach({ media, container: null });

      expect(store.state.streamType).toBe(MediaStreamTypes.LIVE);
    });
  });
});
