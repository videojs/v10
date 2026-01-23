import { useSyncExternalStore } from 'react';
import type { AnyStore, InferStoreState } from '../../core/store';

/**
 * Subscribe to store state changes.
 *
 * Returns the current state snapshot and re-renders when state changes.
 *
 * @example
 * ```tsx
 * function VolumeDisplay() {
 *   const { volume } = useStore(store);
 *   return <span>{Math.round(volume * 100)}%</span>;
 * }
 * ```
 */
export function useStore<Store extends AnyStore>(store: Store): InferStoreState<Store> {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.state as InferStoreState<Store>,
    () => store.state as InferStoreState<Store>
  );
}

export namespace useStore {
  export type Result<Store extends AnyStore> = InferStoreState<Store>;
}
