import type {
  AnyPlayerFeature,
  AudioFeatures,
  AudioPlayerStore,
  PlayerStore,
  PlayerTarget,
  VideoFeatures,
  VideoPlayerStore,
} from '@videojs/core/dom';
import { combine, createStore } from '@videojs/store';

import { type ContainerMixin, createContainerMixin } from '../store/container-mixin';
import { createProviderMixin, type ProviderMixin } from '../store/provider-mixin';
import { type PlayerContext, playerContext } from './context';
import { PlayerController } from './player-controller';

export interface CreatePlayerConfig<Features extends AnyPlayerFeature[]> {
  features: Features;
}

export interface CreatePlayerResult<Store extends PlayerStore> {
  /** Context for consuming player in controllers. */
  context: PlayerContext<Store>;

  /** Creates a store instance for imperative access. */
  create: () => Store;

  /** Player controller bound to this player's context. */
  PlayerController: PlayerController.Constructor<Store>;

  /** Mixin that provides player context to descendants. */
  ProviderMixin: ProviderMixin<Store>;

  /** Mixin that consumes player context and auto-attaches media elements. */
  ContainerMixin: ContainerMixin<Store>;
}

/**
 * Creates a player factory with typed store, mixins, and controller.
 *
 * @example
 * ```ts
 * import { features } from '@videojs/core/dom';
 * import { createPlayer, MediaElement } from '@videojs/html';
 *
 * const { ProviderMixin, ContainerMixin, PlayerController, context } = createPlayer({
 *   features: features.video,
 * });
 *
 * // Provider element: owns the store, provides context to descendants
 * class VideoPlayer extends ProviderMixin(MediaElement) {}
 * customElements.define('video-player', VideoPlayer);
 *
 * // Control element with selector
 * class PlayButton extends MediaElement {
 *   #playback = new PlayerController(this, context, selectPlayback);
 * }
 * ```
 *
 * @label Video
 * @param config - Player configuration with features.
 */
export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;

/**
 * Creates a player factory for audio media.
 *
 * @label Audio
 * @param config - Player configuration with features.
 */
export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;

/**
 * Creates a player factory with custom features.
 *
 * @label Generic
 * @param config - Player configuration with features.
 */
export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<PlayerStore<Features>>;

export function createPlayer(config: CreatePlayerConfig<AnyPlayerFeature[]>): CreatePlayerResult<PlayerStore> {
  const slice = combine<PlayerTarget, AnyPlayerFeature[]>(...config.features);

  function create(): PlayerStore {
    return createStore<PlayerTarget>()(slice);
  }

  const ProviderMixin = createProviderMixin<PlayerStore>(playerContext, create);
  const ContainerMixin = createContainerMixin<PlayerStore>(playerContext);

  return {
    context: playerContext,
    create,
    PlayerController,
    ProviderMixin,
    ContainerMixin,
  };
}
