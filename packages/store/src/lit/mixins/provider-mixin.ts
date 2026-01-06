import type { Context } from '@lit/context';
import type { CustomElement } from '@videojs/utils/dom';
import type { Constructor, Mixin } from '@videojs/utils/types';
import type { AnySlice, UnionSliceTarget } from '../../core/slice';
import type { Store } from '../../core/store';

import { ContextProvider } from '@lit/context';
import { isNull } from '@videojs/utils/predicate';

export interface StoreProvider<Slices extends AnySlice[]> {
  store: Store<UnionSliceTarget<Slices>, Slices>;
}

/**
 * Creates a mixin that provides a store via context.
 *
 * - Creates a store instance on first access
 * - Provides the store to descendants via W3C Context Protocol
 * - Allows store replacement via setter (notifies all consumers)
 * - Destroys the store on disconnect (if not externally provided)
 *
 * @example
 * ```ts
 * const { StoreProviderMixin } = createStore({
 *   slices: [playbackSlice]
 * });
 *
 * class MyPlayer extends StoreProviderMixin(HTMLElement) {
 *   connectedCallback() {
 *     super.connectedCallback?.();
 *   }
 * }
 * ```
 */
export function createStoreProviderMixin<Slices extends AnySlice[]>(
  context: Context<unknown, Store<UnionSliceTarget<Slices>, Slices>>,
  factory: () => Store<UnionSliceTarget<Slices>, Slices>,
): Mixin<CustomElement, StoreProvider<Slices>> {
  type StoreType = Store<UnionSliceTarget<Slices>, Slices>;

  return <Base extends Constructor<CustomElement>>(BaseClass: Base) => {
    return class StoreProviderElement extends BaseClass implements StoreProvider<Slices> {
      #store: StoreType | null = null;
      #provider: ContextProvider<typeof context> | null = null;
      #isOwner = false;

      get store(): StoreType {
        if (isNull(this.#store)) {
          this.#store = factory();
          this.#isOwner = true;
        }
        return this.#store;
      }

      set store(newStore: StoreType) {
        const wasOwner = this.#isOwner;
        const oldStore = this.#store;

        this.#store = newStore;
        this.#isOwner = false;

        if (wasOwner && oldStore && oldStore !== newStore) {
          oldStore.destroy();
        }

        this.#provider?.setValue(newStore);
      }

      connectedCallback() {
        super.connectedCallback?.();

        this.#provider = new ContextProvider(this, {
          context,
          initialValue: this.store,
        });
      }

      disconnectedCallback() {
        super.disconnectedCallback?.();

        if (this.#isOwner && this.#store) {
          this.#store.destroy();
          this.#store = null;
          this.#isOwner = false;
        }

        this.#provider = null;
      }
    };
  };
}
