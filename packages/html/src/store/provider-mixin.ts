import { ContextProvider } from '@lit/context';
import type { Media, PlayerStore } from '@videojs/core/dom';
import { isNull } from '@videojs/utils/predicate';
import type { MediaElementConstructor } from '@/ui/media-element';
import type { PlayerContext } from '../player/context';
import type { PlayerProvider, PlayerProviderConstructor } from './types';

export type ProviderMixin<Store extends PlayerStore> = <Class extends MediaElementConstructor>(
  BaseClass: Class
) => Class & PlayerProviderConstructor<Store>;

export function createProviderMixin<Store extends PlayerStore>(
  context: PlayerContext<Store>,
  factory: () => Store
): ProviderMixin<Store> {
  return <Class extends MediaElementConstructor>(BaseClass: Class) => {
    class PlayerProviderElement extends BaseClass implements PlayerProvider<Store> {
      #store: Store | null = null;
      #media: Media | null = null;

      #provider = new ContextProvider(this, {
        context,
        initialValue: { store: this.store, media: null },
      });

      get store(): Store {
        if (isNull(this.#store)) {
          this.#store = factory();
        }
        return this.#store;
      }

      get media(): Media | null {
        return this.#media;
      }

      set media(value: Media | null) {
        this.#media = value;
        this.#provider.setValue({ store: this.store, media: value });
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        if (this.#store) {
          this.#store.destroy();
          this.#store = null;
        }
      }
    }

    return PlayerProviderElement;
  };
}
