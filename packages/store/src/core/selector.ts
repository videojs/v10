import { pick } from '@videojs/utils/object';
import { throwNoTargetError } from './errors';
import { Signals } from './signals';
import type { AnySlice, InferSliceState, StateContext } from './slice';

const stateContext: StateContext<unknown> = {
  target: throwNoTargetError,
  signals: new Signals(),
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
export function createSelector<S extends AnySlice>(slice: S): (state: object) => InferSliceState<S> | undefined {
  const initialState = slice.state(stateContext);
  const keys = Object.keys(initialState as object);

  const firstKey = keys[0];
  if (!firstKey) return () => undefined;

  return (state) => {
    // WARN: Could be the source of a bug if two slices have overlapping state keys
    if (!(firstKey in state)) return undefined;
    return pick(state as Record<string, unknown>, keys) as InferSliceState<S>;
  };
}
