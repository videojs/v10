import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import { isNull } from '@videojs/utils/predicate';
import type { AnyStore, InferStoreRequests } from '../../core/store';
import type { StoreSource } from '../store-accessor';

import { StoreAccessor } from '../store-accessor';

export type RequestControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Provides access to a store request by key.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
 * ```ts
 * class MyElement extends LitElement {
 *   #play = new RequestController(this, store, 'play');
 *
 *   render() {
 *     return html`<button @click=${() => this.#play.value()}>Play</button>`;
 *   }
 * }
 * ```
 *
 * @example Context source
 * ```ts
 * const { context } = createStore({ features: [playbackFeature] });
 *
 * class MyElement extends LitElement {
 *   #play = new RequestController(this, context, 'play');
 * }
 * ```
 */
export class RequestController<Store extends AnyStore, Name extends keyof InferStoreRequests<Store>>
  implements ReactiveController
{
  readonly #accessor: StoreAccessor<Store>;
  readonly #name: Name;

  constructor(host: RequestControllerHost, source: StoreSource<Store>, name: Name) {
    this.#accessor = new StoreAccessor(host, source);
    this.#name = name;
    host.addController(this);
  }

  get value(): InferStoreRequests<Store>[Name] {
    const store = this.#accessor.value;
    if (isNull(store)) {
      throw new Error('RequestController: Store not available from context');
    }
    return store.request[this.#name] as InferStoreRequests<Store>[Name];
  }

  hostConnected(): void {
    this.#accessor.hostConnected();
  }
}
