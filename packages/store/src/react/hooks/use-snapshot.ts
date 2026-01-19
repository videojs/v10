import type { Reactive } from '../../core/state';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { subscribe, subscribeKeys } from '../../core/state';

/**
 * Subscribe to reactive state and re-render when it changes.
 *
 * Returns a tracking wrapper that records which properties are accessed.
 * Only re-renders when accessed properties change.
 *
 * @param state - Reactive state created by `reactive()`
 * @returns The state, which triggers re-renders when accessed properties change
 *
 * @example
 * ```tsx
 * function VolumeDisplay() {
 *   const state = useSnapshot(store.state);
 *   return <span>{Math.round(state.volume * 100)}%</span>;
 * }
 * ```
 */
export function useSnapshot<T extends object>(state: Reactive<T>): T {
  const versionRef = useRef(0);
  const [trackedKeys] = useState(() => new Set<PropertyKey>());
  const [subscribedKeys, setSubscribedKeys] = useState<PropertyKey[]>([]);

  // Subscribe to state changes - resubscribes when subscribedKeys changes
  const subscribeToState = useCallback(
    (onStoreChange: () => void) => {
      if (subscribedKeys.length === 0) {
        // No keys yet (first render) - subscribe to all
        return subscribe(state, () => {
          versionRef.current++;
          onStoreChange();
        });
      }

      // Subscribe only to tracked keys
      return subscribeKeys(state, subscribedKeys as (keyof T)[], () => {
        versionRef.current++;
        onStoreChange();
      });
    },
    [state, subscribedKeys],
  );

  const getSnapshot = useCallback(() => versionRef.current, []);

  useSyncExternalStore(subscribeToState, getSnapshot, getSnapshot);

  // After render: check if tracked keys differ from subscribed
  useEffect(() => {
    const tracked = Array.from(trackedKeys);
    const keysChanged = tracked.length !== subscribedKeys.length || tracked.some(k => !subscribedKeys.includes(k));

    if (keysChanged) {
      setSubscribedKeys(tracked);
    }

    trackedKeys.clear();
  });

  // Return tracking wrapper
  return useMemo(
    () =>
      new Proxy(state, {
        get(target, prop, receiver) {
          if (typeof prop !== 'symbol') {
            trackedKeys.add(prop);
          }
          return Reflect.get(target, prop, receiver);
        },
      }),
    [state, trackedKeys],
  );
}

export namespace useSnapshot {
  export type Result<T extends object> = T;
}
