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

// =============================================================================
// Engine
// =============================================================================

/**
 * Playback engine instance.
 *
 * Generic over the state and owners shapes, which are determined by the
 * specific composition of features passed to `createPlaybackEngine`.
 */
export interface PlaybackEngine<S extends object, O extends object> {
  state: Signal<S>;
  owners: Signal<O>;
  destroy(): Promise<void>;
}

/**
 * Options for `createPlaybackEngine`. All fields are optional.
 */
export interface PlaybackEngineOptions<S extends object, O extends object, C extends object> {
  /** Static configuration passed to every feature. */
  config?: C;
  /** Initial value for the state signal. */
  initialState?: S;
  /** Initial value for the owners signal. */
  initialOwners?: O;
}

/**
 * Create a playback engine by composing features.
 *
 * `createPlaybackEngine` is generic — it knows nothing about HLS, DASH,
 * or any specific streaming protocol. It creates shared reactive state,
 * wires each feature to that state, and returns the engine interface.
 *
 * The state, owners, and config types are inferred from the features:
 * each feature declares what it needs via its parameter type, and the
 * engine computes the intersection of all requirements.
 *
 * @param features - Array of feature functions (or a single feature)
 * @param options - Optional config, initial state, and initial owners
 *
 * @example
 * ```ts
 * // Minimal — just features
 * const engine = createPlaybackEngine([myFeature]);
 *
 * // With config and initial state
 * const engine = createPlaybackEngine(
 *   [resolvePresentation, selectVideoTrack, loadVideoSegments],
 *   {
 *     config: { initialBandwidth: 2_000_000 },
 *     initialState: { bandwidthState: initialBandwidthState() },
 *   }
 * );
 * ```
 */
export function createPlaybackEngine<const Features extends readonly AnyFeature[]>(
  features: [...Features],
  options?: PlaybackEngineOptions<
    ResolveFeatureState<Features>,
    ResolveFeatureOwners<Features>,
    ResolveFeatureConfig<Features>
  >
): PlaybackEngine<ResolveFeatureState<Features>, ResolveFeatureOwners<Features>>;

export function createPlaybackEngine<F extends AnyFeature>(
  feature: F,
  options?: PlaybackEngineOptions<InferFeatureState<F>, InferFeatureOwners<F>, InferFeatureConfig<F>>
): PlaybackEngine<InferFeatureState<F>, InferFeatureOwners<F>>;

export function createPlaybackEngine(
  features: AnyFeature[] | AnyFeature,
  options?: PlaybackEngineOptions<object, object, object>
): PlaybackEngine<object, object> {
  const state = signal((options?.initialState ?? {}) as object);
  const owners = signal((options?.initialOwners ?? {}) as object);
  const config = (options?.config ?? {}) as object;

  const deps = { state, owners, config };
  const featureArray = Array.isArray(features) ? features : [features];
  const cleanups = featureArray.map((f) => f(deps));

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
