import { effect } from './signals/effect';
import type { ReadonlySignal } from './signals/primitives';
import { signal, untrack, update } from './signals/primitives';

// =============================================================================
// Definition types
// =============================================================================

/**
 * A reactive status-deriving function used in the `monitor` field.
 *
 * Returns the target status the reactor should be in. Any signals read inside
 * the fn body create reactive dependencies — the framework re-evaluates it when
 * those signals change and automatically calls `transition()` when the returned
 * status differs from the current one.
 */
export type ReactorDeriveFn<State extends string> = () => State;

/**
 * An effect function used in reactor `entry` and `reactions` blocks.
 *
 * May return a cleanup function that runs before each re-evaluation and on
 * state exit (including destroy).
 */
export type ReactorEffectFn = () => (() => void) | { abort(): void } | void;

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
 * Both are optional; pass `{}` for states with no effects.
 */
export type ReactorStateDefinition = {
  entry?: ReactorEffectFn | ReactorEffectFn[];
  reactions?: ReactorEffectFn | ReactorEffectFn[];
};

/**
 * Full reactor definition passed to `createReactor`.
 *
 * `State` is the set of domain-meaningful states. `'destroying'` and
 * `'destroyed'` are always added by the framework as implicit terminal states —
 * do not include them here.
 */
export type ReactorDefinition<State extends string> = {
  /** Initial status. */
  initial: State;
  /**
   * Reactive status derivation. Registered before per-state effects — the
   * ordering guarantee ensures transitions fired here take effect before
   * per-state effects re-evaluate in the same flush.
   */
  monitor?: ReactorDeriveFn<State> | ReactorDeriveFn<State>[];
  /**
   * Per-state effect groupings. Every valid status must be declared — pass `{}`
   * for states with no effects. `entry` and `reactions` each become independent
   * `effect()` calls gated on that state, with their own cleanup lifecycles.
   */
  states: Record<State, ReactorStateDefinition>;
};

// =============================================================================
// Live reactor interface
// =============================================================================

/** Live reactor instance returned by `createReactor`. */
export type Reactor<Status extends string> = {
  readonly snapshot: ReadonlySignal<{ status: Status }>;
  destroy(): void;
};

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
 * with its own dependency tracking and cleanup lifecycle.
 *
 * `'destroying'` and `'destroyed'` are always implicit terminal states.
 * `destroy()` transitions through both in sequence: `'destroying'` first (for
 * potential async teardown in a future extension), then immediately `'destroyed'`
 * for the synchronous base case. Active effect cleanups fire via disposal.
 *
 * @example
 * const reactor = createReactor({
 *   initial: 'waiting',
 *   monitor: () => srcSignal.get() ? 'active' : 'waiting',
 *   states: {
 *     active: {
 *       // entry: runs once on state entry; fn body is automatically untracked.
 *       entry: () => listen(el, 'play', handler),
 *       // reactions: re-runs whenever tracked signals change.
 *       reactions: () => { currentTimeSignal.get(); return cleanup; },
 *     },
 *     waiting: {},
 *   }
 * });
 */
export function createReactor<State extends string>(
  def: ReactorDefinition<State>
): Reactor<State | 'destroying' | 'destroyed'> {
  type FullState = State | 'destroying' | 'destroyed';

  const snapshotSignal = signal<{ value: FullState }>({
    value: def.initial as FullState,
  });

  const getStatus = (): FullState => untrack(() => snapshotSignal.get().value);

  const transition = (to: FullState): void => {
    update(snapshotSignal, { value: to });
  };

  const effectDisposals: Array<() => void> = [];

  const wrapResult = (result: ReturnType<ReactorEffectFn>) => {
    if (!result) return undefined;
    if (typeof result === 'function') return result;
    return () => result.abort();
  };

  type EffectCall = () => ReturnType<ReactorEffectFn>;

  type EffectDescriptor = {
    fn: ReactorEffectFn;
    shouldSkip: (snapshot: { value: FullState }) => boolean;
    toFnCall?: (baseCall: EffectCall) => EffectCall;
  };

  const untracked: EffectDescriptor['toFnCall'] = (baseCall) => () => untrack(baseCall);

  const isTerminal = (snapshot: { value: FullState }) =>
    snapshot.value === 'destroying' || snapshot.value === 'destroyed';

  // `monitor` descriptors are built first — the ordering guarantee ensures
  // transitions they trigger take effect before per-state effects re-evaluate
  // in the same flush. See the comment on effect registration order in the
  // previous implementation for full details.
  const descriptors: EffectDescriptor[] = [
    ...toArray(def.monitor).map((fn) => ({
      fn: () => {
        const target = fn();
        if (target !== (getStatus() as State)) transition(target as FullState);
      },
      shouldSkip: isTerminal,
    })),
    ...(Object.entries(def.states) as Array<[State, ReactorStateDefinition]>).flatMap(([state, stateDef]) => {
      const isNotState = (snapshot: { value: FullState }) => snapshot.value !== state;
      return [
        ...toArray(stateDef.entry).map((fn) => ({ fn, shouldSkip: isNotState, toFnCall: untracked })),
        ...toArray(stateDef.reactions).map((fn) => ({ fn, shouldSkip: isNotState })),
      ];
    }),
  ];

  const toEffect = ({ fn, shouldSkip, toFnCall = (baseCall) => baseCall }: EffectDescriptor) =>
    effect(() => {
      const snapshot = snapshotSignal.get();
      if (shouldSkip(snapshot)) return;
      const baseCall = () => fn();
      return wrapResult(toFnCall(baseCall)());
    });

  effectDisposals.push(...descriptors.map(toEffect));

  return {
    get snapshot() {
      return snapshotSignal;
    },

    destroy(): void {
      const state = getStatus();
      if (state === 'destroying' || state === 'destroyed') return;
      // Two-step teardown: transition through 'destroying' first to leave room
      // for async teardown in a future extension, then immediately 'destroyed'
      // for the synchronous base case. Active effect cleanups fire via disposal.
      transition('destroying');
      transition('destroyed');
      for (const dispose of effectDisposals) dispose();
    },
  };
}
