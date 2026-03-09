import type { SetStateAction } from 'react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';

import { useLatestRef } from './use-latest-ref';

type FallbackStorageInterface = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class FallbackStorage implements FallbackStorageInterface {
  private readonly state = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.state.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.state.set(key, value);
  }

  public removeItem(key: string): void {
    this.state.delete(key);
  }
}

type SetUseWebStorageAction<S> = S | ((prevValue: S) => S);
type Dispatch<A> = (value?: A) => void;
export type WebStorageSerializableValue =
  | string
  | boolean
  | number
  | null
  | Record<string, any>
  | WebStorageSerializableValue[];

export type WebStorageType = 'local' | 'session';
export type WebStorage = Storage | FallbackStorage;

export type UseWebStorageReturn<T extends WebStorageSerializableValue | undefined> = [
  T,
  Dispatch<SetUseWebStorageAction<T>>,
  isSupported: boolean,
];

export type UseWebStorageOnChange<T extends WebStorageSerializableValue> = (value: T | undefined) => void;

export type UseWebStorageOptions<T extends WebStorageSerializableValue> = {
  onChange?: UseWebStorageOnChange<T>;
  parser?: (value: unknown) => T;
};

/**
 * Use web storage with a similar API to React's `useState`.
 * @param type 'local' for localStorage, 'session' for sessionStorage
 * @param key string
 * @param defaultValue T
 * @param options UseWebStorageOptions<T>
 * @returns [getter, setter, isSupported: boolean]
 */
export function useWebStorage<T extends WebStorageSerializableValue>(
  type: WebStorageType,
  key: string,
  defaultValue: T,
  options?: UseWebStorageOptions<T>
): UseWebStorageReturn<T>;
export function useWebStorage<T extends WebStorageSerializableValue>(
  type: WebStorageType,
  key: string,
  defaultValue?: T,
  options?: UseWebStorageOptions<T>
): UseWebStorageReturn<T | undefined>;
export function useWebStorage<T extends WebStorageSerializableValue>(
  type: WebStorageType,
  key: string,
  defaultValue?: T,
  options?: UseWebStorageOptions<T>
): UseWebStorageReturn<T | undefined> {
  const { onChange, parser = (item: unknown) => item as T } = options ?? {};

  const [storage] = useState(() => {
    try {
      const webStorage = type === 'local' ? localStorage : sessionStorage;
      const testKey = '_____test_____';
      // Ensure we can set a value to test if storage is supported.
      webStorage.setItem(testKey, new Date().toISOString());
      webStorage.removeItem(testKey);
      return webStorage;
    } catch {
      return new FallbackStorage();
    }
  });

  // Keep a reference to the latest value in state and sync to local storage.
  const [latestValue, _setLatestValue] = useState<T | undefined>(() => {
    try {
      const item = storage.getItem(key);
      return item ? parser(JSON.parse(item)) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const setLatestValue = useLatestRef<Dispatch<SetStateAction<T | undefined>>>((value) => {
    if (typeof value === 'function') {
      _setLatestValue((prev) => value(prev) ?? defaultValue);
    } else {
      _setLatestValue(value ?? defaultValue);
    }
  });

  const handleStorageChange = useEffectEvent((event: StorageEvent) => {
    if (event.key !== key) return;
    // Hopefully legacy logic - some entries will be the string 'undefined' because of a bug
    // where we called setItem(key, undefined)
    // That said, it can't hurt to be cautious
    const newValue =
      event.newValue && event.newValue !== 'undefined' ? parser(JSON.parse(event.newValue)) : defaultValue;
    if (newValue !== latestValue) setStoredValue(newValue);
  });

  // Update state when local storage changes in another tab
  useEffect(() => {
    const abortController = new AbortController();
    window.addEventListener('storage', handleStorageChange, { signal: abortController.signal });
    return () => {
      abortController.abort();
    };
  }, []);

  const setStoredValue = useMemo<Dispatch<SetStateAction<T | undefined>>>(() => {
    const updateStorage = (value: T | undefined) => {
      try {
        // JSON.stringify returns undefined for values like () => {} or Symbol('')
        // Also, if a toJSON() method returns undefined, JSON.stringify will too.
        const jsonValue = JSON.stringify(value) as string | undefined;
        if (jsonValue === undefined) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, jsonValue);
        }
        onChange?.(value);
      } catch {
        // Fail silently.
      }
    };

    return (value) => {
      if (typeof value === 'function') {
        _setLatestValue((prev) => {
          const newValue = value(prev);
          updateStorage(newValue);
          return newValue;
        });
        return;
      }
      updateStorage(value);
      setLatestValue.current(value);
    };
  }, [key, onChange, setLatestValue, storage]);

  // We have to check the inverse as Storage is not available in SSR.
  const isSupported = !(storage instanceof FallbackStorage);

  return [latestValue, setStoredValue, isSupported];
}
