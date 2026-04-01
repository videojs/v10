import type { ActorSnapshot, SignalActor } from './actor';
import { effect } from './signals/effect';
import { signal, untrack, update } from './signals/primitives';

// =============================================================================
// Definition types
// =============================================================================

/**
 * A single effect function within a reactor state.
 *
 * Called when the reactor enters or re-evaluates the state it belongs to.
 * May return a cleanup function that runs before each re-evaluation and on
 * state exit (including destroy).
 */
export type ReactorEffectFn<UserStatus extends string, Context extends object> = (ctx: {
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
}) => (() => void) | { abort(): void } | void;

/**
 * A cross-cutting effect function that runs in every non-terminal state.
 *
 * Identical to `ReactorEffectFn` except the current `status` is also passed,
 * allowing a single effect to monitor conditions and drive transitions from
 * any state without duplicating the same guard in every state block.
 */
export type ReactorAlwaysEffectFn<UserStatus extends string, Context extends object> = (ctx: {
  status: UserStatus;
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
}) => (() => void) | { abort(): void } | void;

/**
 * Full reactor definition passed to `createReactor`.
 *
 * `UserStatus` is the set of domain-meaningful states. `'destroying'` and
 * `'destroyed'` are always added by the framework as implicit terminal states —
 * do not include them here.
 */
export type ReactorDefinition<UserStatus extends string, Context extends object> = {
  /** Initial status. */
  initial: UserStatus;
  /** Initial context. */
  context: Context;
  /**
   * Cross-cutting effects that run in every non-terminal state.
   * Each element becomes one independent `effect()` call that re-runs on any
   * status or context change, with the current `status` available in ctx.
   * Useful for condition monitors that apply uniformly across all states.
   */
  always?: ReactorAlwaysEffectFn<UserStatus, Context>[];
  /**
   * Per-state effect arrays. Every valid status must be declared — use an empty
   * array for states with no effects. Each element becomes one independent
   * `effect()` call gated on that state, with its own dependency tracking and
   * cleanup lifecycle.
   */
  states: Record<UserStatus, ReactorEffectFn<UserStatus, Context>[]>;
};

// =============================================================================
// Live reactor interface
// =============================================================================

/** Live reactor instance returned by `createReactor`. */
export type Reactor<Status extends string, Context extends object> = SignalActor<Status, Context>;

// =============================================================================
// Implementation
// =============================================================================

/**
 * Creates a reactive Reactor from a declarative definition.
 *
 * A Reactor is driven by subscriptions to external signals rather than
 * imperative messages. Each state holds an array of effect functions —
 * every element becomes one independent `effect()` call gated on that state,
 * with its own dependency tracking and cleanup lifecycle. This replaces the
 * pattern of multiple named `cleanupX = effect(...)` variables in function-based
 * reactors.
 *
 * `'destroying'` and `'destroyed'` are always implicit terminal states.
 * `destroy()` transitions through both in sequence: `'destroying'` first (for
 * potential async teardown in a future extension), then immediately `'destroyed'`
 * for the synchronous base case. Active effect cleanups fire via disposal.
 *
 * @example
 * const reactor = createReactor({
 *   initial: 'waiting',
 *   context: {},
 *   // Runs in every non-terminal state — drives transitions from a single place.
 *   always: [
 *     ({ status, transition }) => {
 *       const target = deriveStatus();
 *       if (target !== status) transition(target);
 *     }
 *   ],
 *   states: {
 *     active: [
 *       // State-specific work with its own cleanup lifecycle.
 *       () => {
 *         const unsub = subscribe(valueSignal.get(), handler);
 *         return () => unsub();
 *       }
 *     ]
 *   }
 * });
 */
export function createReactor<UserStatus extends string, Context extends object>(
  def: ReactorDefinition<UserStatus, Context>
): Reactor<UserStatus | 'destroying' | 'destroyed', Context> {
  type FullStatus = UserStatus | 'destroying' | 'destroyed';

  const snapshotSignal = signal<ActorSnapshot<FullStatus, Context>>({
    status: def.initial as FullStatus,
    context: def.context,
  });

  const getStatus = (): FullStatus => untrack(() => snapshotSignal.get().status);

  const transition = (to: FullStatus): void => {
    update(snapshotSignal, { status: to });
  };

  const setContext = (context: Context): void => {
    update(snapshotSignal, { context });
  };

  const effectDisposals: Array<() => void> = [];

  // 'always' effects run in every non-terminal state — processed first so that
  // cross-cutting condition monitors fire before per-state effects in the
  // initial synchronous run.
  for (const fn of def.always ?? []) {
    const dispose = effect(() => {
      const snapshot = snapshotSignal.get();
      if (snapshot.status === 'destroying' || snapshot.status === 'destroyed') return;
      const result = fn({
        status: snapshot.status as UserStatus,
        transition: (to: UserStatus) => {
          if (getStatus() === 'destroying' || getStatus() === 'destroyed') return;
          transition(to as FullStatus);
        },
        context: snapshot.context,
        setContext: (context: Context) => {
          if (getStatus() === 'destroying' || getStatus() === 'destroyed') return;
          setContext(context);
        },
      });
      if (!result) return undefined;
      if (typeof result === 'function') return result;
      return () => result.abort();
    });
    effectDisposals.push(dispose);
  }

  // Per-state effects — each is gated on its matching status.
  for (const [state, fns] of Object.entries(def.states) as Array<
    [UserStatus, ReactorEffectFn<UserStatus, Context>[]]
  >) {
    for (const fn of fns) {
      const dispose = effect(() => {
        const snapshot = snapshotSignal.get();
        if (snapshot.status !== state) return;
        const result = fn({
          transition: (to: UserStatus) => {
            if (getStatus() === 'destroying' || getStatus() === 'destroyed') return;
            transition(to as FullStatus);
          },
          context: snapshot.context,
          setContext: (context: Context) => {
            if (getStatus() === 'destroying' || getStatus() === 'destroyed') return;
            setContext(context);
          },
        });
        if (!result) return undefined;
        if (typeof result === 'function') return result;
        return () => result.abort();
      });
      effectDisposals.push(dispose);
    }
  }

  return {
    get snapshot() {
      return snapshotSignal;
    },

    destroy(): void {
      const status = getStatus();
      if (status === 'destroying' || status === 'destroyed') return;
      // Two-step teardown: transition through 'destroying' first to leave room
      // for async teardown in a future extension, then immediately 'destroyed'
      // for the synchronous base case. Active effect cleanups fire via disposal.
      transition('destroying');
      transition('destroyed');
      for (const dispose of effectDisposals) dispose();
    },
  };
}
