import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

import { isObject } from '@videojs/utils';

/** Minimal store interface for the controller. */
interface ReadonlyStore<State extends object> {
  readonly state: State;
  subscribe: ((listener: (state: State) => void) => () => void) & (<K extends keyof State>(keys: K[], listener: (state: Pick<State, K>) => void) => () => void);
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
  readonly #selector: ((state: State) => Selected) | undefined;
  readonly #keys: (keyof State)[] | null;

  #unsubscribe: (() => void) | null = null;
  #value: Selected;

  constructor(host: ReactiveControllerHost, store: ReadonlyStore<State>, selector?: (state: State) => Selected) {
    this.#host = host;
    this.#store = store;
    this.#selector = selector;
    this.#value = this.#select(store.state);
    this.#keys = this.#extractKeys();

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
    if (this.#keys) {
      // Subscribe only to specific keys for efficiency
      this.#unsubscribe = this.#store.subscribe(this.#keys, () => {
        const next = this.#select(this.#store.state);

        if (!Object.is(this.#value, next)) {
          this.#value = next;
          this.#host.requestUpdate();
        }
      });
    } else {
      // Subscribe to all state changes
      this.#unsubscribe = this.#store.subscribe((state) => {
        const next = this.#select(state);

        if (!Object.is(this.#value, next)) {
          this.#value = next;
          this.#host.requestUpdate();
        }
      });
    }
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  #select(state: State): Selected {
    return this.#selector ? this.#selector(state) : (state as unknown as Selected);
  }

  #extractKeys(): (keyof State)[] | null {
    if (!this.#selector) return null;

    const result = this.#selector(this.#store.state);
    if (!isObject(result)) return null;

    return Object.keys(result) as (keyof State)[];
  }
}
