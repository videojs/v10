import { ContextProvider } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { Media, PlayerStore } from '@videojs/core/dom';
import { isNull } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';

import type { PlayerContext } from '../player/context';
import type { PlayerProvider } from './types';

type Base = Constructor<ReactiveElement>;

type Result<Class extends Base, Store extends PlayerStore> = Class & Constructor<PlayerProvider<Store>>;

export type ProviderMixin<Store extends PlayerStore> = <Class extends Base>(BaseClass: Class) => Result<Class, Store>;

export function createProviderMixin<Store extends PlayerStore>(
  context: PlayerContext<Store>,
  factory: () => Store
): ProviderMixin<Store> {
  return <Class extends Base>(BaseClass: Class) => {
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
