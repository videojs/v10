import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

/** Minimal store interface for the controller. */
interface ReadonlyStore<State extends object> {
  readonly state: State;
  subscribe: ((listener: (state: State) => void) => () => void) & (<Selected>(selector: (state: State) => Selected, listener: (selected: Selected) => void) => () => void);
}

/**
 * A reactive controller that subscribes to store state changes.
 *
 * Triggers host updates when the selected state changes.
 *
 * When a selector is provided that returns an object, the controller
 * automatically subscribes only to the keys present in the selector result,
 * optimizing re-renders.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   private ctrl = new StoreController(this, store);
 *
 *   render() {
 *     const { count, enabled } = this.ctrl.value;
 *     return html`<div>Count: ${count}, Enabled: ${enabled}</div>`;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // With selector for optimized re-renders
 * class MyElement extends LitElement {
 *   private ctrl = new StoreController(this, store, s => ({ count: s.count }));
 *
 *   render() {
 *     return html`<div>Count: ${this.ctrl.value.count}</div>`;
 *   }
 * }
 * ```
 */
export class StoreController<State extends object, Selected = State> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: ReadonlyStore<State>;
  readonly #selector: (state: State) => Selected;

  #unsubscribe: (() => void) | null = null;
  #value: Selected;

  constructor(
    host: ReactiveControllerHost,
    store: ReadonlyStore<State>,
    selector: (state: State) => Selected = s => s as unknown as Selected,
  ) {
    this.#host = host;
    this.#store = store;
    this.#selector = selector;
    this.#value = this.#selector(store.state);

    host.addController(this);
  }

  /** The current selected state value. */
  get value(): Selected {
    return this.#value;
  }

  /** The underlying store instance. */
  get store(): ReadonlyStore<State> {
    return this.#store;
  }

  hostConnected(): void {
    this.#unsubscribe = this.#store.subscribe(this.#selector, (next) => {
      if (!Object.is(this.#value, next)) {
        this.#value = next;
        this.#host.requestUpdate();
      }
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }
}
