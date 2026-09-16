import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vite-plus/test';

import type { PlayerTarget } from '../../../player';
import { createMockVideo } from '../../../tests/test-helpers';
import { playbackRateFeature } from '../playback-rate';

describe('playbackRateFeature', () => {
  it('exposes the supported playback rates', () => {
    const store = createStore<PlayerTarget>()(playbackRateFeature);

    expect(store.state.playbackRates).toEqual([0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2]);
    expect(store.state.playbackRate).toBe(1);
  });

  it('syncs the playback rate on attach', () => {
    const video = createMockVideo();
    const store = createStore<PlayerTarget>()(playbackRateFeature);

    video.playbackRate = 1.5;
    store.attach({ media: video, container: null });

    expect(store.state.playbackRate).toBe(1.5);
  });

  it('updates when the media playback rate changes', () => {
    const video = createMockVideo();
    const store = createStore<PlayerTarget>()(playbackRateFeature);

    store.attach({ media: video, container: null });
    video.playbackRate = 0.5;
    video.dispatchEvent(new Event('ratechange'));

    expect(store.state.playbackRate).toBe(0.5);
  });

  it('sets the playback rate on capable media', () => {
    const video = createMockVideo();
    const store = createStore<PlayerTarget>()(playbackRateFeature);

    store.attach({ media: video, container: null });
    store.setPlaybackRate(1.7);

    expect(video.playbackRate).toBe(1.7);
  });

  it('leaves incapable media unchanged', () => {
    const media = new EventTarget();
    const store = createStore<PlayerTarget>()(playbackRateFeature);

    // SAFETY: The feature deliberately accepts capability subsets and rejects this one before reading media fields.
    store.attach({ media: media as PlayerTarget['media'], container: null });
    store.setPlaybackRate(2);
    media.dispatchEvent(new Event('ratechange'));

    expect(store.state.playbackRate).toBe(1);
    expect('playbackRate' in media).toBe(false);
  });
});
