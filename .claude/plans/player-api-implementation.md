# Player API Implementation Plan

Implementation plan for the Player API, aligned with Store v2 architecture.

Parent issue: [#320](https://github.com/videojs/v10/issues/320)

## Phases

| # | Issue | Title | SP | Status |
|---|-------|-------|-----|--------|
| 1 | [#365](https://github.com/videojs/v10/issues/365) | Store v2 Foundation | 5 | ✅ |
| 2 | [#366](https://github.com/videojs/v10/issues/366) | PlayerTarget & Features | 3 | ✅ |
| 3 | [#367](https://github.com/videojs/v10/issues/367) | React Player API | 3 | ✅ |
| 4 | [#368](https://github.com/videojs/v10/issues/368) | HTML Player API | 5 | ✅ |
| 5 | [#369](https://github.com/videojs/v10/issues/369) | Cleanup & Documentation | 2 | 🔄 Partial (store/lit cleanup done in #368) |

**Total: 18 SP**

## Overview

Transform the current store-based architecture into a feature-based player API with:

- **Single store** with `PlayerTarget = { media: Media, container: MediaContainer | null }`
- **Selector-based subscriptions** via `useStore(store, selector)` and `usePlayer(selector)`
- `createFeatureSelector(feature)` for type-safe feature state selection
- Pre-built selectors exported from `@videojs/core/dom` (`selectPlayback`, `selectVolume`, etc.)
- `createFeatureSelector(feature)` for type-safe feature state selection
- **Feature availability** via `FeatureAvailability` type (`'available' | 'unavailable' | 'unsupported'`)
- **Base player context** in `@videojs/react` and `@videojs/html` for UI primitives
- **`createPlayer()`** factory wraps base context with typed hooks

## Architecture

```
                          createPlayer({ features })
                                    │
                     creates Store<PlayerTarget, State>
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │    PlayerContext      │
                        │  (base, untyped)      │
                        │                       │
                        │  store: AnyStore      │
                        │  media: Media | null  │
                        │  setMedia: ...        │
                        └───────────────────────┘
                                    │
                         UI primitives use base
                           usePlayer(selector)
                              useMedia()

PlayerTarget = {
  media: Media,              // extends HTMLMediaElement
  container: MediaContainer | null  // extends HTMLElement
}

Store<Target, State> = Simplify<{
  state: State,              // state snapshot for selectors
  attach(target: Target): () => void,
  subscribe(callback: () => void): () => void,
  destroy(): void
} & State>                   // direct state access via intersection

PlayerContextValue = {
  store: AnyStore,           // base store type
  media: Media | null,
  setMedia: ...
}
```

---

## Store Package Changes

### Removed from `@videojs/store/react`

| Export | Reason |
|--------|--------|
| `createStore` | Replaced by `createPlayer` in `@videojs/react` |
| `useStoreContext` | Replaced by `usePlayerContext` in `@videojs/react` |
| `StoreContextProvider` | Replaced by player context |
| `CreateStoreConfig` | No longer needed |
| `CreateStoreResult` | No longer needed |
| `ProviderProps` | No longer needed |

### Kept in `@videojs/store/react`

| Export | Purpose |
|--------|---------|
| `useStore` | Hook to subscribe to store state |
| `useSelector` (new) | Selector-based subscription with shallowEqual |

### Removed from `@videojs/store/lit`

| Export | Reason |
|--------|--------|
| `createStore` | Replaced by `createPlayer` in `@videojs/html` |
| `createProviderMixin` | Player-specific version in `@videojs/html` |
| `createContainerMixin` | Player-specific version in `@videojs/html` |
| `createStoreMixin` | Player-specific version in `@videojs/html` |
| `CreateStoreConfig` | No longer needed |
| `CreateStoreResult` | No longer needed |
| `CreateStoreHost` | No longer needed |
| `contextKey` | No longer needed |
| `StoreConsumer` | Player-specific |
| `StoreProvider` | Player-specific |

### Kept in `@videojs/store/lit`

| Export | Purpose |
|--------|---------|
| `SubscriptionController` | Generic subscription management |
| `StoreController` | Subscribes to store state |
| `StoreAccessor` | Resolves store from direct instance or context |
| `StoreSource<Store>` | Type: store instance or context |
| `StoreAccessorHost` | Type: host requirements |
| `SubscriptionControllerHost` | Type: host requirements |

---

## Phase 1: Store Enhancements

### PR 1: feat(store): Store type refactor

Refactor Store type to use `Target` and `State` generics with intersection (`& State`) for direct access plus `state` property for selectors. Use `Simplify<>` for flattened IntelliSense. Simplify type helpers (remove `InferStoreFeatures`). Pass `store` to feature `attach()`.

**Files:**

```
packages/store/src/core/store.ts
packages/store/src/core/types.ts (new or update)
packages/store/src/core/tests/store.test.ts
```

**Store type (intersection with state snapshot):**

```ts
import { Simplify } from '@videojs/utils/types';

/**
 * Store type with direct state access via intersection.
 * - Target: type for attach() parameter (default: unknown)
 * - State: state merged onto store AND available via state property (default: Record<string, unknown>)
 */
type Store<Target = unknown, State = Record<string, unknown>> = Simplify<{
  state: State;
  attach(target: Target): () => void;
  subscribe(callback: () => void): () => void;
  destroy(): void;
} & State>;

/** Loose store type for contexts and base primitives. */
type AnyStore<Target = any> = Store<Target, any>;

/** Infer target type from store. */
type InferStoreTarget<S extends AnyStore> = S extends Store<infer T, any> ? T : never;

/** Infer state type from store. */
type InferStoreState<S extends AnyStore> = S extends Store<any, infer State> ? State : never;

// Note: No InferStoreFeatures - features are not stored in the type.
// State is inferred from features at createStore() call site only.

// Base store (uses defaults) - for features and primitives
// Store<unknown, Record<string, unknown>>
// Access: store.paused → unknown (intersection), store.state.paused → unknown (snapshot)

// Typed store from createStore
// Store<PlayerTarget, { paused: boolean; volume: number; ... }>
// Access: store.paused → boolean (intersection), store.state.paused → boolean (snapshot)
// Selectors always use store.state for consistency
```

**createStore infers from features:**

```ts
function createStore<const Features extends AnyFeature[]>(
  config: { features: Features }
): Store<InferFeatureTarget<Features>, UnionFeatureState<Features>>;

// Usage
const store = createStore({ features: [playbackFeature, volumeFeature] });
// Type: Store<PlayerTarget, { paused: boolean; volume: number; ... }>
store.state.paused;  // Access via state snapshot

// Features are NOT stored in Store type - only Target and State
// This simplifies type helpers and avoids complex inference chains
```

**Feature attach receives store:**

```ts
// Update feature attach signature
attach({ target, signal, set, store }: {
  target: Target;
  signal: AbortSignal;
  set: (partial: Partial<State>) => void;
  store: Store;  // Base store for cross-feature access
}) {
  // One-time read from state snapshot
  const playback = selectPlayback(store.state);
  
  // Reactive subscription
  const unsubscribe = store.subscribe(() => {
    const playback = selectPlayback(store.state);
    // ...
  });
  signal.addEventListener('abort', unsubscribe);
}

---

### PR 2: feat(store): shallowEqual utility

**Files:**

```
packages/store/src/core/shallow-equal.ts (new)
packages/store/src/core/index.ts
packages/store/src/core/tests/shallow-equal.test.ts (new)
```

**Implementation:**

```ts
// packages/store/src/core/shallow-equal.ts
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!Object.hasOwn(b, key) || !Object.is((a as any)[key], (b as any)[key])) {
      return false;
    }
  }
  
  return true;
}
```

---

### PR 3: feat(store/react): useSelector hook

**Files:**

```
packages/store/src/react/hooks/use-selector.ts (new)
packages/store/src/react/hooks/index.ts
packages/store/src/react/hooks/tests/use-selector.test.tsx (new)
```

**Implementation:**

```ts
// packages/store/src/react/hooks/use-selector.ts
import { useRef } from 'react';
import { useSyncExternalStore } from 'react';
import { shallowEqual } from '../../core/shallow-equal';

export function useSelector<S, R>(
  subscribe: (cb: () => void) => () => void,
  getSnapshot: () => S,
  selector: (state: S) => R,
  isEqual: (a: R, b: R) => boolean = shallowEqual
): R {
  const cache = useRef<R | undefined>(undefined);

  const getSelectedSnapshot = () => {
    const next = selector(getSnapshot());
    if (cache.current !== undefined && isEqual(cache.current, next)) {
      return cache.current;
    }
    cache.current = next;
    return next;
  };

  return useSyncExternalStore(subscribe, getSelectedSnapshot, getSelectedSnapshot);
}
```

---

### PR 4: feat(store/react): useStore selector overload

**Files:**

```
packages/store/src/react/hooks/use-store.ts
packages/store/src/react/hooks/tests/use-store.test.tsx
```

**Implementation:**

```ts
// packages/store/src/react/hooks/use-store.ts
import type { AnyStore, InferStoreState } from '../../core/types';
import { shallowEqual } from '../../core/shallow-equal';
import { useSelector } from './use-selector';

export function useStore<S extends AnyStore>(store: S): InferStoreState<S>;
export function useStore<S extends AnyStore, R>(
  store: S,
  selector: (state: Record<string, unknown>) => R
): R;
export function useStore<S extends AnyStore, R>(
  store: S,
  selector?: (state: Record<string, unknown>) => R
): InferStoreState<S> | R {
  const sub = (cb: () => void) => store.subscribe(cb);
  const snap = () => store.state;  // State snapshot
  
  if (selector) {
    return useSelector(sub, snap, selector, shallowEqual);
  }
  
  // No selector: return full state, re-render on any change
  return useSelector(sub, snap, (s) => s, () => false) as InferStoreState<S>;
}
```

---

### PR 5: feat(store): createFeatureSelector

**Files:**

```
packages/store/src/core/feature-selector.ts (new)
packages/store/src/core/index.ts
packages/store/src/core/tests/feature-selector.test.ts (new)
```

**Implementation:**

```ts
// packages/store/src/core/feature-selector.ts
import type { AnyFeature, InferFeatureState, StateFactoryContext } from './feature';
import { StoreError } from './errors';

const stateContext: StateFactoryContext<unknown> = {
  task: () => { throw new StoreError('NO_TARGET'); },
  target: () => { throw new StoreError('NO_TARGET'); },
};

export function createFeatureSelector<F extends AnyFeature>(
  feature: F
): (state: Record<string, unknown>) => InferFeatureState<F> | undefined {
  const initialState = feature.state(stateContext);
  const keys = Object.keys(initialState);
  
  return (state) => {
    if (!(keys[0] in state)) return undefined;
    
    const result: Record<string, unknown> = {};

    for (const key of keys) {
      result[key] = state[key];
    }

    return result as InferFeatureState<F>;
  };
}
```

**Usage:**

```ts
const selectPlayback = createFeatureSelector(playbackFeature);

function PlayButton() {
  // usePlayer passes store.state to selector internally
  const playback = usePlayer(selectPlayback);
  // Type: { paused: boolean; ended: boolean; ... } | undefined
  
  if (!playback) return null; // Feature not configured
  
  playback.paused; // ✓ TypeScript knows
}
```

---

## Phase 2: Core Types

### PR 6: feat(core/dom): PlayerTarget and FeatureAvailability types

**Files:**

```
packages/core/src/dom/types.ts (new)
packages/core/src/dom/index.ts
```

**Implementation:**

```ts
// packages/core/src/dom/types.ts

/** Media element contract. */
export interface Media extends HTMLMediaElement {}

/** Container element contract. */
export interface MediaContainer extends HTMLElement {}

/** Composite target for player features. */
export interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}

/** Feature capability availability. */
export type FeatureAvailability = 'available' | 'unavailable' | 'unsupported';
```

---

### PR 7: refactor(core/dom): update features to use PlayerTarget

Update all features from `HTMLMediaElement` to `PlayerTarget`.

**Files:**

```
packages/core/src/dom/store/features/playback.ts
packages/core/src/dom/store/features/volume.ts
packages/core/src/dom/store/features/time.ts
packages/core/src/dom/store/features/source.ts
packages/core/src/dom/store/features/buffer.ts
packages/core/src/dom/store/features/tests/*.test.ts
```

**Example change:**

```ts
// Before
const playbackFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task }) => ({ ... }),
  attach({ target, signal, set }) {
    listen(target, 'play', sync, { signal });
  },
});

// After
const playbackFeature = defineFeature<PlayerTarget>()({
  state: ({ task }) => ({ ... }),
  attach({ target, signal, set }) {
    listen(target.media, 'play', sync, { signal });
  },
});
```

**Volume feature with availability:**

```ts
// packages/core/src/dom/store/features/volume.ts
import type { FeatureAvailability, PlayerTarget } from '../../types';

/** Check if volume can be programmatically set (fails on iOS Safari). */
function canSetVolume(media: HTMLMediaElement): FeatureAvailability {
  try {
    const original = media.volume;
    media.volume = 0.5;
    const canSet = media.volume === 0.5;
    media.volume = original;
    return canSet ? 'available' : 'unsupported';
  } catch {
    return 'unsupported';
  }
}

const volumeFeature = defineFeature<PlayerTarget>()(({ task }) => ({
  volume: 1,
  muted: false,
  volumeAvailability: 'unsupported' as FeatureAvailability, // Safe default
  setVolume: task('setVolume', (volume: number, { target }) => {
    target.media.volume = volume;
  }),
  setMuted: task('setMuted', (muted: boolean, { target }) => {
    target.media.muted = muted;
  }),
}), {
  attach({ target, signal, set }) {
    const { media } = target;
    
    // Check platform capability
    set({ volumeAvailability: canSetVolume(media) });
    
    const sync = () => set({ volume: media.volume, muted: media.muted });
    listen(media, 'volumechange', sync, { signal });
    sync();
  },
});
```

---

### PR 8: feat(core/dom): feature bundles

**Files:**

```
packages/core/src/dom/store/features/bundles.ts (new)
packages/core/src/dom/store/features/index.ts
```

**Implementation:**

```ts
// packages/core/src/dom/store/features/bundles.ts
import { playbackFeature } from './playback';
import { volumeFeature } from './volume';
import { timeFeature } from './time';
import { sourceFeature } from './source';
import { bufferFeature } from './buffer';

/** Base video player features. */
export const video = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
] as const;

/** Base audio player features. */
export const audio = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
] as const;
```

---

### PR 9: feat(core/dom): feature selectors

Pre-built selectors for standard features, exported from `@videojs/core/dom`.

**Files:**

```
packages/core/src/dom/store/selectors.ts (new)
packages/core/src/dom/index.ts
```

**Implementation:**

```ts
// packages/core/src/dom/store/selectors.ts
import { createFeatureSelector } from '@videojs/store';
import { playbackFeature } from './features/playback';
import { volumeFeature } from './features/volume';
import { timeFeature } from './features/time';
import { sourceFeature } from './features/source';
import { bufferFeature } from './features/buffer';

export const selectPlayback = createFeatureSelector(playbackFeature);
export const selectVolume = createFeatureSelector(volumeFeature);
export const selectTime = createFeatureSelector(timeFeature);
export const selectSource = createFeatureSelector(sourceFeature);
export const selectBuffer = createFeatureSelector(bufferFeature);
```

**Usage:**

```tsx
import { selectPlayback, selectVolume } from '@videojs/core/dom';

function PlayButton() {
  const playback = usePlayer(selectPlayback);
  if (!playback) return null;
  
  return (
    <button onClick={playback.toggle}>
      {playback.paused ? 'Play' : 'Pause'}
    </button>
  );
}

function VolumeSlider() {
  const volume = usePlayer(selectVolume);
  if (!volume) return null;
  
  // Hide on platforms that don't support volume control
  if (volume.volumeAvailability === 'unsupported') return null;
  
  return (
    <input
      type="range"
      value={volume.volume}
      onChange={(e) => volume.setVolume(Number(e.target.value))}
      disabled={volume.volumeAvailability !== 'available'}
    />
  );
}
```

---

## Phase 3: React Player API

### PR 10: feat(react): base player context

Base context for UI primitives — untyped, shared across all createPlayer instances.

> **Resolved:** Selectors define their own loose input type `(state: Record<string, unknown>) => R`. The `as any` cast inside `useStore()` is localized — external API is fully typed. Selector returns `FeatureState | undefined`, handling "feature not configured" case.

**Files:**

```
packages/react/src/player/context.tsx (new)
packages/react/src/index.ts
```

**Implementation:**

```tsx
// packages/react/src/player/context.tsx
import type { AnyStore } from '@videojs/store';
import type { Media, MediaContainer } from '@videojs/core/dom';
import type { Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import { createContext, useContext, useEffect, useRef } from 'react';
import { useStore } from '@videojs/store/react';

/** Player context value. Store is AnyStore for base primitives. */
export interface PlayerContextValue {
  store: AnyStore;
  media: Media | null;
  setMedia: Dispatch<SetStateAction<Media | null>>;
}

/** Base context for player primitives. */
const PlayerContext = createContext<PlayerContextValue | null>(null);

/** Internal provider for player context. */
export function PlayerContextProvider({
  value,
  children,
}: {
  value: PlayerContextValue;
  children: ReactNode;
}): ReactNode {
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

/** Access player context (internal, for primitives). */
export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('NO_STORE');
  return ctx;
}

/** Container component - attaches media to store when registered. */
export function Container({
  children,
  as: Element = 'div',
  className,
  ref: refProp,
}: ContainerProps): ReactNode {
  const { store, media } = usePlayerContext();
  const internalRef = useRef<MediaContainer>(null);
  const containerRef = refProp ?? internalRef;
  
  useEffect(() => {
    if (media) {
      return store.attach({ media, container: containerRef.current });
    }
  }, [media, store, containerRef]);
  
  return (
    <Element ref={containerRef} className={className}>
      {children}
    </Element>
  );
}

export interface ContainerProps {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  ref?: RefObject<MediaContainer>;
}

/** Access player state. Optionally pass selector for derived state. */
export function usePlayer(): Record<string, unknown>;
export function usePlayer<R>(selector: (state: Record<string, unknown>) => R): R;
export function usePlayer<R>(selector?: (state: Record<string, unknown>) => R): Record<string, unknown> | R {
  const { store } = usePlayerContext();
  // useStore passes store.state to selector internally
  return useStore(store, selector as any);
}

/** Access current media element (may be null if not registered). */
export function useMedia(): Media | null {
  const { media } = usePlayerContext();
  return media;
}

/** Register a media element (for Video/Audio primitives). Returns undefined if outside provider (standalone media). */
export function useMediaRegistration(): Dispatch<SetStateAction<Media | null>> | undefined {
  const ctx = useContext(PlayerContext);
  return ctx?.setMedia;
}
```

---

### PR 11: feat(react): createPlayer factory and update Video

Factory that creates typed provider and hooks. Update existing Video component to use new context.

**Files:**

```
packages/react/src/player/create-player.tsx (new)
packages/react/src/media/video.tsx (update - use useMediaRegistration)
packages/react/src/index.ts
packages/react/src/player/tests/create-player.test.tsx (new)
```

**Implementation:**

```tsx
// packages/react/src/player/create-player.tsx
import type { AnyFeature, Store, UnionFeatureState } from '@videojs/store';
import { createStore } from '@videojs/store';
import { useStore } from '@videojs/store/react';
import type { Media, MediaContainer, PlayerTarget } from '@videojs/core/dom';
import type { FC, ReactNode, RefObject } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';
import { Container, PlayerContextProvider, usePlayerContext } from './context';

export interface CreatePlayerConfig<Features extends AnyFeature[]> {
  features: Features;
  displayName?: string;
}

export interface CreatePlayerResult<Features extends AnyFeature[]> {
  Provider: FC<ProviderProps>;
  Container: typeof Container;  // Re-exported from context
  usePlayer: UsePlayerHook<Features>;
}

export interface ProviderProps {
  children: ReactNode;
}

type UsePlayerHook<Features extends AnyFeature[]> = {
  (): UnionFeatureState<Features>;
  <R>(selector: (state: Record<string, unknown>) => R): R;
};

export function createPlayer<const Features extends AnyFeature<PlayerTarget>[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<Features> {
  type State = UnionFeatureState<Features>;
  
  function Provider({ children }: ProviderProps): ReactNode {
    const [store] = useState(() => createStore<Features>({ features: config.features }));
    const [media, setMedia] = useState<Media | null>(null);
    
    useEffect(() => () => store.destroy(), [store]);
    
    return (
      <PlayerContextProvider value={{ store: store as any, media, setMedia }}>
        {children}
      </PlayerContextProvider>
    );
  }
  
  if (config.displayName) {
    Provider.displayName = `${config.displayName}.Provider`;
  }
  
  function usePlayer(): State;
  function usePlayer<R>(selector: (state: Record<string, unknown>) => R): R;
  function usePlayer<R>(selector?: (state: Record<string, unknown>) => R): State | R {
    const { store } = usePlayerContext();
    // useStore passes store.state to selector internally
    return useStore(store, selector as any);
  }
  
  return {
    Provider,
    Container,  // Re-exported from context module
    usePlayer: usePlayer as UsePlayerHook<Features>,
  };
}
```

**Update existing Video component to use player context:**

```tsx
// packages/react/src/media/video.tsx
'use client';

import type { Ref, VideoHTMLAttributes } from 'react';
import { useCallback } from 'react';
import { useComposedRefs } from '../utils/use-composed-refs';
import { useMediaRegistration } from '../player/context';

export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  ref?: Ref<HTMLVideoElement> | React.RefObject<HTMLVideoElement>;
}

export function Video({ children, ref: refProp, ...props }: VideoProps): React.JSX.Element {
  const setMedia = useMediaRegistration();

  const attachRef = useCallback(
    (el: HTMLVideoElement): (() => void) | void => {
      if (!el || !setMedia) return;
      setMedia(el);
      return () => setMedia(null);
    },
    [setMedia]
  );

  const ref = useComposedRefs(refProp, attachRef);

  return (
    <video ref={ref} {...props}>
      {children}
    </video>
  );
}

export namespace Video {
  export type Props = VideoProps;
}
```

---

## Phase 4: HTML Player API

### PR 12: feat(html): directory scaffold and MediaElement

Set up package structure with subpath exports and placeholder files.

**Directory structure:**

```
packages/html/src/
├── index.ts
├── ui/
│   ├── media-element.ts
│   └── video-skin.ts (placeholder)
├── skin/
│   └── modern.ts (placeholder)
├── feature/
│   └── video.ts (placeholder)
└── player/
    ├── context.ts
    ├── player-controller.ts
    └── video.ts (placeholder)
```

**Files:**

```
packages/html/src/ui/media-element.ts (new)
packages/html/src/ui/video-skin.ts (new, placeholder)
packages/html/src/skin/modern.ts (new, placeholder)
packages/html/src/feature/video.ts (new, placeholder)
packages/html/src/player/video.ts (new, placeholder)
packages/html/package.json (update exports, add @lit/context dependency)
packages/html/tsdown.config.ts (new)
```

**MediaElement:**

```ts
// packages/html/src/ui/media-element.ts
import { ReactiveElement } from '@lit/reactive-element';

/** Base class for media UI primitives. */
export class MediaElement extends ReactiveElement {
  // Base class marker for media UI primitives
}
```

**Package exports and dependencies:**

```json
{
  "dependencies": {
    "@lit/context": "^1.1.0",
    "@lit/reactive-element": "^2.1.2",
    "@videojs/core": "workspace:*",
    "@videojs/store": "workspace:*",
    "@videojs/utils": "workspace:*"
  },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./ui/*": { "types": "./dist/ui/*.d.ts", "default": "./dist/ui/*.js" },
    "./skin/*": { "types": "./dist/skin/*.d.ts", "default": "./dist/skin/*.js" },
    "./feature/*": { "types": "./dist/feature/*.d.ts", "default": "./dist/feature/*.js" },
    "./player/*": { "types": "./dist/player/*.d.ts", "default": "./dist/player/*.js" }
  }
}
```

**tsdown.config.ts:**

```ts
import { defineConfig } from 'tsdown';
import { glob } from 'glob';

export default defineConfig({
  entry: glob.sync('src/**/*.ts', { ignore: ['**/*.test.ts', '**/*.d.ts'] }),
  format: 'esm',
  dts: true,
  clean: true,
});
```

---

### PR 13: feat(html): base player context and controller

Base context and controller for UI primitives.

**Files:**

```
packages/html/src/player/context.ts (new)
packages/html/src/player/player-controller.ts (new)
```

**Implementation:**

```ts
// packages/html/src/player/context.ts
import { createContext, ContextConsumer } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { AnyStore } from '@videojs/store';
import type { Constructor } from '@videojs/utils/types';
import type { Media, MediaContainer, PlayerTarget } from '@videojs/core/dom';

/** Player context value. Store is AnyStore for base primitives. */
export interface PlayerContextValue {
  store: AnyStore;
  media: Media | null;
}

/** Base context for player primitives. */
export const playerContext = createContext<PlayerContextValue>(Symbol('@videojs/player'));

/** Mixin that observes for media elements and attaches to store. */
export function ContainerMixin<Base extends Constructor<ReactiveElement>>(BaseClass: Base) {
  return class extends BaseClass {
    #media: Media | null = null;
    #detach: (() => void) | null = null;
    #observer: MutationObserver | null = null;
    #consumer = new ContextConsumer(this, {
      context: playerContext,
      subscribe: true,
    });
    
    override connectedCallback() {
      super.connectedCallback();
      this.#observeMedia();
    }
    
    override disconnectedCallback() {
      super.disconnectedCallback();
      this.#observer?.disconnect();
      this.#detach?.();
    }
    
    #observeMedia() {
      this.#observer = new MutationObserver(() => this.#checkForMedia());
      this.#observer.observe(this, { childList: true, subtree: true });
      this.#checkForMedia();
    }
    
    #checkForMedia() {
      const media = this.querySelector('video, audio') as Media | null;
      if (media !== this.#media) {
        this.#detach?.();
        this.#media = media;
        this.#attachMedia();
      }
    }
    
    #attachMedia() {
      const ctx = this.#consumer.value;
      if (ctx && this.#media) {
        this.#detach = ctx.store.attach({
          media: this.#media,
          container: this as unknown as MediaContainer,
        });
      }
    }
  };
}
```

```ts
// packages/html/src/player/player-controller.ts
import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';
import type { AnyStore, InferStoreState } from '@videojs/store';
import { shallowEqual } from '@videojs/store';
import { StoreAccessor, type StoreSource } from '@videojs/store/lit';

export class PlayerController<S extends AnyStore, R = InferStoreState<S>>
  implements ReactiveController
{
  #host: ReactiveControllerHost;
  #accessor: StoreAccessor<S>;
  #selector?: (state: Record<string, unknown>) => R;
  #cached?: R;
  #unsubscribe?: () => void;
  
  // Overload: with selector - subscribes, R from selector
  constructor(
    host: ReactiveControllerHost,
    source: StoreSource<S>,
    selector: (state: Record<string, unknown>) => R
  );
  // Overload: without selector - no subscription, R is full state
  constructor(
    host: ReactiveControllerHost,
    source: StoreSource<S>
  );
  constructor(
    host: ReactiveControllerHost,
    source: StoreSource<S>,
    selector?: (state: Record<string, unknown>) => R
  ) {
    this.#host = host;
    this.#accessor = new StoreAccessor(host, source);
    this.#selector = selector;
    host.addController(this);
  }
  
  get store(): S {
    return this.#accessor.store;
  }
  
  get value(): R {
    if (this.#selector) {
      // With selector: return cached selected value
      this.#cached ??= this.#selector(this.store.state);
      return this.#cached;
    }
    // Without selector: return current full state snapshot
    return this.store.state as R;
  }
  
  hostConnected(): void {
    // Only subscribe if selector provided
    if (this.#selector) {
      const selector = this.#selector;
      this.#cached = selector(this.store.state);
      
      this.#unsubscribe = this.store.subscribe(() => {
        const next = selector(this.store.state);
        if (!shallowEqual(this.#cached, next)) {
          this.#cached = next;
          this.#host.requestUpdate();
        }
      });
    }
  }
  
  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }
}
```

**Usage:**

```ts
import { selectPlayback } from '@videojs/core/dom';
import { playerContext } from './context';

class MediaPlayButton extends MediaElement {
  // With selector: subscribes, .value is PlaybackState | undefined
  #ctrl = new PlayerController(this, playerContext, selectPlayback);
  
  render() {
    const playback = this.#ctrl.value;
    if (!playback) return nothing;
    
    return html`<button @click=${playback.toggle}>
      ${playback.paused ? 'Play' : 'Pause'}
    </button>`;
  }
}

class SomeOtherElement extends LitElement {
  // Without selector: no subscription, .value is full state
  #ctrl = new PlayerController(this, typedStore);
  
  someMethod() {
    // Get current state (snapshot, not reactive)
    const state = this.#ctrl.value;
  }
}
```

---

### PR 14: feat(html): createPlayer factory

Factory that creates typed mixins and controller.

**Files:**

```
packages/html/src/player/create-player.ts (new)
packages/html/src/player/tests/create-player.test.ts (new)
```

**Implementation:**

```ts
// packages/html/src/player/create-player.ts
import type { AnyFeature, Store, UnionFeatureState } from '@videojs/store';
import { createStore } from '@videojs/store';
import { ContextProvider } from '@lit/context';
import type { ReactiveElement } from '@lit/reactive-element';
import type { Constructor } from '@videojs/utils/types';
import type { Media, MediaContainer, PlayerTarget } from '@videojs/core/dom';
import { playerContext, ContainerMixin, type PlayerContextValue } from './context';
import { PlayerController } from './player-controller';

export interface CreatePlayerConfig<Features extends AnyFeature[]> {
  features: Features;
}

export interface CreatePlayerResult<Features extends AnyFeature[]> {
  context: typeof playerContext;
  create: () => Store<PlayerTarget, UnionFeatureState<Features>>;
  PlayerController: typeof PlayerController;
  ProviderMixin: <Base extends Constructor<ReactiveElement>>(base: Base) => Base;
  ContainerMixin: typeof ContainerMixin;
}

export function createPlayer<const Features extends AnyFeature<PlayerTarget>[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<Features> {
  type StoreType = Store<PlayerTarget, UnionFeatureState<Features>>;
  
  const create = () => createStore({ features: config.features }) as StoreType;
  
  function ProviderMixin<Base extends Constructor<ReactiveElement>>(BaseClass: Base) {
    return class extends BaseClass {
      #store: StoreType = create();
      #media: Media | null = null;
      #provider = new ContextProvider(this, {
        context: playerContext,
        initialValue: { store: this.#store as any, media: null },
      });
      
      get store(): StoreType {
        return this.#store;
      }
      
      get media(): Media | null {
        return this.#media;
      }
      
      set media(value: Media | null) {
        this.#media = value;
        this.#provider.setValue({ store: this.#store as any, media: value });
      }
      
      override disconnectedCallback() {
        super.disconnectedCallback();
        this.#store.destroy();
      }
    };
  }
  
  return {
    context: playerContext,
    create,
    PlayerController,
    ProviderMixin,
    ContainerMixin,
  };
}
```

---

## Phase 5: Cleanup

### PR 15: refactor(store): remove createStore from lit

Remove deprecated exports, update package indexes.

**Note:** React cleanup (`createStore`, `useStoreContext`, etc.) was done in Phase 3 (PR 11).

**Files:**

```
packages/store/src/lit/create-store.ts (delete)
packages/store/src/lit/mixins/provider-mixin.ts (delete)
packages/store/src/lit/mixins/container-mixin.ts (delete)
packages/store/src/lit/mixins/store-mixin.ts (delete)
packages/store/src/lit/mixins/index.ts (delete)
packages/store/src/lit/types.ts (delete)
packages/store/src/lit/index.ts (update)
packages/store/src/lit/tests/create-store.test.ts (delete)
```

**Updated exports:**

```ts
// packages/store/src/react/index.ts
export { useStore } from './hooks/use-store';
export { useSelector } from './hooks/use-selector';
```

```ts
// packages/store/src/lit/index.ts
export { StoreController, SubscriptionController } from './controllers';
export type { StoreSource, StoreAccessorHost } from './store-accessor';
export { StoreAccessor } from './store-accessor';
```

---

## Phase 6: Documentation

### PR 16: docs(rfc): update for revised architecture

Update RFC to reflect:

- Single store with `PlayerTarget`
- Base player context pattern
- Selector-based subscriptions with pre-built selectors (`selectPlayback`, etc.)
- `createFeatureSelector` for type-safe feature access
- `FeatureAvailability` type for platform capability detection
- Removal of `createStore` from platform bindings
- Remove `FeatureKey` pattern (not needed yet)

**Files:**

```
rfc/player-api/*.md
```

---

## Design Decisions

### Why Store Uses Intersection AND State Property

The `Store<Target, State>` type merges state via intersection AND exposes `state` property:

```ts
type Store<Target, State> = Simplify<{
  state: State;                           // State snapshot for selectors
  attach(target: Target): () => void;
  subscribe(callback: () => void): () => void;
  destroy(): void;
} & State>;                               // Direct access via intersection
```

**Why both intersection AND state property:**

- **Direct access** — `store.paused` works for quick reads (intersection)
- **Selectors use state** — `selector(store.state)` for consistent snapshot reference
- **Type inference** — `Simplify<>` flattens the type for better IntelliSense
- **Framework-agnostic** — All frameworks pass `store.state` to selectors

**Selector pattern:**

```ts
// Selectors take state (Record<string, unknown>), not store
const selectPlayback = (state: Record<string, unknown>) => ({ ... });

// Direct access for simple reads
if (store.paused) { ... }

// Selectors always use store.state
usePlayer(selectPlayback);  // React hook passes store.state
controller.value;           // Lit controller reads store.state
```

### Why Base Player Context

UI primitives (PlayButton, VolumeSlider, etc.) need store access without knowing which features are configured. The base context provides:

- `usePlayer()` — returns current state snapshot (untyped `Record<string, unknown>`)
- `usePlayer(selector)` — returns selected state via selector
- `useMedia()` — returns current media element
- `useMediaRegistration()` — for Video/Audio primitives to register

`createPlayer()` wraps this base with typed hooks for app code.

Selectors define their own loose input type `(state: Record<string, unknown>) => R`, so the `as any` cast inside `useStore()` is localized while the external API remains fully typed.

### Why Selector-Based Over Feature-Scoped Hooks

- Simpler mental model — one hook, one pattern
- No conditional hook calls
- `createFeatureSelector(feature)` provides type-safe feature selection
- Pre-built selectors exported from `@videojs/core/dom` (`selectPlayback`, `selectVolume`, etc.)
- Returns `T | undefined` to handle "feature not configured" case
- Matches industry patterns (Zustand, Redux Toolkit)

### Why Feature Availability

Platform capabilities vary (e.g., iOS Safari can't programmatically set volume). Instead of runtime errors or silent failures:

- Features expose `*Availability` state (`'available' | 'unavailable' | 'unsupported'`)
- Safe default is `'unsupported'` — updated in `attach()` after capability check
- State doesn't contain DOM — helper functions like `canSetVolume()` return availability
- UI primitives can hide/disable based on availability

### Why Selector Logic in Framework Bindings (Not Base)

Selector-based change detection (shallowEqual) lives in React hooks and Lit controllers, not in `store.subscribe()`:

- **Framework-agnostic base** — `store.subscribe(callback)` stays simple, fires on any state change
- **Svelte/Vue have their own solutions** — `derived()` and `computed()` handle this idiomatically
- **React/Lit need it** — no built-in derived state, so hooks/controllers handle shallowEqual
- **Direct state access available** — `selector(store.state)` for one-time reads without subscription

**Pattern:**

```ts
// Base store - simple callback, fires on any change
store.subscribe(() => {
  const playback = selectPlayback(store.state);
  // ...
});

// React/Lit - shallowEqual comparison on selector result
useStore(store, selectPlayback);  // Only re-renders when playback state changes
```

### PlayerController Design (Lit)

`PlayerController` exposes both `.store` and `.value`:

- **`.store`** — direct store access for `attach()`, subscriptions, etc.
- **`.value`** — selected state (with selector) or full state snapshot (without)
- **With selector** — subscribes, calls `selector(store.state)` with shallowEqual comparison
- **Without selector** — no subscription, `.value` returns `store.state` snapshot
- **Overloads** — TypeScript knows return type based on whether selector provided

```ts
// With selector - subscribes, .value is selected state
#playback = new PlayerController(this, playerContext, selectPlayback);
this.#playback.value;  // PlaybackState | undefined

// Without selector - no subscription, .value is full state snapshot
#ctrl = new PlayerController(this, playerContext);
this.#ctrl.value;  // Current state snapshot (not reactive)
```

### Why Remove createStore from Platform Bindings

- Player API is the primary use case
- `createStore` in store/react was a thin wrapper
- Base player context provides what primitives need
- Reduces API surface and confusion

---

## Future Work

Items identified during planning but deferred from initial implementation.

### Side-Effect Registration System

The `/ui/*`, `/skin/*`, `/feature/*` exports provide scaffold for future registration patterns:

```ts
// User imports trigger registration
import '@videojs/html/ui/play-button';
import '@videojs/html/skin/modern';
import '@videojs/html/feature/quality-selection';
```

**Deferred:** Requires design decisions on:
- Global registry vs player-scoped registration
- How features/UI/skins discover each other
- Lazy loading and code splitting strategy

### Feature Keys (`FeatureKey<F>`)

Typed symbols for feature identity:

```ts
const playbackKey: FeatureKey<typeof playbackFeature> = Symbol.for('@videojs/playback');
store.get(playbackKey); // Typed access without importing feature
```

**Deferred:** 
- `createFeatureSelector` provides equivalent type-safe access
- Bundle size benefit is marginal for most use cases
- Adds API surface without clear advantage yet

### Additional Feature Availability Checks

Expand `FeatureAvailability` pattern to other features:

```ts
// Fullscreen availability (iframe restrictions, browser support)
fullscreen.fullscreenAvailability

// Picture-in-Picture availability
pip.pipAvailability

// Airplay/Cast availability
cast.castAvailability
```

**Deferred:** Add as features are implemented.

### Streaming/Ads/Live Feature Bundles

Additional feature bundles beyond base `video`/`audio`:

```ts
features.streaming = [qualitySelection, audioTracks, textTracks];
features.ads = [adMarkers, adSkip, adCountdown];
features.live = [liveIndicator, seekToLive, dvr];
```

**Deferred:** Core features need stabilization first.

### Server-Side Rendering Support

SSR-safe patterns for React:
- Hydration-safe store initialization
- Server state serialization
- `useId()` for deterministic IDs

**Deferred:** Requires real-world SSR testing scenarios.

### DevTools Integration

Browser extension for debugging:
- Store state inspector
- Feature configuration viewer
- Request/task timeline
- Performance profiling

**Deferred:** Nice-to-have, not blocking core functionality.
