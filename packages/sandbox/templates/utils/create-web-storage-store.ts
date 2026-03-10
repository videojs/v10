export type WebStorageType = 'local' | 'session';

export type WebStorageSerializableValue =
  | string
  | boolean
  | number
  | null
  | Record<string, any>
  | WebStorageSerializableValue[];

type Subscriber = () => void;

export function createWebStorageStore<T extends WebStorageSerializableValue>(
  type: WebStorageType,
  key: string,
  initialValue: T
) {
  const listeners = new Set<Subscriber>();

  const getSnapshot = (): T => {
    const data = type === 'local' ? localStorage.getItem(key) : sessionStorage.getItem(key);
    return data ? JSON.parse(data) : initialValue;
  };

  const setValue = (value: T) => {
    if (type === 'local') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: Subscriber) => {
    listeners.add(listener);

    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };

    window.addEventListener('storage', onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  };

  return { getSnapshot, setValue, subscribe };
}
