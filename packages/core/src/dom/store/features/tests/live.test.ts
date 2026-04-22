import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vitest';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { liveFeature } from '../live';

interface LiveCapableMedia extends EventTarget {
  liveEdgeStart: number;
  targetLiveWindow: number;
}

function createLiveMedia(initial: Partial<LiveCapableMedia> = {}): LiveCapableMedia {
  const target = new EventTarget() as LiveCapableMedia;
  target.liveEdgeStart = initial.liveEdgeStart ?? Number.NaN;
  target.targetLiveWindow = initial.targetLiveWindow ?? Number.NaN;
  return target;
}

describe('liveFeature', () => {
  describe('fallback (media without live-edge properties)', () => {
    it('stays at `NaN` / `NaN` when the media is not live-edge capable', () => {
      const video = createMockVideo({ duration: 120 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: video, container: null });

      expect(store.state.liveEdgeStart).toBeNaN();
      expect(store.state.targetLiveWindow).toBeNaN();
    });
  });

  describe('capable media', () => {
    it('reads initial values on attach', () => {
      const media = createLiveMedia({ liveEdgeStart: 42, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      expect(store.state.liveEdgeStart).toBe(42);
      expect(store.state.targetLiveWindow).toBe(0);
    });

    it('re-reads both on `targetlivewindowchange`', () => {
      const media = createLiveMedia({ liveEdgeStart: 42, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = 102;
      media.targetLiveWindow = Number.POSITIVE_INFINITY;
      media.dispatchEvent(new Event('targetlivewindowchange'));

      expect(store.state.liveEdgeStart).toBe(102);
      expect(store.state.targetLiveWindow).toBe(Number.POSITIVE_INFINITY);
    });

    it('re-reads `liveEdgeStart` on `progress`', () => {
      const media = createLiveMedia({ liveEdgeStart: 42, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = 100;
      media.dispatchEvent(new Event('progress'));

      expect(store.state.liveEdgeStart).toBe(100);
    });

    it('re-reads `liveEdgeStart` on `durationchange`', () => {
      const media = createLiveMedia({ liveEdgeStart: 42, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = 200;
      media.dispatchEvent(new Event('durationchange'));

      expect(store.state.liveEdgeStart).toBe(200);
    });

    it('re-reads `liveEdgeStart` on `loadedmetadata`', () => {
      const media = createLiveMedia({ liveEdgeStart: Number.NaN, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = 50;
      media.dispatchEvent(new Event('loadedmetadata'));

      expect(store.state.liveEdgeStart).toBe(50);
    });

    it('re-reads `liveEdgeStart` on `canplay`', () => {
      const media = createLiveMedia({ liveEdgeStart: Number.NaN, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = 40;
      media.dispatchEvent(new Event('canplay'));

      expect(store.state.liveEdgeStart).toBe(40);
    });

    it('re-reads `liveEdgeStart` on `timeupdate` (tracks moving live edge)', () => {
      const media = createLiveMedia({ liveEdgeStart: 42, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = 43;
      media.dispatchEvent(new Event('timeupdate'));
      expect(store.state.liveEdgeStart).toBe(43);

      media.liveEdgeStart = 44;
      media.dispatchEvent(new Event('timeupdate'));
      expect(store.state.liveEdgeStart).toBe(44);
    });

    it('re-reads `liveEdgeStart` on `streamtypechange`', () => {
      const media = createLiveMedia({ liveEdgeStart: 42, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = Number.NaN;
      media.dispatchEvent(new Event('streamtypechange'));

      expect(store.state.liveEdgeStart).toBeNaN();
    });

    it('resets on `emptied`', () => {
      const media = createLiveMedia({ liveEdgeStart: 42, targetLiveWindow: 0 });

      const store = createStore<PlayerTarget>()(liveFeature);
      store.attach({ media: media as unknown as PlayerTarget['media'], container: null });

      media.liveEdgeStart = Number.NaN;
      media.targetLiveWindow = Number.NaN;
      media.dispatchEvent(new Event('emptied'));

      expect(store.state.liveEdgeStart).toBeNaN();
      expect(store.state.targetLiveWindow).toBeNaN();
    });
  });
});
