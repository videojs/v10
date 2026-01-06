import type { Context } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { Constructor } from '@videojs/utils/types';

import type { AnySlice, UnionSliceTarget } from '../../core/slice';
import type { Store, StoreProvider } from '../../core/store';
import { ContextProvider } from '@lit/context';
import { isNull } from '@videojs/utils/predicate';

/**
 * Creates a mixin that provides a store via context.
 *
 * - Creates a store instance on first access
 * - Provides the store to descendants via Lit Context Protocol
 * - Allows store replacement via setter (notifies all consumers)
 * - Destroys the store on disconnect (if not externally provided)
 *
 * @example
 * ```ts
 * const { StoreProviderMixin } = createStore({
 *   slices: [playbackSlice]
 * });
 *
 * class MyPlayer extends StoreProviderMixin(LitElement) {
 *   render() {
 *     return html`<slot></slot>`;
 *   }
 * }
 * ```
 */
export function createStoreProviderMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
  factory: () => Store<UnionSliceTarget<Slices>, Slices>,
): <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => Base & Constructor<StoreProvider<Slices>> {
  type ProvidedStore = Store<UnionSliceTarget<Slices>, Slices>;

  return <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => {
    class StoreProviderElement extends BaseClass implements StoreProvider<Slices> {
      #store: ProvidedStore | null = null;
      #isOwner = false;

      #provider = new ContextProvider(this, {
        context,
        initialValue: this.store,
      });

      get store(): ProvidedStore {
        if (isNull(this.#store)) {
          this.#store = factory();
          this.#isOwner = true;
        }

        return this.#store;
      }

      set store(newStore: ProvidedStore) {
        const wasOwner = this.#isOwner;
        const oldStore = this.#store;

        this.#store = newStore;
        this.#isOwner = false;

        if (wasOwner && oldStore && oldStore !== newStore) {
          oldStore.destroy();
        }

        this.#provider.setValue(newStore);
      }

      override disconnectedCallback(): void {
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
