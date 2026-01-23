import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';
import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';
import type { StoreSource } from '../store-accessor';

import { StoreAccessor } from '../store-accessor';

export type StoreControllerHost = ReactiveControllerHost & HTMLElement;

export type StoreControllerValue<Store extends AnyStore> = InferStoreState<Store> & InferStoreRequests<Store>;

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
export class StoreController<Store extends AnyStore> implements ReactiveController {
  readonly #host: StoreControllerHost;
  readonly #accessor: StoreAccessor<Store>;

  #unsubscribe = noop;

  constructor(host: StoreControllerHost, source: StoreSource<Store>) {
    this.#host = host;
    this.#accessor = new StoreAccessor(host, source, (store) => this.#connect(store));
    host.addController(this);
  }

  get value(): StoreControllerValue<Store> {
    const store = this.#accessor.value;

    if (isNull(store)) {
      throw new Error('StoreController: Store not available from context');
    }

    return {
      ...store.state,
      ...store.request,
    } as StoreControllerValue<Store>;
  }

  hostConnected(): void {
    this.#accessor.hostConnected();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }

  #connect(store: Store): void {
    this.#unsubscribe();
    this.#unsubscribe = store.subscribe(() => {
      this.#host.requestUpdate();
    });
  }
}
