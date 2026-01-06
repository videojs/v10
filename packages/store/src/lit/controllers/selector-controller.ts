import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AnyStore, InferStoreState } from '../../core/store';
import { noop } from '@videojs/utils/function';

/**
 * Subscribes to a selected portion of store state.
 * Triggers host updates when the selected value changes.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   #paused = new SelectorController(this, store, s => s.paused);
 *
 *   render() {
 *     return html`<button>${this.#paused.value ? 'Play' : 'Pause'}</button>`;
 *   }
 * }
 * ```
 */
export class SelectorController<Store extends AnyStore, Value> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: Store;
  readonly #selector: (state: InferStoreState<Store>) => Value;

  #value: Value;
  #unsubscribe = noop;

  constructor(host: ReactiveControllerHost, store: Store, selector: (state: InferStoreState<Store>) => Value) {
    this.#host = host;
    this.#store = store;
    this.#selector = selector;
    this.#value = selector(store.state);
    host.addController(this);
  }

  get value(): Value {
    return this.#value;
  }

  hostConnected() {
    // Sync value on reconnect to avoid stale state
    this.#value = this.#selector(this.#store.state);
    this.#unsubscribe = this.#store.subscribe(this.#selector, (value) => {
      this.#value = value;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected() {
    this.#unsubscribe?.();
    this.#unsubscribe = noop;
  }
}
