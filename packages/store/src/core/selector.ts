import { pick } from '@videojs/utils/object';
import { AbortControllerRegistry } from './abort-controller-registry';
import { throwNoTargetError } from './errors';
import type { Selector } from './shallow-equal';
import type { AnySlice, InferSliceState, StateContext } from './slice';
import { snapshotHasSlice } from './slice-identity';

const stateContext: StateContext<unknown> = {
  target: throwNoTargetError,
  signals: new AbortControllerRegistry(),
  get: throwNoTargetError,
  set: throwNoTargetError,
};

/**
 * Create a type-safe selector for a slice's state.
 *
 * The selector returns the slice's state, or `undefined` if the slice
 * is not configured in the store.
 *
 * Store-owned snapshots use exact slice identity. Plain objects and copied
 * snapshots fall back to requiring every source and derived key, so they
 * cannot distinguish independently defined slices with the same shape.
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
export function createSelector<S extends AnySlice>(slice: S): Selector<object, InferSliceState<S> | undefined> {
  const initialState = slice.state(stateContext);
  const keys = [...Object.keys(initialState as object), ...Object.keys(slice.derived ?? {})];

  return Object.assign(
    (state: object) => {
      const isConfigured = snapshotHasSlice(state, slice);

      if (isConfigured === false) return undefined;
      if (isConfigured === undefined && (keys.length === 0 || !keys.every((key) => Object.hasOwn(state, key)))) {
        return undefined;
      }

      return pick(state as Record<string, unknown>, keys) as InferSliceState<S>;
    },
    { displayName: slice.name }
  );
}
