type Subscriber = () => void;

type SharedStoreEntry<T> = {
  channel: BroadcastChannel | null;
  listeners: Set<Subscriber>;
  value: T;
};

const STORE_REGISTRY_KEY = '__videojsSandboxSharedStores__';

type SharedStoreRegistry = Map<string, SharedStoreEntry<unknown>>;

function getStoreRegistry(): SharedStoreRegistry {
  const scope = globalThis as typeof globalThis & { [STORE_REGISTRY_KEY]?: SharedStoreRegistry };

  scope[STORE_REGISTRY_KEY] ??= new Map();

  return scope[STORE_REGISTRY_KEY];
}

export function createSharedStore<T>(key: string, initialValue: T) {
  const registry = getStoreRegistry();
  let entry = registry.get(key) as SharedStoreEntry<T> | undefined;

  if (!entry) {
    entry = {
      channel: typeof BroadcastChannel === 'function' ? new BroadcastChannel(`@videojs/sandbox/${key}`) : null,
      listeners: new Set(),
      value: initialValue,
    };

    entry.channel?.addEventListener('message', (event: MessageEvent<T>) => {
      if (Object.is(entry.value, event.data)) return;

      entry.value = event.data;
      entry.listeners.forEach((listener) => listener());
    });

    registry.set(key, entry);
  }

  const getSnapshot = (): T => entry.value;

  const subscribe = (listener: Subscriber) => {
    entry.listeners.add(listener);

    return () => {
      entry.listeners.delete(listener);
    };
  };

  const initialize = (value: T) => {
    if (Object.is(entry.value, value)) return;

    entry.value = value;
    entry.listeners.forEach((listener) => listener());
  };

  const setValue = (value: T) => {
    if (Object.is(entry.value, value)) return;

    entry.value = value;
    entry.listeners.forEach((listener) => listener());
    entry.channel?.postMessage(value);
  };

  return {
    getSnapshot,
    initialize,
    setValue,
    subscribe,
  };
}
