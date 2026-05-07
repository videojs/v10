import { Signal as SignalNS } from 'signal-polyfill';

/** Read a signal value without tracking it as a dependency. */
export const untrack: <T>(fn: () => T) => T = SignalNS.subtle.untrack;

/**
 * Read a signal's current value without tracking it as a dependency. Sugar
 * for `untrack(() => signal.get())` to reduce boilerplate at single-read
 * sites. Structurally typed to accept any signal-like (Signal, Computed,
 * ReadonlySignal).
 *
 * Accepts an optional `transform` to project the value in the same call;
 * the default is the identity function so the single-arg form returns `T`
 * unchanged.
 *
 * @example
 * const value = peek(someSignal);
 * const id = peek(presentationSignal, (p) => p?.id);
 */
export function peek<T, R = T>(source: { get(): T }, transform: (value: T) => R = (v: T) => v as unknown as R): R {
  return untrack(() => transform(source.get()));
}

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
 * Update a writable signal. Two forms:
 *
 * - **Updater function** `(current) => next`. Works for any signal type,
 *   including `Signal<T | undefined>` — handle undefined in the updater.
 * - **Partial object** to merge into the current state. Requires
 *   `T extends object`.
 *
 * @example
 * update(state, { playbackRate: 2 });
 * update(state, (s) => ({ ...s, count: s.count + 1 }));
 * update(maybeUndefinedSignal, (current) => current ?? defaultValue);
 */
export function update<T>(signal: Signal<T>, updater: (current: T) => T): void;
export function update<T extends object>(signal: Signal<T>, updater: Partial<T>): void;
export function update<T>(signal: Signal<T>, updater: ((current: T) => T) | object): void {
  const current = untrack(() => signal.get());
  if (typeof updater === 'function') {
    signal.set((updater as (current: T) => T)(current));
  } else {
    // Partial<T> form — `T extends object` enforced by the public overload.
    signal.set({ ...(current as object), ...updater } as T);
  }
}

/**
 * Equality comparator for objects with an optional `id` field. Designed for
 * use as a `computed` `equals` option when reacting to identity changes
 * (Ham-shaped objects, JSON-API-shaped resources) while filtering internal
 * updates that preserve the id.
 *
 * Handles undefined inputs symmetrically: both undefined → equal; one
 * undefined → different.
 *
 * @example
 * const presentationById = computed(() => state.presentation.get(), {
 *   equals: equalsById,
 * });
 */
export function equalsById<T extends { id?: string }>(a: T | undefined, b: T | undefined): boolean {
  return a?.id === b?.id;
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
