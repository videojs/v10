import type { Context } from '@lit/context';
import { ContextProvider } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import { isNull } from '@videojs/utils/predicate';
import type { Constructor } from '@videojs/utils/types';
import type { AnyFeature } from '../../core/feature';
import type { Store } from '../../core/store';
import type { StoreProvider } from '../types';

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
export function createProviderMixin<Features extends AnyFeature[]>(
  context: Context<unknown, Store<Features>>,
  factory: () => Store<Features>
): <Base extends Constructor<ReactiveElement>>(BaseClass: Base) => Base & Constructor<StoreProvider<Features>> {
  type ProvidedStore = Store<Features>;

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
