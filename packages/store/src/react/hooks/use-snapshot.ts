import type { State } from '../../core/state';

import { useSyncExternalStore } from 'react';

/**
 * Subscribe to state and re-render when state changes.
 *
 * @example
 * ```tsx
 * function VolumeDisplay() {
 *   const { volume } = useSnapshot(store.state);
 *   return <span>{Math.round(volume * 100)}%</span>;
 * }
 * ```
 */
export function useSnapshot<T extends object>(state: State<T>): T {
  return useSyncExternalStore(
    onStoreChange => state.subscribe(onStoreChange),
    () => state.current,
    () => state.current,
  );
}

export namespace useSnapshot {
  export type Result<T extends object> = T;
}
