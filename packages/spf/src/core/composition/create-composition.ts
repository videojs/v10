import type { Signal } from '../signals/primitives';

/**
 * Cleanup returned by a behavior. Behaviors may return:
 * - `void` / `undefined` — no cleanup needed
 * - A function — called on destroy (may return a Promise)
 * - An object with `destroy()` — called on destroy (may return a Promise)
 */
export type BehaviorCleanup = void | (() => void | Promise<void>) | { destroy(): void | Promise<void> };

/**
 * A signal map keyed by the fields of `S`. Each field is a discrete signal.
 *
 * Optional fields on `S` map to required signal slots whose value type
 * includes `undefined`, ensuring every key has a signal even when the
 * underlying value is absent.
 */
export type StateSignals<S extends object> = { [K in keyof S]-?: Signal<S[K]> };

/**
 * A signal map keyed by the fields of `C`. Each field is a discrete signal
 * for a platform object or actor reference.
 */
export type ContextSignals<C extends object> = { [K in keyof C]-?: Signal<C[K]> };

/**
 * The deps object passed to each behavior by the composition.
 *
 * - `state` — discrete signal map for state fields (reactive data)
 * - `context` — discrete signal map for platform objects and actor references
 * - `config` — static configuration, passed once at composition creation
 */
export interface BehaviorDeps<S extends object, C extends object, Cfg extends object> {
  state: StateSignals<S>;
  context: ContextSignals<C>;
  config: Cfg;
}

/**
 * A behavior is a function that receives deps (state, context, config)
 * and returns an optional cleanup handle.
 *
 * Each behavior declares its own state/context/config shape via its
 * parameter type. The composition's types are determined by the engine
 * — or inferred from the array of behaviors.
 */
export type Behavior<S extends object, C extends object, Cfg extends object> = (
  deps: BehaviorDeps<S, C, Cfg>
) => BehaviorCleanup;

// =============================================================================
// Behavior type inference
// =============================================================================

/** A behavior function with unconstrained deps — used as a generic bound. */
// biome-ignore lint/suspicious/noExplicitAny: required for generic behavior inference
type AnyBehavior = (deps: any) => BehaviorCleanup;

/** Extract the first parameter (deps) type from a behavior function. */
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type inference
type DepsOf<F> = F extends (deps: infer D, ...args: any[]) => any ? D : never;

/**
 * Empty-object fallback used when a behavior omits state, context, or config.
 *
 * Using `{}` rather than `object` is deliberate — `object & {x: T}` collapses
 * to `{x: never}` under TS's union-to-intersection conversion in some inference
 * contexts (likely a TS quirk around the `object` upper bound), whereas
 * `{} & {x: T}` simplifies cleanly to `{x: T}`.
 */
// biome-ignore lint/complexity/noBannedTypes: see comment above
type Empty = {};

/**
 * Unwrap a signal map back to its state/context shape.
 *
 * Inferring through `{ get(): infer V }` rather than `Signal<infer V>`
 * sidesteps `Signal`'s nominal/invariance behaviour — the conditional
 * matches structurally on the read side, and `V` is inferred covariantly.
 */
type UnwrapSignals<M> = M extends object ? { [K in keyof M]: M[K] extends { get(): infer V } ? V : never } : Empty;

/** Infer the state shape a behavior requires from its deps parameter. */
export type InferBehaviorState<F> = DepsOf<F> extends { state: infer M } ? UnwrapSignals<M> : Empty;

/** Infer the context shape a behavior requires from its deps parameter. */
export type InferBehaviorContext<F> = DepsOf<F> extends { context: infer M } ? UnwrapSignals<M> : Empty;

/** Infer the config shape a behavior requires from its deps parameter. */
export type InferBehaviorConfig<F> = DepsOf<F> extends { config: infer C extends object } ? C : Empty;

/**
 * Recursively intersect a per-behavior projection across the tuple.
 *
 * Iterating over the tuple directly avoids `UnionToIntersection`'s
 * function-contravariance trick, which produces unstable intersections
 * (collapsing concrete fields to `never` or unrelated types) when one of the
 * union members is the empty `{}` fallback.
 */
type IntersectBehaviors<Behaviors extends readonly AnyBehavior[], Project extends object> = Behaviors extends readonly [
  infer First extends AnyBehavior,
  ...infer Rest extends readonly AnyBehavior[],
]
  ? Apply<Project, First> & IntersectBehaviors<Rest, Project>
  : Empty;

/**
 * Apply a projection (one of the marker types below) to a single behavior.
 * Encoded as a discriminated dispatch so the recursion above can stay generic
 * and we don't have to write three near-identical recursive types.
 */
type Apply<Project extends object, F> = Project extends { kind: 'state' }
  ? InferBehaviorState<F>
  : Project extends { kind: 'context' }
    ? InferBehaviorContext<F>
    : Project extends { kind: 'config' }
      ? InferBehaviorConfig<F>
      : never;

type StateProjection = { kind: 'state' };
type ContextProjection = { kind: 'context' };
type ConfigProjection = { kind: 'config' };

/** Resolve the combined state shape from an array of behaviors (intersection of all requirements). */
export type ResolveBehaviorState<Behaviors extends readonly AnyBehavior[]> =
  IntersectBehaviors<Behaviors, StateProjection> extends infer R extends object ? R : Empty;

/** Resolve the combined context shape from an array of behaviors (intersection of all requirements). */
export type ResolveBehaviorContext<Behaviors extends readonly AnyBehavior[]> =
  IntersectBehaviors<Behaviors, ContextProjection> extends infer R extends object ? R : Empty;

/** Resolve the combined config shape from an array of behaviors (intersection of all requirements). */
export type ResolveBehaviorConfig<Behaviors extends readonly AnyBehavior[]> =
  IntersectBehaviors<Behaviors, ConfigProjection> extends infer R extends object ? R : Empty;

/**
 * True if any property in `T` collapsed to `undefined` or `never` — indicating
 * a type conflict from intersecting incompatible behavior requirements.
 *
 * - Required conflicts: `{ v: number } & { v: string }` → `{ v: never }` — caught via `[never] extends [undefined]`
 * - Optional conflicts: `{ v?: number } & { v?: string }` → `{ v?: undefined }` — caught directly
 */
type HasConflict<T extends object> = true extends {
  [K in keyof T]: [T[K]] extends [undefined] ? true : never;
}[keyof T]
  ? true
  : false;

// =============================================================================
// Composition validation
// =============================================================================

/**
 * Validate that a behavior composition has no type conflicts.
 * Returns the behaviors tuple if valid, or an error message type if conflicts are detected.
 *
 * State, context, and config are all checked the same way — by intersecting
 * each behavior's requirement and looking for collapsed fields. The
 * intersection-based check applies the same rule to context as to state, so
 * two behaviors that disagree on a context field's type (e.g. `Surface` vs
 * `VideoSurface`) surface a conflict at compose time. The prior subtype-based
 * approach for owners is gone — the unified rule is simpler and catches the
 * cases where two behaviors silently agreed on a wider supertype.
 */
type ValidateComposition<Behaviors extends readonly AnyBehavior[]> =
  HasConflict<ResolveBehaviorState<Behaviors>> extends true
    ? 'Error: behaviors have conflicting state types'
    : HasConflict<ResolveBehaviorContext<Behaviors>> extends true
      ? 'Error: behaviors have conflicting context types'
      : HasConflict<ResolveBehaviorConfig<Behaviors>> extends true
        ? 'Error: behaviors have conflicting config types'
        : [...Behaviors];

// =============================================================================
// Composition
// =============================================================================

/**
 * A composition of behaviors with shared state and context signal maps.
 */
export interface Composition<S extends object, C extends object> {
  state: StateSignals<S>;
  context: ContextSignals<C>;
  destroy(): Promise<void>;
}

/**
 * Options for `createComposition`. The caller constructs the state and
 * context signal maps and passes them in — this is the "create signals
 * from the outside" stage of the discrete-signals migration. A later
 * stage will derive these from per-behavior key declarations.
 */
export interface CompositionOptions<S extends object, C extends object, Cfg extends object> {
  /** Static configuration passed to every behavior. */
  config?: Cfg;
  /** State signal map — one signal per state field. */
  state: StateSignals<S>;
  /** Context signal map — one signal per context field. */
  context: ContextSignals<C>;
}

/**
 * Create a composition by wiring behaviors to pre-built signal maps.
 *
 * Two ways to call:
 *
 * 1. **Inferred** — pass behaviors and let TypeScript intersect their
 *    deps to compute the engine's state, context, and config shapes.
 *    Conflicts (e.g. two behaviors disagreeing on a field's type) surface
 *    as a compose-time type error. Best when behaviors declare narrow
 *    per-feature shapes.
 * 2. **Explicit** — supply `<S, C, Cfg>` type arguments and the engine
 *    uses those shapes directly. Best for engines that aggregate many
 *    wrapper-style behaviors all sharing the same `Behavior<S, C, Cfg>`
 *    type — TypeScript's distributive intersection inference can drop
 *    types in that case, so explicit arguments are more reliable.
 *
 * @example
 * ```ts
 * // 1. Inferred — compose-time conflict detection on state/context/config
 * const composition = createComposition([resolvePresentation, selectVideoTrack], {
 *   state: createStateSignals(),
 *   context: createContextSignals(),
 * });
 *
 * // 2. Explicit (engine declares its full shape up front)
 * const composition = createComposition<MyState, MyContext, MyConfig>(
 *   [behavior1, behavior2, ...],
 *   { config, state, context }
 * );
 * ```
 */
export function createComposition<const Behaviors extends readonly AnyBehavior[]>(
  behaviors: ValidateComposition<Behaviors>,
  options: CompositionOptions<
    ResolveBehaviorState<Behaviors>,
    ResolveBehaviorContext<Behaviors>,
    ResolveBehaviorConfig<Behaviors>
  >
): Composition<ResolveBehaviorState<Behaviors>, ResolveBehaviorContext<Behaviors>>;
export function createComposition(
  behaviors: readonly AnyBehavior[],
  options: CompositionOptions<object, object, object>
): Composition<object, object> {
  const { state, context, config } = options;
  const deps: BehaviorDeps<object, object, object> = {
    state,
    context,
    config: config ?? ({} as object),
  };
  const cleanups = behaviors.map((behavior) => behavior(deps));

  return {
    state,
    context,
    async destroy() {
      const results: (void | Promise<void>)[] = [];
      for (const cleanup of cleanups) {
        if (cleanup == null) continue;
        if (typeof cleanup === 'function') {
          results.push(cleanup());
        } else if ('destroy' in cleanup) {
          results.push(cleanup.destroy());
        }
      }
      await Promise.all(results);
      // Reset every signal to undefined as a final cleanup, matching the
      // prior post-destroy `owners.set({})` semantics. A later stage will
      // move per-signal cleanup into the behaviors that own the writes.
      for (const key in state) {
        (state[key as keyof typeof state] as Signal<unknown>).set(undefined);
      }
      for (const key in context) {
        (context[key as keyof typeof context] as Signal<unknown>).set(undefined);
      }
    },
  };
}
