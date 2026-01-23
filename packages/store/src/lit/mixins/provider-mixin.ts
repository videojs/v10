import type { Context } from '@lit/context';
import { ContextProvider } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import { isNull } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';
import type { AnyFeature, UnionFeatureTarget } from '../../core/feature';
import type { Store, StoreProvider } from '../../core/store';

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
 *   features: [playbackFeature]
 * });
 *
 * class MyPlayer extends StoreProviderMixin(LitElement) {
 *   render() {
 *     return html`<slot></slot>`;
 *   }
 * }
 * ```
 */
export function createStoreProviderMixin<Features extends AnyFeature[]>(
  context: Context<unknown, Store<UnionFeatureTarget<Features>, Features>>,
  factory: () => Store<UnionFeatureTarget<Features>, Features>
): <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => Base & Constructor<StoreProvider<Features>> {
  type ProvidedStore = Store<UnionFeatureTarget<Features>, Features>;

  return <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => {
    class StoreProviderElement extends BaseClass implements StoreProvider<Features> {
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
