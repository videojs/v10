import { isObject, isPlainObject } from '@videojs/utils/predicate';

type Listener = () => void;

/** Symbol used to brand reactive objects. */
const REACTIVE_SYMBOL = Symbol('@videojs/reactive');

/** A reactive state object created by `reactive()`. */
export type Reactive<T extends object> = T & { readonly [REACTIVE_SYMBOL]: true };

// Track which objects are reactive (for isReactive check)
const reactiveCache = new WeakSet<object>();

// Map from target -> reactive object (to find reactive from within set handler)
const reactiveMap = new WeakMap<object, object>();

// Global listeners per proxy
const listeners = new WeakMap<object, Set<Listener>>();

// Key-specific listeners per proxy
const keyListeners = new WeakMap<object, Map<PropertyKey, Set<Listener>>>();

// Parent references for bubbling (proxy -> parent proxy)
const parents = new WeakMap<object, object>();

// Pending changes (proxy -> keys that changed)
const pending = new Map<object, Set<PropertyKey>>();

// Batching
let batchDepth = 0;
let flushScheduled = false;

/** Create a reactive state object with optional parent for change bubbling. */
export function reactive<T extends object>(initial: T, parent?: object): Reactive<T> {
  const proxy = new Proxy(initial, {
    set(target, prop, value, receiver) {
      const prev = Reflect.get(target, prop, receiver);
      if (Object.is(prev, value)) return true;

      // Get the reactive object for this target
      const thisReactive = reactiveMap.get(target)!;

      // Auto-wrap nested plain objects with this as parent
      if (isPlainObject(value) && !isReactive(value)) {
        value = reactive(value, thisReactive);
      }

      Reflect.set(target, prop, value, receiver);

      // Mark this and all parents as pending
      let current: object | undefined = thisReactive;
      while (current) {
        if (!pending.has(current)) pending.set(current, new Set());
        pending.get(current)!.add(prop);
        current = parents.get(current);
      }

      if (batchDepth === 0) scheduleFlush();
      return true;
    },

    deleteProperty(target, prop) {
      const hadProp = Reflect.has(target, prop);
      const result = Reflect.deleteProperty(target, prop);

      if (hadProp && result) {
        const thisReactive = reactiveMap.get(target)!;
        let current: object | undefined = thisReactive;
        while (current) {
          if (!pending.has(current)) pending.set(current, new Set());
          pending.get(current)!.add(prop);
          current = parents.get(current);
        }

        if (batchDepth === 0) scheduleFlush();
      }

      return result;
    },
  });

  reactiveCache.add(proxy);
  reactiveMap.set(initial, proxy);
  if (parent) parents.set(proxy, parent);

  // Auto-wrap nested plain objects after creation (so we can set parent)
  for (const key of Object.keys(initial) as (keyof T)[]) {
    const value = initial[key];
    if (isPlainObject(value) && !isReactive(value)) {
      (initial as Record<string, unknown>)[key as string] = reactive(value, proxy);
    }
  }

  // Cast is safe: the proxy is branded at runtime via reactiveCache
  return proxy as Reactive<T>;
}

/** Check if a value is reactive (created by this module). */
export function isReactive<T extends object>(value: T | unknown): value is Reactive<T> {
  return isObject(value) && reactiveCache.has(value);
}

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(flush);
}

/** Force pending notifications immediately. Mainly for tests. */
export function flush(): void {
  flushScheduled = false;

  for (const [target, keys] of pending) {
    // Notify global listeners for this target
    listeners.get(target)?.forEach(fn => fn());

    // Notify key-specific listeners
    const targetKeyListeners = keyListeners.get(target);
    if (targetKeyListeners) {
      for (const key of keys) {
        targetKeyListeners.get(key)?.forEach(fn => fn());
      }
    }
  }

  pending.clear();
}

/** Group mutations; notifications fire after fn completes. */
export function batch<R>(fn: () => R): R {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) scheduleFlush();
  }
}

/** Subscribe to all changes on a reactive state object. */
export function subscribe<T extends object>(state: Reactive<T>, fn: Listener): () => void {
  if (!listeners.has(state)) listeners.set(state, new Set());
  listeners.get(state)!.add(fn);
  return () => listeners.get(state)?.delete(fn);
}

/** Subscribe to changes on specific keys of a reactive state object. */
export function subscribeKeys<T extends object>(state: Reactive<T>, keys: (keyof T)[], fn: Listener): () => void {
  if (!keyListeners.has(state)) keyListeners.set(state, new Map());
  const targetMap = keyListeners.get(state)!;

  for (const key of keys) {
    if (!targetMap.has(key)) targetMap.set(key, new Set());
    targetMap.get(key)!.add(fn);
  }

  return () => {
    for (const key of keys) {
      targetMap.get(key)?.delete(fn);
    }
  };
}

/** Return a frozen shallow copy of the current state. */
export function snapshot<T extends object>(state: Reactive<T>): Readonly<T> {
  return Object.freeze({ ...state });
}
