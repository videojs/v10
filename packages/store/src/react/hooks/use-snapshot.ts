import type { Reactive } from '../../core/state';

import { useState, useSyncExternalStore } from 'react';
import { track } from '../../core/state';

/**
 * Subscribe to reactive state and re-render when accessed properties change.
 *
 * Automatically tracks which properties are accessed during render and only
 * re-renders when those specific properties change.
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
  const [{ tracked, subscribe, getSnapshot, next }] = useState(() => track(state));

  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  next();

  return tracked;
}

export namespace useSnapshot {
  export type Result<T extends object> = T;
}
