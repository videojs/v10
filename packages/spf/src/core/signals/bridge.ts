import { Signal } from 'signal-polyfill';
import type { State, WritableState } from '../state/create-state';
import { effect } from './effect';

/**
 * Bridge a WritableState into a Signal.ReadonlyState.
 *
 * The signal mirrors the state's current value and stays in sync via a
 * subscription. Returns the signal and a cleanup function that tears down
 * the subscription.
 *
 * This is temporary scaffolding for incremental migration. Once all consumers
 * have been migrated to signals, the bridge and the underlying WritableState
 * can be retired together.
 */
export function stateToSignal<T>(state: State<T>): [Signal.State<T>, () => void] {
  const signal = new Signal.State(state.current);
  const cleanup = state.subscribe((v) => signal.set(v));
  return [signal, cleanup];
}

/**
 * Bridge a Signal.ReadonlyState back into a WritableState via an effect.
 *
 * Runs an effect that calls `state.patch(map(signal.get()))` whenever the
 * signal changes. Returns a cleanup function that stops the effect.
 *
 * Use this when a migrated reactor's local signal state needs to remain
 * observable by reactors that have not yet been migrated (e.g. a throughput
 * signal that feeds a WritableState-based ABR reactor).
 *
 * Like stateToSignal, this is temporary scaffolding — delete when no longer
 * needed.
 */
export function signalToState<T, S>(
  signal: Signal.ReadonlyState<S>,
  state: WritableState<T>,
  map: (value: S) => T extends object ? Partial<T> : T
): () => void {
  return effect(() => state.patch(map(signal.get())));
}
