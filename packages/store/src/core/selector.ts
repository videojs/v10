import { pick } from '@videojs/utils/object';
import { StoreError } from './errors';
import type { AnySlice, InferSliceState, StateContext } from './slice';

const stateContext: StateContext<unknown> = {
  task: () => {
    throw new StoreError('NO_TARGET');
  },
  target: () => {
    throw new StoreError('NO_TARGET');
  },
};

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
 * ```
 */
export function createSelector<S extends AnySlice>(
  slice: S
): (state: Record<string, unknown>) => InferSliceState<S> | undefined {
  const initialState = slice.state(stateContext);
  const keys = Object.keys(initialState as object);

  const firstKey = keys[0];
  if (!firstKey) return () => undefined;

  return (state) => {
    // WARN: Could be the source of a bug if two slices have overlapping state keys
    if (!(firstKey in state)) return undefined;
    return pick(state, keys) as InferSliceState<S>;
  };
}
