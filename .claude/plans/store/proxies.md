# Proxy State Migration Plan

**Branch:** `feat/store-proxies`
**Status:** READY

## Overview

Replace class-based `State` with proxy-based reactivity. Remove selector APIs in favor of snapshot pattern. Add parent bubbling for nested object support.

**Goals:**

- Simpler mental model (mutate directly, reactivity automatic)
- Consistent pattern across state and tasks
- Cleaner APIs (no selector functions, no equality functions)

---

## Decisions

| Question          | Decision                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Batching          | **Auto-batch to microtask**. Export `flush()` for tests.                                                  |
| Migration helpers | **Clean break**. No `subscribeKeys()` public helper for gradual migration.                                |
| Lit updates       | `host.requestUpdate()` + **optional callback** on controller constructor.                                 |
| React pattern     | Use **`useSyncExternalStore`** to avoid race conditions (state changing between render and subscription). |

### Auto-Batching Notes

Notifications are deferred to microtask by default. This means:

```ts
proxy.a = 1;
proxy.b = 2;
// Only ONE notification fires (after microtask)
```

**For tests**, use one of:

1. `flush()` — Force pending notifications immediately
2. `await Promise.resolve()` — Let microtask run
3. `vi.runAllTicks()` — With fake timers

**Reads are synchronous** — mutations apply immediately, only notifications are deferred:

```ts
proxy.count = 5;
console.log(proxy.count); // 5 ✓
```

---

## Core Changes

### 1. Proxy-Based State

**Before:** `State` class with `set()`, `patch()`, `subscribe()`, `subscribeKeys()`

**After:** `proxy()` function with automatic change detection

```ts
// Before
this.#state = new State(initial);
this.#state.patch({ volume: 0.5 });
this.#state.subscribe(fn);

// After
this.state = proxy(initial);
Object.assign(this.state, { volume: 0.5 });
subscribe(this.state, fn);
```

### 2. Remove Selector APIs

| Before                              | After                             |
| ----------------------------------- | --------------------------------- |
| `useSelector(store, s => s.volume)` | `useSnapshot(store.state).volume` |
| `SelectorController`                | `SnapshotController`              |
| `store.subscribe(selector, fn)`     | `subscribe(store.state, fn)`      |
| `store.subscribe(fn)`               | `subscribe(store.state, fn)`      |

### 3. Remove Configurable State

```diff
  interface StoreConfig<Target, Slices> {
    slices: Slices;
    queue?: Queue<...>;
-   state?: StateFactory<...>;  // REMOVED
    onSetup?: ...;
    onAttach?: ...;
    onError?: ...;
  }
```

### 4. Queue Uses Proxy Internally

Queue keeps its public API (`enqueue`, `abort`, `reset`, `tasks`) but uses proxy for internal task tracking:

```diff
  export class Queue<Tasks extends TaskRecord = DefaultTaskRecord> {
-   readonly #subscribers = new Set<QueueListener<Tasks>>();
-   #tasks: TasksRecord<Tasks> = {};
+   readonly tasks: TasksRecord<Tasks>;

    constructor() {
+     this.tasks = proxy<TasksRecord<Tasks>>({} as TasksRecord<Tasks>);
    }

-   subscribe(listener: QueueListener<Tasks>): () => void { ... }
-   #notifySubscribers(): void { ... }

    // Task updates use Object.assign instead of replacement
-   this.#tasks[name] = successTask;
+   Object.assign(this.tasks[name], {
+     status: 'success',
+     settledAt: Date.now(),
+     output: result,
+   });
  }
```

---

## Proxy Implementation

### Core Primitives (`state.ts`)

```ts
// Public API
export function proxy<T extends object>(initial: T, parent?: object): T;
export function isProxy(value: unknown): value is object;
export function subscribe<T extends object>(p: T, fn: () => void): () => void;
export function subscribeKeys<T extends object>(p: T, keys: (keyof T)[], fn: () => void): () => void;
export function batch<T>(fn: () => T): T;
export function flush(): void; // Force pending notifications (mainly for tests)
export function snapshot<T extends object>(p: T): Readonly<T>;
```

### Automatic Access Tracking

`useSnapshot` and `SnapshotController` automatically track which properties are accessed during render and only subscribe to those keys. This is handled internally — no public `trackAccess` API needed.

```tsx
const snap = useSnapshot(store.state);
return <div>{snap.volume}</div>; // Only re-renders when 'volume' changes
```

**How it works:**

1. Return a tracking proxy that records property access
2. After render, subscribe to only the accessed keys via `subscribeKeys`
3. On next render, re-track and resubscribe if keys changed

### Parent Bubbling

Required for Queue tasks — when a task's status changes, `queue.tasks` subscribers must be notified:

```ts
queue.tasks = proxy({});
queue.tasks.play = proxy({ status: 'pending', ... });

// Later
Object.assign(queue.tasks.play, { status: 'success', ... });
// Notifies: queue.tasks.play subscribers AND queue.tasks subscribers
```

### Implementation

```ts
type Listener = () => void;

// Track which objects are proxied (for isProxy check)
const proxyCache = new WeakSet<object>();

// Global listeners per proxy target
const listeners = new WeakMap<object, Set<Listener>>();

// Key-specific listeners per proxy target
const keyListeners = new WeakMap<object, Map<PropertyKey, Set<Listener>>>();

// Parent references for bubbling
const parents = new WeakMap<object, object>();

// Pending changes (target → keys that changed)
const pending = new Map<object, Set<PropertyKey>>();

// Batching
let batchDepth = 0;
let flushScheduled = false;

export function proxy<T extends object>(initial: T, parent?: object): T {
  if (parent) parents.set(initial, parent);

  const p = new Proxy(initial, {
    set(target, prop, value) {
      if (Object.is((target as any)[prop], value)) return true;

      // Auto-proxy nested objects
      if (value && typeof value === 'object' && !isProxy(value)) {
        value = proxy(value, target);
      }

      (target as any)[prop] = value;

      // Mark this and all parents as pending with the changed key
      let current: object | undefined = target;
      let changedKey: PropertyKey = prop;
      while (current) {
        if (!pending.has(current)) pending.set(current, new Set());
        pending.get(current)!.add(changedKey);

        // For parent, the "key" is whichever property points to the child
        // This is simplified - we mark all keys that changed
        changedKey = prop; // Parent tracks same key for simplicity
        current = parents.get(current);
      }

      if (batchDepth === 0) scheduleFlush();
      return true;
    },
  });

  proxyCache.add(p);
  return p;
}

export function isProxy(value: unknown): value is object {
  return typeof value === 'object' && value !== null && proxyCache.has(value);
}

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(flush);
}

export function flush(): void {
  flushScheduled = false;

  for (const [target, keys] of pending) {
    // Notify global listeners for this target
    listeners.get(target)?.forEach((fn) => fn());

    // Notify key-specific listeners
    const targetKeyListeners = keyListeners.get(target);
    if (targetKeyListeners) {
      for (const key of keys) {
        targetKeyListeners.get(key)?.forEach((fn) => fn());
      }
    }
  }

  pending.clear();
}

export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) scheduleFlush();
  }
}

export function subscribe<T extends object>(p: T, fn: Listener): () => void {
  if (!listeners.has(p)) listeners.set(p, new Set());
  listeners.get(p)!.add(fn);
  return () => listeners.get(p)?.delete(fn);
}

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

export function snapshot<T extends object>(p: T): Readonly<T> {
  return Object.freeze({ ...p });
}
```

---

## Platform Adapters

### React

**`use-snapshot.ts`** (new)

Uses `useSyncExternalStore` to avoid race conditions between render and subscription.

```tsx
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

import { subscribe } from '../../core/state';

/**
 * Returns a tracking proxy that re-renders when accessed properties change.
 *
 * Initial implementation subscribes to ALL changes for correctness.
 * Key-based optimization (only re-render when accessed keys change) can be
 * added later if performance requires it.
 */
export function useSnapshot<T extends object>(p: T): T {
  // Version counter - increments on any proxy change
  const versionRef = useRef(0);
  const trackedRef = useRef(new Set<PropertyKey>());

  // Subscribe to all changes
  const subscribeToProxy = useCallback(
    (onStoreChange: () => void) => {
      return subscribe(p, () => {
        versionRef.current++;
        onStoreChange();
      });
    },
    [p]
  );

  // Return version for React to compare
  const getSnapshot = useCallback(() => versionRef.current, []);

  // Safe subscription handling via React
  useSyncExternalStore(subscribeToProxy, getSnapshot, getSnapshot);

  // Return tracking proxy that records property access
  // (tracking is for future key-based optimization)
  return useMemo(() => {
    trackedRef.current.clear();
    return new Proxy(p, {
      get(target, prop) {
        if (typeof prop === 'symbol') return Reflect.get(target, prop);
        trackedRef.current.add(prop);
        return Reflect.get(target, prop);
      },
    });
  }, [p]);
}
```

**Hook updates:**

| Hook            | Change                               |
| --------------- | ------------------------------------ |
| `useSelector`   | **Delete**                           |
| `useMutation`   | Use `useSnapshot(store.queue.tasks)` |
| `useOptimistic` | Use `useSnapshot` for state + tasks  |
| `useTasks`      | Use `useSnapshot(store.queue.tasks)` |
| `useRequest`    | Keep as-is                           |

### Lit

**`snapshot-controller.ts`** (new)

Supports optional callback for custom handling beyond `requestUpdate()`.

```ts
export interface SnapshotControllerOptions<T extends object> {
  /** Called when tracked state changes (after requestUpdate) */
  onChange?: (snapshot: T) => void;
}

export class SnapshotController<T extends object> implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #proxy: T;
  readonly #trackedKeys = new Set<PropertyKey>();
  readonly #trackingProxy: T;
  readonly #onChange?: (snapshot: T) => void;
  #unsubscribe = noop;

  constructor(host: ReactiveControllerHost, proxy: T, options?: SnapshotControllerOptions<T>) {
    this.#host = host;
    this.#proxy = proxy;
    this.#onChange = options?.onChange;

    // Create tracking proxy
    this.#trackingProxy = new Proxy(proxy, {
      get: (target, prop) => {
        // Skip symbols (internal Lit/JS props)
        if (typeof prop === 'symbol') return Reflect.get(target, prop);
        this.#trackedKeys.add(prop);
        return Reflect.get(target, prop);
      },
    });

    host.addController(this);
  }

  get value(): T {
    return this.#trackingProxy;
  }

  hostConnected(): void {
    this.#resubscribe();
  }

  hostUpdated(): void {
    // Resubscribe after each render with newly tracked keys
    this.#resubscribe();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }

  #resubscribe(): void {
    this.#unsubscribe();
    const keys = Array.from(this.#trackedKeys) as (keyof T)[];
    this.#unsubscribe = subscribeKeys(this.#proxy, keys, () => {
      this.#host.requestUpdate();
      this.#onChange?.(this.#proxy);
    });
    this.#trackedKeys.clear();
  }
}
```

**Controller updates:**

| Controller             | Change                                     |
| ---------------------- | ------------------------------------------ |
| `SelectorController`   | **Delete**                                 |
| `MutationController`   | Use `SnapshotController` internally        |
| `OptimisticController` | Use `SnapshotController` for state + tasks |
| `TasksController`      | Use `SnapshotController`                   |
| `RequestController`    | Keep as-is                                 |

---

## Limitations

### Top-Level Tracking Only

`useSnapshot` and `SnapshotController` track property access at the **top level only**.

```tsx
const snap = useSnapshot(store.state);

snap.volume; // Tracks 'volume' ✓
snap.tasks.play.status; // Tracks 'tasks' only, NOT nested path
```

This means changes to **any property** within `tasks` will trigger re-renders for components that accessed any part of `tasks`.

**Workaround:** For fine-grained nested subscriptions, use `subscribeKeys` directly with the nested proxy:

```ts
// Subscribe to specific nested property
subscribeKeys(store.queue.tasks.play, ['status'], callback);
```

**Future enhancement:** Nested path tracking could be added if performance becomes an issue. This would require tracking access paths like `['tasks', 'play', 'status']` and creating nested tracking proxies recursively.

### React Subscribes to All Changes (Initial Implementation)

The initial `useSnapshot` implementation subscribes to **all** proxy changes, not just accessed keys. This is correct but may cause extra re-renders.

The tracking proxy records accessed keys for future optimization. When performance profiling shows this is a bottleneck, we can add key-based filtering:

```ts
// Future optimization: only notify if accessed keys changed
subscribe(p, () => {
  const changedKeys = getChangedKeys(p); // Would need to track this
  const hasAccessedKey = changedKeys.some((k) => trackedRef.current.has(k));
  if (hasAccessedKey) {
    versionRef.current++;
    onStoreChange();
  }
});
```

The Lit `SnapshotController` already implements key-based subscription via `hostUpdated()` re-subscription.

---

## Files Summary

### Create

| File                                         | Purpose                 |
| -------------------------------------------- | ----------------------- |
| `src/react/hooks/use-snapshot.ts`            | React snapshot hook     |
| `src/lit/controllers/snapshot-controller.ts` | Lit snapshot controller |

### Rewrite

| File                | Changes                               |
| ------------------- | ------------------------------------- |
| `src/core/state.ts` | Class → proxy functions with bubbling |

### Update

| File                                           | Changes                                                  |
| ---------------------------------------------- | -------------------------------------------------------- |
| `src/core/store.ts`                            | Use proxy, remove subscribe methods, remove state config |
| `src/core/queue.ts`                            | Use proxy for tasks, remove subscribe method             |
| `src/core/index.ts`                            | Export proxy primitives                                  |
| `src/react/hooks/use-mutation.ts`              | Use `useSnapshot`                                        |
| `src/react/hooks/use-optimistic.ts`            | Use `useSnapshot`                                        |
| `src/react/hooks/use-tasks.ts`                 | Use `useSnapshot`                                        |
| `src/react/hooks/index.ts`                     | Export `useSnapshot`, remove `useSelector`               |
| `src/react/index.ts`                           | Update exports                                           |
| `src/react/create-store.tsx`                   | Update hook references                                   |
| `src/lit/controllers/mutation-controller.ts`   | Use `SnapshotController`                                 |
| `src/lit/controllers/optimistic-controller.ts` | Use `SnapshotController`                                 |
| `src/lit/controllers/tasks-controller.ts`      | Use `SnapshotController`                                 |
| `src/lit/controllers/index.ts`                 | Update exports                                           |
| `src/lit/index.ts`                             | Update exports                                           |
| `src/lit/create-store.ts`                      | Update controller references                             |
| `README.md`                                    | Remove "Custom State", update subscribe, update examples |

### Delete

| File                                         | Reason                               |
| -------------------------------------------- | ------------------------------------ |
| `src/react/hooks/use-selector.ts`            | Replaced by `use-snapshot.ts`        |
| `src/lit/controllers/selector-controller.ts` | Replaced by `snapshot-controller.ts` |

### Rename Tests

| From                                                    | To                                                      |
| ------------------------------------------------------- | ------------------------------------------------------- |
| `src/lit/controllers/tests/selector-controller.test.ts` | `src/lit/controllers/tests/snapshot-controller.test.ts` |

### Check & Maybe Delete

| File                                    | Action                     |
| --------------------------------------- | -------------------------- |
| `packages/utils/src/object/selector.ts` | Delete if unused elsewhere |

---

## Test Updates

| Test File                     | Changes                                        |
| ----------------------------- | ---------------------------------------------- |
| `state.test.ts`               | Rewrite for proxy API, add bubbling tests      |
| `queue.test.ts`               | Update for proxy tasks, remove subscribe tests |
| `store.test.ts`               | Remove subscribe tests                         |
| `snapshot-controller.test.ts` | New tests for SnapshotController               |
| All hook/controller tests     | Update API usage                               |

### Testing with Auto-Batching

Since notifications are deferred to microtask, tests need to wait for flush:

```ts
import { describe, expect, it, vi } from 'vitest';

import { flush, proxy, subscribe } from './state';

describe('proxy', () => {
  it('notifies subscribers after microtask', async () => {
    const p = proxy({ count: 0 });
    const listener = vi.fn();
    subscribe(p, listener);

    p.count = 1;

    // Not called yet (deferred to microtask)
    expect(listener).not.toHaveBeenCalled();

    // Option 1: Use flush()
    flush();
    expect(listener).toHaveBeenCalledOnce();

    // Option 2: await microtask
    p.count = 2;
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('batches multiple mutations', async () => {
    const p = proxy({ a: 0, b: 0 });
    const listener = vi.fn();
    subscribe(p, listener);

    p.a = 1;
    p.b = 2;
    p.a = 3;

    flush();
    // Only ONE notification despite 3 mutations
    expect(listener).toHaveBeenCalledOnce();
  });
});
```

---

## README Updates

1. **Remove "Custom State" section** (lines 582-615)
2. **Remove "Subscribing to State" selector examples** (lines 264-288)
3. **Update subscribe documentation:**

   ```ts
   // After
   import { subscribe } from '@videojs/store';

   // Before
   store.subscribe(
     (s) => s.volume,
     (volume) => console.log(volume)
   );

   subscribe(store.state, () => console.log(store.state.volume));
   ```

4. **Add proxy primitives documentation**

---

## Migration Guide

| Before                      | After                                                |
| --------------------------- | ---------------------------------------------------- |
| `store.queue.subscribe(fn)` | `subscribe(store.queue.tasks, fn)`                   |
| `store.subscribe(fn)`       | `subscribe(store.state, fn)`                         |
| `store.subscribe(sel, fn)`  | `subscribe(store.state, fn)` (track access manually) |
| `useSelector(store, sel)`   | `useSnapshot(store.state)`                           |
| `SelectorController`        | `SnapshotController`                                 |
| `state: factory` config     | Remove (not configurable)                            |

---

## Verification

After implementation:

1. `pnpm -F @videojs/store test` — All tests pass (use `flush()` for sync assertions)
2. `pnpm -F @videojs/store build` — Builds successfully
3. `pnpm typecheck` — No type errors
4. `pnpm lint` — No lint errors
5. Examples still work

**Note:** Tests that assert on listener calls must use `flush()` or `await Promise.resolve()` due to auto-batching.

---

## Implementation Order

1. Create proxy implementation with bubbling (`state.ts`)
2. Update `Queue` to use proxy for tasks
3. Update `Store` to use proxy
4. Create `useSnapshot` hook
5. Create `SnapshotController`
6. Update remaining hooks (mutation, optimistic, tasks)
7. Update remaining controllers
8. Delete old files (`use-selector.ts`, `selector-controller.ts`)
9. Update all exports
10. Update tests
11. Update README
12. Check utils for `getSelectorKeys` usage
