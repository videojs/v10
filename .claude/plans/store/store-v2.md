# Store v2 Plan

Simplify store package by removing queue public API, simplifying internals, and cleaning up bindings.

---

## Phase 1: Queue Removal ✅

> **COMPLETED:** Queue, task, and meta were completely removed. Actions now use `target()` directly.

**What was done:**
- Deleted `queue.ts`, `request.ts` and their tests
- Removed `Task`, `TaskOptions`, `TaskHandler`, `TaskContext` types from `slice.ts`
- Simplified `StateContext` to just `{ target: () => Target }`
- Removed `pending`, `meta()`, `onTaskStart`, `onTaskEnd` from store
- Removed `ABORTED`, `SUPERSEDED` error codes
- Actions now call `target()` directly instead of using `task()` wrapper

<details>
<summary>Original plan (obsolete)</summary>

Remove public API, keep internal for abort/supersession/modes.

### 1.1 Rewrite `src/core/queue.ts`

**Before:** 251 lines with observable task state
**After:** ~60 lines with just abort/modes

```ts
import { StoreError } from './errors';
import type { RequestMode } from './request';

export type TaskKey = string | symbol;

export interface QueueTask<Output = unknown> {
  key: TaskKey;
  mode?: RequestMode;
  handler: (ctx: { signal: AbortSignal }) => Promise<Output>;
}

export class Queue {
  #pending = new Map<TaskKey, AbortController>();
  #shared = new Map<TaskKey, Promise<unknown>>();
  #destroyed = false;

  get destroyed(): boolean {
    return this.#destroyed;
  }

  enqueue<Output>({ key, mode = 'exclusive', handler }: QueueTask<Output>): Promise<Output> {
    if (this.#destroyed) {
      return Promise.reject(new StoreError('DESTROYED'));
    }

    // Shared mode: join existing
    if (mode === 'shared') {
      const existing = this.#shared.get(key);
      if (existing) return existing as Promise<Output>;
    }

    // Supersede pending with same key
    this.#pending.get(key)?.abort(new StoreError('SUPERSEDED'));

    const abort = new AbortController();
    this.#pending.set(key, abort);

    const promise = handler({ signal: abort.signal }).finally(() => {
      this.#pending.delete(key);
      this.#shared.delete(key);
    });

    if (mode === 'shared') {
      this.#shared.set(key, promise);
    }

    return promise;
  }

  abort(key?: TaskKey): void {
    if (key !== undefined) {
      this.#pending.get(key)?.abort(new StoreError('ABORTED'));
      return;
    }

    const error = new StoreError('ABORTED');
    for (const controller of this.#pending.values()) {
      controller.abort(error);
    }
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.abort();
    this.#pending.clear();
    this.#shared.clear();
  }
}
```

**Removed:**
- `TaskRecord`, `DefaultTaskRecord`, `EnsureTaskRecord`, `TasksRecord` types
- `#tasks` state, `subscribe()`, `tasks` getter, `reset()`
- `name`, `input`, `meta` from QueueTask
- `createQueue()` factory

---

### 1.2 Delete `src/core/task.ts`

Entire file removed. `TaskKey` moved to `queue.ts`.

---

### 1.3 Update `src/core/guard.ts`

Keep types, remove combinators:

```ts
// KEEP
export type GuardResult = boolean | Promise<unknown>;
export interface GuardContext<Target> { target: Target; signal: AbortSignal; }
export type Guard<Target> = (ctx: GuardContext<Target>) => GuardResult;

// REMOVE
export function all(...) { ... }
export function any(...) { ... }
export function timeout(...) { ... }
```

---

### 1.4 Update `src/core/store.ts`

**Imports:**
```diff
- import type { PendingTask, Task, TaskContext } from './task';
+ import type { TaskKey } from './queue';
```

**Queue type:**
```diff
- readonly #queue: Queue<UnionFeatureTasks<Features>>;
+ readonly #queue: Queue;
```

**Constructor:**
```diff
- this.#queue = config.queue ?? new Queue<UnionFeatureTasks<Features>>();
+ this.#queue = new Queue();
```

**Remove queue getter (lines 69-71):**
```diff
- get queue(): Queue<UnionFeatureTasks<Features>> {
-   return this.#queue;
- }
```

**Simplify #execute handler (line 248):**
```diff
- const handler = async ({ input, signal }: TaskContext) => {
+ const handler = async ({ signal }: { signal: AbortSignal }) => {
```

**Simplify enqueue call (lines 267-274):**
```diff
  return await this.#queue.enqueue({
-   name,
    key,
    mode: config.mode,
-   input,
-   meta,
    handler,
  });
```

**Simplify error handling (lines 275-285):**
```diff
  } catch (error) {
-   const tasks = this.#queue.tasks as Record<string | symbol, Task | undefined>;
-   const task = tasks[name];
-   this.#handleError({
-     request: task?.status === 'pending' ? task : undefined,
-     error,
-   });
+   this.#handleError({ error });
    throw error;
  }
```

**Remove config.queue (line 325):**
```diff
  interface StoreConfig<Target, Features> {
    features: Features;
-   queue?: Queue<UnionFeatureTasks<Features>>;
    onSetup?: ...;
```

**Simplify StoreErrorContext (lines 342-346):**
```diff
  interface StoreErrorContext<Target, Features> {
-   request?: PendingTask | undefined;
    store: Store<Target, Features>;
    error: unknown;
  }
```

**Remove InferStoreTasks (line 368):**
```diff
- export type InferStoreTasks<S extends AnyStore> = UnionFeatureTasks<InferStoreFeatures<S>>;
```

---

### 1.5 Update `src/core/feature.ts`

```diff
- import type { EnsureTaskRecord } from './queue';

- export type UnionFeatureTasks<Features extends Feature<any, any, any>[]> = EnsureTaskRecord<
-   UnionToIntersection<InferFeatureRequests<Features[number]>>
- >;
```

---

### 1.6 Update `src/core/index.ts`

```diff
  export * from './computed';
  export * from './errors';
  export * from './feature';
- export * from './guard';
+ export type { Guard, GuardContext, GuardResult } from './guard';
- export * from './queue';
+ export type { TaskKey } from './queue';
  export * from './request';
  export * from './state';
  export * from './store';
- export * from './task';
```

---

### 1.7 Delete Lit Queue Bindings

**Delete:** `src/lit/controllers/queue-controller.ts`

**Update `src/lit/controllers/index.ts`:**
```diff
- export { QueueController, type QueueControllerHost } from './queue-controller';
```

**Update `src/lit/index.ts`:**
```diff
  export {
-   QueueController,
    SnapshotController,
    StoreController,
    SubscriptionController,
  } from './controllers';
```

**Update `src/lit/create-store.ts`:**
- Remove `QueueController` class
- Remove from `CreateStoreResult` interface
- Remove from return object
- Remove `TasksRecord`, `UnionFeatureTasks` imports

---

### 1.8 Delete React Queue Bindings

**Delete:** `src/react/hooks/use-queue.ts`

**Update `src/react/hooks/index.ts`:**
```diff
- export { useQueue } from './use-queue';
```

**Update `src/react/index.ts`:**
```diff
- export { useQueue, useSnapshot, useStore } from './hooks';
+ export { useSnapshot, useStore } from './hooks';
```

**Update `src/react/create-store.tsx`:**
- Remove `useQueue` function
- Remove from `CreateStoreResult` interface
- Remove from return object
- Remove `TasksRecord`, `UnionFeatureTasks` imports

---

### 1.9 Tests

| File | Action |
|------|--------|
| `src/core/tests/queue.test.ts` | Rewrite: test enqueue, shared mode, supersession, abort, destroy |
| `src/core/tests/queue.types.test.ts` | Delete |
| `src/core/tests/task.test.ts` | Delete |
| `src/core/tests/task.types.test.ts` | Delete (if exists) |
| `src/core/tests/guard.test.ts` | Delete (only has combinator tests) |
| `src/core/tests/store.test.ts` | Remove `config.queue` test, update error context tests |
| `src/core/tests/store.types.test.ts` | Remove `InferStoreTasks` tests |
| `src/lit/controllers/tests/queue-controller.test.ts` | Delete |
| `src/react/hooks/tests/use-queue.test.tsx` | Delete |

**Simplified queue tests should cover:**
- `enqueue()` executes handler and returns result
- `enqueue()` with same key supersedes pending (aborts with SUPERSEDED)
- `enqueue()` with `mode: 'shared'` joins existing promise
- `abort(key)` aborts specific task
- `abort()` aborts all tasks
- `destroy()` aborts all and rejects future enqueues

---

### 1.10 Summary

| Category | Files Deleted | Files Modified |
|----------|---------------|----------------|
| Core | 1 (`task.ts`) | 5 (`queue.ts`, `guard.ts`, `store.ts`, `feature.ts`, `index.ts`) |
| Lit | 1 (`queue-controller.ts`) | 3 (`index.ts`, `create-store.ts`, `controllers/index.ts`) |
| React | 1 (`use-queue.ts`) | 3 (`index.ts`, `create-store.tsx`, `hooks/index.ts`) |
| Tests | 6 | 3 |

### 1.11 Verification

```bash
pnpm typecheck
pnpm -F @videojs/store test
pnpm lint
pnpm build:packages
```

</details>

---

## Phase 2: Bindings Cleanup (Separate PR)

Simplify existing `createStore` implementations before building the Player API.

### Overview

This refactor prepares the store infrastructure for the Player API by:
1. Removing unused inheritance patterns (React)
2. Delegating to base hooks instead of duplicating logic (React)
3. Renaming mixins to clearer names (Lit)

### 2.1 React Changes

#### Remove `inherit` Prop

The `inherit` prop allowed nested Providers to share a parent's store. With single-store architecture, this pattern is unnecessary.

**File:** `packages/store/src/react/create-store.tsx`

**Before:**
```tsx
interface ProviderProps<Features extends AnyFeature[]> {
  children: ReactNode;
  store?: Store<...>;
  inherit?: boolean;  // Remove this
}

function Provider({ children, store: providedStore, inherit = false }: ProviderProps<Features>): ReactNode {
  const parentStore = useParentStore();
  const shouldInherit = inherit && !isNull(parentStore);
  // ... inheritance logic
}
```

**After:**
```tsx
interface ProviderProps<Features extends AnyFeature[]> {
  children: ReactNode;
  store?: Store<...>;
}

function Provider({ children, store: providedStore }: ProviderProps<Features>): ReactNode {
  const [store] = useState<StoreType>(() => {
    if (!isUndefined(providedStore)) {
      return providedStore;
    }
    return create();
  });

  const isOwner = isUndefined(providedStore);
  // ... simplified logic
}
```

#### Simplify Context

**File:** `packages/store/src/react/context.tsx`

Remove `useParentStore` — no longer needed without inheritance.

**Before:**
```tsx
export function useParentStore(): AnyStore | null {
  return useContext(StoreContext);
}
```

**After:** Remove the function entirely.

#### Delegate `useStore` to Base Hook

**File:** `packages/store/src/react/create-store.tsx`

The `useStore` function inside `createStore` duplicates logic from `hooks/use-store.ts`. It should delegate instead.

**Before:**
```tsx
function useStore(): UseStoreResult<Features> {
  const store = useStoreContext();

  const state = useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.state,
    () => store.state
  );

  return useMemo(
    () => ({ ...state, ...(store.request as object) }) as UseStoreResult<Features>,
    [state, store.request]
  );
}
```

**After:**
```tsx
import { useStore as useStoreBase } from './hooks/use-store';

function useStore(): UseStoreResult<Features> {
  const store = useStoreContext();
  return useStoreBase(store) as UseStoreResult<Features>;
}
```

---

### 2.2 Lit Changes

#### Rename Mixins

Rename mixins to clearer, domain-agnostic names:

| Old Name | New Name | Reason |
|----------|----------|--------|
| `StoreAttachMixin` | `ContainerMixin` | Describes role, not implementation |
| `StoreProviderMixin` | `ProviderMixin` | Shorter, clearer |
| `StoreMixin` | Keep as-is | Combined mixin stays the same |

#### File Renames

```
packages/store/src/lit/mixins/attach-mixin.ts → container-mixin.ts
packages/store/src/lit/mixins/provider-mixin.ts (no change, update export name)
packages/store/src/lit/mixins/combined-mixin.ts (no change)
packages/store/src/lit/mixins/index.ts (update exports)
```

#### Update Factory Functions

**File:** `packages/store/src/lit/mixins/container-mixin.ts` (renamed from attach-mixin.ts)

```ts
// Rename factory function
export function createContainerMixin<Features extends AnyFeature[]>(...) {
  // ... same implementation, just renamed
}

// Backwards compat alias (deprecated)
/** @deprecated Use createContainerMixin */
export const createStoreAttachMixin = createContainerMixin;
```

**File:** `packages/store/src/lit/mixins/provider-mixin.ts`

```ts
// Rename factory function
export function createProviderMixin<Features extends AnyFeature[]>(...) {
  // ... same implementation, just renamed
}

// Backwards compat alias (deprecated)
/** @deprecated Use createProviderMixin */
export const createStoreProviderMixin = createProviderMixin;
```

**File:** `packages/store/src/lit/mixins/combined-mixin.ts`

```ts
import { createContainerMixin } from './container-mixin';
import { createProviderMixin } from './provider-mixin';

export function createStoreMixin<Features extends AnyFeature[]>(...) {
  const ProviderMixin = createProviderMixin<Features>(context, factory);
  const ContainerMixin = createContainerMixin<Features>(context);
  // ...
}
```

**File:** `packages/store/src/lit/mixins/index.ts`

```ts
// New names (preferred)
export { createContainerMixin } from './container-mixin';
export { createProviderMixin } from './provider-mixin';
export { createStoreMixin } from './combined-mixin';

// Deprecated aliases
export { createStoreAttachMixin } from './container-mixin';
export { createStoreProviderMixin } from './provider-mixin';
```

#### Update createStore Returns

**File:** `packages/store/src/lit/create-store.ts`

```ts
export interface CreateStoreResult<Features extends AnyFeature[]> {
  StoreMixin: ...;
  ProviderMixin: ...;      // was StoreProviderMixin
  ContainerMixin: ...;     // was StoreAttachMixin
  context: ...;
  create: ...;
  StoreController: ...;
  
  // Deprecated aliases
  /** @deprecated Use ProviderMixin */
  StoreProviderMixin: ...;
  /** @deprecated Use ContainerMixin */
  StoreAttachMixin: ...;
}

export function createStore<Features extends AnyFeature[]>(...): CreateStoreResult<Features> {
  // ...
  const ProviderMixin = createProviderMixin<Features>(context, create);
  const ContainerMixin = createContainerMixin<Features>(context);
  const StoreMixin = createStoreMixin<Features>(context, create);

  return {
    StoreMixin,
    ProviderMixin,
    ContainerMixin,
    context,
    create,
    StoreController,
    // Deprecated aliases
    StoreProviderMixin: ProviderMixin,
    StoreAttachMixin: ContainerMixin,
  };
}
```

---

### 2.3 Files to Modify

| File | Change |
|------|--------|
| `packages/store/src/react/create-store.tsx` | Remove inherit, delegate useStore |
| `packages/store/src/react/context.tsx` | Remove useParentStore |
| `packages/store/src/lit/mixins/attach-mixin.ts` | Rename to container-mixin.ts |
| `packages/store/src/lit/mixins/provider-mixin.ts` | Rename factory function |
| `packages/store/src/lit/mixins/combined-mixin.ts` | Update imports |
| `packages/store/src/lit/mixins/index.ts` | Update exports |
| `packages/store/src/lit/create-store.ts` | Update returned names |

### 2.4 Test Updates

Existing tests should continue to pass with deprecated aliases. Add new tests for renamed exports.

### 2.5 Verification

```bash
pnpm typecheck
pnpm -F @videojs/store test
pnpm -F @videojs/store build
```

### 2.6 Commit

```
refactor(store): simplify createStore implementations

React:
- Remove `inherit` prop from Provider (single-store pattern)
- Remove `useParentStore()` hook
- Delegate useStore to base hook implementation

Lit:
- Rename StoreAttachMixin → ContainerMixin
- Rename StoreProviderMixin → ProviderMixin
- Keep deprecated aliases for backwards compatibility
```

---

## Phase 3: Store v2 API (Design Only)

A redesigned store API inspired by Zustand's factory pattern. Goals:
- Simplify API surface
- Reduce type complexity by ~70%
- Maintain power of current design (task tracking, cancellation, reactive state)

### Design Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Feature property | `feature.create` | Matches `create*` naming convention |
| `task()` API | Shorthand + full options | Ergonomic for simple cases |
| `target()` helper | Sync access to target | Allows sync mutations without Promise |
| `meta()` method | Meta context for actions | Clean API, doesn't pollute action signatures |
| Guards | Dropped | Guard logic is just code at start of action body |
| Task tracking | Minimal (`store.pending` only) | No history, just what's running |
| Task tracing | `onTaskStart` / `onTaskEnd` callbacks | Observability without state |
| Store construction | `Object.defineProperty` | No Proxy overhead |
| State conflicts | Last feature wins | Simple merge semantics |
| Migration | Not needed | No external users |

### Core Concept

Features are defined using a factory function that receives helpers (`task`, `get`, `target`). The factory returns an object containing state (plain values) and actions (functions). Types are inferred from the return type — no manual generics needed.

```ts
const playbackFeature = defineFeature<HTMLMediaElement>()(
  ({ task, get, target }) => ({
    // State (plain values)
    playing: false,
    currentTime: 0,
    
    // Action - async, tracked
    play() {
      return task({
        key: 'playback',
        handler: ({ target }) => target.play(),
      });
    },
    
    // Action - async, fire-and-forget (shorthand)
    load(src: string) {
      return task(({ target }) => { target.src = src; target.load(); });
    },
    
    // Action - sync, direct target access
    seek(time: number) {
      target().currentTime = time;
    },
  }),
  {
    getSnapshot: ({ target }) => ({ ... }),
    subscribe: ({ target, update, signal }) => { ... },
  }
);
```

---

### API Design

#### `defineFeature<Target>()`

Curried function to define a feature. Target generic is explicit, full definition `T` inferred from factory return.

```ts
function defineFeature<Target>(): <T>(
  create: (ctx: DefineFeatureContext<Target, ExtractState<T>>) => T,
  config: FeatureConfig<Target, ExtractState<T>>
) => Feature<Target, T>;
```

- `T` is the full feature definition (state + actions merged)
- `ExtractState<T>` extracts only state for reactivity (`get()`, selectors)

#### Factory Context

```ts
interface DefineFeatureContext<Target, State> {
  task: TaskHelper<Target, State>;   // async, queue-based
  get: () => State;                   // current state snapshot
  target: () => Target;               // current target (throws if not attached)
}
```

#### `task()` Helper

Runs work against the target with optional tracking. Two signatures:

```ts
// Shorthand - handler only (fire-and-forget)
task(handler: (ctx: HandlerContext<Target, State>) => Output): Promise<Output>;

// Full options - with key, mode, cancels
task(options: TaskOptions<Target, State, Output>): Promise<Output>;
```

```ts
interface TaskOptions<Target, State, Output> {
  key?: string;                    // Task tracking key (omit = no tracking)
  mode?: 'exclusive' | 'shared';   // Default: 'exclusive'
  cancels?: string[];              // Cancel other task keys
  handler: (ctx: HandlerContext<Target, State>) => Output;
}

interface HandlerContext<Target, State> {
  target: Target;
  signal: AbortSignal;
  get: () => State;
  meta: RequestMeta | null;        // From store.trace(), null if not traced
}
```

**Behavior:**
- `key` provided → Task tracked in `store.tasks[key]`
- `key` omitted → Fire-and-forget, no tracking
- `mode: 'exclusive'` (default) → Cancels previous task with same key
- `mode: 'shared'` → Joins existing in-flight task with same key
- `meta` comes from `store.meta()` — not passed to `task()` directly

#### `target()` Helper

Sync access to current target. Use for simple synchronous mutations.

```ts
target: () => Target;  // throws StoreError('NO_TARGET') if not attached
```

**When to use:**
- `target()` — sync mutations, no tracking needed
- `task()` — async work, cancellation, tracking

#### Feature Config (Second Argument)

```ts
interface FeatureConfig<Target, State> {
  getSnapshot: (ctx: {
    target: Target;
    get: () => State;
    initialState: State;
  }) => State;
  
  subscribe: (ctx: {
    target: Target;
    update: () => void;
    signal: AbortSignal;
    get: () => State;
  }) => void;
}
```

**Flow:**
1. Store created → state = initialState (plain values from factory)
2. Target attached → state = getSnapshot(target)
3. Target fires event → subscribe calls update() → getSnapshot() → new state

---

### Store API

#### Creation

`createStore()` is a **factory function** that returns a plain object (not a class instance).

```ts
const store = createStore({
  target: videoElement,
  features: [playbackFeature, audioFeature],
  
  // Optional: trace callbacks for observability
  onTaskStart: ({ key, meta }) => {
    console.log(`[START] ${key}`, meta?.source);
  },
  onTaskEnd: ({ key, meta, error }) => {
    if (error) console.log(`[ERROR] ${key}`, error);
    else console.log(`[END] ${key}`);
  },
});
```

#### Usage

State and actions live **directly on the store object**:

```ts
// State (flat access — directly on object)
store.playing        // boolean
store.currentTime    // number
store.volume         // number

// Actions (flat access — directly on object)
store.play()         // Promise<void>
store.seek(30)       // void (sync)
store.setVolume(0.5) // void (sync)

// Pending tasks (minimal tracking - no history)
store.pending.playback  // { key, meta, startedAt } | undefined

// Check if task is running
if (store.pending.playback) { ... }

// Subscribe (Zustand-style, selector optional)
store.subscribe((state) => { ... });
store.subscribe((s) => s.playing, (playing, prev) => { ... });

// Lifecycle
store.destroy();
```

#### `meta()` Method

Pass meta context to actions for observability/debugging:

```ts
// From DOM event (common case)
store.meta(clickEvent).play()
store.meta(keyEvent).seek(10)

// Explicit meta
store.meta({ source: 'keyboard', reason: 'shortcut' }).play()

// Chain multiple actions with same context
const m = store.meta(event);
m.play();
m.seek(30);
```

**Implementation:**

```ts
meta(eventOrMeta: Event | RequestMetaInit): MetaStore<...> {
  const resolved = eventOrMeta instanceof Event 
    ? createRequestMetaFromEvent(eventOrMeta) 
    : createRequestMeta(eventOrMeta);
  
  // Returns store wrapper with meta bound to all task() calls
  return createMetaStore(this, resolved);
}
```

**Meta access in handlers:**

```ts
play() {
  return task({
    key: 'playback',
    handler: ({ target, signal, meta }) => {
      console.log('Triggered by:', meta?.source);
      return target.play();
    },
  });
}
```

| Action Type | Signal | Meta |
|-------------|--------|------|
| `task()` async | ✓ From queue | ✓ From `meta()`, in handler context |
| `target()` sync | ✗ N/A (instant) | ✗ N/A (no handler context) |

---

### Type System

#### Core Types

```ts
// ExtractState — Used for reactivity (get(), selectors)
type ExtractState<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};

// T (full type) — Used for store surface (state + actions merged)
// No separate ExtractActions needed
```

#### Type Inference Flow

```
defineFeature<Target>()(factory, config)
                          │
                          ▼
         TypeScript infers T from factory return
                          │
                          ▼
                          T
  { playing: boolean, currentTime: number, play: () => Promise<void>, ... }
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
     ExtractState<T>                    T
  (for get(), selectors)        (for store surface)
```

#### Store Type

```ts
// Store merges all feature definitions directly
type Store<Features> = UnionToIntersection<
  InferFeatureDefinition<Features[number]>
> & {
  subscribe: ...;
  destroy: ...;
};
```

The store is a **plain object** returned by `createStore()` factory — not a class instance.

---

### Full Example

```ts
const playbackFeature = defineFeature<HTMLMediaElement>()(
  ({ task, get, target }) => ({
    // State
    playing: false,
    currentTime: 0,
    duration: 0,
    
    // Action - async, tracked (uses task with key)
    play() {
      return task({
        key: 'playback',
        mode: 'exclusive',
        handler: ({ target, signal, meta }) => {
          // meta available from store.meta()
          console.log('play triggered by:', meta?.source);
          return target.play();
        },
      });
    },
    
    // Action - async, tracked (uses task with key)
    pause() {
      return task({
        key: 'playback',
        mode: 'exclusive',
        handler: ({ target }) => target.pause(),
      });
    },
    
    // Action - sync, direct target access (no task, no promise)
    seek(time: number) {
      target().currentTime = time;
    },
  }),
  {
    getSnapshot: ({ target }) => ({
      playing: !target.paused,
      currentTime: target.currentTime,
      duration: target.duration,
    }),
    subscribe: ({ target, update, signal }) => {
      target.addEventListener('play', update, { signal });
      target.addEventListener('pause', update, { signal });
      target.addEventListener('timeupdate', update, { signal });
      target.addEventListener('durationchange', update, { signal });
    },
  }
);

const audioFeature = defineFeature<HTMLMediaElement>()(
  ({ task, get, target }) => ({
    // State
    volume: 1,
    muted: false,
    
    // Action - sync (no promise needed for simple property set)
    setVolume(volume: number) {
      target().volume = volume;
    },
    
    // Action - sync
    toggleMute() {
      const t = target();
      t.muted = !t.muted;
    },
    
    // Action - state only, no target needed
    getEffectiveVolume() {
      const { volume, muted } = get();
      return muted ? 0 : volume;
    },
  }),
  {
    getSnapshot: ({ target }) => ({
      volume: target.volume,
      muted: target.muted,
    }),
    subscribe: ({ target, update, signal }) => {
      target.addEventListener('volumechange', update, { signal });
    },
  }
);

// Store
const store = createStore({
  target: video,
  features: [playbackFeature, audioFeature],
});

// State (getters on store object)
store.playing        // boolean
store.currentTime    // number
store.volume         // number
store.muted          // boolean

// Actions - async (return Promise)
store.play()         // Promise<void>
store.pause()        // Promise<void>

// Actions - sync (no Promise)
store.seek(30)       // void
store.setVolume(0.5) // void
store.toggleMute()   // void

// Actions - state only
store.getEffectiveVolume()  // number

// Subscribe
store.subscribe((state) => {
  console.log('State changed:', state);
});

store.subscribe(
  (s) => s.playing,
  (playing) => console.log('Playing:', playing)
);

// Pending tasks (minimal tracking)
store.pending.playback  // { key, meta, startedAt } | undefined

// Meta - attach meta context for observability
store.meta(clickEvent).play()
store.meta({ source: 'keyboard' }).seek(30)
```

---

### Type Simplification

#### Current Types (~25 definitions)

```ts
// Feature types
Feature<Target, State, Requests>
AnyFeature<Target>
FeatureGetSnapshot<Target, State>
FeatureGetSnapshotContext<Target, State>
FeatureSubscribe<Target, State>
FeatureSubscribeContext<Target, State>
FeatureUpdate
FeatureConfig<Target, State, Requests>
FeatureFactory<Target>
FeatureFactoryResult<Target, Config>

// Feature inference
InferFeatureTarget<S>
InferFeatureState<S>
InferFeatureRequests<S>
ResolveFeatureRequestHandlers<S>
UnionFeatureTarget<Features>
UnionFeatureState<Features>
UnionFeatureRequests<Features>
UnionFeatureTasks<Features>

// Request types
Request<Input, Output>
RequestRecord
DefaultRequestRecord
RequestContext<Target>
RequestKey<Input>
RequestMode
RequestCancel<Input>
RequestHandler<Target, Input, Output>
RequestConfig<Target, Input, Output>
ResolvedRequestConfig<Target, Input, Output>
RequestHandlerRecord
RequestConfigMap<Target, Requests>
ResolvedRequestConfigMap<Target, Requests>

// Request inference
InferRequestHandlerInput<Handler>
InferRequestHandlerOutput<Handler>
ResolveRequestMap<Requests>
ResolveRequestHandler<R>
```

#### v2 Types (~10 definitions)

```ts
// Feature types
Feature<Target, T>
DefineFeatureContext<Target, State>  // { task, get, target }
FeatureConfig<Target, State>
TaskOptions<Target, State, Output>

// Contexts
HandlerContext<Target, State>
GetSnapshotContext<Target, State>
SubscribeContext<Target, State>

// Pending task (minimal)
PendingTask  // { key, meta, startedAt }

// Extraction (only one needed)
ExtractState<T>
```

#### Comparison

| Metric | Current | v2 | Reduction |
|--------|---------|-----|-----------|
| Type definitions | ~25 | ~10 | **~60%** |
| Lines of type code | ~150 | ~50 | **~65%** |
| Inference depth | 4+ levels | 1-2 levels | **~50%** |

#### Key Wins

1. **No Request type layer** — Actions are just functions, TypeScript infers types directly
2. **No config resolution types** — No `RequestConfig` → `ResolvedRequestConfig` transformation
3. **Single extraction type** — Only `ExtractState<T>` needed; full `T` used for store surface
4. **Factory, not class** — `createStore()` returns a plain object with state/actions merged

---

### Comparison: Current vs v2

| Aspect | Current | v2 |
|--------|---------|-----|
| Store creation | `new Store(config)` class | `createStore(config)` factory → plain object |
| Feature definition | `createFeature<Target>()({ initialState, request, ... })` | `defineFeature<Target>()(create, config)` |
| Feature property | `feature.request` | `feature.create` |
| State definition | Separate `initialState` object | Plain values in factory return |
| Actions definition | Separate `request` object with config wrappers | Functions (may call `task()` or `target()`) |
| Sync actions | Not supported (all via queue) | `target()` helper for direct sync access |
| Task config | Wrapper at definition: `request: { play: { handler } }` | Inline: `task({ handler })` or `task(handler)` |
| Task tracking | Full state machine (`pending/success/error`) | Minimal (`store.pending` only) |
| Task tracing | Manual | `onTaskStart` / `onTaskEnd` callbacks |
| Store access | `store.state.x`, `store.request.y()` | `store.x`, `store.y()` (flat on object) |
| Subscribe | Key array based | Zustand-style selector |
| Type extraction | `ExtractState` + `ExtractActions` | `ExtractState` only; `T` for full surface |
| API familiarity | Custom | Zustand-like |

---

### Implementation Notes

#### Store Construction (No Proxy)

`createStore()` builds a plain object dynamically:

```ts
function createStore(config) {
  const queue = new Queue();
  let currentState = {};
  let currentMeta = null;  // from store.meta()
  const pending = {};      // minimal task tracking
  
  const store = {};
  
  for (const feature of config.features) {
    const ctx: DefineFeatureContext = {
      task: (handlerOrOptions) => {
        const { key, handler } = normalizeTaskOptions(handlerOrOptions);
        const meta = currentMeta;
        
        // Track pending task
        if (key) {
          pending[key] = { key, meta, startedAt: Date.now() };
          config.onTaskStart?.({ key, meta });
        }
        
        return queue.enqueue({ key, handler })
          .then(result => {
            if (key) delete pending[key];
            config.onTaskEnd?.({ key, meta, result });
            return result;
          })
          .catch(error => {
            if (key) delete pending[key];
            config.onTaskEnd?.({ key, meta, error });
            throw error;
          });
      },
      get: () => currentState,
      target: () => {
        if (!currentTarget) throw new StoreError('NO_TARGET');
        return currentTarget;
      },
    };
    
    const definition = feature.create(ctx);
    
    for (const [key, value] of Object.entries(definition)) {
      if (typeof value === 'function') {
        store[key] = value;  // Actions
      } else {
        currentState[key] = value;  // State
        Object.defineProperty(store, key, {
          get: () => currentState[key],
          enumerable: true,
        });
      }
    }
  }
  
  store.pending = pending;
  store.meta = (eventOrMeta) => createMetaStore(store, eventOrMeta);
  store.subscribe = (cb) => { ... };
  store.destroy = () => { ... };
  
  return store;
}
```

#### Resolved Questions

| Question | Resolution |
|----------|------------|
| Task tracking | Minimal `store.pending` — only currently running tasks |
| Task history | None — use `onTaskStart`/`onTaskEnd` callbacks to log |
| Naming collisions | TypeScript prevents duplicate keys in object literal |
| Computed state | Not supported in v2 MVP. Could add `computed()` later |

---

### Not Changing

- Reactive state model (getSnapshot + subscribe)
- Target attachment pattern
- Task modes (exclusive/shared)
- Cancellation via AbortSignal
- Platform adapters (Lit, React) — will need updates to consume new API

---

## PR Sequence

### PR 1: Core Queue Simplification
**Scope:** ~10 files  
**Theme:** Simplify internal task execution

- Rewrite `queue.ts` (251 → ~60 lines)
- Delete `task.ts`
- Modify `guard.ts` (remove combinators)
- Modify `store.ts` (remove `queue` getter, simplify error context)
- Modify `feature.ts` (remove `UnionFeatureTasks`)
- Modify `index.ts`
- Rewrite/delete tests

### PR 2: Remove Platform Queue Bindings
**Scope:** ~8 files  
**Theme:** Remove queue public API from platforms

- Delete Lit `QueueController` + test
- Delete React `useQueue` + test
- Update exports in both platforms

### PR 3: Bindings Cleanup (Phase 2)
**Scope:** ~10 files  
**Theme:** Simplify and rename for clarity

- React: Remove `inherit`, `useParentStore`, delegate `useStore`
- Lit: Rename mixins (`ContainerMixin`, `ProviderMixin`)

### PR 4: Store v2 API (Phase 3)
**Scope:** TBD  
**Theme:** New store API with flat access

- `defineFeature()` with `create` property
- `DefineFeatureContext` with `task`, `get`, `target` helpers
- `task()` shorthand + full options
- `target()` helper for sync access
- `store.meta()` for tracing context (Proxy-based)
- `store.pending` for minimal task tracking
- `onTaskStart` / `onTaskEnd` callbacks
- Flat store object construction
- Migrate existing features in `packages/core/src/dom/store/features/`

### PR 5: Platform Bindings for v2
**Scope:** TBD  
**Theme:** Update Lit/React bindings for v2 API

- Update `packages/store/src/lit/` for v2 store API
- Update `packages/store/src/react/` for v2 store API
- Update controllers/hooks to work with new flat access
- Update mixins for new store shape

### PR 6: Documentation Updates
**Scope:** ~5 files  
**Theme:** Update docs and AI guidance

- `packages/store/README.md` — Update API docs
- `.claude/skills/component/references/lit.md` — Update mixin names
- `.claude/skills/docs/templates/readme.md` — Update mixin references
- `CLAUDE.md` — Update store patterns/conventions
- Document new v2 API patterns and examples
