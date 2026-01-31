export type StateChange = () => void;

export interface State<T extends object> {
  readonly current: Readonly<T>;
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
  #listeners = new Set<StateChange>();
  #pending = false;

  constructor(initial: T) {
    this.#current = Object.freeze({ ...initial });
  }

  get current(): Readonly<T> {
    return this.#current;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    if (Object.is(this.#current[key], value)) return;
    this.#current = Object.freeze({ ...this.#current, [key]: value });
    this.#markPending();
  }

  delete<K extends keyof T>(key: K): void {
    if (!(key in this.#current)) return;
    const { [key]: _, ...rest } = this.#current;
    this.#current = Object.freeze(rest as T);
    this.#markPending();
  }

  patch(partial: Partial<T>): void {
    const next = { ...this.#current };
    let changed = false;

    for (const key in partial) {
      if (!hasOwnProp.call(partial, key)) continue;

      const value = partial[key];

      if (!Object.is(this.#current[key], value)) {
        next[key] = value!;
        changed = true;
      }
    }

    if (changed) {
      this.#current = Object.freeze(next);
      this.#markPending();
    }
  }

  subscribe(callback: StateChange): () => void {
    this.#listeners.add(callback);
    return () => this.#listeners.delete(callback);
  }

  flush(): void {
    if (!this.#pending) return;
    this.#pending = false;

    for (const fn of this.#listeners) fn();
  }

  #markPending(): void {
    this.#pending = true;
    pendingContainers.add(this);
    scheduleFlush();
  }
}

export function createState<T extends object>(initial: T): WritableState<T> {
  return new StateContainer(initial);
}

export function isState(value: unknown): value is State<object> {
  return value instanceof StateContainer;
}
