# Store Queue Simplification Plan

## Overview

Simplify the queue from ~524 LOC to ~200 LOC while preserving core value.

**Goal:** Remove convenience features only used in tests/docs, keep what's essential for real-world async media operations.

---

## Why the Queue Exists

The store design: **all writes are async requests**. This isn't optional — it's the architecture.

```ts
// Read path: sync state from target
store.state.paused; // Synced from video.paused

// Write path: async requests to target
await store.request.play(); // Returns Promise, always
```

Media operations are inherently async and can fail:

| Scenario               | What Can Happen                                     |
| ---------------------- | --------------------------------------------------- |
| **Chromecast/AirPlay** | 100-500ms+ network round-trip, device disconnect    |
| **Source loading**     | 1-5s+ load time, 404, DRM errors, codec unsupported |
| **Quality switching**  | Segment fetching, ABR delays                        |
| **Network conditions** | Timeouts, flaky connections                         |
| **User behavior**      | Impatient clicks, changing mind mid-operation       |

The queue handles these realities uniformly.

---

## Real-World Scenarios

### Chromecast Play

```ts
// Command goes over network to Cast device
await store.request.play();
```

**Without queue:**

- How does UI show "Connecting..."?
- User taps 5 times impatiently → 5 network messages?
- Device disconnects mid-request → how to surface error?

**With queue:**

- `tasks['play'].status === 'pending'` → show loading
- Supersession → only 1 message sent
- `tasks['play'].status === 'error'` → show failure

### Source Switching

```ts
// User browses playlist quickly
store.request.setSource('a.mp4'); // Starts loading
store.request.setSource('b.mp4'); // User changed mind
store.request.setSource('c.mp4'); // Final choice
```

**Without queue:**

- All three sources load simultaneously
- Wasted bandwidth, race conditions
- Which promise resolves? Which errors?

**With queue:**

- Supersession aborts a.mp4 and b.mp4
- Only c.mp4 loads
- Clean promise semantics (superseded reject with SUPERSEDED)

### Network Failure

```ts
// Quality change needs segment fetch
await store.request.setQuality('1080p');
// Network times out
```

**Without queue:**

- Component needs try/catch + useState for error
- Every async operation repeats this boilerplate

**With queue:**

- `tasks['setQuality'].status === 'error'`
- `tasks['setQuality'].error` contains details
- `reset('setQuality')` + retry

### Component Implementation Comparison

**Without queue (manual):**

```tsx
function SourceSelector() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = async (src) => {
    setLoading(true);
    setError(null);
    try {
      await loadSource(src);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <select disabled={loading} onChange={(e) => handleChange(e.target.value)} />
      {loading && <Spinner />}
      {error && <Error message={error.message} />}
    </>
  );
}
```

**With queue:**

```tsx
function SourceSelector() {
  const source = useMutation(store, 'setSource');

  return (
    <>
      <select disabled={source.status === 'pending'} onChange={(e) => source.mutate(e.target.value)} />
      {source.status === 'pending' && <Spinner />}
      {source.status === 'error' && <Error message={source.error.message} />}
    </>
  );
}
```

---

## Required Capabilities → Queue Features

| Scenario                 | Required Capability    | Queue Feature                      |
| ------------------------ | ---------------------- | ---------------------------------- |
| Cast/AirPlay round-trip  | Loading indicator      | `tasks[name].status === 'pending'` |
| Network/DRM failures     | Error display          | `tasks[name].status === 'error'`   |
| User retry after failure | Error recovery         | `reset()` + re-request             |
| Impatient clicks         | Prevent duplicate work | Supersession (same key)            |
| User changes mind        | Cancel in-flight       | `abort()` + AbortSignal            |
| Multiple operation types | Parallel execution     | Key-based coordination             |
| Async completion         | Await result           | Promise API                        |
| React/Lit integration    | Observe changes        | `subscribe()`                      |
| Debug production issues  | Task visibility        | `tasks` record                     |

---

## What We Keep (And Why)

### 1. Microtask Batching

**Required for supersession to work.**

```ts
// User drags volume slider rapidly
store.request.setVolume(0.3);
store.request.setVolume(0.5);
store.request.setVolume(0.7);
// Without batching: all three handlers execute (race condition)
// With batching: only 0.7 executes
```

Without batching, `target.volume = 0.3` runs before we know 0.5 is coming.

### 2. Supersession (Same Key Cancels Previous)

**Prevents race conditions on every slider, toggle, and rapid interaction.**

```ts
// Seek bar scrubbing
store.request.seek(10); // User still dragging...
store.request.seek(15); // Previous aborted
store.request.seek(20); // Only this completes
```

```ts
// Play/pause rapid toggle
store.request.play(); // Queued
store.request.pause(); // play() superseded
store.request.play(); // pause() superseded — only final executes
```

Media Chrome lacks this — users implement manually or suffer bugs.

### 3. AbortController Propagation

**Graceful cancellation for long-running operations.**

```ts
async setSource(src, { signal }) {
  target.src = src;
  await onEvent(target, 'loadeddata', { signal }); // Aborted if new source
}

// User changes quality mid-load
store.request.setSource('720p.mp4');  // Loading...
store.request.setSource('1080p.mp4'); // 720p aborted, 1080p starts
```

- Prevents wasted bandwidth
- Prevents stale responses updating state
- Handlers can clean up resources on abort

### 4. Lifecycle Tracking (pending/success/error)

**Observability for UI and debugging.**

```tsx
// Loading state
<select disabled={tasks['setSource']?.status === 'pending'}>

// Error display
{tasks['play']?.status === 'error' && <ErrorMessage />}
```

```ts
// Debugging
queue.subscribe((tasks) => {
  console.table(
    Object.entries(tasks).map(([name, t]) => ({
      name,
      status: t?.status,
      duration: t?.settledAt ? t.settledAt - t.startedAt : '...',
    }))
  );
});
```

```ts
// Analytics
queue.subscribe((tasks) => {
  for (const [name, task] of Object.entries(tasks)) {
    if (task?.status !== 'pending') {
      analytics.track('request', { name, status: task.status });
    }
  }
});
```

```ts
// Global error handler
queue.subscribe((tasks) => {
  for (const task of Object.values(tasks)) {
    if (task?.status === 'error' && !task.cancelled) {
      toast.error(`${task.name} failed`);
    }
  }
});
```

Without lifecycle tracking, every component tracks its own loading/error state.

### 5. Subscribe

**Required for React/Lit hook integration.**

```ts
// useMutation implementation
const subscribe = (onStoreChange) =>
  store.queue.subscribe((tasks) => {
    if (tasks[name] !== taskRef.current) {
      taskRef.current = tasks[name];
      onStoreChange();
    }
  });
```

### 6. abort()

**User/system cancellation.**

```ts
// Component unmount
useEffect(() => () => store.queue.abort('setSource'), []);

// User clicks "Cancel"
<button onClick={() => store.queue.abort('upload')}>Cancel</button>

// Navigation
router.beforeEach(() => store.queue.abort());
```

### 7. reset()

**Clear settled state.**

```ts
// Error persists after retry without reset
store.request.play(); // Fails — tasks['play'].status === 'error'
store.queue.reset('play'); // Clear error
store.request.play(); // Fresh attempt
```

### 8. Meta Field

**Low cost (~1 field), useful for debugging/analytics.**

```ts
store.request.play(null, { source: 'user', reason: 'play-button' });

// In handler or subscriber
console.log(task.meta?.source); // 'user' vs 'system'
```

---

## What We Remove (And Why Safe)

### 1. Configurable Schedulers (`delay()`, `raf()`, `idle()`)

**~70 LOC saved.**

- Only used in tests and docs
- Use external debounce if needed: `debounce(store.request.seek, 100)`
- Microtask is sufficient for supersession

### 2. `flush()`

**~15 LOC saved.**

- Only meaningful with configurable schedulers
- Tests can use `await Promise.resolve()` or `vi.runAllTimersAsync()`

### 3. `cancel()`

**~25 LOC saved.**

- Redundant with `abort()`
- `cancel()` only removes queued tasks
- `abort()` handles both queued and pending

### 4. `isPending()`, `isQueued()`, `isSettled()` Methods

**~15 LOC saved from Queue class.**

- Move to type guard utility functions (reusable, better type narrowing)
- `isQueued()` removed entirely (meaningless with microtask scheduling)

### 5. `queued` Getter

**~10 LOC saved.**

- With fixed microtask scheduling, queued state is ~0ms
- By the time you check, it's already pending or gone
- Internal implementation detail

### 6. `onDispatch`, `onSettled` Hooks

**~20 LOC saved.**

- Only used in tests
- Derive from `subscribe()`:
  ```ts
  queue.subscribe((tasks) => {
    for (const [name, task] of Object.entries(tasks)) {
      if (task?.status === 'pending') onDispatch(task);
      if (task?.status !== 'pending') onSettled(task);
    }
  });
  ```

### 7. Config Object

**~15 LOC saved.**

- Only held `scheduler`, `onDispatch`, `onSettled`
- All removed

### 8. DOM Schedulers File

**Delete `packages/store/src/dom/schedulers.ts` and `index.ts`.**

- Only exported `raf()` and `idle()`
- Nothing left after scheduler removal

---

## Implementation Changes

### 1. Single Batched Microtask

**Current:** Each `enqueue()` schedules its own microtask.

```ts
enqueue(task1) → queueMicrotask(flush1)
enqueue(task2) → queueMicrotask(flush2)
enqueue(task3) → queueMicrotask(flush3)
// Three microtasks queued
```

**New:** Single microtask per sync batch.

```ts
#flushScheduled = false;

enqueue(task) {
  this.#queued.set(key, task);

  if (!this.#flushScheduled) {
    this.#flushScheduled = true;
    queueMicrotask(() => {
      this.#flushScheduled = false;
      this.#flushAll();
    });
  }
}
```

### 2. Remove `schedule` Parameter

```diff
  interface QueueTask<...> {
    name: string;
    key: Key;
    input?: Input;
    meta?: RequestMeta | null;
-   schedule?: TaskScheduler | undefined;
    handler: (ctx: TaskContext<Input>) => Promise<Output>;
  }
```

### 3. Simplified Constructor

```diff
- constructor(config: QueueConfig<Tasks> = {}) {
-   this.#scheduler = config.scheduler ?? microtask;
-   this.#onDispatch = tryCatch(config.onDispatch, logError);
-   this.#onSettled = tryCatch(config.onSettled, logError);
- }
+ constructor() {}
```

---

## Final API Surface

```ts
interface Queue<Tasks> {
  // State
  readonly tasks: TasksRecord<Tasks>;
  readonly destroyed: boolean;

  // Core
  enqueue<K extends keyof Tasks>(task: QueueTask<K>): Promise<Tasks[K]['output']>;

  // Control
  abort(name?: keyof Tasks): void;
  reset(name?: keyof Tasks): void;
  destroy(): void;

  // Observe
  subscribe(listener: QueueListener<Tasks>): () => void;
}
```

---

## Migration Guide

| Before                    | After                                       |
| ------------------------- | ------------------------------------------- |
| `queue.isPending('play')` | `queue.tasks['play']?.status === 'pending'` |
| `queue.isSettled('play')` | `queue.tasks['play']?.status !== 'pending'` |
| `queue.isQueued('play')`  | Remove (instant with microtask)             |
| `queue.cancel('play')`    | `queue.abort('play')`                       |
| `queue.flush('play')`     | Remove (no configurable scheduling)         |
| `queue.queued`            | Remove (internal detail)                    |
| `schedule: delay(100)`    | External: `debounce(request, 100)`          |
| `onSettled: fn`           | `queue.subscribe(tasks => ...)`             |
| `createQueue({ ... })`    | `createQueue()`                             |

---

## Files to Change

1. **`packages/store/src/core/queue.ts`** — Main simplification
2. **`packages/store/src/core/tests/queue.test.ts`** — Remove tests for removed features
3. **`packages/store/src/core/tests/queue.types.test.ts`** — Update type tests
4. **`packages/store/src/dom/schedulers.ts`** — Delete
5. **`packages/store/src/dom/index.ts`** — Delete (empty after scheduler removal)
6. **`packages/store/src/dom/tests/schedulers.test.ts`** — Delete
7. **`packages/store/src/core/index.ts`** — Remove scheduler exports
8. **`packages/store/README.md`** — Update docs

---

## Type Changes

Keep strong typing. Simplifications:

```diff
- export type TaskScheduler = (flush: () => void) => (() => void) | void;

- export interface QueueConfig<Tasks extends TaskRecord = DefaultTaskRecord> {
-   scheduler?: TaskScheduler;
-   onDispatch?: ...;
-   onSettled?: ...;
- }

- export interface QueuedTaskId<Key extends TaskKey = TaskKey> { ... }
- export type PublicQueuedRecord<Tasks extends TaskRecord> = { ... }
```

Keep all Task types (`PendingTask`, `SuccessTask`, `ErrorTask`, etc.) — used by hooks.

---

## Estimated LOC

| Section     | Current  | After    |
| ----------- | -------- | -------- |
| Types       | ~120     | ~80      |
| Schedulers  | ~30      | 0        |
| Queue class | ~350     | ~120     |
| Factory     | ~10      | ~5       |
| **Total**   | **~524** | **~200** |

---

## Verification

After implementation:

1. `pnpm -F @videojs/store test` — All remaining tests pass
2. `pnpm -F @videojs/store build` — Builds successfully
3. `pnpm typecheck` — No type errors
4. Hooks (`useMutation`, `useOptimistic`, `useTasks`) — Still work
5. Examples — Still work
