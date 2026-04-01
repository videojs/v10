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
}) => (() => void) | void;

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
   * Per-state effect arrays. Each element becomes one independent `effect()`
   * call gated on that state, with its own dependency tracking and cleanup
   * lifecycle. States with no entry silently run no effects.
   */
  states: Partial<Record<UserStatus, ReactorEffectFn<UserStatus, Context>[]>>;
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
 *   states: {
 *     waiting: [
 *       ({ transition }) => {
 *         if (readySignal.get()) transition('active');
 *       }
 *     ],
 *     active: [
 *       // Effect 1 — guard and exit cleanup
 *       ({ transition }) => {
 *         if (!readySignal.get()) { transition('waiting'); return; }
 *         return () => teardown();
 *       },
 *       // Effect 2 — independent tracking/cleanup
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

  // For each user-defined state, wrap each effect fn in a status-gated effect().
  // The outer effect reads snapshotSignal (tracking both status and context), gates
  // on the matching state, and delegates to the user fn whose own signal reads
  // establish the inner dependency set.
  const effectDisposals: Array<() => void> = [];
  for (const [state, fns] of Object.entries(def.states) as Array<
    [UserStatus, ReactorEffectFn<UserStatus, Context>[]]
  >) {
    for (const fn of fns) {
      const dispose = effect(() => {
        const snapshot = snapshotSignal.get();
        if (snapshot.status !== state) return;
        return fn({
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
