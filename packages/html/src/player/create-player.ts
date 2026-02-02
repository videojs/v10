import type { AnyPlayerFeature, PlayerStore, PlayerTarget } from '@videojs/core/dom';
import { combine, createStore } from '@videojs/store';

import { type ContainerMixin, createContainerMixin } from './container-mixin';
import { type PlayerContext, playerContext } from './context';
import { PlayerController } from './player-controller';
import { createPlayerMixin, type PlayerMixin } from './player-mixin';
import { createProviderMixin, type ProviderMixin } from './provider-mixin';

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

  /** Mixin for a complete player element (provider + container). */
  PlayerMixin: PlayerMixin<Store>;

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
 *
 * const {
 *   context,
 *   create,
 *   PlayerController,
 *   PlayerMixin,
 *   ProviderMixin,
 *   ContainerMixin,
 * } = createPlayer({
 *   features: [...features.video],
 * });
 *
 * // Complete player element
 * class VideoPlayer extends PlayerMixin(ReactiveElement) {}
 *
 * // Or separate provider/container
 * class MyPlayer extends ProviderMixin(ReactiveElement) {}
 * class MyContainer extends ContainerMixin(ReactiveElement) {}
 *
 * // Control element
 * class PlayButton extends ReactiveElement {
 *   #playback = new PlayerController(this, selectPlayback);
 * }
 * ```
 */
export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<PlayerStore<Features>> {
  type Store = PlayerStore<Features>;

  const slice = combine<PlayerTarget, Features>(...config.features);

  function create(): Store {
    return createStore<PlayerTarget>()(slice);
  }

  const ctx = playerContext as PlayerContext<Store>;

  const PlayerMixin = createPlayerMixin<Store>(ctx, create);
  const ProviderMixin = createProviderMixin<Store>(ctx, create);
  const ContainerMixin = createContainerMixin<Store>(ctx);
  const BoundPlayerController = PlayerController as unknown as PlayerController.Constructor<Store>;

  return {
    context: ctx,
    create,
    PlayerController: BoundPlayerController,
    PlayerMixin,
    ProviderMixin,
    ContainerMixin,
  };
}
