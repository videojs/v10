import { pick } from '@videojs/utils/object';

import { AbortControllerRegistry } from './abort-controller-registry';
import { throwNoTargetError } from './errors';
import type { Selector } from './shallow-equal';
import type { AnySlice, InferSliceState, StateContext } from './slice';
import { getSnapshotSlices } from './state';

const stateContext: StateContext<unknown> = {
  target: throwNoTargetError,
  signals: new AbortControllerRegistry(),
  get: throwNoTargetError,
  set: throwNoTargetError,
};

/**
 * Create a type-safe selector for a slice's state.
 *
 * The selector returns the slice's state, or `undefined` if the slice is not configured in the store.
 *
 * Store snapshots record which slice objects built them, so the selector matches by identity: the slice passed to
 * `createStore` (directly or through `combine`) must be the same object passed here. Plain objects and copied snapshots
 * carry no such record and fall back to checking for the slice's first state key.
 *
 * @example
 *   ```ts
 *   const selectPlayback = createSelector(playbackSlice);
 *   selectPlayback(store.state); // { paused, play, pause, ... } | undefined
 *   selectPlayback.displayName; // 'playback' (from slice name)
 *   ```;
 *
 * @param slice - The slice to create a selector for.
 */
export function createSelector<S extends AnySlice>(slice: S): Selector<object, InferSliceState<S> | undefined> {
  const initialState = slice.state(stateContext);
  const keys = [...Object.keys(initialState as object), ...Object.keys(slice.derived ?? {})];

  const firstKey = keys[0];
  const hasShape = (state: object) => firstKey !== undefined && firstKey in state;

  let warnedIdentity = false;

  return Object.assign(
    (state: object) => {
      const slices = getSnapshotSlices(state);
      const configured = slices ? slices.has(slice) : hasShape(state);

      if (__DEV__ && slices && !configured && !warnedIdentity && hasShape(state)) {
        warnedIdentity = true;
        console.warn(
          `[vjs-store] createSelector(): store state has the keys of slice "${slice.name ?? 'anonymous'}" but the store was not built from that slice object. Selectors match slices by identity; pass the same slice to createStore() and createSelector().`
        );
      }

      if (!configured) return undefined;

      return pick(state as Record<string, unknown>, keys) as InferSliceState<S>;
    },
    { displayName: slice.name }
  );
}
