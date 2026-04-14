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
 * The state, owners, and config types are determined by the composition:
 * each feature declares what it needs, and the engine's types are the
 * intersection of those requirements.
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
export function createPlaybackEngine<S extends object, O extends object, C extends object>(
  features: Feature<S, O, C>[] | Feature<S, O, C>,
  options?: PlaybackEngineOptions<S, O, C>
): PlaybackEngine<S, O> {
  const state = signal<S>((options?.initialState ?? {}) as S);
  const owners = signal<O>((options?.initialOwners ?? {}) as O);
  const config = (options?.config ?? {}) as C;

  const deps: FeatureDeps<S, O, C> = { state, owners, config };
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
