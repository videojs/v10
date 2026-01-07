import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AnyStore, InferStoreState } from '../../core/store';
import type { StoreSource } from '../store-accessor';

import { noop } from '@videojs/utils/function';
import { isNull } from '@videojs/utils/predicate';

import { StoreAccessor } from '../store-accessor';

export type SelectorControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Subscribes to a selected portion of store state.
 * Triggers host updates when the selected value changes.
 *
 * Accepts either a direct store instance or a context that provides one.
 *
 * @example Direct store
 * ```ts
 * class MyElement extends LitElement {
 *   #paused = new SelectorController(this, store, s => s.paused);
 *
 *   render() {
 *     return html`<button>${this.#paused.value ? 'Play' : 'Pause'}</button>`;
 *   }
 * }
 * ```
 *
 * @example Context source (from createStore)
 * ```ts
 * const { context } = createStore({ slices: [playbackSlice] });
 *
 * class MyElement extends LitElement {
 *   #paused = new SelectorController(this, context, s => s.paused);
 *
 *   render() {
 *     return html`<button>${this.#paused.value ? 'Play' : 'Pause'}</button>`;
 *   }
 * }
 * ```
 */
export class SelectorController<Store extends AnyStore, Value> implements ReactiveController {
  readonly #host: SelectorControllerHost;
  readonly #accessor: StoreAccessor<Store>;
  readonly #selector: (state: InferStoreState<Store>) => Value;

  #value: Value | undefined;
  #unsubscribe = noop;

  constructor(host: SelectorControllerHost, source: StoreSource<Store>, selector: (state: InferStoreState<Store>) => Value) {
    this.#host = host;
    this.#selector = selector;
    this.#accessor = new StoreAccessor(host, source, store => this.#connect(store));

    // Initialize value if store available immediately (direct store case)
    const store = this.#accessor.value;
    if (store) this.#value = selector(store.state);

    host.addController(this);
  }

  get value(): Value {
    const store = this.#accessor.value;
    if (isNull(store)) {
      throw new Error('SelectorController: Store not available from context');
    }
    return this.#value as Value;
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
    this.#value = this.#selector(store.state);
    this.#unsubscribe = store.subscribe(this.#selector, (value) => {
      this.#value = value;
      this.#host.requestUpdate();
    });
  }
}
