import { type AnyPlayerStore, createPopupGroup, type MediaContainer, type PlayerStore } from '@videojs/core/dom';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';
import type { MediaElementConstructor } from '@/ui/media-element';
import { type ContainerContext, containerContext, type PlayerContext, playerContext } from '../player/context';
import { popupGroupContext } from '../player/popup-group-context';
import type { PlayerConsumer, PlayerConsumerConstructor } from './types';

export interface ContainerMixinConfig<Store extends PlayerStore> {
  playerContext: PlayerContext<Store>;
  containerContext: ContainerContext;
}

export type ContainerMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Class & PlayerConsumerConstructor<Store>;

/**
 * Create a mixin that consumes player context and registers itself as the
 * container element with the provider via `containerContext`.
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
      #popupGroup = createPopupGroup();
      #popupGroupProvider = new ContextProvider(this, {
        context: popupGroupContext,
        initialValue: this.#popupGroup,
      });

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
        this.#popupGroupProvider.setValue(this.#popupGroup);
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

/**
 * Player container mixin configured for the default player contexts.
 *
 * Import this convenience mixin directly when composing a custom container.
 */
export const ContainerMixin = createContainerMixin<AnyPlayerStore>({
  playerContext,
  containerContext,
});
