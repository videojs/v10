# Store React/DOM Bindings

## Goal

Implement React and DOM bindings for Video.js 10's store, enabling:

- Simple `createStore()` API that returns Provider + hooks/controllers
- Skins define their own store configs and export Provider + Skin + hooks
- Consumers can extend skin configs with additional slices
- Base hooks/controllers for testing and advanced use cases

## Key Decisions

| Decision            | Resolution                                                                          |
| ------------------- | ----------------------------------------------------------------------------------- |
| Store creation      | `createStore({ slices, displayName? })` - types inferred from slices                |
| Hook naming         | `useStore`, `useSelector`, `useRequest`, `useTasks`, `useMutation`, `useOptimistic` |
| Controller naming   | `SelectorController`, `RequestController`, `TasksController`, etc                   |
| Selector hook       | `useSelector(selector)` - requires selector (Redux-style)                           |
| Store hook          | `useStore()` - returns store instance                                               |
| Request hook        | `useRequest()` or `useRequest(r => r.foo)` - full map or single request             |
| Tasks hook          | `useTasks()` - returns `store.queue.tasks` (reactive)                               |
| Mutation hook       | `useMutation(r => r.foo)` - status tracking (isPending, isError, error)             |
| Optimistic hook     | `useOptimistic(r => r.foo, s => s.bar)` - optimistic value + status                 |
| Settled state       | Core Queue tracks last result/error per key, cleared on next request                |
| Base hooks          | All take store as first arg: `useSelector(store, sel)`, etc                         |
| createStore hooks   | Returns all hooks including `useMutation` and `useOptimistic`                       |
| Slice hook return   | `{ state, request, isAvailable }` - state/request null when unavailable             |
| Skin exports        | `Provider`, `Skin`, `extendConfig`                                                  |
| Slice namespace     | `export * as media` → `media.playback`                                              |
| Video component     | Generic, exported from `@videojs/react` (not from skins)                            |
| Lit mixins          | `StoreMixin` (combined), `StoreProviderMixin`, `StoreAttachMixin`                   |
| Primitives context  | `useStoreContext()` internal hook for primitive UI components                       |
| displayName         | For React DevTools component naming                                                 |
| Component types     | Namespace pattern: `Skin.Props` via `namespace Skin { export type Props }`          |
| Element define      | `FrostedSkinElement.define(tagName, { mixins })` for declarative setup              |
| Config extension    | `extendConfig()` uses `uniqBy` + `composeCallbacks` from utils                      |
| Provider resolution | Isolated by default; `inherit` prop to use parent store from context                |
| Store instance      | `create()` method for imperative store creation                                     |
| Package structure   | `store/react` and `store/lit` (no `store/dom`)                                      |

---

## Phase 0: Core Utilities [DONE]

> Implemented in PR #283.

- `uniqBy` - `packages/utils/src/array/uniq-by.ts`
- `composeCallbacks` - `packages/utils/src/function/compose-callbacks.ts`
- `extendConfig` - `packages/store/src/core/extend-config.ts`

---

## Phase 0.5: Queue Task Refactor

Refactor Queue to use a unified `tasks` map with status discriminator. This enables `useMutation` and `useOptimistic` hooks to track request lifecycle.

**File:** `packages/store/src/core/queue.ts`

### Task Types (Discriminated Union)

```typescript
// Base fields shared by all task states
interface TaskBase<Key, Input> {
  id: symbol;
  name: string;
  key: Key;
  input: Input;
  startedAt: number;
  meta: RequestMeta | null;
}

// Pending - request in flight
interface PendingTask<Key, Input> extends TaskBase<Key, Input> {
  status: 'pending';
  abort: AbortController;
}

// Success - completed successfully
interface SuccessTask<Key, Input, Output> extends TaskBase<Key, Input> {
  status: 'success';
  settledAt: number;
  duration: number;
  output: Output;
}

// Error - failed or cancelled
interface ErrorTask<Key, Input> extends TaskBase<Key, Input> {
  status: 'error';
  settledAt: number;
  duration: number;
  error: unknown;
  cancelled: boolean; // true if aborted, false if actual error
}

// Union types
type Task<Key, Input, Output> = PendingTask<Key, Input> | SuccessTask<Key, Input, Output> | ErrorTask<Key, Input>;

type SettledTask<Key, Input, Output> = SuccessTask<Key, Input, Output> | ErrorTask<Key, Input>;
```

### Queue API

```typescript
export class Queue<Tasks extends TaskRecord> {
  // Single source of truth - one task per key (pending OR settled)
  get tasks(): Readonly<TasksRecord<Tasks>>;

  // Clear settled task for a key (no-op if pending)
  reset(key: keyof Tasks): void;

  // Subscribe to task changes
  subscribe(listener: (tasks: TasksRecord<Tasks>) => void): () => void;
}
```

### Lifecycle

1. `enqueue()` → task added with `status: 'pending'`
2. Task completes → same entry updated to `status: 'success'` or `status: 'error'`
3. New request for same key → replaces previous (pending aborted, settled cleared)
4. `reset(key)` → removes settled task

### Usage

```typescript
const task = queue.tasks.changeVolume;

// TypeScript narrows based on status
if (task?.status === 'pending') {
  task.abort; // available
}
if (task?.status === 'success') {
  task.output; // available
}
if (task?.status === 'error') {
  task.error; // available
  task.cancelled; // true if aborted
}
```

---

## Phase 1: React Bindings (`@videojs/store/react`)

### 1.1 Shared Context (Internal)

**File:** `packages/store/src/react/context.ts`

Internal shared context used by all Providers. Not exported publicly.

```typescript
import type { ReactNode } from 'react';
import type { AnyStore } from '../core';

import { createContext, useContext } from 'react';

// Internal shared context - all Providers write to this
const StoreContext = createContext<AnyStore | null>(null);

/**
 * Internal hook for primitive UI components.
 * Accesses the nearest store from context without type information.
 */
export function useStoreContext(): AnyStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStoreContext must be used within a Provider');
  }
  return store;
}

/**
 * Internal hook to get parent store (may be null).
 * Used by Provider to check for existing store in tree.
 */
export function useParentStore(): AnyStore | null {
  return useContext(StoreContext);
}

/**
 * Internal provider component.
 */
export function StoreContextProvider({ store, children }: { store: AnyStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
```

### 1.2 `createStore`

**File:** `packages/store/src/react/create-store.ts`

```typescript
import type { AnySlice, InferSliceTarget, StoreConfig } from '../core';
import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';

import { StoreContextProvider, useParentStore, useStoreContext } from './context';

export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<
  InferSliceTarget<Slices[number]>,
  Slices
> {
  displayName?: string;
}

export interface ProviderProps {
  children: ReactNode;
  /** Optional pre-created store. If provided, uses this store. */
  store?: Store<InferSliceTarget<Slices[number]>, Slices>;
  /** If true, inherits store from parent context instead of creating new. Defaults to false (isolated). */
  inherit?: boolean;
}

export interface CreateStoreResult<Slices extends AnySlice[]> {
  Provider: FC<ProviderProps>;
  useStore: () => Store<InferSliceTarget<Slices[number]>, Slices>;
  useSelector: <T>(selector: (state: UnionSliceState<Slices>) => T) => T;
  useRequest: {
    (): UnionSliceRequests<Slices>;
    <T>(selector: (requests: UnionSliceRequests<Slices>) => T): T;
  };
  useTasks: () => TasksRecord<UnionSliceTasks<Slices>>;
  useMutation: <K extends keyof UnionSliceRequests<Slices>>(
    selector: (requests: UnionSliceRequests<Slices>) => UnionSliceRequests<Slices>[K]
  ) => MutationResult<UnionSliceRequests<Slices>[K]>;
  useOptimistic: <K extends keyof UnionSliceRequests<Slices>, T>(
    requestSelector: (requests: UnionSliceRequests<Slices>) => UnionSliceRequests<Slices>[K],
    stateSelector: (state: UnionSliceState<Slices>) => T
  ) => OptimisticResult<T, UnionSliceRequests<Slices>[K]>;
  /** Creates a store instance for imperative access (e.g., attach before render, testing). */
  create: () => Store<InferSliceTarget<Slices[number]>, Slices>;
}

export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices>;
```

### 1.3 Types

**File:** `packages/store/src/react/types.ts`

```typescript
export type SliceResult<S extends AnySlice> =
  | { state: InferSliceState<S>; request: InferSliceRequests<S>; isAvailable: true }
  | { state: null; request: null; isAvailable: false };

export interface MutationResult<Request extends (...args: any[]) => any> {
  /** Trigger the request */
  mutate: Request;
  /** Request is currently in flight */
  isPending: boolean;
  /** Last request failed */
  isError: boolean;
  /** Last request succeeded */
  isSuccess: boolean;
  /** No request has been made yet */
  isIdle: boolean;
  /** Current status */
  status: 'idle' | 'pending' | 'success' | 'error';
  /** Error from last failed request */
  error: unknown;
  /** Clear settled state (error/success) */
  reset: () => void;
}

export interface OptimisticResult<Value, Request extends (...args: any[]) => any> extends MutationResult<Request> {
  /** Current value (optimistic if pending, otherwise confirmed) */
  value: Value;
  /** Trigger request with optimistic update */
  setValue: (value: Value) => void;
}
```

### 1.4 Base hooks

**File:** `packages/store/src/react/hooks.ts`

```typescript
// Base hooks - take store explicitly (for testing/advanced use)
// All hooks take store as first argument for consistency

export function useSelector<S extends AnyStore, T>(store: S, selector: (state: InferStoreState<S>) => T): T;

export function useRequest<S extends AnyStore>(store: S): InferStoreRequests<S>;
export function useRequest<S extends AnyStore, T>(store: S, selector: (requests: InferStoreRequests<S>) => T): T;

export function useTasks<S extends AnyStore>(store: S): TasksRecord<InferStoreTasks<S>>;

export function useMutation<S extends AnyStore, R extends (...args: any[]) => any>(
  store: S,
  selector: (requests: InferStoreRequests<S>) => R
): MutationResult<R>;

export function useOptimistic<S extends AnyStore, R extends (...args: any[]) => any, T>(
  store: S,
  requestSelector: (requests: InferStoreRequests<S>) => R,
  stateSelector: (state: InferStoreState<S>) => T
): OptimisticResult<T, R>;
```

### 1.5 Implementation Details

- `create()`: Returns `new Store(config)` - for creating store in `useState` or imperative use
- `Provider`: Resolution order:
  1. If `store` prop provided, uses that
  2. Else if `inherit={true}` and parent store exists in context, uses that
  3. Else, creates new store via `useState(() => new Store(config))`

  **Note:** `inherit` defaults to `false` (isolated). This ensures most players are standalone by default.
  Use `inherit` when intentionally sharing state (e.g., thumbnail preview inside main player).

  Uses `StoreContextProvider` internally. Cleanup: `useEffect` calls `store.destroy()` on unmount (only if Provider created the store).

  ```typescript
  function Provider({ children, store: providedStore, inherit = false }: ProviderProps) {
    const parentStore = useParentStore();
    const shouldInherit = inherit && parentStore != null;
    const [store] = useState(() => providedStore ?? (shouldInherit ? parentStore : new Store(config)));
    const isOwner = !providedStore && !shouldInherit; // Only destroy if we created it

    useEffect(() => {
      return () => {
        if (isOwner) store.destroy();
      };
    }, [store, isOwner]);

    return <StoreContextProvider store={store}>{children}</StoreContextProvider>;
  }
  ```

- `useStore()`: Returns typed store from `useStoreContext()`
- `useSelector(selector)`: Uses `useSyncExternalStore` with selector
- `useRequest()`: Returns stable `store.request` from context
- `useTasks()`: Subscribes to `store.queue`, returns `queue.tasks`
- `useSlice(slice)`: Returns `{ state, request, isAvailable }` with null narrowing

### 1.6 Exports

**File:** `packages/store/src/react/index.ts`

```typescript
// Internal hook for primitive UI components
export { useStoreContext } from './context';
export { createStore } from './create-store';
// Base hooks for testing/advanced use (all take store as first arg)
export { useMutation, useOptimistic, useTasks, useRequest, useSelector } from './hooks';

export type { CreateStoreConfig, CreateStoreResult, MutationResult, OptimisticResult, SliceResult } from './types';
```

---

## Phase 2: Lit Bindings (`@videojs/store/lit`)

All DOM/Lit bindings live together since they all depend on `@lit/context`.

### 2.0 @lit/context Research

Key findings from analyzing `@lit/context@1.1.6`:

**Dynamic Value Updates:**

- `ContextProvider.setValue(newValue, force?)` notifies all subscribed consumers
- Uses `Object.is()` for equality - swapping store objects triggers updates automatically
- `force = true` needed only for in-place mutations (same reference)

**Subscription Model:**

- Consumers must opt-in: `subscribe: true` in `@consume()` or `ContextConsumer`
- Without subscription, consumers only receive initial value
- Provider stores callbacks in `Map<ContextCallback, CallbackInfo>`
- `updateObservers()` iterates all callbacks on value change

**Store Swapping Pattern (validated):**

```typescript
class MySkin extends HTMLElement {
  #provider = new ContextProvider(this, { context: storeContext });

  set store(newStore: Store) {
    this.#provider.setValue(newStore); // Notifies all subscribers
  }
}
```

### 2.1 `createStore`

**File:** `packages/store/src/lit/create-store.ts`

```typescript
import type { AnySlice, InferSliceTarget, StoreConfig } from '../core';
import type { Context } from '@lit/context';
import type { ReactiveControllerHost } from '@lit/reactive-element';

import { createContext } from '@lit/context';

export interface CreateStoreConfig<Slices extends AnySlice[]> extends StoreConfig<
  InferSliceTarget<Slices[number]>,
  Slices
> {}

export interface CreateStoreResult<Slices extends AnySlice[]> {
  /** Combined mixin: provides store via context AND auto-attaches slotted media */
  StoreMixin: <T extends Constructor<HTMLElement>>(Base: T) => T;
  /** Mixin that provides store via context (no auto-attach) */
  StoreProviderMixin: <T extends Constructor<HTMLElement>>(Base: T) => T;
  /** Mixin that auto-attaches slotted media elements (requires store from context) */
  StoreAttachMixin: <T extends Constructor<HTMLElement>>(Base: T) => T;
  /** Context for consuming store in controllers */
  context: Context<Store<InferSliceTarget<Slices[number]>, Slices>>;
  /** Creates a store instance for imperative access */
  create: () => Store<InferSliceTarget<Slices[number]>, Slices>;
}

export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices>;
```

**Implementation details:**

- Uses `@lit/context` for W3C Context Protocol
- Context key auto-generated per `createStore()` call (unique Symbol)
- `StoreMixin`: Combined mixin, equivalent to `StoreAttachMixin(StoreProviderMixin(Base))`
- `StoreProviderMixin`: Mixin that:
  - Creates store instance
  - Uses `ContextProvider` internally
  - Exposes `store` setter that calls `provider.setValue(newStore)`
- `StoreAttachMixin`: Mixin that:
  - Consumes store from context
  - Observes slotted elements for `<video>` or `<audio>`
  - Calls `store.attach(mediaElement)` when found
  - Cleans up on disconnect
- `create()`: Returns `new Store(config)` for imperative use

### 2.2 Controllers

**File:** `packages/store/src/lit/controllers.ts`

Controllers mirror React hooks for consistency. All take `(host, store, ...)` pattern.

```typescript
import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

// SelectorController - like useSelector(store, selector)
export class SelectorController<S extends AnyStore, T> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S, selector: (state: InferStoreState<S>) => T);
  get value(): T;
}

// RequestController - like useRequest(store) or useRequest(store, selector)
export class RequestController<S extends AnyStore> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S);
  get value(): InferStoreRequests<S>;
}

export class RequestController<S extends AnyStore, T> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S, selector: (requests: InferStoreRequests<S>) => T);
  get value(): T;
}

// TasksController - like useTasks(store)
export class TasksController<S extends AnyStore> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S);
  get value(): TasksRecord<InferStoreTasks<S>>;
}

// MutationController - like useMutation(store, selector)
export class MutationController<S extends AnyStore, R extends (...args: any[]) => any> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S, selector: (requests: InferStoreRequests<S>) => R);
  get value(): MutationResult<R>;
}

// OptimisticController - like useOptimistic(store, requestSelector, stateSelector)
export class OptimisticController<
  S extends AnyStore,
  R extends (...args: any[]) => any,
  T,
> implements ReactiveController {
  constructor(
    host: ReactiveControllerHost,
    store: S,
    requestSelector: (requests: InferStoreRequests<S>) => R,
    stateSelector: (state: InferStoreState<S>) => T
  );
  get value(): OptimisticResult<T, R>;
}
```

**Implementation details:**

- Controllers take store explicitly (base pattern, like React base hooks)
- Subscribe to store/queue changes, call `host.requestUpdate()` on change
- Cleanup on `hostDisconnected`

### 2.3 Exports

**File:** `packages/store/src/lit/index.ts`

```typescript
export {
  MutationController,
  OptimisticController,
  TasksController,
  RequestController,
  SelectorController,
} from './controllers';
export { createStore } from './create-store';

export type { CreateStoreConfig, CreateStoreResult, MutationResult, OptimisticResult } from './types';
```

**Note:** Mixins (`StoreMixin`, `StoreProviderMixin`, `StoreAttachMixin`) are accessed via the `createStore()` return object, not exported directly. This ensures each store has its own typed mixins.

---

## Phase 3: Playback Slice (`@videojs/core/dom`)

Based on [Issue #239](https://github.com/videojs/v10/issues/239).

### 3.1 Playback slice

**File:** `packages/core/src/dom/slices/playback.ts`

State and requests are inferred from slice definition using `InferSliceState` and `InferSliceRequests`.

For reference, the expected shape:

**PlaybackState (inferred via `InferSliceState<typeof playback>`):**

- `paused: boolean`
- `ended: boolean`
- `started: boolean`
- `waiting: boolean`
- `currentTime: number`
- `duration: number`
- `buffered: Array<[number, number]>`
- `seekable: Array<[number, number]>`
- `volume: number`
- `muted: boolean`
- `canPlay: boolean`
- `source: unknown`
- `streamType: 'on-demand' | 'live' | 'live-dvr' | 'unknown'`

**PlaybackRequests (inferred via `InferSliceRequests<typeof playback>`):**

- `play: () => Promise<void>`
- `pause: () => Promise<void>`
- `seek: (time: number) => Promise<void>`
- `changeVolume: (volume: number) => Promise<void>`
- `toggleMute: () => Promise<void>`
- `changeSource: (src: string) => Promise<string>` (returns new src)

```typescript
import type { InferSliceRequests, InferSliceState } from '@videojs/store';

import { createSlice } from '@videojs/store';

export const playback = createSlice<HTMLMediaElement>()({
  initialState: {
    paused: true,
    ended: false,
    started: false,
    waiting: false,
    currentTime: 0,
    duration: 0,
    buffered: [] as Array<[number, number]>,
    seekable: [] as Array<[number, number]>,
    volume: 1,
    muted: false,
    canPlay: false,
    source: null as unknown,
    streamType: 'unknown' as 'on-demand' | 'live' | 'live-dvr' | 'unknown',
  },
  getSnapshot: ({ target }) => ({
    paused: target.paused,
    ended: target.ended,
    // ... etc
  }),
  subscribe: ({ target, update, signal }) => {
    // Listen to media events and call update()
  },
  request: {
    play: {
      handler: async (_input: void, { target }) => {
        await target.play();
      },
    },
    pause: {
      handler: (_input: void, { target }) => {
        target.pause();
      },
    },
    seek: {
      handler: (time: number, { target }) => {
        target.currentTime = time;
        return time;
      },
    },
    changeVolume: {
      handler: (volume: number, { target }) => {
        target.volume = volume;
        return volume;
      },
    },
    toggleMute: {
      handler: (_input: void, { target }) => {
        target.muted = !target.muted;
        return target.muted;
      },
    },
    changeSource: {
      handler: (src: string, { target }) => {
        target.src = src;
        return src;
      },
    },
  },
});

// Types are inferred from slice - use these utilities
export type PlaybackState = InferSliceState<typeof playback>;
export type PlaybackRequests = InferSliceRequests<typeof playback>;
```

### 3.2 Namespace export

**File:** `packages/core/src/dom/slices/index.parts.ts`

```typescript
// Parts file for namespace re-export
export { playback } from './playback';
```

**File:** `packages/core/src/dom/slices/index.ts`

```typescript
// Namespace export (from parts to avoid circular reference)
export * as media from './index.parts';

// Standalone exports
export { playback } from './playback';
```

Usage:

```typescript
import { media, playback } from '@videojs/core/dom';

media.playback; // via namespace
playback; // standalone export
```

### 3.3 Utilities

**File:** `packages/core/src/dom/slices/utils.ts`

```typescript
export function serializeTimeRanges(ranges: TimeRanges): Array<[number, number]>;
```

### 3.4 Type guards

**File:** `packages/core/src/dom/guards.ts`

```typescript
export function isHTMLVideo(target: unknown): target is HTMLVideoElement;
export function isHTMLAudio(target: unknown): target is HTMLAudioElement;
export function isHTMLMedia(target: unknown): target is HTMLMediaElement;
```

---

## Phase 4: React Package Setup (`@videojs/react`)

### 4.1 Video component

**File:** `packages/react/src/media/video.tsx`

```typescript
import type { VideoHTMLAttributes, RefCallback } from 'react';
import { useCallback } from 'react';
import { useStore } from '../store';
import { useComposedRefs } from '../utils/use-composed-refs';

export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  ref?: RefCallback<HTMLVideoElement> | React.RefObject<HTMLVideoElement>;
}

/**
 * Video element that automatically attaches to the store.
 * Uses React 19 ref cleanup pattern.
 */
export function Video({ children, ref, ...props }: VideoProps): JSX.Element {
  const store = useStore();

  const attachRef: RefCallback<HTMLVideoElement> = useCallback((el) => {
    if (el) {
      const detach = store.attach(el);
      // React 19: return cleanup function
      return detach;
    }
  }, [store]);

  const composedRef = useComposedRefs(ref, attachRef);

  return (
    <video ref={composedRef} {...props}>
      {children}
    </video>
  );
}
```

### 4.2 Package exports

**File:** `packages/react/src/index.ts`

```typescript
// Media elements
export { Video } from './media/video';
export type { VideoProps } from './media/video';

// Re-export slices for convenience (users import from @videojs/react, not @videojs/core/dom)
export { media } from '@videojs/core/dom';
// Re-export for extension
export { createStore } from '@videojs/store/react';
```

---

## Phase 5: Frosted Skin (React)

### 5.1 Store config

**File:** `packages/react/src/skins/frosted/store.ts`

```typescript
import type { AnySlice, StoreConfig } from '@videojs/store';

import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/react';

import { media } from './slices'; // internal - re-exported from @videojs/react

/** Base config for frosted skin. */
const baseConfig = {
  slices: [media.playback] as const,
  displayName: 'FrostedSkin',
};

/**
 * Extends frosted skin config with additional slices/hooks.
 * Composes lifecycle hooks (both called, base first).
 */
export function extendConfig<S extends readonly AnySlice[] = readonly []>(extension?: Partial<StoreConfig<any, S>>) {
  return extendBaseConfig(baseConfig, extension);
}

export const { Provider, create } = createStore(extendConfig());
```

### 5.2 Skin component

**File:** `packages/react/src/skins/frosted/skin.tsx`

```typescript
import type { PropsWithChildren } from 'react';

export type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export function Skin({ children, className }: SkinProps): JSX.Element {
  return (
    <div className={`vjs-frosted-skin ${className ?? ''}`}>
      {children}
      {/* Controls rendered here */}
    </div>
  );
}

/**
 * Namespace pattern for component types.
 * Allows: `Skin.Props` instead of importing `SkinProps` separately.
 */
export namespace Skin {
  export type Props = SkinProps;
}
```

### 5.3 Exports

**File:** `packages/react/src/skins/frosted/index.ts`

```typescript
export { Skin } from './skin';
export type { SkinProps } from './skin';
export { extendConfig, Provider } from './store';
```

---

## Phase 6: Frosted Skin (HTML)

### 6.1 Store config

**File:** `packages/html/src/skins/frosted/store.ts`

```typescript
import type { AnySlice, StoreConfig } from '@videojs/store';

import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/lit';

import { media } from './slices'; // internal - re-exported from @videojs/html

/** Base config for frosted skin. */
const baseConfig = {
  slices: [media.playback] as const,
};

/**
 * Extends frosted skin config with additional slices/hooks.
 * Composes lifecycle hooks (both called, base first).
 */
export function extendConfig<S extends readonly AnySlice[] = readonly []>(extension?: Partial<StoreConfig<any, S>>) {
  return extendBaseConfig(baseConfig, extension);
}

export const { StoreMixin, StoreProviderMixin, StoreAttachMixin, context } = createStore(extendConfig());
```

### 6.2 Skin component

**File:** `packages/html/src/skins/frosted/skin.ts`

```typescript
import { StoreAttachMixin, StoreMixin, StoreProviderMixin } from './store';

type Mixin = <T extends Constructor<HTMLElement>>(Base: T) => T;

export interface DefineOptions {
  /** Mixins to apply. Defaults to [StoreMixin] (combined provider + attach). */
  mixins?: Mixin[];
}

/**
 * Frosted skin element. Empty for now - controls will be added later.
 * Uses shadow DOM with slot for video element.
 */
export class FrostedSkinElement extends HTMLElement {
  /** Default tag name for this element. */
  static tagName = 'vjs-frosted-skin';

  /**
   * Define this element with the custom elements registry.
   *
   * @example
   * // Default: combined provider + attach
   * FrostedSkinElement.define('vjs-frosted-skin');
   *
   * @example
   * // Granular mixin control (e.g., attach only, inherit provider from parent)
   * FrostedSkinElement.define('vjs-thumbnail', { mixins: [StoreAttachMixin] });
   *
   * @example
   * // Custom store with extended slices
   * const { StoreMixin } = createStore(extendConfig({ slices: [chaptersSlice] }));
   * FrostedSkinElement.define('my-extended-player', { mixins: [StoreMixin] });
   */
  static define(tagName: string, options: DefineOptions = {}) {
    const { mixins = [StoreMixin] } = options;

    // Apply mixins in order (right to left composition)
    const Mixed = mixins.reduceRight((Base, mixin) => mixin(Base), this as typeof FrostedSkinElement);
    customElements.define(tagName, Mixed);
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<slot></slot>`;
  }
}
```

### 6.3 Define export

**File:** `packages/html/src/define/vjs-frosted-skin.ts`

```typescript
import { FrostedSkinElement } from '../skins/frosted/skin';

FrostedSkinElement.define('vjs-frosted-skin');
```

### 6.4 Exports

**File:** `packages/html/src/skins/frosted/index.ts`

```typescript
export { FrostedSkinElement } from './skin';
export type { DefineOptions } from './skin';
export { context, extendConfig, StoreAttachMixin, StoreMixin, StoreProviderMixin } from './store';
```

---

## Usage Examples

### React: Custom UI

```tsx
import { createStore, media, Video } from '@videojs/react';

// Note: media is re-exported from @videojs/react (not @videojs/core/dom)

const { Provider, useSelector, useRequest, useMutation, useOptimistic } = createStore({
  slices: [media.playback],
});

function App() {
  return (
    <Provider>
      <Video src="video.mp4" />
      <MyCustomControls />
    </Provider>
  );
}

function MyCustomControls() {
  const currentTime = useSelector((s) => s.currentTime);
  const seek = useRequest((r) => r.seek);
  return <button onClick={() => seek(0)}>Restart ({currentTime}s)</button>;
}

// With mutation status tracking
function PlayButton() {
  const paused = useSelector((s) => s.paused);
  const { mutate: play, isPending } = useMutation((r) => r.play);
  const { mutate: pause } = useMutation((r) => r.pause);

  return (
    <button onClick={() => (paused ? play() : pause())} disabled={isPending}>
      {paused ? 'Play' : 'Pause'}
    </button>
  );
}

// With optimistic updates
function VolumeSlider() {
  const { value, setValue, isPending, isError } = useOptimistic(
    (r) => r.changeVolume,
    (s) => s.volume
  );

  return (
    <>
      <input
        type="range"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ opacity: isPending ? 0.5 : 1 }}
      />
      {isError && <span>Failed to change volume</span>}
    </>
  );
}
```

### React: Pre-created store instance (imperative access)

```tsx
import { useState } from 'react';

import { createStore, media, Video } from '@videojs/react';

const { Provider, create, useSelector } = createStore({
  slices: [media.playback],
});

function App() {
  // Create store instance in useState for stable reference
  const [store] = useState(() => create());

  return (
    <Provider store={store}>
      <Video src="video.mp4" />
      <MyControls />
    </Provider>
  );
}
```

### React: Frosted skin

```tsx
import { Video } from '@videojs/react';
import { Provider, Skin } from '@videojs/react/skins/frosted';

function App() {
  return (
    <Provider>
      <Skin>
        <Video src="video.mp4" />
      </Skin>
    </Provider>
  );
}
```

### React: Extending frosted with custom slices

```tsx
import { createStore, Video } from '@videojs/react';
import { extendConfig, Skin } from '@videojs/react/skins/frosted';

import { chaptersSlice } from './slices/chapters';

// Extend frosted config with custom slice (merges with base slices)
const { Provider, useSlice } = createStore(
  extendConfig({ slices: [chaptersSlice] })
);

function App() {
  return (
    <Provider>
      <Skin>
        <Video src="video.mp4" />
      </Skin>
      <ChaptersPanel />
    </Provider>
  );
}

function ChaptersPanel() {
  const chapters = useSlice(chaptersSlice);
  if (!chapters.isAvailable) return null;
  return <div>{chapters.state.markers.map(...)}</div>;
}
```

### HTML: Frosted skin (CDN)

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@videojs/html/define/vjs-frosted-skin.js';
</script>

<vjs-frosted-skin>
  <video src="video.mp4"></video>
</vjs-frosted-skin>
```

### HTML: Custom provider element

```html
<script type="module" src="./my-player.js"></script>

<my-player>
  <video src="video.mp4"></video>
  <!-- custom controls here -->
</my-player>
```

Where `my-player.js` contains:

```typescript
import { createStore, media } from '@videojs/html';

const { StoreMixin } = createStore({
  slices: [media.playback],
});

// Create custom element with store provider and auto-attach
class MyPlayer extends StoreMixin(HTMLElement) {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<slot></slot>`;
  }
}

customElements.define('my-player', MyPlayer);
```

### HTML: Extending frosted with custom slices

```html
<script type="module" src="./my-extended-skin.js"></script>

<my-extended-skin>
  <video src="video.mp4"></video>
</my-extended-skin>
```

Where `my-extended-skin.js` contains:

```typescript
import { extendConfig, FrostedSkinElement } from '@videojs/html/skins/frosted';
import { createStore } from '@videojs/store/lit';

import { chaptersSlice } from './slices/chapters.js';

// Extend frosted config with custom slice (merges with base slices)
const { StoreMixin } = createStore(extendConfig({ slices: [chaptersSlice] }));

FrostedSkinElement.define('my-extended-skin', { mixins: [StoreMixin] });
```

---

## File Structure

```
packages/utils/src/
├── array/
│   ├── uniq-by.ts              # DONE
│   ├── tests/
│   │   └── uniq-by.test.ts     # DONE
│   └── index.ts                # DONE
└── function/
    ├── compose-callbacks.ts    # DONE
    ├── tests/
    │   └── compose-callbacks.test.ts  # DONE
    └── index.ts                # DONE

packages/store/src/
├── core/
│   ├── store.ts                # existing
│   ├── slice.ts                # existing
│   ├── queue.ts                # existing
│   ├── extend-config.ts        # DONE
│   ├── tests/
│   │   └── extend-config.test.ts # DONE
│   └── index.ts                # DONE
├── react/
│   ├── context.ts              # NEW (internal shared context)
│   ├── create-store.ts         # NEW
│   ├── hooks.ts                # NEW (base hooks)
│   ├── types.ts                # NEW
│   └── index.ts
└── lit/
    ├── create-store.ts         # NEW (StoreMixin, StoreProviderMixin, StoreAttachMixin, context)
    ├── controllers.ts          # NEW (SelectorController, RequestController, etc.)
    ├── types.ts                # NEW
    └── index.ts

packages/core/src/dom/
├── slices/
│   ├── playback.ts             # NEW
│   ├── utils.ts                # NEW
│   └── index.ts                # NEW (+ media namespace)
├── guards.ts                   # NEW
└── index.ts

packages/react/src/
├── media/
│   └── video.tsx               # NEW
├── skins/
│   ├── frosted/
│   │   ├── store.ts            # NEW
│   │   ├── skin.tsx            # NEW
│   │   └── index.ts            # NEW
│   └── minimal/
│       └── ...
└── index.ts

packages/html/src/
├── define/
│   └── vjs-frosted-skin.ts     # NEW
├── skins/
│   ├── frosted/
│   │   ├── store.ts            # NEW
│   │   ├── skin.ts             # NEW
│   │   ├── styles.css          # NEW
│   │   └── index.ts            # NEW
│   └── minimal/
│       └── ...
└── index.ts
```

---

## Implementation Order

1. **Phase 0**: Core utilities **[DONE - PR #283]**
   - `uniqBy`, `composeCallbacks` utilities ✓
   - `extendConfig` ✓

2. **Phase 0.5**: Queue Task Refactor
   - Unified `tasks` map with status discriminator
   - `PendingTask`, `SuccessTask`, `ErrorTask` types
   - `reset(key)` method
   - Update existing tests

3. **Phase 1**: React Bindings (basic)
   - Shared context, `useStoreContext`
   - `createStore()` with `inherit` prop
   - `useStore`, `useSelector`, `useRequest`, `useTasks`
   - `Video` component, package exports

4. **Phase 2**: Lit Bindings (basic)
   - `createStore()` with mixins
   - `SelectorController`, `RequestController`, `TasksController`
   - `@lit/context` integration

5. **Phase 3**: Mutation Hooks/Controllers
   - React: `useMutation(store, selector)`
   - Lit: `MutationController(host, store, selector)`

6. **Phase 4**: Optimistic Hooks/Controllers
   - React: `useOptimistic(store, reqSel, stateSel)`
   - Lit: `OptimisticController(host, store, reqSel, stateSel)`

7. **Phase 5**: Playback Slice
   - `media.playback` slice in `@videojs/core/dom`

8. **Phase 6**: Skins
   - React skin (Provider, Skin, extendConfig)
   - HTML skin (FrostedSkinElement, extendConfig)

Each phase includes tests.

---

## Package Configuration

### tsdown.config.ts Updates

Each package with new subpaths needs tsdown entry points:

**`packages/html/tsdown.config.ts`:**

```typescript
import { readdirSync } from 'node:fs';

// Dynamically gather define/ entries
const defineEntries = readdirSync('src/define')
  .filter((f) => f.endsWith('.ts'))
  .reduce(
    (acc, f) => {
      const name = f.replace('.ts', '');
      acc[`define/${name}`] = `src/define/${f}`;
      return acc;
    },
    {} as Record<string, string>
  );

export default {
  entry: {
    index: 'src/index.ts',
    'skins/frosted': 'src/skins/frosted/index.ts',
    ...defineEntries,
  },
};
```

**`packages/react/tsdown.config.ts`:**

```typescript
export default {
  entry: {
    index: 'src/index.ts',
    'skins/frosted': 'src/skins/frosted/index.ts',
  },
};
```

**`packages/store/tsdown.config.ts`:**

```typescript
export default {
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    lit: 'src/lit/index.ts',
  },
};
```

### package.json Exports Updates

Use `types` + `default` format to match existing packages.

**`packages/html/package.json`:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./define/*": {
      "default": "./dist/define/*.js"
    },
    "./skins/frosted": {
      "types": "./dist/skins/frosted.d.ts",
      "default": "./dist/skins/frosted.js"
    }
  }
}
```

**`packages/react/package.json`:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./skins/frosted": {
      "types": "./dist/skins/frosted.d.ts",
      "default": "./dist/skins/frosted.js"
    }
  }
}
```

**`packages/store/package.json`:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "default": "./dist/react.js"
    },
    "./lit": {
      "types": "./dist/lit.d.ts",
      "default": "./dist/lit.js"
    }
  }
}
```

---

## PR Coordination

### Related Issues

| Issue | Title               | Description                             |
| ----- | ------------------- | --------------------------------------- |
| #218  | Store               | Parent tracking issue                   |
| #285  | Queue Task Refactor | Unified tasks map, status discriminator |
| #228  | Optimistic Updates  | useMutation, useOptimistic              |
| #229  | React Bindings      | createStore, hooks, context             |
| #230  | Lit Bindings        | Controllers, mixins, context            |
| #239  | Playback Slice      | media.playback slice                    |
| #231  | Skin Stores         | Skin store configuration                |

### PR Strategy

```
PR #283: Core Utilities [DONE]
├── uniqBy, composeCallbacks (utils) ✓
├── extendConfig (store/core) ✓
└── Tests ✓

PR A: Queue Task Refactor
├── Unified Task type with status discriminator
├── PendingTask, SuccessTask, ErrorTask
├── Single `tasks` map, `reset(key)` method
├── Update tests
└── Closes #285

PR B: React Bindings (basic)
├── createStore, Provider, useStore
├── useSelector, useRequest, useTasks
├── Video component
├── References #218
└── Closes #229

PR C: Lit Bindings (basic)
├── createStore with mixins
├── SelectorController, RequestController, TasksController
├── References #218
└── Closes #230

PR D: Mutation Hooks/Controllers
├── React: useMutation
├── Lit: MutationController
└── References #228

PR E: Optimistic Hooks/Controllers
├── React: useOptimistic
├── Lit: OptimisticController
└── Closes #228

PR F: Playback Slice
├── media.playback (core/dom/slices)
├── Utils, type guards
├── References #218
└── Closes #239

PR G: Skins
├── React skin (Provider, Skin, extendConfig)
├── HTML skin (FrostedSkinElement, extendConfig)
├── References #218
└── Closes #231
```

### Dependency Graph

```
PR #283 ───> PR A ───> PR B ───> PR D ───> PR E ───> PR G
                  └──> PR C ──────────────────────────┘
                  └──> PR F ──────────────────────────┘
```

PRs are sequential. PR B, C, F can technically parallel after PR A, but we'll do them sequentially for easier review.

---

## Deferred

- Testing utilities (`@videojs/store/testing`) - separate plan
- Minimal skin implementation
