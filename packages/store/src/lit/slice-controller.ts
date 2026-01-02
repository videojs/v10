import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

import { pick } from '@videojs/utils/object';

/** Minimal slice interface for the controller. */
interface ReadonlySlice<State extends object> {
  readonly id: symbol;
  readonly initialState: State;
}

/** Minimal store interface for the controller. */
interface ReadonlyStore<State extends object> {
  readonly state: State;
  readonly slices: ReadonlySlice<object>[];
  subscribe: <Selected>(selector: (state: State) => Selected, listener: (selected: Selected) => void) => () => void;
}

/**
 * A reactive controller that subscribes to a specific slice's state.
 *
 * Provides type-safe access to slice state with support detection.
 * Use `isSupported()` to check if the slice is registered in the store.
 *
 * @example
 * ```ts
 * class MyElement extends LitElement {
 *   private counter = new SliceController(this, store, counterSlice);
 *
 *   render() {
 *     if (!this.counter.isSupported()) {
 *       return html`<div>Counter not available</div>`;
 *     }
 *     const { count, step } = this.counter.value;
 *     return html`<div>Count: ${count}, Step: ${step}</div>`;
 *   }
 * }
 * ```
 */
export class SliceController<StoreState extends object, SliceState extends object> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #store: ReadonlyStore<StoreState>;
  readonly #slice: ReadonlySlice<SliceState>;
  readonly #keys: (keyof SliceState)[];

  #unsubscribe: (() => void) | null = null;
  #value: SliceState;

  constructor(host: ReactiveControllerHost, store: ReadonlyStore<StoreState>, slice: ReadonlySlice<SliceState>) {
    this.#host = host;
    this.#store = store;
    this.#slice = slice;
    this.#keys = Object.keys(slice.initialState) as (keyof SliceState)[];
    this.#value = this.#pickSliceState(store.state);

    host.addController(this);
  }

  /** The current slice state. */
  get value(): SliceState {
    return this.#value;
  }

  /** The underlying store instance. */
  get store(): ReadonlyStore<StoreState> {
    return this.#store;
  }

  /** The slice this controller is tracking. */
  get slice(): ReadonlySlice<SliceState> {
    return this.#slice;
  }

  /**
   * Check if this slice is registered in the store.
   *
   * @example
   * ```ts
   * if (this.counter.isSupported()) {
   *   const { count } = this.counter.value;
   * }
   * ```
   */
  isSupported(): boolean {
    return this.#store.slices.some(s => s.id === this.#slice.id);
  }

  hostConnected(): void {
    // Create a selector that picks the slice keys from store state
    const selector = (state: StoreState) =>
      pick(state as Record<string, unknown>, this.#keys as string[]) as SliceState;

    this.#unsubscribe = this.#store.subscribe(selector, (next) => {
      this.#value = next;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  #pickSliceState(state: StoreState): SliceState {
    return pick(state as Record<string, unknown>, this.#keys as string[]) as SliceState;
  }
}
