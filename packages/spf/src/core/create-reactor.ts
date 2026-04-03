import type { ActorSnapshot, SignalActor } from './actor';
import { effect } from './signals/effect';
import { signal, untrack, update } from './signals/primitives';

// =============================================================================
// Definition types
// =============================================================================

/**
 * An effect function used in reactor states and `always` blocks.
 *
 * Receives `status` (the current reactor status), `transition`, `context`, and
 * `setContext`. May return a cleanup function that runs before each re-evaluation
 * and on state exit (including destroy).
 *
 * In `always` blocks, `status` reflects whichever non-terminal state is active.
 * In per-state `entry`/`reactions` blocks, `status` is always that state's value.
 */
export type ReactorEffectFn<UserStatus extends string, Context extends object> = (ctx: {
  status: UserStatus;
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
}) => (() => void) | { abort(): void } | void;

/**
 * Per-state effect grouping for a single reactor state.
 *
 * - `entry` effects run once on state entry. The fn body is automatically
 *   untracked — no `untrack()` calls are needed inside. Use this for
 *   one-time setup: reading current values, attaching event listeners, etc.
 * - `reactions` effects run on state entry and re-run whenever a signal read
 *   inside the fn body changes. Use `untrack()` for reads you do not want to
 *   track. Use this for work that must stay in sync with reactive state.
 *
 * Both arrays are optional; pass `{}` for states with no effects.
 */
export type ReactorStateDefinition<UserStatus extends string, Context extends object> = {
  entry?: ReactorEffectFn<UserStatus, Context> | ReactorEffectFn<UserStatus, Context>[];
  reactions?: ReactorEffectFn<UserStatus, Context> | ReactorEffectFn<UserStatus, Context>[];
};

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
  always?: ReactorEffectFn<UserStatus, Context> | ReactorEffectFn<UserStatus, Context>[];
  /**
   * Per-state effect groupings. Every valid status must be declared — pass `{}`
   * for states with no effects. `entry` and `reactions` each become independent
   * `effect()` calls gated on that state, with their own cleanup lifecycles.
   */
  states: Record<UserStatus, ReactorStateDefinition<UserStatus, Context>>;
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
 *     active: {
 *       // entry: runs once on state entry; fn body is automatically untracked.
 *       entry: [() => listen(el, 'play', handler)],
 *       // reactions: re-runs whenever tracked signals change.
 *       reactions: [() => { currentTimeSignal.get(); return cleanup; }],
 *     },
 *     idle: {}, // no effects
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

  const makeCtx = (snapshot: ActorSnapshot<FullStatus, Context>) => ({
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

  const wrapResult = (result: ReturnType<ReactorEffectFn<UserStatus, Context>>) => {
    if (!result) return undefined;
    if (typeof result === 'function') return result;
    return () => result.abort();
  };

  // Registers each fn as an independent effect. The effect reads snapshotSignal,
  // skips if shouldSkip returns true, then calls fn — untracked for entry effects
  // (so only snapshotSignal is tracked), tracked for reactions and always effects.
  const registerEffects = (
    effects: ReactorEffectFn<UserStatus, Context> | ReactorEffectFn<UserStatus, Context>[] | undefined,
    shouldSkip: (snapshot: ActorSnapshot<FullStatus, Context>) => boolean,
    untracked = false
  ) => {
    const fns = effects === undefined ? [] : Array.isArray(effects) ? effects : [effects];
    for (const fn of fns) {
      effectDisposals.push(
        effect(() => {
          const snapshot = snapshotSignal.get();
          if (shouldSkip(snapshot)) return;
          const call = () => fn(makeCtx(snapshot));
          return wrapResult(untracked ? untrack(call) : call());
        })
      );
    }
  };

  const isTerminal = (snapshot: ActorSnapshot<FullStatus, Context>) =>
    snapshot.status === 'destroying' || snapshot.status === 'destroyed';

  // 'always' effects run in every non-terminal state — processed first so that
  // cross-cutting condition monitors fire before per-state effects in the
  // initial synchronous run AND on every subsequent re-run.
  //
  // The ordering guarantee: effect() calls watcher.watch(computed) in order of
  // registration. runPending() drains watcher.getPending() into a Set (insertion-
  // ordered) before iterating it. Because 'always' effects are registered before
  // per-state effects here, they are guaranteed to run first in every flush.
  // This is load-bearing: it means a transition triggered by an 'always' monitor
  // takes effect before the per-state effects of the (now-exited) state re-run,
  // so per-state effects can rely on the invariants established by 'always'.
  registerEffects(def.always, isTerminal);

  // Per-state effects — each is gated on its matching status.
  // `entry` effects are registered with untracked=true so the fn body creates no
  // reactive dependencies; they run once on state entry and clean up on exit.
  // `reactions` effects leave the fn body tracked normally.
  for (const [state, stateDef] of Object.entries(def.states) as Array<
    [UserStatus, ReactorStateDefinition<UserStatus, Context>]
  >) {
    const isNotState = (snapshot: ActorSnapshot<FullStatus, Context>) => snapshot.status !== state;
    registerEffects(stateDef.entry, isNotState, true);
    registerEffects(stateDef.reactions, isNotState);
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
