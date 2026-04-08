import type { ReadonlySignal } from './signals/primitives';
import { signal, untrack, update } from './signals/primitives';

// =============================================================================
// Shared snapshot type
// =============================================================================

/**
 * Base snapshot for all machine-like primitives (Actors and Reactors).
 * Carries only the finite state value. Actors extend this with `context`.
 */
export interface MachineSnapshot<State extends string> {
  value: State;
}

// =============================================================================
// Shared interface
// =============================================================================

/**
 * Shared interface for all machine-like primitives.
 * Both Actors (message-driven) and Reactors (signal-driven) implement this.
 */
export interface Machine<Snapshot extends MachineSnapshot<string>> {
  readonly snapshot: ReadonlySignal<Snapshot>;
  destroy(): void;
}

// =============================================================================
// Shared core factory
// =============================================================================

/**
 * Provisions the shared mechanics for all machine-like primitives: a snapshot
 * signal, an untracked state reader, and a transition function.
 *
 * Internal — consumed by `createMachineActor` and `createMachineReactor`. Not part of the
 * public API.
 */
export function createMachineCore<FullState extends string, Snapshot extends MachineSnapshot<FullState>>(
  initialSnapshot: Snapshot
) {
  const snapshotSignal = signal(initialSnapshot);
  const getState = (): FullState => untrack(() => snapshotSignal.get().value);
  const transition = (to: FullState): void => update(snapshotSignal, (current) => ({ ...current, value: to }));
  return { snapshotSignal, getState, transition };
}
