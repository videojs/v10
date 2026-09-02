import { noop } from '@videojs/utils/function';
import { shallowEqual } from '@videojs/utils/object';

import type { AnySlice } from './slice';

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
  replace: (next: T) => void;
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

// Snapshots are frozen copies, so membership lives beside them instead of on them.
const snapshotSlices = new WeakMap<object, ReadonlySet<AnySlice>>();

class StateContainer<T> implements WritableState<T> {
  #current: T;
  #slices: ReadonlySet<AnySlice> | undefined;
  #listeners = new Set<StateChange>();
  #pending = false;

  constructor(initial: T, slices?: ReadonlySet<AnySlice>) {
    this.#slices = slices;
    this.#current = this.#publish({ ...initial });
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
      this.#current = this.#publish(next);
      this.#markPending();
    }
  }

  replace(next: T): void {
    // Example: media metadata can change under a user override while the
    // resolved title stays the same. Preserve the public snapshot in that case.
    if (shallowEqual(this.#current, next)) return;

    this.#current = this.#publish({ ...next });
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

  #publish(next: T): T {
    const snapshot = Object.freeze(next);

    if (this.#slices) snapshotSlices.set(snapshot as object, this.#slices);

    return snapshot;
  }
}

/**
 * @param initial - Initial state; the container publishes frozen copies.
 * @param slices - Slices the state was built from. Every snapshot the container publishes is tagged with them so
 *   `createSelector` can check membership by identity. Copies of a snapshot carry no tag.
 */
export function createState<T>(initial: T, slices?: ReadonlySet<AnySlice>): WritableState<T> {
  return new StateContainer(initial, slices);
}

/** Returns the slices a store-owned snapshot was built from, or `undefined` for any other object. */
export function getSnapshotSlices(snapshot: object): ReadonlySet<AnySlice> | undefined {
  return snapshotSlices.get(snapshot);
}

export function isState(value: unknown): value is State<object> {
  return value instanceof StateContainer;
}
