import { type Signal, signal } from '../../core/signals/primitives';

/**
 * Cleanup returned by a feature. Features may return:
 * - `void` / `undefined` — no cleanup needed
 * - A function — called on destroy (may return a Promise)
 * - An object with `destroy()` — called on destroy (may return a Promise)
 */
export type FeatureCleanup = void | (() => void | Promise<void>) | { destroy(): void | Promise<void> };

/**
 * The deps object passed to each feature by the engine.
 *
 * - `state` — shared reactive state signal
 * - `owners` — shared reactive owners signal (platform objects)
 * - `config` — static configuration, passed once at engine creation
 */
export interface FeatureDeps<S extends object, O extends object, C extends object> {
  state: Signal<S>;
  owners: Signal<O>;
  config: C;
}

/**
 * A feature is a function that receives deps (state, owners, config)
 * and returns an optional cleanup handle.
 *
 * Each feature declares its own state/owners/config shape via its
 * parameter type. The engine's types are determined by the composition.
 */
export type Feature<S extends object, O extends object, C extends object> = (
  deps: FeatureDeps<S, O, C>
) => FeatureCleanup;

// =============================================================================
// Feature type inference
// =============================================================================

/** A feature function with unconstrained deps — used as a generic bound. */
// biome-ignore lint/suspicious/noExplicitAny: required for generic feature inference
type AnyFeature = (deps: any) => FeatureCleanup;

/** Extract the first parameter (deps) type from a feature function. */
// biome-ignore lint/suspicious/noExplicitAny: required for conditional type inference
type DepsOf<F> = F extends (deps: infer D, ...args: any[]) => any ? D : never;

/** Infer the state type a feature requires from its deps parameter. */
export type InferFeatureState<F> = DepsOf<F> extends { state: Signal<infer S extends object> } ? S : object;

/** Infer the owners type a feature requires from its deps parameter. */
export type InferFeatureOwners<F> = DepsOf<F> extends { owners: Signal<infer O extends object> } ? O : object;

/** Infer the config type a feature requires from its deps parameter. */
export type InferFeatureConfig<F> = DepsOf<F> extends { config: infer C extends object } ? C : object;

/** Convert a union to an intersection: `A | B` → `A & B`. */
// biome-ignore lint/suspicious/noExplicitAny: required for distributive conditional type
type UnionToIntersection<U> = (U extends any ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

/** Resolve the combined state type from an array of features (intersection of all requirements). */
export type ResolveFeatureState<Features extends readonly AnyFeature[]> =
  UnionToIntersection<InferFeatureState<Features[number]>> extends infer R extends object ? R : object;

/** Resolve the combined owners type from an array of features (intersection of all requirements). */
export type ResolveFeatureOwners<Features extends readonly AnyFeature[]> =
  UnionToIntersection<InferFeatureOwners<Features[number]>> extends infer R extends object ? R : object;

/** Resolve the combined config type from an array of features (intersection of all requirements). */
export type ResolveFeatureConfig<Features extends readonly AnyFeature[]> =
  UnionToIntersection<InferFeatureConfig<Features[number]>> extends infer R extends object ? R : object;

/**
 * True if any property in `T` collapsed to `undefined` or `never` — indicating
 * a type conflict from intersecting incompatible feature requirements.
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
// Two features sharing an owner key are compatible only if their types
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

/** Check one feature's owners against all remaining features. */
type CheckOwnersAgainstRest<Owners extends object, Rest extends readonly AnyFeature[]> = Rest extends readonly [
  infer Next,
  ...infer Remaining extends readonly AnyFeature[],
]
  ? OwnersCompatible<Owners, InferFeatureOwners<Next>> extends true
    ? CheckOwnersAgainstRest<Owners, Remaining>
    : false
  : true;

/** Check all pairs of features' owners for subtype compatibility. */
type AllOwnersCompatible<Features extends readonly AnyFeature[]> = Features extends readonly [
  infer First,
  ...infer Rest extends readonly AnyFeature[],
]
  ? CheckOwnersAgainstRest<InferFeatureOwners<First>, Rest> extends true
    ? AllOwnersCompatible<Rest>
    : false
  : true;

// =============================================================================
// Composition validation
// =============================================================================

/**
 * Validate that a feature composition has no type conflicts.
 * Returns the features tuple if valid, or an error message type if conflicts are detected.
 *
 * - State/config: checked via intersection — conflicting primitives produce `never`/`undefined`
 * - Owners: checked via subtype — shared keys must have types in an extends relationship
 */
type ValidateComposition<Features extends readonly AnyFeature[]> =
  HasConflict<ResolveFeatureState<Features>> extends true
    ? 'Error: features have conflicting state types'
    : AllOwnersCompatible<Features> extends false
      ? 'Error: features have incompatible owners types'
      : HasConflict<ResolveFeatureConfig<Features>> extends true
        ? 'Error: features have conflicting config types'
        : [...Features];

// =============================================================================
// Engine
// =============================================================================

/**
 * A composition of features with shared reactive state, owners, and config.
 *
 * Generic over the state and owners shapes, which are determined by the
 * specific features passed to `createComposition`.
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
  /** Static configuration passed to every feature. */
  config?: C;
  /** Initial value for the state signal. */
  initialState?: S;
  /** Initial value for the owners signal. */
  initialOwners?: O;
}

/**
 * Create a composition by composing features.
 *
 * `createComposition` is generic — it knows nothing about HLS, DASH,
 * or any specific protocol. It creates shared reactive state, wires
 * each feature to that state, and returns the composition interface.
 *
 * The state, owners, and config types are inferred from the features:
 * each feature declares what it needs via its parameter type, and the
 * engine computes the intersection of all requirements.
 *
 * @param features - Array of feature functions
 * @param options - Optional config, initial state, and initial owners
 *
 * @example
 * ```ts
 * // Minimal — just features
 * const engine = createComposition([myFeature]);
 *
 * // With config and initial state
 * const engine = createComposition(
 *   [resolvePresentation, selectVideoTrack, loadVideoSegments],
 *   {
 *     config: { initialBandwidth: 2_000_000 },
 *     initialState: { bandwidthState: initialBandwidthState() },
 *   }
 * );
 * ```
 */
export function createComposition<const Features extends readonly AnyFeature[]>(
  features: ValidateComposition<Features>,
  options?: CompositionOptions<
    ResolveFeatureState<Features>,
    ResolveFeatureOwners<Features>,
    ResolveFeatureConfig<Features>
  >
): Composition<ResolveFeatureState<Features>, ResolveFeatureOwners<Features>> {
  type S = ResolveFeatureState<Features>;
  type O = ResolveFeatureOwners<Features>;
  type C = ResolveFeatureConfig<Features>;

  const state = signal((options?.initialState ?? {}) as S);
  const owners = signal((options?.initialOwners ?? {}) as O);
  const config = (options?.config ?? {}) as C;

  const deps: FeatureDeps<S, O, C> = { state, owners, config };
  // ValidateComposition resolves to [...Features] for valid compositions;
  // the cast is needed because the type is unresolved in the generic context.
  const cleanups = (features as unknown as AnyFeature[]).map((f) => f(deps));

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
    },
  };
}
