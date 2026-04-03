/**
 * Generic actor types.
 *
 * An actor owns its snapshot (finite state + non-finite context) and
 * notifies observers when it changes. Mirrors the XState snapshot model:
 * `snapshot.value` is the bounded operational mode, `snapshot.context`
 * holds arbitrary non-finite data.
 */

import type { ReadonlySignal } from './signals/primitives';

/** Complete actor snapshot: finite state + non-finite context. */
export interface ActorSnapshot<State extends string, Context> {
  value: State;
  context: Context;
}

/** Generic actor interface: owns its snapshot and notifies observers. */
export interface Actor<State extends string, Context> {
  /** Current snapshot. */
  readonly snapshot: ActorSnapshot<State, Context>;

  /**
   * Subscribe to snapshot changes. Fires immediately with the current
   * snapshot, then on every subsequent change.
   *
   * @returns Unsubscribe function.
   */
  subscribe(listener: (snapshot: ActorSnapshot<State, Context>) => void): () => void;

  /** Tear down the actor. */
  destroy(): void;
}

/** Generic actor interface: owns its snapshot and notifies observers. */
export interface SignalActor<State extends string, Context> {
  /** Current snapshot. Readable and reactive; not writable by consumers. */
  readonly snapshot: ReadonlySignal<ActorSnapshot<State, Context>>;
  /** Tear down the actor. */
  destroy(): void;
}
