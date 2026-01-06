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
  Key extends keyof InferStoreRequests<Store>,
> implements ReactiveController {
  readonly #store: Store;
  readonly #key: Key;

  constructor(host: ReactiveControllerHost, store: Store, key: Key) {
    this.#store = store;
    this.#key = key;
    host.addController(this);
  }

  get value(): InferStoreRequests<Store>[Key] {
    return this.#store.request[this.#key] as InferStoreRequests<Store>[Key];
  }

  // no-op to satisfy `ReactiveController` interface
  hostConnected(): void {}
}
