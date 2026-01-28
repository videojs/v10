export type StateChange = () => void;

export interface State<T extends object> {
  readonly current: Readonly<T>;
  subscribe<K extends keyof T>(keys: K[], callback: StateChange): () => void;
  subscribe(callback: StateChange): () => void;
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

const pendingContainers = new Set<StateContainer<any, any>>();

export function flush(): void {
  flushScheduled = false;

  for (const container of pendingContainers) {
    container.flush();
  }

  pendingContainers.clear();
}

const hasOwnProp = Object.prototype.hasOwnProperty;

class StateContainer<T extends object, K extends keyof T> implements WritableState<T> {
  #current: T;
  #listeners = new Set<StateChange>();
  #keyListeners = new Map<K, Set<StateChange>>();
  #pending = new Set<K>();

  constructor(initial: T) {
    this.#current = Object.freeze({ ...initial });
  }

  get current(): Readonly<T> {
    return this.#current;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    if (Object.is(this.#current[key], value)) return;
    this.#current = Object.freeze({ ...this.#current, [key]: value });
    this.#pending.add(key as any);
    pendingContainers.add(this);
    scheduleFlush();
  }

  delete<K extends keyof T>(key: K): void {
    if (!(key in this.#current)) return;
    const { [key]: _, ...rest } = this.#current;
    this.#current = Object.freeze(rest as T);
    this.#pending.add(key as any);
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
        this.#pending.add(key as any);
      }
    }

    if (this.#pending.size > 0) {
      this.#current = Object.freeze(next);
      pendingContainers.add(this);
      scheduleFlush();
    }
  }

  subscribe(callback: StateChange): () => void;
  subscribe<K extends keyof T>(keys: K[], callback: StateChange): () => void;
  subscribe(first: StateChange | K[], second?: StateChange): () => void {
    // Key-specific subscription
    if (Array.isArray(first)) {
      const keys = first;
      const callback = second!;

      for (const key of keys) {
        let set = this.#keyListeners.get(key);
        if (!set) this.#keyListeners.set(key, (set = new Set()));
        set.add(callback);
      }

      return () => {
        for (const key of keys) {
          this.#keyListeners.get(key)?.delete(callback);
        }
      };
    }

    // Global subscription
    const callback = first;
    this.#listeners.add(callback);

    return () => this.#listeners.delete(callback);
  }

  flush(): void {
    if (this.#pending.size === 0) return;

    const keys = this.#pending;
    this.#pending = new Set();

    for (const fn of this.#listeners) fn();

    for (const key of keys) {
      const set = this.#keyListeners.get(key);

      if (set) {
        for (const fn of set) fn();
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
