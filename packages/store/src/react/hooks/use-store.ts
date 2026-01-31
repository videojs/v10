import { useSyncExternalStore } from 'react';
import type { AnyStore, InferStoreState } from '../../core/store';

export type UseStoreResult<S extends AnyStore> = InferStoreState<S>;

/**
 * Subscribe to store state changes.
 *
 * Returns state and action functions, re-renders when state changes.
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
export function useStore<S extends AnyStore>(store: S): UseStoreResult<S> {
  useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.state,
    () => store.state
  );

  // In v2, state and actions are directly on the store object
  return store as unknown as UseStoreResult<S>;
}

export namespace useStore {
  export type Result<S extends AnyStore> = UseStoreResult<S>;
}
