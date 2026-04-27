import { type Signal, signal } from '../signals/primitives';

/**
 * Cleanup returned by a behavior. Behaviors may return:
 * - `void` / `undefined` — no cleanup needed
 * - A function — called on destroy (may return a Promise)
 * - An object with `destroy()` — called on destroy (may return a Promise)
 */
export type BehaviorCleanup = void | (() => void | Promise<void>) | { destroy(): void | Promise<void> };

/**
 * The deps object passed to each behavior by the engine.
 *
 * - `state` — shared reactive state signal
 * - `owners` — shared reactive owners signal (platform objects)
 * - `config` — static configuration, passed once at engine creation
 */
export interface BehaviorDeps<S extends object, O extends object, C extends object> {
  state: Signal<S>;
  owners: Signal<O>;
  config: C;
}

/**
 * A behavior is a function that receives deps (state, owners, config)
 * and returns an optional cleanup handle.
 *
 * Each behavior declares its own state/owners/config shape via its
 * parameter type. The engine's types are determined by the composition.
 */
export type Behavior<S extends object, O extends object, C extends object> = (
  deps: BehaviorDeps<S, O, C>
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

/** Infer the state type a behavior requires from its deps parameter. */
export type InferBehaviorState<F> = DepsOf<F> extends { state: Signal<infer S extends object> } ? S : object;

/** Infer the owners type a behavior requires from its deps parameter. */
export type InferBehaviorOwners<F> = DepsOf<F> extends { owners: Signal<infer O extends object> } ? O : object;

/** Infer the config type a behavior requires from its deps parameter. */
export type InferBehaviorConfig<F> = DepsOf<F> extends { config: infer C extends object } ? C : object;

/** Convert a union to an intersection: `A | B` → `A & B`. */
// biome-ignore lint/suspicious/noExplicitAny: required for distributive conditional type
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** Resolve the combined state type from an array of behaviors (intersection of all requirements). */
export type ResolveBehaviorState<Behaviors extends readonly AnyBehavior[]> =
  UnionToIntersection<InferBehaviorState<Behaviors[number]>> extends infer R extends object ? R : object;

/** Resolve the combined owners type from an array of behaviors (intersection of all requirements). */
export type ResolveBehaviorOwners<Behaviors extends readonly AnyBehavior[]> =
  UnionToIntersection<InferBehaviorOwners<Behaviors[number]>> extends infer R extends object ? R : object;

/** Resolve the combined config type from an array of behaviors (intersection of all requirements). */
export type ResolveBehaviorConfig<Behaviors extends readonly AnyBehavior[]> =
  UnionToIntersection<InferBehaviorConfig<Behaviors[number]>> extends infer R extends object ? R : object;

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
// Owners compatibility (subtype-based)
//
// Unlike state/config (where intersection catches primitive conflicts),
// owners hold concrete platform objects where class hierarchy matters.
// Two behaviors sharing an owner key are compatible only if their types
// are in a subtype relationship (one extends the other).
// =============================================================================

/** Strip `undefined` from a type so optionality doesn't affect subtype checks. */
type NonUndefined<T> = T extends undefined ? never : T;

/**
 * Check that two owners types are compatible: for each overlapping key,
 * one type must extend the other (ignoring optionality).
 *
 * - `{ el?: HTMLElement }` + `{ el?: HTMLVideoElement }` → valid (HTMLVideoElement extends HTMLElement)
 * - `{ el?: HTMLCanvasElement }` + `{ el?: HTMLVideoElement }` → invalid (neither extends the other)
 * - `{ el?: HTMLElement }` + `{ buffer?: SourceBuffer }` → valid (no overlapping keys)
 */
type OwnersCompatible<A extends object, B extends object> = [Extract<keyof A, keyof B>] extends [never]
  ? true
  : false extends {
        [K in Extract<keyof A, keyof B>]: [NonUndefined<A[K]>] extends [NonUndefined<B[K]>]
          ? true
          : [NonUndefined<B[K]>] extends [NonUndefined<A[K]>]
            ? true
            : false;
      }[Extract<keyof A, keyof B>]
    ? false
    : true;

/** Check one behavior's owners against all remaining behaviors. */
type CheckOwnersAgainstRest<Owners extends object, Rest extends readonly AnyBehavior[]> = Rest extends readonly [
  infer Next,
  ...infer Remaining extends readonly AnyBehavior[],
]
  ? OwnersCompatible<Owners, InferBehaviorOwners<Next>> extends true
    ? CheckOwnersAgainstRest<Owners, Remaining>
    : false
  : true;

/** Check all pairs of behaviors' owners for subtype compatibility. */
type AllOwnersCompatible<Behaviors extends readonly AnyBehavior[]> = Behaviors extends readonly [
  infer First,
  ...infer Rest extends readonly AnyBehavior[],
]
  ? CheckOwnersAgainstRest<InferBehaviorOwners<First>, Rest> extends true
    ? AllOwnersCompatible<Rest>
    : false
  : true;

// =============================================================================
// Composition validation
// =============================================================================

/**
 * Validate that a behavior composition has no type conflicts.
 * Returns the behaviors tuple if valid, or an error message type if conflicts are detected.
 *
 * - State/config: checked via intersection — conflicting primitives produce `never`/`undefined`
 * - Owners: checked via subtype — shared keys must have types in an extends relationship
 */
type ValidateComposition<Behaviors extends readonly AnyBehavior[]> =
  HasConflict<ResolveBehaviorState<Behaviors>> extends true
    ? 'Error: behaviors have conflicting state types'
    : AllOwnersCompatible<Behaviors> extends false
      ? 'Error: behaviors have incompatible owners types'
      : HasConflict<ResolveBehaviorConfig<Behaviors>> extends true
        ? 'Error: behaviors have conflicting config types'
        : [...Behaviors];

// =============================================================================
// Engine
// =============================================================================

/**
 * A composition of behaviors with shared reactive state, owners, and config.
 *
 * Generic over the state and owners shapes, which are determined by the
 * specific behaviors passed to `createComposition`.
 */
export interface Composition<S extends object, O extends object> {
  state: Signal<S>;
  owners: Signal<O>;
  destroy(): Promise<void>;
}

/**
 * Options for `createComposition`. All fields are optional.
 */
export interface CompositionOptions<S extends object, O extends object, C extends object> {
  /** Static configuration passed to every behavior. */
  config?: C;
  /** Initial value for the state signal. */
  initialState?: S;
  /** Initial value for the owners signal. */
  initialOwners?: O;
}

/**
 * Create a composition by composing behaviors.
 *
 * `createComposition` is generic — it knows nothing about HLS, DASH,
 * or any specific protocol. It creates shared reactive state, wires
 * each behavior to that state, and returns the composition interface.
 *
 * Two ways to call:
 *
 * 1. **Inferred** — pass behaviors and let TypeScript intersect their
 *    deps to compute the engine's state, owners, and config shapes.
 *    Best when behaviors declare narrow per-feature shapes.
 * 2. **Explicit** — supply `<S, O, C>` type arguments and the engine
 *    uses those shapes directly. Best for engines that aggregate many
 *    wrapper-style behaviors all sharing the same `Behavior<S, O, C>`
 *    type — TypeScript's distributive intersection inference can drop
 *    types in that case, so explicit arguments are more reliable.
 *
 * @param behaviors - Array of behavior functions
 * @param options - Optional config, initial state, and initial owners
 *
 * @example
 * ```ts
 * // 1. Inferred
 * const engine = createComposition([resolvePresentation, selectVideoTrack]);
 *
 * // 2. Explicit (engine declares its full state/owners/config up front)
 * const engine = createComposition<MyState, MyOwners, MyConfig>(
 *   [behavior1, behavior2, ...],
 *   { config, initialState, initialOwners }
 * );
 * ```
 */
export function createComposition<const Behaviors extends readonly AnyBehavior[]>(
  behaviors: ValidateComposition<Behaviors>,
  options?: CompositionOptions<
    ResolveBehaviorState<Behaviors>,
    ResolveBehaviorOwners<Behaviors>,
    ResolveBehaviorConfig<Behaviors>
  >
): Composition<ResolveBehaviorState<Behaviors>, ResolveBehaviorOwners<Behaviors>>;
export function createComposition<S extends object, O extends object, C extends object>(
  behaviors: readonly Behavior<S, O, C>[],
  options?: CompositionOptions<S, O, C>
): Composition<S, O>;
export function createComposition(
  behaviors: readonly AnyBehavior[],
  options?: CompositionOptions<object, object, object>
): Composition<object, object> {
  const state = signal(options?.initialState ?? {});
  const owners = signal(options?.initialOwners ?? {});
  const config = options?.config ?? {};

  const deps: BehaviorDeps<object, object, object> = { state, owners, config };
  const cleanups = behaviors.map((f) => f(deps));

  return {
    state,
    owners,
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
      // Clear any keys behaviors registered — or callers seeded via
      // initialOwners — so the composition ends with an empty owners map.
      owners.set({});
    },
  };
}
