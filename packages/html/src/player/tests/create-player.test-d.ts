import {
  type AudioPlayerStore,
  audioFeatures,
  backgroundFeatures,
  definePlayerFeature,
  features,
  metadataFeature,
  type PlayerStore,
  type PlayerTarget,
  type ScreenOrientationLockType,
  type VideoPlayerStore,
  videoFeatures,
} from '@videojs/core/dom';
import type { Slice } from '@videojs/store';
import { assertType, describe, it } from 'vite-plus/test';

import { UIElement } from '../../ui/ui-element';
import { type CreatePlayerResult, createPlayer } from '../create-player';

describe('createPlayer', () => {
  it('resolves video features to VideoPlayerStore', () => {
    const result = createPlayer({ features: videoFeatures });

    assertType<CreatePlayerResult<VideoPlayerStore>>(result);
    // @ts-expect-error ContainerMixin is no longer part of the HTML API.
    result.ContainerMixin;
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
    const MetadataProvider = withMetadata.ProviderMixin(UIElement);
    const PlainProvider = withoutMetadata.ProviderMixin(UIElement);
    const metadataProvider = new MetadataProvider();
    const plainProvider = new PlainProvider();

    // The store calls this `title`; on an element that name is the tooltip.
    assertType<string | null | undefined>(metadataProvider.contentTitle);

    // @ts-expect-error metadata properties are absent when the feature is absent.
    plainProvider.contentTitle;
  });

  it('exposes orientation lock configuration as a provider property', () => {
    const withOrientationLock = createPlayer({ features: [features.orientationLock] });
    const withoutOrientationLock = createPlayer({ features: [features.playback] });
    const OrientationProvider = withOrientationLock.ProviderMixin(UIElement);
    const PlainProvider = withoutOrientationLock.ProviderMixin(UIElement);
    const orientationProvider = new OrientationProvider();
    const plainProvider = new PlainProvider();

    assertType<CreatePlayerResult<PlayerStore<[typeof features.orientationLock]>>>(withOrientationLock);
    assertType<ScreenOrientationLockType | null | undefined>(orientationProvider.orientationLockType);

    // @ts-expect-error orientation lock properties are absent when the feature is absent.
    plainProvider.orientationLockType;
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
