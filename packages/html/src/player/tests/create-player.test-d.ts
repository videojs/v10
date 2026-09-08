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

import type { UIElement } from '../../ui/ui-element';
import { type CreatePlayerResult, createPlayer } from '../create-player';

describe('createPlayer', () => {
  it('resolves video features to VideoPlayerStore', () => {
    const result = createPlayer({ features: videoFeatures });

    assertType<CreatePlayerResult<VideoPlayerStore>>(result);
    // @ts-expect-error ContainerMixin is no longer part of the HTML API.
    result.ContainerMixin;
    // @ts-expect-error createPlayer returns a PlayerElement class directly.
    result.ProviderMixin;
    // @ts-expect-error Use playerContext.
    result.context;
    // @ts-expect-error The player element owns its store.
    result.create;
  });

  it('resolves audio features to AudioPlayerStore', () => {
    const result = createPlayer({ features: audioFeatures });

    assertType<CreatePlayerResult<AudioPlayerStore>>(result);

    const player = new result.PlayerElement();

    assertType<number | undefined>(player.error?.code);
    assertType<string | undefined>(player.error?.message);
    assertType<() => void>(player.dismissError);
    assertType<() => void>(player.subscribe(() => {}));
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
    const player = new result.PlayerElement();

    assertType<CreatePlayerResult<PlayerStore<[Slice<PlayerTarget, CustomState>]>>>(result);
    assertType<boolean>(player.custom);
  });

  it('infers config properties from selected features', () => {
    const withMetadata = createPlayer({ features: [metadataFeature] });
    const withoutMetadata = createPlayer({ features: [features.playback] });
    const metadataPlayer = new withMetadata.PlayerElement();
    const plainPlayer = new withoutMetadata.PlayerElement();

    // The store calls this `title`; on an element that name is the tooltip.
    assertType<string | null | undefined>(metadataPlayer.contentTitle);
    assertType<string>(metadataPlayer.title);
    assertType<string | null | undefined>(metadataPlayer.poster);
    assertType<string>(metadataPlayer.store.title);
    assertType<string>(metadataPlayer.store.poster);

    // @ts-expect-error metadata properties are absent when the feature is absent.
    plainPlayer.contentTitle;
  });

  it('returns a controller already bound to the player context', () => {
    const { PlayerController } = createPlayer({ features: videoFeatures });
    const host = null as unknown as UIElement;

    assertType<import('../player-controller').PlayerController<VideoPlayerStore>>(new PlayerController(host));
    assertType<import('../player-controller').PlayerController<VideoPlayerStore, boolean>>(
      new PlayerController(host, (state) => state.paused)
    );
  });

  it('exposes orientation lock configuration as a player property', () => {
    const withOrientationLock = createPlayer({ features: [features.orientationLock] });
    const withoutOrientationLock = createPlayer({ features: [features.playback] });
    const orientationPlayer = new withOrientationLock.PlayerElement();
    const plainPlayer = new withoutOrientationLock.PlayerElement();

    assertType<CreatePlayerResult<PlayerStore<[typeof features.orientationLock]>>>(withOrientationLock);
    assertType<ScreenOrientationLockType | null | undefined>(orientationPlayer.orientationLockType);

    // @ts-expect-error orientation lock properties are absent when the feature is absent.
    plainPlayer.orientationLockType;
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

    // The player has both video and analytics state
    const player = new result.PlayerElement();

    assertType<boolean>(player.paused);
    assertType<number>(player.volume);
    assertType<string[]>(player.events);
    assertType<Promise<void>>(player.play());

    // @ts-expect-error Direct state is read-only; use the feature action.
    player.paused = false;
  });

  it('resolves background features to generic PlayerStore', () => {
    const result = createPlayer({ features: backgroundFeatures });
    const player = new result.PlayerElement();

    assertType<CreatePlayerResult<PlayerStore<[]>>>(result);

    // @ts-expect-error Playback state is absent without the playback feature.
    void player.paused;
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

    const player = new result.PlayerElement();

    assertType<boolean>(player.paused);
    assertType<number>(player.volume);
    assertType<string[]>(player.events);
  });
});
