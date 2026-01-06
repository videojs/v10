import type { AnyStore, InferStoreState } from '../../core/store';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Subscribe to a slice of store state.
 *
 * Only re-renders when the selected value changes (shallow comparison).
 * The selector function should return a stable reference for objects
 * to avoid unnecessary re-renders.
 *
 * @param store - The store instance to subscribe to
 * @param selector - Function that extracts the desired value from state
 * @returns The selected value, updated when it changes
 *
 * @example
 * ```tsx
 * function VolumeDisplay() {
 *   const volume = useSelector(store, (s) => s.volume);
 *   return <span>{Math.round(volume * 100)}%</span>;
 * }
 * ```
 */
export function useSelector<S extends AnyStore, T>(store: S, selector: (state: InferStoreState<S>) => T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => store.subscribe(selector, onStoreChange),
    [store, selector],
  );

  const getSnapshot = useCallback(() => selector(store.state), [store, selector]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
