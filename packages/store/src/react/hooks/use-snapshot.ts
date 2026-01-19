import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { subscribe, subscribeKeys } from '../../core/state';

/**
 * Subscribe to a reactive proxy and re-render when it changes.
 *
 * Returns a tracking proxy that records which properties are accessed.
 * Only re-renders when accessed properties change.
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
  const versionRef = useRef(0);
  const [trackedKeys] = useState(() => new Set<PropertyKey>());
  const [subscribedKeys, setSubscribedKeys] = useState<PropertyKey[]>([]);

  // Subscribe to proxy changes - resubscribes when subscribedKeys changes
  const subscribeToProxy = useCallback(
    (onStoreChange: () => void) => {
      if (subscribedKeys.length === 0) {
        // No keys yet (first render) - subscribe to all
        return subscribe(proxy, () => {
          versionRef.current++;
          onStoreChange();
        });
      }

      // Subscribe only to tracked keys
      return subscribeKeys(proxy, subscribedKeys as (keyof T)[], () => {
        versionRef.current++;
        onStoreChange();
      });
    },
    [proxy, subscribedKeys],
  );

  const getSnapshot = useCallback(() => versionRef.current, []);

  useSyncExternalStore(subscribeToProxy, getSnapshot, getSnapshot);

  // After render: check if tracked keys differ from subscribed
  useEffect(() => {
    const tracked = Array.from(trackedKeys);
    const keysChanged = tracked.length !== subscribedKeys.length || tracked.some(k => !subscribedKeys.includes(k));

    if (keysChanged) {
      setSubscribedKeys(tracked);
    }

    trackedKeys.clear();
  });

  // Return tracking proxy
  return useMemo(
    () =>
      new Proxy(proxy, {
        get(target, prop, receiver) {
          if (typeof prop !== 'symbol') {
            trackedKeys.add(prop);
          }
          return Reflect.get(target, prop, receiver);
        },
      }),
    [proxy, trackedKeys],
  );
}

export namespace useSnapshot {
  export type Result<T extends object> = T;
}
