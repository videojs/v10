import { useSyncExternalStore } from 'react';

export function useExternalStore<T>(store: { subscribe: (listener: () => void) => () => void; getSnapshot: () => T }) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
