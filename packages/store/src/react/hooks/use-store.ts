import { useMemo, useSyncExternalStore } from 'react';
import type { AnyStore, InferStoreRequests, InferStoreState } from '../../core/store';

export type UseStoreResult<Store extends AnyStore> = InferStoreState<Store> & InferStoreRequests<Store>;

/**
 * Subscribe to store state changes.
 *
 * Returns state and request functions spread together, re-renders when state changes.
 *
 * @example
 * ```tsx
 * function VolumeControl() {
 *   const { volume, setVolume } = useStore(store);
 *   return (
 *     <input
 *       type="range"
 *       value={volume}
 *       onChange={(e) => setVolume(+e.target.value)}
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

  return useMemo(() => ({ ...state, ...store.request }) as UseStoreResult<Store>, [state, store.request]);
}

export namespace useStore {
  export type Result<Store extends AnyStore> = UseStoreResult<Store>;
}
