import { useSyncExternalStore } from 'react';
import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';

export type UseStoreResult<Store extends AnyStore> = InferStoreState<Store> & {
  request: InferStoreRequests<Store>;
};

/**
 * Subscribe to store state changes.
 *
 * Returns the current state snapshot with request map, re-renders when state changes.
 *
 * @example
 * ```tsx
 * function VolumeControl() {
 *   const { volume, request } = useStore(store);
 *   return (
 *     <input
 *       type="range"
 *       value={volume}
 *       onChange={(e) => request.setVolume(+e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useStore<Store extends AnyStore>(store: Store): UseStoreResult<Store> {
  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.state,
    () => store.state
  );

  return {
    ...state,
    request: store.request,
  } as UseStoreResult<Store>;
}

export namespace useStore {
  export type Result<Store extends AnyStore> = UseStoreResult<Store>;
}
