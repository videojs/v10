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
