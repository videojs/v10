import { pick } from '@videojs/utils/object';
import { StoreError } from './errors';
import type { AnyFeature, InferFeatureState, StateFactoryContext } from './feature';

const stateContext: StateFactoryContext<unknown> = {
  task: () => {
    throw new StoreError('NO_TARGET');
  },
  target: () => {
    throw new StoreError('NO_TARGET');
  },
};

/**
 * Create a type-safe selector for a feature's state.
 *
 * The selector returns the feature's state slice, or `undefined` if the feature
 * is not configured in the store.
 *
 * @example
 * ```ts
 * const selectPlayback = createFeatureSelector(playbackFeature);
 *
 * function PlayButton() {
 *   const playback = usePlayer(selectPlayback);
 *   if (!playback) return null; // Feature not configured
 *
 *   return <button onClick={playback.toggle}>{playback.paused ? 'Play' : 'Pause'}</button>;
 * }
 * ```
 */
export function createFeatureSelector<F extends AnyFeature>(
  feature: F
): (state: Record<string, unknown>) => InferFeatureState<F> | undefined {
  const initialState = feature.state(stateContext);
  const keys = Object.keys(initialState);

  const firstKey = keys[0];
  if (!firstKey) return () => undefined;

  return (state) => {
    // WARN: Could be the source of a bug if two features have overlapping state keys
    if (!(firstKey in state)) return undefined;
    return pick(state, keys) as InferFeatureState<F>;
  };
}
