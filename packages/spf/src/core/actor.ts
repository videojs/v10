/**
 * Generic actor types.
 *
 * An actor owns its snapshot (finite state + non-finite context) and
 * notifies observers when it changes. Mirrors the XState snapshot model:
 * `snapshot.value` is the bounded operational mode, `snapshot.context`
 * holds arbitrary non-finite data.
 */

import type { Machine, MachineSnapshot } from './machine';

/**
 * Complete actor snapshot: finite state + non-finite context.
 * Extends `MachineSnapshot` with context — the non-finite data managed by the actor.
 */
export interface ActorSnapshot<State extends string, Context extends object> extends MachineSnapshot<State> {
  context: Context;
}

/** Generic actor interface: owns its snapshot as a reactive signal. */
export interface SignalActor<State extends string, Context extends object>
  extends Machine<ActorSnapshot<State, Context>> {}

/**
 * A message-driven actor with no reactive snapshot.
 *
 * Use for actors that coordinate async work but have no state that external
 * consumers need to observe. Analogous to XState's `fromCallback`.
 */
export interface CallbackActor<Message extends { type: string }> {
  send(message: Message): void;
  destroy(): void;
}
