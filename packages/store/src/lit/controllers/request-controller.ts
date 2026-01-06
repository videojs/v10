import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AnyStore, InferStoreRequests } from '../../core/store';

/**
 * Provides access to a store request by key.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #play = new RequestController(this, store, 'play');
 *
 *   render() {
 *     return html`<button @click=${() => this.#play.value()}>Play</button>`;
 *   }
 * }
 * ```
 */
export class RequestController<
  Store extends AnyStore,
  Name extends keyof InferStoreRequests<Store>,
> implements ReactiveController {
  readonly #store: Store;
  readonly #name: Name;

  constructor(host: ReactiveControllerHost, store: Store, name: Name) {
    this.#store = store;
    this.#name = name;
    host.addController(this);
  }

  get value(): InferStoreRequests<Store>[Name] {
    return this.#store.request[this.#name] as InferStoreRequests<Store>[Name];
  }

  // no-op to satisfy `ReactiveController` interface
  hostConnected() {}
}
