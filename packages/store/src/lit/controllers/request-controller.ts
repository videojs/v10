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
  S extends AnyStore,
  K extends string & keyof InferStoreRequests<S>,
> implements ReactiveController {
  readonly #store: S;
  readonly #key: K;

  constructor(host: ReactiveControllerHost, store: S, key: K) {
    this.#store = store;
    this.#key = key;
    host.addController(this);
  }

  get value(): InferStoreRequests<S>[K] {
    return (this.#store.request as InferStoreRequests<S>)[this.#key];
  }

  hostConnected(): void {}
}
