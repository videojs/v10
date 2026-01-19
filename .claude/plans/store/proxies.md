# Proxy State Migration Plan

**Branch:** `feat/store-proxies`
**Status:** IN PROGRESS

## Completed

- **Phase 1:** Proxy primitives in `state.ts` — commit `f128125`

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

**See:** `packages/store/src/core/state.ts`

### Public API

| Export                           | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `proxy(initial, parent?)`        | Create reactive proxy with parent bubbling |
| `isProxy(value)`                 | Check if value is a proxy                  |
| `subscribe(proxy, fn)`           | Subscribe to all changes                   |
| `subscribeKeys(proxy, keys, fn)` | Subscribe to specific key changes          |
| `batch(fn)`                      | Group mutations, flush after               |
| `flush()`                        | Force pending notifications (for tests)    |
| `snapshot(proxy)`                | Return frozen shallow copy                 |

### Key Behaviors

- Auto-batches via `queueMicrotask`
- Auto-proxies nested objects at creation and assignment
- Parent bubbling notifies ancestors when nested objects change

---

## Platform Adapters

### React: `useSnapshot` hook

- Uses `useSyncExternalStore` for safe subscription timing
- Version counter pattern for change detection
- Returns tracking proxy that records accessed keys (for future optimization)
- Initially subscribes to ALL changes; key filtering can be added later

| Hook            | Change                               |
| --------------- | ------------------------------------ |
| `useSelector`   | **Delete**                           |
| `useMutation`   | Use `useSnapshot(store.queue.tasks)` |
| `useOptimistic` | Use `useSnapshot` for state + tasks  |
| `useTasks`      | Use `useSnapshot(store.queue.tasks)` |
| `useRequest`    | Keep as-is                           |

### Lit: `SnapshotController`

- Key-based subscription via `subscribeKeys`
- Re-subscribes on `hostUpdated()` with newly tracked keys
- Optional `onChange` callback for custom handling
- Calls `host.requestUpdate()` when tracked keys change

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

Tracking is top-level only: `snap.tasks.play.status` tracks `'tasks'`, not the nested path.

**Workaround:** Use `subscribeKeys` directly with nested proxy:

```ts
subscribeKeys(store.queue.tasks.play, ['status'], callback);
```

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
