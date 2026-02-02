import type { Context } from '@lit/context';
import { ContextProvider } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import { isNull } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';
import type { AnyStore } from '../../core/store';
import type { StoreProvider } from '../types';

/**
 * Creates a mixin that provides a store via context.
 *
 * @example
 * ```ts
 * const { ProviderMixin } = createStore({
 *   features: [playbackFeature]
 * });
 *
 * class MyPlayer extends ProviderMixin(LitElement) {
 *   render() {
 *     return html`<slot></slot>`;
 *   }
 * }
 * ```
 */
export function createProviderMixin<Store extends AnyStore>(
  context: Context<unknown, Store>,
  factory: () => Store
): <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => Base & Constructor<StoreProvider<Store>> {
  return <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => {
    class StoreProviderElement extends BaseClass implements StoreProvider<Store> {
      #store: Store | null = null;
      #isOwner = false;

      #provider = new ContextProvider(this, {
        context,
        initialValue: this.store,
      });

      get store(): Store {
        if (isNull(this.#store)) {
          this.#store = factory();
          this.#isOwner = true;
        }

        return this.#store;
      }

      set store(newStore: Store) {
        const wasOwner = this.#isOwner;
        const oldStore = this.#store;

        this.#store = newStore;
        this.#isOwner = false;

        if (wasOwner && oldStore && oldStore !== newStore) {
          oldStore.destroy();
        }

        this.#provider.setValue(newStore);
      }

      override disconnectedCallback() {
        super.disconnectedCallback();
        if (this.#isOwner && this.#store) {
          this.#store.destroy();
          this.#store = null;
          this.#isOwner = false;
        }
      }
    }

    return StoreProviderElement;
  };
}
