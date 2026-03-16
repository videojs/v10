import type { MediaContainer, PlayerStore } from '@videojs/core/dom';
import { ContextConsumer } from '@videojs/element/context';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { ContainerAttachContext, PlayerContext } from '../player/context';
import type { PlayerConsumer, PlayerConsumerConstructor } from './types';

export interface ContainerMixinConfig<Store extends PlayerStore> {
  playerContext: PlayerContext<Store>;
  containerAttachContext: ContainerAttachContext;
}

export type ContainerMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Class & PlayerConsumerConstructor<Store>;

/**
 * Create a mixin that consumes player context and registers itself as the
 * container element with the provider via `containerAttachContext`.
 *
 * @param config - Container configuration with player and attach contexts.
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
          context: config.containerAttachContext,
          callback: (value) => {
            this.#setContainer = value ?? null;
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
