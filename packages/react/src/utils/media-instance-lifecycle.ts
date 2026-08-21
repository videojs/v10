interface DestroyableMedia {
  detach?(): void;
  destroy(): void;
}

const terminationCallbacks = new WeakMap<object, Set<() => void>>();

export function onMediaInstanceTermination(instance: object, callback: () => void): () => void {
  let callbacks = terminationCallbacks.get(instance);
  if (!callbacks) terminationCallbacks.set(instance, (callbacks = new Set()));
  callbacks.add(callback);

  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0 && terminationCallbacks.get(instance) === callbacks) {
      terminationCallbacks.delete(instance);
    }
  };
}

export function destroyMediaInstance(instance: DestroyableMedia): void {
  const callbacks = terminationCallbacks.get(instance);
  terminationCallbacks.delete(instance);

  try {
    for (const callback of callbacks ?? []) callback();
    instance.detach?.();
  } finally {
    instance.destroy();
  }
}
