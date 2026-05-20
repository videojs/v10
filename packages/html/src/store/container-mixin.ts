import type { MediaContainer, PlayerStore } from '@videojs/core/dom';
import { ContextConsumer } from '@videojs/element/context';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { ContainerContext, PlayerContext } from '../player/context';
import type { PlayerConsumer, PlayerConsumerConstructor } from './types';

/** Configuration accepted by `createContainerMixin`. */
export interface ContainerMixinConfig<Store extends PlayerStore> {
  /** Context the mixin reads the player store from. */
  playerContext: PlayerContext<Store>;
  /** Context the mixin registers itself with as the container element. */
  containerContext: ContainerContext;
}

/** Mixin that turns a `MediaElement` subclass into a player-context consumer + container registrant. */
export type ContainerMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Class & PlayerConsumerConstructor<Store>;

/**
 * Build a mixin that consumes player context and registers itself as the container with the provider.
 *
 * @param config - Container configuration with player and container contexts.
 */
export function createContainerMixin<Store extends PlayerStore>(
  config: ContainerMixinConfig<Store>
): ContainerMixin<Store> {
  return <Class extends MediaElementConstructor>(BaseClass: Class) => {
    class PlayerContainerElement extends BaseClass implements PlayerConsumer<Store>, MediaContainer {
      #contextStore: Store | null = null;
      #setContainer: ((container: MediaContainer | null) => void) | null = null;

      constructor(...args: any[]) {
        super(...args);

        new ContextConsumer(this, {
          context: config.playerContext,
          callback: (value) => {
            this.#contextStore = value ?? null;
          },
          subscribe: true,
        });

        new ContextConsumer(this, {
          context: config.containerContext,
          callback: (value) => {
            this.#setContainer = value?.setContainer ?? null;
            if (this.isConnected) this.#setContainer?.(this);
          },
          subscribe: true,
        });
      }

      get store(): Store | null {
        return this.#contextStore;
      }

      override connectedCallback() {
        super.connectedCallback();
        this.#setContainer?.(this);
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        this.#setContainer?.(null);
      }
    }

    return PlayerContainerElement;
  };
}
