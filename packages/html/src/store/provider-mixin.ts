import type { PlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { isNull } from '@videojs/utils/predicate';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { PlayerContext } from '../player/context';
import type { PlayerProvider, PlayerProviderConstructor } from './types';

export type ProviderMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Class & PlayerProviderConstructor<Store>;

/** Create a mixin that provides player context to descendant elements. */
export function createProviderMixin<Store extends PlayerStore>(
  context: PlayerContext<Store>,
  factory: () => Store
): ProviderMixin<Store> {
  return <Class extends MediaElementConstructor>(BaseClass: Class) => {
    class PlayerProviderElement extends BaseClass implements PlayerProvider<Store> {
      #store: Store | null = factory();

      #provider = new ContextProvider(this, {
        context,
        initialValue: this.store,
      });

      get store(): Store {
        if (isNull(this.#store)) {
          this.#store = factory();
        }

        return this.#store;
      }

      override connectedCallback() {
        super.connectedCallback();
        this.#provider.setValue(this.store);
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        this.#store?.destroy();
        this.#store = null;
      }
    }

    return PlayerProviderElement;
  };
}
