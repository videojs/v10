/**
 * Default state container.
 *
 * Extend or implement the same shape for custom state handling.
 */
export class State<T> {
  #state: T;

  readonly #listeners = new Set<(state: T) => void>();
  readonly #keyListeners = new Map<keyof T, Set<(state: T) => void>>();

  constructor(initial: T) {
    this.#state = { ...initial };
  }

  get value(): T {
    return this.#state;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    if (this.#state[key] === value) return;
    this.#state = { ...this.#state, [key]: value };
    this.#notify([key]);
  }

  patch(partial: Partial<T>): void {
    const changedKeys = Object.keys(partial) as (keyof T)[];
    if (changedKeys.length > 0) {
      this.#state = { ...this.#state, ...partial };
      this.#notify(changedKeys);
    }
  }

  subscribe(listener: (state: T) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  subscribeKeys<K extends keyof T>(
    keys: K[],
    listener: (state: Pick<T, K>) => void,
  ): () => void {
    for (const key of keys) {
      let set = this.#keyListeners.get(key);

      if (!set) {
        set = new Set();
        this.#keyListeners.set(key, set);
      }

      set.add(listener);
    }

    return () => {
      for (const key of keys) {
        this.#keyListeners.get(key)?.delete(listener);
      }
    };
  }

  #notify(changedKeys: (keyof T)[]): void {
    for (const listener of this.#listeners) {
      listener(this.#state);
    }

    const notified = new Set<(state: T, changedKeys: (keyof T)[]) => void>();

    for (const key of changedKeys) {
      const set = this.#keyListeners.get(key);
      if (!set) continue;

      for (const listener of set) {
        if (!notified.has(listener)) {
          notified.add(listener);
          listener(this.#state);
        }
      }
    }
  }
}

export type StateFactory<T> = (initial: T) => State<T>;
