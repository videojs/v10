import { noop } from '@videojs/utils/function';

export type StateChange = () => void;

export type UnknownState = Record<string, unknown>;

export interface SubscribeOptions {
  signal?: AbortSignal;
}

export interface State<T> {
  readonly current: Readonly<T>;
  subscribe(callback: StateChange, options?: SubscribeOptions): () => void;
}

export interface WritableState<T> extends State<T> {
  patch: (partial: Partial<T>) => void;
  replace: (next: T, forceNotify?: boolean) => void;
}

let isFlushScheduled = false;
function scheduleFlush(): void {
  if (isFlushScheduled) return;
  isFlushScheduled = true;
  queueMicrotask(flush);
}

const pendingContainers = new Set<StateContainer<any>>();

export function flush(): void {
  isFlushScheduled = false;
  for (const container of pendingContainers) container.flush();
  pendingContainers.clear();
}

const hasOwnProp = Object.prototype.hasOwnProperty;

class StateContainer<T> implements WritableState<T> {
  #current: T;
  #listeners = new Set<StateChange>();
  #pending = false;

  constructor(initial: T) {
    this.#current = Object.freeze({ ...initial });
  }

  get current(): Readonly<T> {
    return this.#current;
  }

  patch(partial: Partial<T>): void {
    const next = { ...this.#current };

    let changed = false;

    for (const key of Reflect.ownKeys(partial as object) as (keyof T)[]) {
      if (!hasOwnProp.call(partial, key)) continue;

      const value = partial[key];

      if (!Object.is(this.#current[key], value)) {
        next[key] = value!;
        changed = true;
      }
    }

    if (changed) {
      this.replace(next);
    }
  }

  replace(next: T, forceNotify = false): void {
    const changed = forceNotify || !shallowEqual(this.#current, next);
    if (!changed) return;

    this.#current = Object.freeze({ ...next });
    this.#markPending();
  }

  subscribe(callback: StateChange, options?: SubscribeOptions): () => void {
    const signal = options?.signal;
    if (signal?.aborted) return noop;

    this.#listeners.add(callback);

    if (!signal) {
      return () => this.#listeners.delete(callback);
    }

    const onAbort = () => this.#listeners.delete(callback);
    signal.addEventListener('abort', onAbort, { once: true });

    return () => {
      signal.removeEventListener('abort', onAbort);
      this.#listeners.delete(callback);
    };
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

function shallowEqual<T>(a: T, b: T): boolean {
  const aKeys = Reflect.ownKeys(a as object);
  const bKeys = Reflect.ownKeys(b as object);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!hasOwnProp.call(b, key) || !Object.is(a[key as keyof T], b[key as keyof T])) return false;
  }

  return true;
}

export function createState<T>(initial: T): WritableState<T> {
  return new StateContainer(initial);
}

export function isState(value: unknown): value is State<object> {
  return value instanceof StateContainer;
}
