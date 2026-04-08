import type { ActorSnapshot } from './actor';
import type { Machine } from './machine';
import { createMachineCore } from './machine';
import { untrack, update } from './signals/primitives';

// =============================================================================
// Definition types
// =============================================================================

/**
 * A reducer-shaped actor: `(context, message) => context`.
 *
 * No finite states — the snapshot carries `value: 'active' | 'destroyed'`
 * as a universal lifecycle marker rather than domain state. The interesting
 * state is entirely in the context, which is observable via `snapshot`.
 *
 * Use this when the actor has context that needs to be observable but no
 * meaningful state machine (e.g., a message-driven model with DOM side
 * effects). For actors that need per-state behavior, use `createMachineActor`.
 */
export interface TransitionActor<Context extends object, Message extends { type: string }>
  extends Machine<ActorSnapshot<'active' | 'destroyed', Context>> {
  send(message: Message): void;
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Creates a reducer-shaped actor from an initial context and a reducer function.
 *
 * The reducer receives the current context and a message and returns the next
 * context. Returning the same reference (by identity) skips the signal update —
 * so early-returning `context` unchanged is both the no-op and the optimization.
 *
 * Side effects (e.g. DOM mutations) may be performed inside the reducer.
 * They run synchronously before the signal is updated.
 *
 * @example
 * const actor = createTransitionActor(
 *   { count: 0 },
 *   (context, message: { type: 'increment' }) => ({ count: context.count + 1 })
 * );
 */
export function createTransitionActor<Context extends object, Message extends { type: string }>(
  initialContext: Context,
  reducer: (context: Context, message: Message) => Context
): TransitionActor<Context, Message> {
  const { snapshotSignal, getState, transition } = createMachineCore<
    'active' | 'destroyed',
    ActorSnapshot<'active' | 'destroyed', Context>
  >({ value: 'active', context: initialContext });

  const getContext = (): Context => untrack(() => snapshotSignal.get().context);
  const setContext = (context: Context): void => update(snapshotSignal, { context });

  return {
    get snapshot() {
      return snapshotSignal;
    },

    send(message: Message): void {
      if (getState() === 'destroyed') return;
      const context = getContext();
      const newContext = reducer(context, message);
      if (newContext !== context) setContext(newContext);
    },

    destroy(): void {
      if (getState() === 'destroyed') return;
      transition('destroyed');
    },
  };
}
