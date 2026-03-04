import { pick } from '@videojs/utils/object';
import { AbortControllerRegistry } from './abort-controller-registry';
import { throwNoTargetError } from './errors';
import type { AnySlice, InferSliceState, StateContext } from './slice';

const stateContext: StateContext<unknown> = {
  target: throwNoTargetError,
  signals: new AbortControllerRegistry(),
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
 * selectPlayback.displayName;  // 'playback' (from slice name)
 * ```
 *
 * @param slice - The slice to create a selector for.
 */
export function createSelector<S extends AnySlice>(
  slice: S
): ((state: object) => InferSliceState<S> | undefined) & { displayName?: string } {
  const initialState = slice.state(stateContext);
  const keys = Object.keys(initialState as object);

  const firstKey = keys[0];
  const meta: { displayName?: string } = slice.name ? { displayName: slice.name } : {};

  if (!firstKey) {
    return Object.assign(() => undefined, meta);
  }

  return Object.assign((state: object) => {
    // WARN: Could be the source of a bug if two slices have overlapping state keys
    if (!(firstKey in state)) return undefined;
    return pick(state as Record<string, unknown>, keys) as InferSliceState<S>;
  }, meta);
}
