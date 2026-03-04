import { pick } from '@videojs/utils/object';
import { AbortControllerRegistry } from './abort-controller-registry';
import { throwNoTargetError } from './errors';
import type { AnySlice, InferSliceState, StateContext } from './slice';

const stateContext: StateContext<unknown> = {
  target: throwNoTargetError,
  signals: new AbortControllerRegistry(),
};

export interface NamedSelector<State, Result> {
  (state: State): Result;
  featureName: string;
}

/**
 * Create a type-safe selector for a slice's state.
 *
 * The selector returns the slice's state, or `undefined` if the slice
 * is not configured in the store.
 *
 * @example
 * ```ts
 * const selectPlayback = createSelector(playbackSlice);
 * selectPlayback(store.state); // { paused, play, pause, ... } | undefined
 * selectPlayback.featureName; // 'playback'
 * ```
 *
 * @param slice - The named feature slice to create a selector for.
 */
export function createSelector<S extends AnySlice & { name: string }>(
  slice: S
): NamedSelector<object, InferSliceState<S> | undefined> {
  const initialState = slice.state(stateContext);
  const keys = Object.keys(initialState as object);

  const firstKey = keys[0];

  if (!firstKey) {
    return Object.assign(() => undefined, { featureName: slice.name });
  }

  return Object.assign(
    (state: object) => {
      // WARN: Could be the source of a bug if two slices have overlapping state keys
      if (!(firstKey in state)) return undefined;
      return pick(state as Record<string, unknown>, keys) as InferSliceState<S>;
    },
    { featureName: slice.name }
  );
}
