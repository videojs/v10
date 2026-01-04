# Store React/DOM Bindings

## Goal

Implement React and DOM bindings for Video.js 10's store, enabling:

- Simple `createStore()` API that returns Provider + hooks/controllers
- Skins define their own store configs and export Provider + Skin + hooks
- Consumers can extend skin configs with additional slices
- Base hooks/controllers for testing and advanced use cases

## Key Decisions

| Decision               | Resolution                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| Store creation         | `createStore({ slices, displayName? })` - types inferred from slices    |
| Hook naming            | `useStore`, `useSelector`, `useRequest`, `usePending`, `useSlice`       |
| Controller naming      | `StoreController`, `SelectorController`, `RequestController`, etc       |
| Selector hook          | `useSelector(selector)` - requires selector (Redux-style)               |
| Store hook             | `useStore()` - returns store instance                                   |
| Pending hook           | `usePending()` - returns `store.queue.pending` (reactive)               |
| Slice hook return      | `{ state, request, isAvailable }` - state/request null when unavailable |
| Skin exports           | `Provider`, `Skin`, hooks/controllers                                   |
| Slice namespace        | `export * as media` → `media.playbackSlice`                             |
| Video component        | Generic, exported from `@videojs/react` (not from skins)                |
| DOM provider           | `withStoreProvider` mixin                                               |
| Base hooks/controllers | Take store explicitly, for testing/advanced use                         |
| displayName            | For React DevTools component naming                                     |

---

## Phase 1: React Bindings (`@videojs/store/react`)

### 1.1 `createStore`

**File:** `packages/store/src/react/create-store.ts`

```typescript
import type { AnySlice, StoreConfig } from '../core';
import type { ReactNode } from 'react';

export interface CreateStoreConfig<Slices extends AnySlice[]> {
  slices: Slices;
  displayName?: string;
}

export interface CreateStoreResult<Slices extends AnySlice[]> {
  Provider: FC<{ children: ReactNode }>;
  useStore: () => Store<InferSliceTarget<Slices[number]>, Slices>;
  useSelector: <T>(selector: (state: UnionSliceState<Slices>) => T) => T;
  useRequest: () => UnionSliceRequests<Slices>;
  usePending: () => PendingRecord<UnionSliceTasks<Slices>>;
  useSlice: <S extends Slices[number]>(slice: S) => SliceResult<S>;
}

export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices>;
```

### 1.2 Types

**File:** `packages/store/src/react/types.ts`

```typescript
export type SliceResult<S extends AnySlice> =
  | { state: InferSliceState<S>; request: InferSliceRequests<S>; isAvailable: true }
  | { state: null; request: null; isAvailable: false };
```

### 1.3 Base hooks

**File:** `packages/store/src/react/hooks.ts`

```typescript
// Base hooks - take store explicitly (for testing/advanced use)
export function useSelector<S extends AnyStore, T>(store: S, selector: (state: InferStoreState<S>) => T): T;

export function useRequest<S extends AnyStore>(store: S): InferStoreRequests<S>;

export function usePending<S extends AnyStore>(store: S): PendingRecord<InferStoreTasks<S>>;

export function useSlice<S extends AnyStore, Slice extends AnySlice>(store: S, slice: Slice): SliceResult<Slice>;
```

**Implementation details:**

- `Provider`: Creates store via `useState(() => new Store(config))`, provides via context
- `useStore()`: Returns store instance from context
- `useSelector(selector)`: Uses `useSyncExternalStore` with selector
- `useRequest()`: Returns stable `store.request` from context
- `usePending()`: Subscribes to `store.queue`, returns `queue.pending`
- `useSlice(slice)`: Returns `{ state, request, isAvailable }` with null narrowing
- Cleanup: `useEffect` calls `store.destroy()` on unmount

### 1.4 Exports

**File:** `packages/store/src/react/index.ts`

```typescript
export { createStore } from './create-store';
// Base hooks for testing/advanced use
export { usePending, useRequest, useSelector, useSlice } from './hooks';

export type { CreateStoreConfig, CreateStoreResult, SliceResult } from './types';
```

---

## Phase 2: DOM Bindings (`@videojs/store/dom`)

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

**File:** `packages/store/src/dom/create-store.ts`

```typescript
import type { Context } from '@lit/context';
import type { ReactiveControllerHost } from '@lit/reactive-element';

import { createContext } from '@lit/context';

export interface CreateStoreConfig<Slices extends AnySlice[]> {
  slices: Slices;
}

export interface CreateStoreResult<Slices extends AnySlice[]> {
  defineStoreProvider: (tagName: string) => void;
  withStoreProvider: <T extends Constructor<HTMLElement>>(Base: T) => T;
  StoreController: new (host: ReactiveControllerHost) => StoreControllerInstance<Slices>;
  SelectorController: <T>(
    host: ReactiveControllerHost,
    selector: (state: UnionSliceState<Slices>) => T
  ) => SelectorControllerInstance<T>;
  RequestController: new (host: ReactiveControllerHost) => RequestControllerInstance<Slices>;
  PendingController: new (host: ReactiveControllerHost) => PendingControllerInstance<Slices>;
  SliceController: <S extends Slices[number]>(host: ReactiveControllerHost, slice: S) => SliceControllerInstance<S>;
  context: Context<Store<InferSliceTarget<Slices[number]>, Slices>>;
}

export function createStore<Slices extends AnySlice[]>(config: CreateStoreConfig<Slices>): CreateStoreResult<Slices>;
```

### 2.2 Base controllers

**File:** `packages/store/src/dom/controllers.ts`

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

- Uses `@lit/context` for W3C Context Protocol
- Context key auto-generated per `createStore()` call (unique Symbol)
- `withStoreProvider`: Mixin that:
  - Creates store instance
  - Uses `ContextProvider` internally
  - Exposes `store` setter that calls `provider.setValue(newStore)`
- Controllers:
  - Consume store via `ContextConsumer` with `subscribe: true`
  - Subscribe to store changes, call `host.requestUpdate()` on change
  - Cleanup on `hostDisconnected` (automatic via ContextConsumer)
- `SelectorController`: One-step instantiation `new SelectorController(this, selector)`

### 2.3 Exports

**File:** `packages/store/src/dom/index.ts`

```typescript
// Base controllers for testing/advanced use
export { PendingController, RequestController, SelectorController, SliceController } from './controllers';
export { createStore } from './create-store';

export type { CreateStoreConfig, CreateStoreResult } from './types';
```

---

## Phase 3: Playback Slice (`@videojs/core/dom`)

Based on [Issue #239](https://github.com/videojs/v10/issues/239).

### 3.1 Playback slice

**File:** `packages/core/src/dom/slices/playback.ts`

```typescript
interface PlaybackState {
  paused: boolean;
  ended: boolean;
  started: boolean;
  waiting: boolean;
  currentTime: number;
  duration: number;
  buffered: Array<[number, number]>;
  seekable: Array<[number, number]>;
  volume: number;
  muted: boolean;
  canPlay: boolean;
  source: unknown;
  streamType: 'on-demand' | 'live' | 'live-dvr' | 'unknown';
}

interface PlaybackRequests {
  play: Request<void>;
  pause: Request<void>;
  seek: Request<number>;
  changeVolume: Request<number>;
  toggleMute: Request<void>;
  changeSource: Request<string>;
}

export const playbackSlice = createSlice<HTMLMediaElement>()({
  initialState: {
    /* ... */
  },
  getSnapshot: ({ target }) => ({
    /* ... */
  }),
  subscribe: ({ target, update, signal }) => {
    /* ... */
  },
  request: {
    /* ... */
  },
});
```

### 3.2 Namespace export

**File:** `packages/core/src/dom/slices/index.ts`

```typescript
export { playbackSlice } from './playback';

// Namespace export
export * as media from './index';
```

Usage:

```typescript
import { media, playbackSlice } from '@videojs/core/dom';

media.playbackSlice; // via namespace
playbackSlice; // standalone export
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

**File:** `packages/react/src/media/Video.tsx`

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
export { Video } from './media/Video';
export type { VideoProps } from './media/Video';

export { media } from '@videojs/core/dom';
// Re-export for extension
export { createStore } from '@videojs/store/react';
```

---

## Phase 5: Frosted Skin (React)

### 5.1 Store config

**File:** `packages/react/src/skins/frosted/store.ts`

```typescript
import { media } from '@videojs/core/dom';
import { createStore } from '@videojs/store/react';

export const storeConfig = {
  slices: [media.playback] as const,
  displayName: 'FrostedSkin',
};

export const { Provider, useStore, useSelector, useRequest, usePending, useSlice } = createStore(storeConfig);
```

### 5.2 Skin component

**File:** `packages/react/src/skins/frosted/Skin.tsx`

```typescript
import type { PropsWithChildren } from 'react';

import { useRequest, useSelector } from './store';

export interface SkinProps extends PropsWithChildren<{
  className?: string;
  theme?: 'light' | 'dark';
}> {}

export function Skin({ children, className, theme }: SkinProps): JSX.Element {
  return (
    <div className={`vjs-frosted-skin ${className ?? ''}`} data-theme={theme}>
      {children}
      <Controls />
    </div>
  );
}

function Controls() {
  const paused = useSelector((s) => s.paused);
  const { play, pause } = useRequest();
  // ... render controls
}
```

### 5.3 Exports

**File:** `packages/react/src/skins/frosted/index.ts`

```typescript
export { Skin } from './Skin';
export type { SkinProps } from './Skin';
export { Provider, storeConfig, usePending, useRequest, useSelector, useSlice, useStore } from './store';
```

---

## Phase 6: Frosted Skin (HTML)

### 6.1 Store config

**File:** `packages/html/src/skins/frosted/store.ts`

```typescript
import { media } from '@videojs/core/dom';
import { createStore } from '@videojs/store/dom';

export const storeConfig = {
  slices: [media.playback] as const,
};

export const {
  defineStoreProvider,
  withStoreProvider,
  StoreController,
  SelectorController,
  RequestController,
  PendingController,
  SliceController,
  context,
} = createStore(storeConfig);
```

### 6.2 Skin component

**File:** `packages/html/src/skins/frosted/Skin.ts`

```typescript
import { RequestController, SelectorController, withStoreProvider } from './store';

export class FrostedSkinElement extends HTMLElement {
  #paused = new SelectorController(this, (s) => s.paused);
  #request = new RequestController(this);

  /**
   * Define a custom element with this skin, optionally with a custom provider mixin.
   * Useful for extending the skin with additional slices.
   */
  static define(tagName: string, providerMixin = withStoreProvider) {
    const SkinWithProvider = providerMixin(this);
    customElements.define(tagName, SkinWithProvider);
  }

  connectedCallback() {
    this.innerHTML = `
      <slot></slot>
      <div class="controls">
        <button class="play-pause"></button>
      </div>
    `;
    this.#updatePlayButton();
    this.querySelector('button')?.addEventListener('click', this.#handleClick);
  }

  #handleClick = () => {
    this.#paused.value ? this.#request.value.play() : this.#request.value.pause();
  };

  #updatePlayButton() {
    const btn = this.querySelector('.play-pause');
    if (btn) btn.textContent = this.#paused.value ? 'Play' : 'Pause';
  }
}

  #handleClick = () => {
    this.#paused.value ? this.#request.value.play() : this.#request.value.pause();
  };

  #updatePlayButton() {
    const btn = this.querySelector('.play-pause');
    if (btn) btn.textContent = this.#paused.value ? 'Play' : 'Pause';
  }
}
```

### 6.3 Define export

**File:** `packages/html/src/define/vjs-frosted-skin.ts`

```typescript
import { FrostedSkinElement } from '../skins/frosted/Skin';

customElements.define('vjs-frosted-skin', FrostedSkinElement);
```

### 6.4 Exports

**File:** `packages/html/src/skins/frosted/index.ts`

```typescript
export { FrostedSkinElement } from './Skin';
export {
  context,
  PendingController,
  RequestController,
  SelectorController,
  SliceController,
  storeConfig,
  StoreController,
  withStoreProvider,
} from './store';
```

---

## Usage Examples

### React: Custom UI

```tsx
import { createStore, media, Video } from '@videojs/react';

const { Provider, useSelector, useRequest } = createStore({
  slices: [media.playbackSlice],
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
import { Skin, storeConfig } from '@videojs/react/skins/frosted';

import { chaptersSlice } from './slices/chapters';

// Extend frosted config with custom slice
const { Provider, useSlice } = createStore({
  ...storeConfig,
  slices: [...storeConfig.slices, chaptersSlice],
});

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
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/define/vjs-frosted-skin.js"></script>

<vjs-frosted-skin>
  <video src="video.mp4"></video>
</vjs-frosted-skin>
```

### HTML: Custom provider element (CDN)

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/define/my-player.js"></script>

<my-player>
  <video src="video.mp4"></video>
  <!-- custom controls here -->
</my-player>
```

Where `my-player.js` contains:

```typescript
import { createStore, playbackSlice } from '@videojs/html';

const { defineStoreProvider } = createStore({
  slices: [playbackSlice],
});

defineStoreProvider('my-player');
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
import { FrostedSkinElement, storeConfig } from '@videojs/html/skins/frosted';
import { createStore } from '@videojs/store/dom';

import { chaptersSlice } from './slices/chapters.js';

// Extend frosted config with custom slice
const { withStoreProvider } = createStore({
  ...storeConfig,
  slices: [...storeConfig.slices, chaptersSlice],
});

FrostedSkinElement.define('my-extended-skin', withStoreProvider);
```

---

## File Structure

```
packages/store/src/
├── core/
│   ├── store.ts                # existing
│   ├── slice.ts                # existing
│   ├── queue.ts                # existing
│   └── index.ts
├── react/
│   ├── create-store.ts         # NEW
│   ├── hooks.ts                # NEW (base hooks)
│   ├── types.ts                # NEW
│   └── index.ts
└── dom/
    ├── create-store.ts         # NEW
    ├── controllers.ts          # NEW (base controllers)
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
│   └── Video.tsx               # NEW
├── skins/
│   ├── frosted/
│   │   ├── store.ts            # NEW
│   │   ├── Skin.tsx            # NEW
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
│   │   ├── Skin.ts             # NEW
│   │   ├── styles.css          # NEW
│   │   └── index.ts            # NEW
│   └── minimal/
│       └── ...
└── index.ts
```

---

## Implementation Order

1. **Phase 1**: React bindings (`@videojs/store/react`)
   - `createStore()`, base hooks, types
2. **Phase 2**: DOM bindings (`@videojs/store/dom`)
   - `createStore()`, `defineStoreProvider()`, base controllers, types, `@lit/context` integration
3. **Phase 3**: Playback slice (`@videojs/core/dom`)
   - `media.playback`, utils, guards
4. **Phase 4**: React package setup (`@videojs/react`)
   - `Video`, package exports
5. **Phase 5**: Frosted skin React (`@videojs/react/skins/frosted`)
6. **Phase 6**: Frosted skin HTML (`@videojs/html/skins/frosted`)

Each phase includes tests.

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
  - Has: `StoreController`, `SliceController`, `PendingController`
  - Missing: `SelectorController`, `RequestController`, context-based factory, `withStoreProvider` mixin
  - Action: Update with new API design

### PR Strategy

```
PR 1: Store React Bindings
├── createStore (store/react)
├── Base hooks (store/react)
├── Types
├── References #218
└── Closes #229

PR 2: Store DOM Bindings (update PR #281)
├── createStore (store/dom)
├── defineStoreProvider
├── Base controllers (store/dom)
├── withStoreProvider mixin
├── @lit/context integration
├── References #218
└── Closes #230

PR 3: Playback Slice
├── media.playbackSlice (core/dom/slices)
├── Utils (serializeTimeRanges)
├── Type guards
├── References #218
└── Closes #239

PR 4: React Package Setup
├── Video component
├── Package exports
└── References #218

PR 5: Frosted Skin
├── React skin (Provider, Skin, storeConfig, hooks)
├── HTML skin (FrostedSkinElement.define, storeConfig, controllers)
├── define/vjs-frosted-skin.ts
├── References #218
└── Closes #231
```

### Dependency Graph

```
PR 1 ──┬──> PR 2 (can parallel)
       └──> PR 3 (can parallel)
                 └──> PR 4 (needs PR 1, PR 3)
                           └──> PR 5 (needs PR 2, PR 4)
```

---

## Deferred

- Testing utilities (`@videojs/store/testing`) - separate plan
- Minimal skin implementation
