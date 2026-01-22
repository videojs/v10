type Listener = (changedKeys: ReadonlySet<PropertyKey>) => void;

export interface State<T extends object> {
  readonly current: Readonly<T>;
  subscribe: ((listener: Listener) => () => void) & (<K extends keyof T>(keys: K[], listener: Listener) => () => void);
}

export interface WritableState<T extends object> extends State<T> {
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  patch: (partial: Partial<T>) => void;
  delete: <K extends keyof T>(key: K) => void;
}

let flushScheduled = false;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(flush);
}

const pendingContainers = new Set<StateContainer<any>>();

export function flush(): void {
  flushScheduled = false;

  for (const container of pendingContainers) {
    container.flush();
  }

  pendingContainers.clear();
}

const hasOwnProp = Object.prototype.hasOwnProperty;

class StateContainer<T extends object> implements WritableState<T> {
  #current: T;
  #listeners = new Set<Listener>();
  #keyListeners = new Map<PropertyKey, Set<Listener>>();
  #pending = new Set<PropertyKey>();

  constructor(initial: T) {
    this.#current = Object.freeze({ ...initial });
  }

  get current(): Readonly<T> {
    return this.#current;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    if (Object.is(this.#current[key], value)) return;
    this.#current = Object.freeze({ ...this.#current, [key]: value });
    this.#pending.add(key);
    pendingContainers.add(this);
    scheduleFlush();
  }

  delete<K extends keyof T>(key: K): void {
    if (!(key in this.#current)) return;
    const { [key]: _, ...rest } = this.#current;
    this.#current = Object.freeze(rest as T);
    this.#pending.add(key);
    pendingContainers.add(this);
    scheduleFlush();
  }

  patch(partial: Partial<T>): void {
    const next = { ...this.#current };

    for (const key in partial) {
      if (!hasOwnProp.call(partial, key)) continue;

      const value = partial[key];

      if (!Object.is(this.#current[key], value)) {
        next[key] = value!;
        this.#pending.add(key);
      }
    }

    if (this.#pending.size > 0) {
      this.#current = Object.freeze(next);
      pendingContainers.add(this);
      scheduleFlush();
    }
  }

  subscribe(listener: Listener): () => void;
  subscribe<K extends keyof T>(keys: K[], listener: Listener): () => void;
  subscribe(first: Listener | PropertyKey[], second?: Listener): () => void {
    // Key-specific subscription
    if (Array.isArray(first)) {
      const keys = first;
      const listener = second!;

      for (const key of keys) {
        let set = this.#keyListeners.get(key);
        if (!set) this.#keyListeners.set(key, (set = new Set()));
        set.add(listener);
      }

      return () => {
        for (const key of keys) {
          this.#keyListeners.get(key)?.delete(listener);
        }
      };
    }

    // Global subscription
    const listener = first;
    this.#listeners.add(listener);

    return () => this.#listeners.delete(listener);
  }

  flush(): void {
    if (this.#pending.size === 0) return;

    const keys: ReadonlySet<PropertyKey> = new Set(this.#pending);
    this.#pending.clear();

    for (const fn of this.#listeners) fn(keys);

    for (const key of keys) {
      const set = this.#keyListeners.get(key);

      if (set) {
        for (const fn of set) fn(keys);
      }
    }
  }
}

export function createState<T extends object>(initial: T): WritableState<T> {
  return new StateContainer(initial);
}

export function isState(value: unknown): value is State<object> {
  return value instanceof StateContainer;
}
