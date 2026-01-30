# Architecture

Internal structure of the Player API. Implementation detail for feature authors.

## Overview

```
                          createPlayer()
                               │
                     filters by feature.type
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
       ┌───────────────────┐   ┌───────────────────┐
       │   Media Store     │   │   Player Store    │
       │  target: <video>  │◄──│  target: container│
       │                   │   │                   │
       │  playback, volume │   │  fullscreen, idle │
       │  time, etc.       │   │  keyboard, etc.   │
       └───────────────────┘   └───────────────────┘
                                        │
                                 store.get(feature)
                                        │
                              Cross-feature access
```

**Key insight:** Player store holds reference to media store. Features use `store.get()` for cross-feature access, abstracting away which store a feature lives on.

## Two Stores

### Why Two Stores

| Reason                | Explanation                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| **Different targets** | Media features target `HTMLMediaElement`. Player features target container. |
| **Attachment timing** | Video element and container mount at different times.                  |
| **Type safety**       | Features declare which target they need. TypeScript catches mismatches. |
| **Standalone media**  | Headless player, audio-only, programmatic control. Media store works alone. |

### Media Store

```ts
interface MediaTarget {
  element: HTMLMediaElement;
}
```

Media features observe and control the `<video>` or `<audio>` element directly.

### Player Store

```ts
interface PlayerTarget {
  container: HTMLElement;
  mediaStore: MediaStore;
}
```

Player features can:

- Control the container element (fullscreen, focus)
- Access media features via `store.get()` for coordination

## Feature Registry

Each store maintains a feature registry:

```ts
interface Store {
  features: Map<symbol, Feature>;

  get(feature: Feature | FeatureKey | string): Slice | undefined;
  has(feature: Feature | FeatureKey | string): boolean;
}
```

Features are keyed by their `feature.key` (symbol).

## Cross-Feature Access

Features access other features via `store.get()`:

```ts
const keyboardFeature = createPlayerFeature({
  subscribe: ({ store, update, signal }) => {
    // Access playback feature (might be on media store)
    const playback = store.get(features.playback);

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') playback?.toggle();
    }, { signal });
  },
});
```

The store handles looking up features across both stores transparently.

## Reactive System

Selector-based subscriptions via `useSyncExternalStore` (React) or ReactiveElement's update cycle (HTML).

### Subscription Flow

1. **Subscribe** — `usePlayer(feature, selector)` subscribes to store
2. **Snapshot** — On change, `feature.getSnapshot()` called
3. **Compare** — Selector result compared with `shallowEqual`
4. **Update** — If different, trigger re-render

### Feature Subscriptions

When using `usePlayer(feature)`:

1. Subscribe scoped to that feature's state keys
2. Only re-render when that feature's state changes
3. Other features updating don't cause re-render

```ts
// Only subscribes to playback state
const playback = usePlayer(features.playback);

// currentTime updates (time feature) don't affect this component
```

## File Structure

| Path                                     | Purpose                                      |
| ---------------------------------------- | -------------------------------------------- |
| `packages/store/src/`                    | Core store, features, selectors              |
| `packages/core/src/dom/features/media/`  | Media features (playback, volume, time)      |
| `packages/core/src/dom/features/player/` | Player features (fullscreen, keyboard, idle) |
| `packages/html/src/`                     | HTML player + skins                          |
| `packages/react/src/`                    | React player + skins                         |

## Progressive Complexity

| Level           | Example                                         | Sees internal stores? |
| --------------- | ----------------------------------------------- | --------------------- |
| Use skin        | `<VideoSkin>`                                   | No                    |
| Use features    | `createPlayer({ features: [features.video] })`    | No                    |
| Custom features | `createPlayer({ features: [..., myFeature] })`  | No                    |
| Use hooks       | `usePlayer(features.playback)`                  | No                    |
| Write feature   | `createPlayerFeature({ ... })`                  | Yes (store.get)       |

Internal stores are implementation details until you author features.

## Constraints

- Media features live in `@videojs/core/dom/features/media`
- Player features live in `@videojs/core/dom/features/player`
- `createPlayer` lives in `@videojs/html` and `@videojs/react`
- Two stores internally, one API externally
- `store.get()` and `store.has()` are the feature access primitives
