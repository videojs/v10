import { useState } from 'react';
import {
  createWebStorageStore,
  type WebStorageSerializableValue,
  type WebStorageType,
} from './create-web-storage-store';
import { useExternalStore } from './use-external-store';

export function useWebStorage<T extends WebStorageSerializableValue>(
  type: WebStorageType,
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [store] = useState(() => createWebStorageStore<T>(type, key, defaultValue));
  const value = useExternalStore(store);
  return [value, store.setValue];
}
