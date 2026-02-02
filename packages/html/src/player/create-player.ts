import type { AnyPlayerFeature, PlayerStore, PlayerTarget } from '@videojs/core/dom';
import { combine, createStore } from '@videojs/store';

import { type ContainerMixin, createContainerMixin } from '../store/container-mixin';
import { createProviderMixin, type ProviderMixin } from '../store/provider-mixin';
import type { PlayerElementConstructor } from '../store/types';
import { MediaElement } from '../ui/media-element';
import { type PlayerContext, playerContext } from './context';
import { PlayerController } from './player-controller';
import { createPlayerMixin, type PlayerMixin } from './player-mixin';

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

  /** Pre-composed player element ready for customElements.define(). */
  PlayerElement: PlayerElementConstructor<Store>;

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
 * import { createPlayer, MediaElement } from '@videojs/html';
 *
 * const { PlayerElement, PlayerController, context } = createPlayer({
 *   features: [...features.video],
 * });
 *
 * // Simple: register pre-composed PlayerElement
 * customElements.define('video-player', PlayerElement);
 *
 * // Custom: extend with PlayerMixin
 * class MyPlayer extends PlayerMixin(MediaElement) {}
 *
 * // Control element with selector
 * class PlayButton extends MediaElement {
 *   #playback = new PlayerController(this, context, selectPlayback);
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
  const PlayerElement = PlayerMixin(MediaElement);
  const ProviderMixin = createProviderMixin<Store>(ctx, create);
  const ContainerMixin = createContainerMixin<Store>(ctx);

  return {
    context: ctx,
    create,
    PlayerController,
    PlayerElement,
    PlayerMixin,
    ProviderMixin,
    ContainerMixin,
  };
}
