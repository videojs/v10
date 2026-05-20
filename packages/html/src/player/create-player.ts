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
import { containerContext, mediaContext, type PlayerContext, playerContext } from './context';
import { PlayerController } from './player-controller';

/** Configuration accepted by `createPlayer`. */
export interface CreatePlayerConfig<Features extends AnyPlayerFeature[]> {
  /** Feature set that determines the store's shape and behavior. */
  features: Features;
}

/** Bundle returned by `createPlayer` — a store factory, context, controller, and provider/container mixins. */
export interface CreatePlayerResult<Store extends PlayerStore> {
  /** Context descendants consume to access the player store. */
  context: PlayerContext<Store>;

  /** Creates a store instance for imperative access. */
  create: () => Store;

  /** Player controller bound to this player's context. */
  PlayerController: PlayerController.Constructor<Store>;

  /** Mixin that provides player context to descendants. */
  ProviderMixin: ProviderMixin<Store>;

  /** Mixin that consumes player context and registers as the container element. */
  ContainerMixin: ContainerMixin<Store>;
}

/**
 * Build a typed player factory — store, mixins, and controller — wired to a feature set.
 *
 * Use the returned `ProviderMixin` on the player shell element to own the store and broadcast
 * context to descendants. Use `ContainerMixin` on the container element to register itself. Use
 * `PlayerController` inside descendant elements to read state.
 *
 * @label Video
 * @param config - Player configuration with features.
 * @see https://videojs.org/docs/framework/html/reference/html-create-player
 */
export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;

/**
 * Build a typed audio player factory wired to `audioFeatures`.
 *
 * @label Audio
 * @param config - Player configuration with features.
 * @see https://videojs.org/docs/framework/html/reference/html-create-player
 */
export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;

/**
 * Build a typed player factory for a custom feature set.
 *
 * @label Generic
 * @param config - Player configuration with features.
 * @see https://videojs.org/docs/framework/html/reference/html-create-player
 */
export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<PlayerStore<Features>>;

export function createPlayer(config: CreatePlayerConfig<AnyPlayerFeature[]>): CreatePlayerResult<PlayerStore> {
  const slice = combine<PlayerTarget, AnyPlayerFeature[]>(...config.features);

  function create(): PlayerStore {
    return createStore<PlayerTarget>()(slice);
  }

  const ProviderMixin = createProviderMixin<PlayerStore>({
    playerContext,
    mediaContext,
    containerContext,
    factory: create,
  });

  const ContainerMixin = createContainerMixin<PlayerStore>({
    playerContext,
    containerContext,
  });

  return {
    context: playerContext,
    create,
    PlayerController,
    ProviderMixin,
    ContainerMixin,
  };
}
