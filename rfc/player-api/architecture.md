# Architecture

Internal structure of the Player API. Implementation detail for feature authors.

## Overview

```
                          createPlayer()
                               │
                    creates Store<PlayerTarget>
                               │
                               ▼
                   ┌───────────────────────┐
                   │        Store          │
                   │  target: PlayerTarget │
                   │                       │
                   │  playback, volume,    │
                   │  time, fullscreen...  │
                   └───────────────────────┘
                               │
                        store.state
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              selectPlayback()      selectVolume()
                    │                     │
                    ▼                     ▼
              PlaybackState         VolumeState
```

**Key insight:** Single store with composite target. Features define slices that are combined. Selectors extract typed state for UI components.

## PlayerTarget

All features receive a composite target containing both media element and container:

```ts
interface PlayerTarget {
  media: Media;                    // HTMLMediaElement
  container: MediaContainer | null; // Container element (optional)
}
```

This allows features to:

- Observe and control the media element directly
- Access the container for UI concerns (fullscreen, focus)
- Work with media-only scenarios (headless, audio)

## Store Type

```ts
type Store<Target, State> = {
  readonly target: Target | null;
  readonly state: State;
  attach(target: Target): () => void;
  subscribe(callback: () => void): () => void;
  destroy(): void;
} & State;  // Direct state access via intersection
```

The store provides:

- **Direct access** — `store.paused` works for quick reads
- **State snapshot** — `store.state` for selectors
- **Attachment** — `store.attach(target)` connects to media element
- **Subscriptions** — `store.subscribe(callback)` for reactive updates

## Slices and Combine

Features are defined as slices and combined into a single store:

```ts
import { defineSlice, combine, createStore } from '@videojs/store';

const playbackSlice = defineSlice<PlayerTarget>()({
  state: () => ({ paused: true, ended: false }),
  attach: ({ target, set, signal }) => {
    const sync = () => set({ paused: target.media.paused, ended: target.media.ended });
    target.media.addEventListener('play', sync, { signal });
    target.media.addEventListener('pause', sync, { signal });
    sync();
  },
});

// Combine slices
const playerSlice = combine(playbackSlice, volumeSlice, timeSlice);

// Create store
const store = createStore<PlayerTarget>()(playerSlice);
```

## Selectors

Selectors extract typed state from the store. They enable:

- **Type-safe access** — TypeScript knows the shape of selected state
- **Subscription scoping** — Only re-render when selected state changes
- **Composition** — Derive values from multiple state properties

```ts
import { createSelector } from '@videojs/store';

// Create selector from slice
const selectPlayback = createSelector(playbackSlice);

// Usage in React
const playback = usePlayer(selectPlayback);
// Type: { paused: boolean; ended: boolean; ... } | undefined

// Usage in HTML
const ctrl = new PlayerController(this, context, selectPlayback);
// ctrl.value: { paused: boolean; ended: boolean; ... } | undefined
```

### Pre-built Selectors

Standard selectors are exported from `@videojs/core/dom`:

```ts
import {
  selectPlayback,
  selectVolume,
  selectTime,
  selectSource,
  selectBuffer,
} from '@videojs/core/dom';
```

## Reactive System

Selector-based subscriptions via `useSyncExternalStore` (React) or controller update cycle (HTML).

### Subscription Flow

1. **Subscribe** — `usePlayer(selector)` subscribes to store
2. **Snapshot** — On change, `store.state` provides current state
3. **Select** — Selector extracts relevant state
4. **Compare** — Result compared with `shallowEqual`
5. **Update** — If different, trigger re-render

### Performance

Selectors with `shallowEqual` comparison prevent unnecessary re-renders:

```tsx
// Only re-renders when paused OR ended changes
const playback = usePlayer(selectPlayback);

// currentTime updates (60fps during playback) don't affect this component
```

## File Structure

| Path                                  | Purpose                             |
| ------------------------------------- | ----------------------------------- |
| `packages/store/src/core/`            | Core store, slices, selectors       |
| `packages/store/src/react/`           | React hooks (`useStore`)            |
| `packages/store/src/lit/`             | Lit controllers (`StoreController`) |
| `packages/core/src/dom/`              | PlayerTarget, features, selectors   |
| `packages/html/src/`                  | HTML player, mixins, elements       |
| `packages/react/src/`                 | React player, context, hooks        |

## Progressive Complexity

| Level           | Example                                        | Sees internals? |
| --------------- | ---------------------------------------------- | --------------- |
| Use skin        | `<VideoSkin>`                                  | No              |
| Use features    | `createPlayer({ features: [...] })`            | No              |
| Custom features | `createPlayer({ features: [..., mySlice] })`   | No              |
| Use hooks       | `usePlayer(selectPlayback)`                    | No              |
| Write slice     | `defineSlice<PlayerTarget>()({ ... })`         | Yes (attach)    |

Store internals are implementation details until you author slices.

## Constraints

- Features target `PlayerTarget` (composite of media + container)
- Slices live in `@videojs/core/dom`
- `createPlayer` lives in `@videojs/html` and `@videojs/react`
- Single store, selectors for typed access
- `shallowEqual` comparison in React hooks and Lit controllers
