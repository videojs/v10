# Store React/DOM Bindings

## Goal

Implement React and DOM bindings for Video.js 10's store, enabling:

- Simple `createStore()` API that returns Provider + hooks/controllers
- Skins define their own store configs and export Provider + Skin + hooks
- Consumers can extend skin configs with additional slices
- Base hooks/controllers for testing and advanced use cases

## Key Decisions

| Decision               | Resolution                                                                 |
| ---------------------- | -------------------------------------------------------------------------- |
| Store creation         | `createStore({ slices, displayName? })` - types inferred from slices       |
| Hook naming            | `useStore`, `useSelector`, `useRequest`, `usePending`, `useSlice`          |
| Controller naming      | `StoreController`, `SelectorController`, `RequestController`, etc          |
| Selector hook          | `useSelector(selector)` - requires selector (Redux-style)                  |
| Store hook             | `useStore()` - returns store instance                                      |
| Pending hook           | `usePending()` - returns `store.queue.pending` (reactive)                  |
| Slice hook return      | `{ state, request, isAvailable }` - state/request null when unavailable    |
| Skin exports           | `Provider`, `Skin`, `defineStoreConfig`                                    |
| Slice namespace        | `export * as media` → `media.playback`                                     |
| Video component        | Generic, exported from `@videojs/react` (not from skins)                   |
| DOM mixins             | `withStore` (combined), `withStoreProvider`, `withStoreAttach`             |
| Base hooks/controllers | Take store explicitly, for testing/advanced use                            |
| Primitives context     | `useStoreContext()` internal hook for primitive UI components              |
| displayName            | For React DevTools component naming                                        |
| Component types        | Namespace pattern: `Skin.Props` via `namespace Skin { export type Props }` |
| Element tagName        | Static `tagName` property, used by `define()` method                       |
| Config merging         | `mergeStoreConfig()` uses `uniqBy` + `composeCallbacks` from utils         |
| Provider resolution    | `providedStore ?? parentStore ?? new Store(config)`                        |
| Store instance         | `create()` method for imperative store creation                            |
| Package structure      | `store/react` and `store/lit` (no `store/dom`)                             |

---

## Phase 0: Core Utilities

### 0.1 Utility Functions (`@videojs/utils`)

**File:** `packages/utils/src/array/uniq-by.ts`

```typescript
/**
 * Returns array with duplicates removed, keeping the LAST occurrence.
 * Useful for slice merging where extensions should override base slices.
 */
export function uniqBy<T, K>(arr: T[], mapper: (item: T) => K): T[] {
  const seen = new Map<K, number>();
  arr.forEach((item, i) => seen.set(mapper(item), i));
  return arr.filter((_, i) => [...seen.values()].includes(i));
}
```

**File:** `packages/utils/src/array/index.ts`

```typescript
export { uniqBy } from './uniq-by';
```

**File:** `packages/utils/src/function/compose-callbacks.ts`

```typescript
/**
 * Composes multiple callbacks into one. All callbacks receive same args, no return value.
 * Returns undefined if no callbacks provided.
 */
export function composeCallbacks<T extends (...args: any[]) => void>(...fns: (T | undefined | null)[]): T | undefined {
  const defined = fns.filter((fn): fn is T => fn != null);
  if (defined.length === 0) return undefined;
  if (defined.length === 1) return defined[0];
  return ((...args: Parameters<T>) => {
    defined.forEach((fn) => fn(...args));
  }) as T;
}
```

**File:** `packages/utils/src/function/index.ts`

```typescript
export { composeCallbacks } from './compose-callbacks';
```

### 0.2 `mergeStoreConfig` (`@videojs/store`)

**File:** `packages/store/src/core/merge-config.ts`

Utility to merge store configs, properly composing lifecycle hooks.

```typescript
import type { AnySlice, StoreConfig } from './store';

import { uniqBy } from '@videojs/utils/array';
import { composeCallbacks } from '@videojs/utils/function';

/**
 * Merges two store configs, composing lifecycle hooks.
 * - slices: deduplicated by id (extension wins), preserves order
 * - onSetup/onAttach/onError: both called (base first, then extension)
 * - queue/state: extension overrides base if provided
 */
export function mergeStoreConfig<BaseSlices extends AnySlice[], ExtSlices extends AnySlice[]>(
  base: StoreConfig<any, BaseSlices>,
  extension?: Partial<StoreConfig<any, ExtSlices>>
): StoreConfig<any, [...BaseSlices, ...ExtSlices]> {
  if (!extension) return base as any;

  return {
    // Dedupe slices by id, keeping last occurrence (extension wins)
    slices: uniqBy([...base.slices, ...(extension.slices ?? [])], (s) => s.id) as [...BaseSlices, ...ExtSlices],

    // Extension overrides if provided
    queue: extension.queue ?? base.queue,
    state: extension.state ?? base.state,

    // Compose lifecycle hooks (both called, base first)
    onSetup: composeCallbacks(base.onSetup, extension.onSetup),
    onAttach: composeCallbacks(base.onAttach, extension.onAttach),
    onError: composeCallbacks(base.onError, extension.onError),
  };
}
```

### 0.3 Core Exports

**File:** `packages/store/src/core/index.ts`

```typescript
// ... existing exports
export { mergeStoreConfig } from './merge-config';
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
  /** Optional pre-created store. If not provided, Provider uses parent or creates new. */
  store?: Store<InferSliceTarget<Slices[number]>, Slices>;
}

export interface CreateStoreResult<Slices extends AnySlice[]> {
  Provider: FC<ProviderProps>;
  useStore: () => Store<InferSliceTarget<Slices[number]>, Slices>;
  useSelector: <T>(selector: (state: UnionSliceState<Slices>) => T) => T;
  useRequest: () => UnionSliceRequests<Slices>;
  usePending: () => PendingRecord<UnionSliceTasks<Slices>>;
  useSlice: <S extends Slices[number]>(slice: S) => SliceResult<S>;
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
```

### 1.4 Base hooks

**File:** `packages/store/src/react/hooks.ts`

```typescript
// Base hooks - take store explicitly (for testing/advanced use)
export function useSelector<S extends AnyStore, T>(store: S, selector: (state: InferStoreState<S>) => T): T;

export function useRequest<S extends AnyStore>(store: S): InferStoreRequests<S>;

export function usePending<S extends AnyStore>(store: S): PendingRecord<InferStoreTasks<S>>;

export function useSlice<S extends AnyStore, Slice extends AnySlice>(store: S, slice: Slice): SliceResult<Slice>;
```

### 1.5 Implementation Details

- `create()`: Returns `new Store(config)` - for creating store in `useState` or imperative use
- `Provider`: Resolution order:
  1. If `store` prop provided, uses that
  2. Else if parent store exists in context, uses that
  3. Else, creates new store via `useState(() => new Store(config))`

  Uses `StoreContextProvider` internally. Cleanup: `useEffect` calls `store.destroy()` on unmount (only if Provider created the store).

  ```typescript
  function Provider({ children, store: providedStore }: ProviderProps) {
    const parentStore = useParentStore();
    const [store, setStore] = useState(() => providedStore ?? parentStore ?? new Store(config));
    const isOwner = !providedStore && !parentStore; // Only destroy if we created it

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
- `usePending()`: Subscribes to `store.queue`, returns `queue.pending`
- `useSlice(slice)`: Returns `{ state, request, isAvailable }` with null narrowing

### 1.6 Exports

**File:** `packages/store/src/react/index.ts`

```typescript
export { createStore } from './create-store';
// Base hooks for testing/advanced use
export { usePending, useRequest, useSelector, useSlice } from './hooks';
// Internal hook for primitive UI components
export { useStoreContext } from './context';

export type { CreateStoreConfig, CreateStoreResult, SliceResult } from './types';
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
  withStore: <T extends Constructor<HTMLElement>>(Base: T) => T;
  /** Mixin that provides store via context (no auto-attach) */
  withStoreProvider: <T extends Constructor<HTMLElement>>(Base: T) => T;
  /** Mixin that auto-attaches slotted media elements (requires store from context) */
  withStoreAttach: <T extends Constructor<HTMLElement>>(Base: T) => T;
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
- `withStore`: Combined mixin, equivalent to `withStoreAttach(withStoreProvider(Base))`
- `withStoreProvider`: Mixin that:
  - Creates store instance
  - Uses `ContextProvider` internally
  - Exposes `store` setter that calls `provider.setValue(newStore)`
- `withStoreAttach`: Mixin that:
  - Consumes store from context
  - Observes slotted elements for `<video>` or `<audio>`
  - Calls `store.attach(mediaElement)` when found
  - Cleans up on disconnect
- `create()`: Returns `new Store(config)` for imperative use

### 2.2 Controllers

**File:** `packages/store/src/lit/controllers.ts`

```typescript
import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

// Base controllers - take store explicitly (for testing/advanced use)
export class SelectorController<S extends AnyStore, T> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S, selector: (state: InferStoreState<S>) => T);
  get value(): T;
}

export class RequestController<S extends AnyStore> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S);
  get value(): InferStoreRequests<S>;
}

export class PendingController<S extends AnyStore> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S);
  get value(): PendingRecord<InferStoreTasks<S>>;
}

export class SliceController<S extends AnyStore, Slice extends AnySlice> implements ReactiveController {
  constructor(host: ReactiveControllerHost, store: S, slice: Slice);
  get state(): InferSliceState<Slice> | null;
  get request(): InferSliceRequests<Slice> | null;
  get isAvailable(): this is this & { state: InferSliceState<Slice>; request: InferSliceRequests<Slice> };
}
```

**Implementation details:**

- Controllers consume store via `ContextConsumer` with `subscribe: true`
- Subscribe to store changes, call `host.requestUpdate()` on change
- Cleanup on `hostDisconnected` (automatic via ContextConsumer)

### 2.3 Exports

**File:** `packages/store/src/lit/index.ts`

```typescript
export { createStore } from './create-store';
export { PendingController, RequestController, SelectorController, SliceController } from './controllers';

export type { CreateStoreConfig, CreateStoreResult } from './types';
```

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

import { media } from '@videojs/core/dom';
import { mergeStoreConfig } from '@videojs/store';
import { createStore } from '@videojs/store/react';

/** Base config for frosted skin. */
const baseConfig = {
  slices: [media.playback] as const,
  displayName: 'FrostedSkin',
};

/**
 * Defines store config for frosted skin.
 * Merges base config with extension, properly composing lifecycle hooks.
 */
export function defineStoreConfig<S extends readonly AnySlice[] = readonly []>(
  extension?: Partial<StoreConfig<any, S>>
) {
  return mergeStoreConfig(baseConfig, extension);
}

export const { Provider, create } = createStore(defineStoreConfig());
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
export { defineStoreConfig, Provider } from './store';
```

---

## Phase 6: Frosted Skin (HTML)

### 6.1 Store config

**File:** `packages/html/src/skins/frosted/store.ts`

```typescript
import type { AnySlice, StoreConfig } from '@videojs/store';

import { media } from '@videojs/core/dom';
import { mergeStoreConfig } from '@videojs/store';
import { createStore } from '@videojs/store/lit';

/** Base config for frosted skin. */
const baseConfig = {
  slices: [media.playback] as const,
};

/**
 * Defines store config for frosted skin.
 * Merges base config with extension, properly composing lifecycle hooks.
 */
export function defineStoreConfig<S extends readonly AnySlice[] = readonly []>(
  extension?: Partial<StoreConfig<any, S>>
) {
  return mergeStoreConfig(baseConfig, extension);
}

export const { withStore, withStoreProvider, withStoreAttach, context } = createStore(defineStoreConfig());
```

### 6.2 Skin component

**File:** `packages/html/src/skins/frosted/skin.ts`

```typescript
import { withStore, withStoreAttach, withStoreProvider } from './store';

/**
 * Frosted skin element. Empty for now - controls will be added later.
 * Uses shadow DOM with slot for video element.
 */
export class FrostedSkinElement extends HTMLElement {
  /** Default tag name for this element. */
  static tagName = 'vjs-frosted-skin';

  /**
   * Define this element with the custom elements registry.
   * Default uses withStore (combined provider + attach).
   * Pass custom mixins for extension scenarios.
   */
  static define(tagName = this.tagName, storeMixin = withStore) {
    const SkinWithStore = storeMixin(this);
    customElements.define(tagName, SkinWithStore);
  }

  /**
   * Define with granular control over mixins.
   * Use when extending with custom store config.
   */
  static defineWithMixins(tagName: string, providerMixin = withStoreProvider, attachMixin = withStoreAttach) {
    // Provider first (provides context), then attach (consumes context)
    const SkinWithStore = attachMixin(providerMixin(this));
    customElements.define(tagName, SkinWithStore);
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

FrostedSkinElement.define();
```

### 6.4 Exports

**File:** `packages/html/src/skins/frosted/index.ts`

```typescript
export { FrostedSkinElement } from './skin';
export { context, defineStoreConfig, withStore, withStoreAttach, withStoreProvider } from './store';
```

---

## Usage Examples

### React: Custom UI

```tsx
import { createStore, media, Video } from '@videojs/react';

const { Provider, useSelector, useRequest } = createStore({
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
  const { seek } = useRequest();
  return <button onClick={() => seek(0)}>Restart ({currentTime}s)</button>;
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
import { defineStoreConfig, Skin } from '@videojs/react/skins/frosted';

import { chaptersSlice } from './slices/chapters';

// Extend frosted config with custom slice (merges with base slices)
const { Provider, useSlice } = createStore(
  defineStoreConfig({ slices: [chaptersSlice] })
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
import { media } from '@videojs/core/dom';
import { createStore } from '@videojs/store/lit';

const { withStore } = createStore({
  slices: [media.playback],
});

// Create custom element with store provider and auto-attach
class MyPlayer extends withStore(HTMLElement) {
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
import { defineStoreConfig, FrostedSkinElement } from '@videojs/html/skins/frosted';
import { createStore } from '@videojs/store/lit';

import { chaptersSlice } from './slices/chapters.js';

// Extend frosted config with custom slice (merges with base slices)
const { withStore } = createStore(defineStoreConfig({ slices: [chaptersSlice] }));

FrostedSkinElement.define('my-extended-skin', withStore);
```

---

## File Structure

```
packages/utils/src/
├── array/
│   ├── uniq-by.ts              # NEW
│   └── index.ts                # NEW
└── function/
    ├── compose-callbacks.ts    # NEW
    └── index.ts                # NEW

packages/store/src/
├── core/
│   ├── store.ts                # existing
│   ├── slice.ts                # existing
│   ├── queue.ts                # existing
│   ├── merge-config.ts         # NEW
│   └── index.ts
├── react/
│   ├── context.ts              # NEW (internal shared context)
│   ├── create-store.ts         # NEW
│   ├── hooks.ts                # NEW (base hooks)
│   ├── types.ts                # NEW
│   └── index.ts
└── lit/
    ├── create-store.ts         # NEW (withStore, withStoreProvider, withStoreAttach, context)
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

1. **Phase 0**: Core utilities (`@videojs/utils`, `@videojs/store`)
   - `uniqBy`, `composeCallbacks` utilities
   - `mergeStoreConfig`
2. **Phase 1**: React bindings + React package (`@videojs/store/react`, `@videojs/react`)
   - Shared context (`context.ts`, `useStoreContext`)
   - `createStore()`, base hooks, types
   - `Video` component, package exports
3. **Phase 2**: Lit bindings (`@videojs/store/lit`)
   - `createStore()` with `withStore`, `withStoreProvider`, `withStoreAttach`
   - Controllers (`SelectorController`, `RequestController`, etc.)
   - `@lit/context` integration
4. **Phase 3**: Playback slice (`@videojs/core/dom`)
   - `media.playback`, utils, guards
5. **Phase 4-6**: Frosted skin (`@videojs/react/skins/frosted`, `@videojs/html/skins/frosted`)
   - React skin (Provider, Skin, storeConfig, hooks)
   - HTML skin (FrostedSkinElement.define, storeConfig, controllers)

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

| Issue | Title                    | Description                   |
| ----- | ------------------------ | ----------------------------- |
| #218  | Store                    | Parent tracking issue         |
| #229  | React Bindings           | `createStore`, hooks, context |
| #230  | ReactiveElement Bindings | Controllers, context          |
| #231  | Frosted Skin             | Frosted skin implementation   |
| #239  | Playback Feature         | Consolidated playback slice   |

### Existing PR

- **PR #281** (`videojs-store-lit`) - Draft with WIP Lit controllers
  - Action: **Completely override** with new API design from this plan

### PR Strategy

```
PR 1: Utilities + Store React Bindings + React Package
├── uniqBy, composeCallbacks (utils)
├── mergeStoreConfig (store/core)
├── Shared context, useStoreContext (store/react)
├── createStore with parent lookup (store/react)
├── Base hooks (store/react)
├── Video component (react)
├── Package exports (react)
├── References #218
└── Closes #229

PR 2: Store Lit Bindings (override PR #281)
├── createStore (store/lit) - withStore, withStoreProvider, withStoreAttach, context, create
├── Lit controllers - SelectorController, RequestController, etc.
├── @lit/context integration
├── References #218
└── Closes #230

PR 3: Playback Slice
├── media.playback (core/dom/slices)
├── Utils (serializeTimeRanges)
├── Type guards
├── References #218
└── Closes #239

PR 4: Frosted Skin Store
├── React skin (Provider, Skin, defineStoreConfig)
├── HTML skin (FrostedSkinElement, defineStoreConfig)
├── define/vjs-frosted-skin.ts
├── References #218
└── Closes #231
```

### Dependency Graph

```
PR 1 ──┬──> PR 2 (can parallel after mergeStoreConfig from PR 1)
       └──> PR 3 (can parallel)
            └──> PR 4 (needs PR 1, PR 2, PR 3)
```

---

## Deferred

- Testing utilities (`@videojs/store/testing`) - separate plan
- Minimal skin implementation
