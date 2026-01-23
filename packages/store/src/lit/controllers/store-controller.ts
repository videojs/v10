import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';
import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';
import type { StoreSource } from '../store-accessor';

import { StoreAccessor } from '../store-accessor';

export type StoreControllerHost = ReactiveControllerHost & HTMLElement;

export interface StoreControllerValue<Store extends AnyStore> {
  state: InferStoreState<Store>;
  request: InferStoreRequests<Store>;
}

/**
 * Subscribes to store state changes.
 * Triggers host updates when state changes.
 * Provides access to state and request map.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
 * ```ts
 * class MyElement extends LitElement {
 *   #store = new StoreController(this, store);
 *
 *   render() {
 *     const { state, request } = this.#store.value;
 *     return html`
 *       <span>${state.volume}</span>
 *       <button @click=${() => request.setVolume(0.5)}>Set 50%</button>
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
      state: store.state as InferStoreState<Store>,
      request: store.request as InferStoreRequests<Store>,
    };
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
