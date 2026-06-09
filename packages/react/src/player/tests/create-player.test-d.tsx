import type { AudioPlayerStore, PlayerStore, PlayerTarget, VideoPlayerStore } from '@videojs/core/dom';
import { audioFeatures, definePlayerFeature, features, videoFeatures } from '@videojs/core/dom';
import type { Slice } from '@videojs/store';
import { assertType, describe, it } from 'vitest';

import { type CreatePlayerResult, createPlayer } from '../create-player';

describe('createPlayer', () => {
  it('resolves video features to VideoPlayerStore', () => {
    const result = createPlayer({ features: videoFeatures });

    assertType<CreatePlayerResult<VideoPlayerStore>>(result);
  });

  it('resolves audio features to AudioPlayerStore', () => {
    const result = createPlayer({ features: audioFeatures });

    assertType<CreatePlayerResult<AudioPlayerStore>>(result);
  });

  it('resolves spread video features to VideoPlayerStore', () => {
    const result = createPlayer({ features: videoFeatures });

    assertType<CreatePlayerResult<VideoPlayerStore>>(result);
  });

  it('resolves custom features to generic PlayerStore', () => {
    interface CustomState {
      custom: boolean;
    }

    const customFeature = definePlayerFeature({
      state: (): CustomState => ({ custom: true }),
    });

    const result = createPlayer({ features: [customFeature] });

    assertType<CreatePlayerResult<PlayerStore<[Slice<PlayerTarget, CustomState>]>>>(result);
  });

  it('accepts the orientation lock feature alias with and without config', () => {
    const configuredOrientationLock = features.orientationLock({ type: 'portrait' });

    const defaultResult = createPlayer({ features: [features.orientationLock] });
    const configuredResult = createPlayer({ features: [configuredOrientationLock] });

    assertType<CreatePlayerResult<PlayerStore<[typeof features.orientationLock]>>>(defaultResult);
    assertType<CreatePlayerResult<PlayerStore<[typeof configuredOrientationLock]>>>(configuredResult);
  });

  it('resolves extended video features to generic PlayerStore', () => {
    interface AnalyticsState {
      events: string[];
    }

    const analyticsFeature = definePlayerFeature({
      state: (): AnalyticsState => ({ events: [] }),
    });

    const result = createPlayer({
      features: [...videoFeatures, analyticsFeature],
    });

    // Extended features fall through to the generic overload
    assertType<CreatePlayerResult<PlayerStore<[...typeof videoFeatures, typeof analyticsFeature]>>>(result);
  });

  it('resolves extended audio features to generic PlayerStore', () => {
    interface AnalyticsState {
      events: string[];
    }

    const analyticsFeature = definePlayerFeature({
      state: (): AnalyticsState => ({ events: [] }),
    });

    const result = createPlayer({
      features: [...audioFeatures, analyticsFeature],
    });

    assertType<CreatePlayerResult<PlayerStore<[...typeof audioFeatures, typeof analyticsFeature]>>>(result);
  });
});
