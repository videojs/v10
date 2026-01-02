import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

/** Minimal slice interface for the controller. */
interface ReadonlySlice<State extends object> {
  readonly id: symbol;
  readonly initialState: State;
}

/** Minimal store interface for the controller. */
interface ReadonlyStore<State extends object> {
  readonly state: State;
  readonly slices: ReadonlySlice<object>[];
  subscribe: <K extends keyof State>(keys: K[], listener: (state: Pick<State, K>) => void) => () => void;
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
  readonly #keys: string[];

  #unsubscribe: (() => void) | null = null;
  #value: SliceState;

  constructor(host: ReactiveControllerHost, store: ReadonlyStore<StoreState>, slice: ReadonlySlice<SliceState>) {
    this.#host = host;
    this.#store = store;
    this.#slice = slice;
    this.#keys = Object.keys(slice.initialState);
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
    this.#unsubscribe = this.#store.subscribe(this.#keys as (keyof StoreState)[], () => {
      this.#value = this.#pickSliceState(this.#store.state);
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
  }

  #pickSliceState(state: StoreState): SliceState {
    const result: Record<string, unknown> = {};

    for (const key of this.#keys) {
      result[key] = state[key as keyof StoreState];
    }

    return result as SliceState;
  }
}
