import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

import { subscribe } from '../../core/state';

/**
 * Subscribe to a reactive proxy and re-render when it changes.
 *
 * Returns a tracking proxy that records which properties are accessed.
 * Currently subscribes to ALL changes; key-based optimization can be added later.
 *
 * @param proxy - A reactive proxy created by `proxy()`
 * @returns The proxy, which triggers re-renders when accessed properties change
 *
 * @example
 * ```tsx
 * function VolumeDisplay() {
 *   const state = useSnapshot(store.state);
 *   return <span>{Math.round(state.volume * 100)}%</span>;
 * }
 * ```
 */
export function useSnapshot<T extends object>(proxy: T): T {
  // Version counter - increments on any proxy change
  const versionRef = useRef(0);
  const trackedRef = useRef(new Set<PropertyKey>());

  // Subscribe to all changes
  const subscribeToProxy = useCallback(
    (onStoreChange: () => void) => {
      return subscribe(proxy, () => {
        versionRef.current++;
        onStoreChange();
      });
    },
    [proxy],
  );

  // Return version for React to compare
  const getSnapshot = useCallback(() => versionRef.current, []);

  // Safe subscription handling via React
  useSyncExternalStore(subscribeToProxy, getSnapshot, getSnapshot);

  // Return tracking proxy that records property access
  // (tracking is for future key-based optimization)
  return useMemo(() => {
    trackedRef.current.clear();
    return new Proxy(proxy, {
      get(target, prop, receiver) {
        if (typeof prop !== 'symbol') {
          trackedRef.current.add(prop);
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }, [proxy]);
}

export namespace useSnapshot {
  export type Result<T extends object> = T;
}
