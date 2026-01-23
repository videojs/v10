import type { State } from './state';

/**
 * Create a computed value derived from state.
 *
 * @example
 * ```ts
 * const effectiveVolume = createComputed(state, ['volume', 'muted'], ({ volume, muted }) => muted ? 0 : volume);
 * ```
 */
export function createComputed<T extends object, K extends keyof T, R>(
  state: State<T>,
  keys: K[],
  derive: (snapshot: Pick<T, K>) => R
): Computed<T, K, R> {
  return new Computed(state, keys, derive);
}

/**
 * A computed value derived from state.
 *
 * The derived value is recomputed when any of the specified keys change.
 * Subscribers are notified only when the computed value actually changes.
 *
 * @example
 * ```ts
 * const effectiveVolume = new Computed(
 *   state,
 *   ['volume', 'muted'],
 *   ({ volume, muted }) => muted ? 0 : volume
 * );
 *
 * effectiveVolume.current;  // derived value
 * effectiveVolume.subscribe(() => console.log('changed'));
 * effectiveVolume.destroy();  // cleanup when done
 * ```
 */
export class Computed<T extends object, K extends keyof T, R> {
  readonly #state: State<T>;
  readonly #keys: K[];
  readonly #derive: (snapshot: Pick<T, K>) => R;
  readonly #listeners = new Set<() => void>();
  readonly #unsubscribe: () => void;

  #cached!: R;
  #initialized = false;

  constructor(state: State<T>, keys: K[], derive: (snapshot: Pick<T, K>) => R) {
    this.#state = state;
    this.#keys = keys;
    this.#derive = derive;

    this.#unsubscribe = state.subscribe(keys, () => {
      if (this.#compute()) {
        for (const fn of this.#listeners) fn();
      }
    });
  }

  get current(): R {
    if (!this.#initialized) this.#compute();
    return this.#cached;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  destroy(): void {
    this.#unsubscribe();
    this.#listeners.clear();
  }

  #compute(): boolean {
    const currentState = {} as Pick<T, K>;

    for (const k of this.#keys) {
      currentState[k] = this.#state.current[k];
    }

    const next = this.#derive(currentState);
    const changed = !this.#initialized || !Object.is(this.#cached, next);

    this.#cached = next;
    this.#initialized = true;

    return changed;
  }
}
