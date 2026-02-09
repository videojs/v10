import type { AudioPlayerStore, PlayerStore, PlayerTarget, VideoPlayerStore } from '@videojs/core/dom';
import { definePlayerFeature, features } from '@videojs/core/dom';
import type { Slice } from '@videojs/store';
import { assertType, describe, it } from 'vitest';

import { type CreatePlayerResult, createPlayer } from '../create-player';

describe('createPlayer', () => {
  it('resolves video features to VideoPlayerStore', () => {
    const result = createPlayer({ features: features.video });

    assertType<CreatePlayerResult<VideoPlayerStore>>(result);
  });

  it('resolves audio features to AudioPlayerStore', () => {
    const result = createPlayer({ features: features.audio });

    assertType<CreatePlayerResult<AudioPlayerStore>>(result);
  });

  it('resolves spread video features to VideoPlayerStore', () => {
    const result = createPlayer({ features: [...features.video] });

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

  it('resolves extended video features to generic PlayerStore', () => {
    interface AnalyticsState {
      events: string[];
    }

    const analyticsFeature = definePlayerFeature({
      state: (): AnalyticsState => ({ events: [] }),
    });

    const result = createPlayer({
      features: [...features.video, analyticsFeature],
    });

    // Extended features fall through to the generic overload
    assertType<CreatePlayerResult<PlayerStore<[...typeof features.video, typeof analyticsFeature]>>>(result);

    // The store has both video and analytics state
    const store = result.create();

    assertType<boolean>(store.paused);
    assertType<number>(store.volume);
    assertType<string[]>(store.events);
  });

  it('resolves extended audio features to generic PlayerStore', () => {
    interface AnalyticsState {
      events: string[];
    }

    const analyticsFeature = definePlayerFeature({
      state: (): AnalyticsState => ({ events: [] }),
    });

    const result = createPlayer({
      features: [...features.audio, analyticsFeature],
    });

    const store = result.create();

    assertType<boolean>(store.paused);
    assertType<number>(store.volume);
    assertType<string[]>(store.events);
  });
});
