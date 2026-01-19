import { isObject } from '@videojs/utils/predicate';

// =============================================================================
// PROXY-BASED REACTIVITY (New API)
// =============================================================================

type Listener = () => void;

/** Only auto-proxy plain objects, not class instances like AbortController, Date, etc. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

// Track which objects are proxied (for isProxy check)
const proxyCache = new WeakSet<object>();

// Map from target -> proxy (to find proxy from within set handler)
const proxyMap = new WeakMap<object, object>();

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

/** Create a reactive proxy with optional parent for change bubbling. */
export function proxy<T extends object>(initial: T, parent?: object): T {
  const p = new Proxy(initial, {
    set(target, prop, value, receiver) {
      const prev = Reflect.get(target, prop, receiver);
      if (Object.is(prev, value)) return true;

      // Get the proxy for this target
      const thisProxy = proxyMap.get(target)!;

      // Auto-proxy nested plain objects with this proxy as parent
      if (isPlainObject(value) && !isProxy(value)) {
        value = proxy(value as object, thisProxy);
      }

      Reflect.set(target, prop, value, receiver);

      // Mark this proxy and all parent proxies as pending
      let current: object | undefined = thisProxy;
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
        const thisProxy = proxyMap.get(target)!;
        let current: object | undefined = thisProxy;
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

  proxyCache.add(p);
  proxyMap.set(initial, p);
  if (parent) parents.set(p, parent);

  // Auto-proxy nested plain objects after the proxy is created (so we can set parent)
  for (const key of Object.keys(initial) as (keyof T)[]) {
    const value = initial[key];
    if (isPlainObject(value) && !isProxy(value)) {
      (initial as Record<string, unknown>)[key as string] = proxy(value as object, p);
    }
  }

  return p;
}

/** Check if a value is a proxy created by this module. */
export function isProxy(value: unknown): value is object {
  return isObject(value) && proxyCache.has(value);
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

/** Subscribe to all changes on a proxy. */
export function subscribe<T extends object>(p: T, fn: Listener): () => void {
  if (!listeners.has(p)) listeners.set(p, new Set());
  listeners.get(p)!.add(fn);
  return () => listeners.get(p)?.delete(fn);
}

/** Subscribe to changes on specific keys of a proxy. */
export function subscribeKeys<T extends object>(p: T, keys: (keyof T)[], fn: Listener): () => void {
  if (!keyListeners.has(p)) keyListeners.set(p, new Map());
  const targetMap = keyListeners.get(p)!;

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

/** Return a frozen shallow copy of the proxy's current state. */
export function snapshot<T extends object>(p: T): Readonly<T> {
  return Object.freeze({ ...p });
}

// =============================================================================
// LEGACY CLASS-BASED STATE (To be removed in Phase 2)
// =============================================================================

/**
 * @deprecated Use `proxy()` instead. Will be removed after Store migration.
 */
export class State<T> {
  #state: T;

  readonly #listeners = new Set<(state: T) => void>();
  readonly #keyListeners = new Map<keyof T, Set<(state: T) => void>>();

  constructor(initial: T) {
    this.#state = { ...initial };
  }

  get value(): T {
    return this.#state;
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    if (this.#state[key] === value) return;
    this.#state = { ...this.#state, [key]: value };
    this.#notify([key]);
  }

  patch(partial: Partial<T>): void {
    const changedKeys: (keyof T)[] = [];

    for (const [key, value] of Object.entries(partial)) {
      if (this.#state[key as keyof T] !== value) {
        changedKeys.push(key as keyof T);
      }
    }

    if (changedKeys.length > 0) {
      this.#state = { ...this.#state, ...partial };
      this.#notify(changedKeys);
    }
  }

  subscribe(listener: (state: T) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  subscribeKeys<K extends keyof T>(keys: K[], listener: (state: Pick<T, K>) => void): () => void {
    for (const key of keys) {
      let set = this.#keyListeners.get(key);

      if (!set) {
        set = new Set();
        this.#keyListeners.set(key, set);
      }

      set.add(listener);
    }

    return () => {
      for (const key of keys) {
        this.#keyListeners.get(key)?.delete(listener);
      }
    };
  }

  #notify(changedKeys: (keyof T)[]): void {
    for (const listener of this.#listeners) {
      listener(this.#state);
    }

    const notified = new Set<(state: T, changedKeys: (keyof T)[]) => void>();

    for (const key of changedKeys) {
      const set = this.#keyListeners.get(key);
      if (!set) continue;

      for (const listener of set) {
        if (!notified.has(listener)) {
          notified.add(listener);
          listener(this.#state);
        }
      }
    }
  }
}

/**
 * @deprecated State factories are no longer configurable.
 */
export type StateFactory<T> = (initial: T) => State<T>;
