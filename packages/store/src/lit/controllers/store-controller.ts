import type { AnyStore, InferStoreState } from '../../core/store';
import type { StoreSource } from '../store-accessor';
import type { SubscriptionControllerHost } from './subscription-controller';
import { SubscriptionController } from './subscription-controller';

export type StoreControllerHost = SubscriptionControllerHost;

export type StoreControllerValue<Store extends AnyStore> = InferStoreState<Store>;

/**
 * Subscribes to store state changes.
 * Triggers host updates when state changes.
 * Provides access to state and request functions spread together.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
 * ```ts
 * class MyElement extends LitElement {
 *   #store = new StoreController(this, store);
 *
 *   render() {
 *     const { volume, setVolume } = this.#store.value;
 *     return html`
 *       <span>${volume}</span>
 *       <button @click=${() => setVolume(0.5)}>Set 50%</button>
 *     `;
 *   }
 * }
 * ```
 *
 * @example Context source
 * ```ts
 * const { context } = createStore({ features: [playbackFeature] });
 *
 * class MyElement extends LitElement {
 *   #store = new StoreController(this, context);
 * }
 * ```
 */
export class StoreController<Store extends AnyStore> {
  readonly #sub: SubscriptionController<Store, StoreControllerValue<Store>>;

  constructor(host: StoreControllerHost, source: StoreSource<Store>) {
    this.#sub = new SubscriptionController(host, source, {
      subscribe: (store, onChange) => store.subscribe(onChange),
      getValue: (store) => store as unknown as StoreControllerValue<Store>,
    });
  }

  get value(): StoreControllerValue<Store> {
    return this.#sub.value;
  }
}
