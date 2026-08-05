import {
  type AudioPlayerStore,
  audioFeatures,
  backgroundFeatures,
  definePlayerFeature,
  features,
  metadataFeature,
  type PlayerStore,
  type PlayerTarget,
  type VideoPlayerStore,
  videoFeatures,
} from '@videojs/core/dom';
import type { Slice } from '@videojs/store';
import { assertType, describe, it } from 'vitest';

import { MediaElement } from '../../ui/media-element';
import { type CreatePlayerResult, createPlayer } from '../create-player';

describe('createPlayer', () => {
  it('resolves video features to VideoPlayerStore', () => {
    const result = createPlayer({ features: videoFeatures });

    assertType<CreatePlayerResult<VideoPlayerStore>>(result);
  });

  it('resolves audio features to AudioPlayerStore', () => {
    const result = createPlayer({ features: audioFeatures });

    assertType<CreatePlayerResult<AudioPlayerStore>>(result);

    const store = result.create();

    assertType<number | undefined>(store.error?.code);
    assertType<string | undefined>(store.error?.message);
    assertType<() => void>(store.dismissError);
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

  it('infers config properties from selected features', () => {
    const withMetadata = createPlayer({ features: [metadataFeature] });
    const withoutMetadata = createPlayer({ features: [features.playback] });
    const MetadataProvider = withMetadata.ProviderMixin(MediaElement);
    const PlainProvider = withoutMetadata.ProviderMixin(MediaElement);
    const metadataProvider = new MetadataProvider();
    const plainProvider = new PlainProvider();

    assertType<string | null | undefined>(metadataProvider.contentTitle);
    assertType<string | null | undefined>(metadataProvider.defaultContentTitle);

    // @ts-expect-error metadata properties are absent when the feature is absent.
    plainProvider.contentTitle;
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

    // The store has both video and analytics state
    const store = result.create();

    assertType<boolean>(store.paused);
    assertType<number>(store.volume);
    assertType<string[]>(store.events);
  });

  it('resolves background features to generic PlayerStore', () => {
    const result = createPlayer({ features: backgroundFeatures });

    assertType<CreatePlayerResult<PlayerStore<[]>>>(result);
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

    const store = result.create();

    assertType<boolean>(store.paused);
    assertType<number>(store.volume);
    assertType<string[]>(store.events);
  });
});
