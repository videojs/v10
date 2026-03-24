import type { WritableState } from '../state/create-state';
import { effect } from './effect';
import { type ReadonlySignal, type Signal, signal } from './primitives';

function shallowEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const keysA = Object.keys(a as object) as (keyof T)[];
  if (keysA.length !== Object.keys(b as object).length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

/**
 * Bridge a WritableState to a Signal.State, keeping both sides in sync.
 *
 * - WritableState → Signal: a subscription keeps the signal up to date
 *   whenever external code calls state.patch().
 * - Signal → WritableState: an effect diffs signal.get() against state.current
 *   and patches only the fields that actually changed, so migrated reactors
 *   can write to the signal and un-migrated reactors still see the update.
 *
 * Shallow equality on the signal prevents feedback loops: when the forward
 * bridge calls signal.set(state.current) after a reverse patch, the signal
 * compares field-by-field and skips notification if nothing changed.
 *
 * This is temporary scaffolding for incremental migration. Once all consumers
 * have been migrated to signals, the bridge and the underlying WritableState
 * can be retired together.
 */
export function stateToSignal<T extends object>(state: WritableState<T>): [Signal<T>, () => void] {
  const sig = signal(state.current, { equals: shallowEqual });

  // WritableState → Signal: keep signal in sync when external code patches state
  const cleanupForward = state.subscribe((v) => sig.set(v));

  // Signal → WritableState: when a reactor writes to the signal, patch only
  // the fields that differ so un-migrated reactors see the change too
  const cleanupReverse = effect(() => {
    const next = sig.get();
    const current = state.current;
    const patch: Partial<T> = {};
    let hasChanges = false;
    for (const key of Object.keys(next) as (keyof T)[]) {
      if (next[key] !== current[key]) {
        patch[key] = next[key];
        hasChanges = true;
      }
    }
    if (hasChanges) state.patch(patch as T extends object ? Partial<T> : T);
  });

  return [
    sig,
    () => {
      cleanupForward();
      cleanupReverse();
    },
  ];
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
  sig: ReadonlySignal<S>,
  state: WritableState<T>,
  map: (value: S) => T extends object ? Partial<T> : T
): () => void {
  return effect(() => state.patch(map(sig.get())));
}
