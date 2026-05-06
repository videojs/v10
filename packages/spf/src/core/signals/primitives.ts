import { Signal as SignalNS } from 'signal-polyfill';

/** Read a signal value without tracking it as a dependency. */
export const untrack: <T>(fn: () => T) => T = SignalNS.subtle.untrack;

/** A writable reactive value (read + write). */
export type Signal<T> = SignalNS.State<T>;

/** A derived reactive value that re-evaluates when its dependencies change (read-only). */
export type Computed<T> = SignalNS.Computed<T>;

/** A read-only view of a reactive value. */
export type ReadonlySignal<T> = Omit<SignalNS.State<T>, 'set'>;

export interface SignalOptions<T> {
  equals?: (t: T, t2: T) => boolean;
}

/** Create a writable reactive value. */
export function signal<T>(initialValue: T, options?: SignalOptions<T>): Signal<T> {
  return new SignalNS.State(initialValue, options as SignalNS.Options<T>);
}

/** Create a computed reactive value. */
export function computed<T>(fn: () => T, options?: SignalOptions<T>): Computed<T> {
  return new SignalNS.Computed(fn, options as SignalNS.Options<T>);
}

/**
 * Update a writable signal. Accepts either a partial object to merge into the
 * current state, or an updater function that receives the current state and
 * returns the next state.
 *
 * @example
 * update(state, { playbackRate: 2 });
 * update(state, (s) => ({ ...s, count: s.count + 1 }));
 */
export function update<T extends object>(signal: Signal<T>, updater: Partial<T> | ((current: T) => T)): void {
  const current = untrack(() => signal.get());
  signal.set(typeof updater === 'function' ? updater(current) : { ...current, ...updater });
}

/**
 * Read every signal in a map and return a plain object snapshot. Each read
 * tracks in the surrounding Computed/Effect — equivalent to calling `.get()`
 * on a single `Signal<S>` over the merged shape.
 *
 * Convenience for behaviors that pass whole state/context snapshots to pure
 * helpers; prefer per-field reads when only a few fields are needed.
 */
export function snapshot<M extends Record<string, ReadonlySignal<unknown>>>(
  map: M
): { [K in keyof M]: M[K] extends { get(): infer V } ? V : never } {
  const out = {} as { [K in keyof M]: M[K] extends { get(): infer V } ? V : never };
  for (const key in map) {
    out[key] = map[key]!.get() as never;
  }
  return out;
}
