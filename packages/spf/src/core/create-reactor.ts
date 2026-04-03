import type { ActorSnapshot, SignalActor } from './actor';
import { effect } from './signals/effect';
import { signal, untrack, update } from './signals/primitives';

// =============================================================================
// Definition types
// =============================================================================

/**
 * A reactive status-deriving function used in the `derive` field.
 *
 * Returns the target status the reactor should be in. Any signals read inside
 * the fn body create reactive dependencies — the framework re-evaluates it when
 * those signals change and automatically calls `transition()` when the returned
 * status differs from the current one.
 */
export type ReactorDeriveFn<UserStatus extends string, Context extends object> = (ctx: {
  status: UserStatus;
  transition: (to: UserStatus) => void;
  context: Context;
  setContext: (next: Context) => void;
}) => UserStatus;

/**
 * An effect function used in reactor `entry` and `reactions` blocks.
 *
 * Receives `status`, `transition`, `context`, and `setContext`. May return a
 * cleanup function that runs before each re-evaluation and on state exit
 * (including destroy).
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
   * Reactive status derivation. Registered before per-state effects — the
   * ordering guarantee ensures transitions fired here take effect before
   * per-state effects re-evaluate in the same flush.
   */
  derive?: ReactorDeriveFn<UserStatus, Context> | ReactorDeriveFn<UserStatus, Context>[];
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
// Implementation helpers
// =============================================================================

const toArray = <T>(x: T | T[] | undefined): T[] => (x === undefined ? [] : Array.isArray(x) ? x : [x]);

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
 *   derive: ({ status, transition }) => {
 *     const target = deriveStatus();
 *     if (target !== status) transition(target);
 *     return target;
 *   },
 *   states: {
 *     active: {
 *       // entry: runs once on state entry; fn body is automatically untracked.
 *       entry: () => listen(el, 'play', handler),
 *       // reactions: re-runs whenever tracked signals change.
 *       reactions: () => { currentTimeSignal.get(); return cleanup; },
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

  type EffectCall = () => ReturnType<ReactorEffectFn<UserStatus, Context>>;

  type EffectDescriptor = {
    fn: ReactorEffectFn<UserStatus, Context>;
    shouldSkip: (snapshot: ActorSnapshot<FullStatus, Context>) => boolean;
    toFnCall: (baseCall: EffectCall) => EffectCall;
  };

  const identity: EffectDescriptor['toFnCall'] = (baseCall) => baseCall;
  const untracked: EffectDescriptor['toFnCall'] = (baseCall) => () => untrack(baseCall);

  const isTerminal = (snapshot: ActorSnapshot<FullStatus, Context>) =>
    snapshot.status === 'destroying' || snapshot.status === 'destroyed';

  // `derive` descriptors are built first — the ordering guarantee ensures
  // transitions they trigger take effect before per-state effects re-evaluate
  // in the same flush. See the comment on effect registration order in the
  // previous implementation for full details.
  const descriptors: EffectDescriptor[] = [
    ...toArray(def.derive).map((fn) => ({
      fn: (ctx: Parameters<ReactorEffectFn<UserStatus, Context>>[0]) => {
        const target = fn(ctx);
        if (target !== ctx.status) ctx.transition(target);
      },
      shouldSkip: isTerminal,
      toFnCall: identity,
    })),
    ...(Object.entries(def.states) as Array<[UserStatus, ReactorStateDefinition<UserStatus, Context>]>).flatMap(
      ([state, stateDef]) => {
        const isNotState = (snapshot: ActorSnapshot<FullStatus, Context>) => snapshot.status !== state;
        return [
          ...toArray(stateDef.entry).map((fn) => ({ fn, shouldSkip: isNotState, toFnCall: untracked })),
          ...toArray(stateDef.reactions).map((fn) => ({ fn, shouldSkip: isNotState, toFnCall: identity })),
        ];
      }
    ),
  ];

  const toEffect = ({ fn, shouldSkip, toFnCall }: EffectDescriptor) =>
    effect(() => {
      const snapshot = snapshotSignal.get();
      if (shouldSkip(snapshot)) return;
      const baseCall = () => fn(makeCtx(snapshot));
      return wrapResult(toFnCall(baseCall)());
    });

  effectDisposals.push(...descriptors.map(toEffect));

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
