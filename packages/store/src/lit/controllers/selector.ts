import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AnyStore, InferStoreState } from '../../core/store';

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
export class SelectorController<S extends AnyStore, T> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: S;
  readonly #selector: (state: InferStoreState<S>) => T;

  #value: T;
  #unsubscribe: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, store: S, selector: (state: InferStoreState<S>) => T) {
    this.#host = host;
    this.#store = store;
    this.#selector = selector;
    this.#value = selector(store.state);
    host.addController(this);
  }

  get value(): T {
    return this.#value;
  }

  hostConnected(): void {
    // Sync value on reconnect to avoid stale state
    this.#value = this.#selector(this.#store.state);

    this.#unsubscribe = this.#store.subscribe(this.#selector, (value) => {
      this.#value = value;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}
