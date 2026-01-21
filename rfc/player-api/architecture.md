# Architecture

Internal structure of the Player API.

## Overview

```
                          createPlayer()
                    config: presets.website | { features: [...] }
                                   │
                         filters by feature.type
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
      ┌────────────────────────┐      ┌────────────────────────┐
      │  createStore()         │      │  createStore()         │
      │  type: 'media'         │      │  type: 'player'        │
      └────────────────────────┘      └────────────────────────┘
                   │                               │
                   ▼                               ▼
      ┌────────────────────────┐      ┌────────────────────────┐
      │     Media Store        │◄─────│    Player Store        │
      │  target: MediaTarget   │      │  target: PlayerTarget  │
      │                        │      │                        │
      │  state: paused, volume │      │  state: isFullscreen   │
      │  request: play, pause  │      │  request: toggleFS     │
      └────────────────────────┘      └────────────────────────┘
                                                   │
                                        getFeature(target.media, f)
                                                   │
                                       ┌───────────┴───────────┐
                                       ▼                       ▼
                                Read media state        Call media requests
                                (iOS fallback)          (keyboard shortcuts)
```

**Key insight:** Player Store's target includes a media proxy. This enables coordination without tight coupling — feature authors use the same flat API as component authors.

## Two Stores

### Why Two Stores

| Reason                | Explanation                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **Different targets** | Media features target `MediaTarget`. Player features target `PlayerTarget`.                         |
| **Attachment timing** | `<Video>` and `<Container>` mount at different times, possibly different tree locations.            |
| **Config dependency** | Player features configure against typed media store. Media store must exist first.                  |
| **Observability**     | Player→media interactions go through store. Enables debugging, tracing, request queuing.            |
| **Standalone media**  | Headless player, audio-only, programmatic control. Media store works alone.                         |
| **Type safety**       | Player features declare required media capabilities. TypeScript catches mismatches at compile time. |

### Feature Types

Features are discriminated by `type`:

```ts
interface MediaFeature {
  type: 'media';
  // ...
}

interface PlayerFeature {
  type: 'player';
  // ...
}
```

`createPlayer` filters features by type, builds both stores, returns unified API.

## Targets

### MediaTarget

```ts
interface MediaTarget {
  element: HTMLMediaElement;
}
```

Media features observe and control the `<video>` or `<audio>` element directly.

### PlayerTarget

```ts
interface PlayerTarget {
  container: HTMLElement;
  media: UnknownMedia; // flat proxy, not store
}
```

Player features can:

- Control the container element (fullscreen, focus)
- Access media proxy for coordination (same flat API as components)

## Cross-Store Access

Player features access media via `target.media` (a flat proxy). Use `hasFeature`/`getFeature` for type narrowing, and `subscribe` for reactive updates.

```ts
import * as media from '@videojs/core/dom/features/media';
import { getFeature, hasFeature, subscribe } from '@videojs/store';

const fullscreen = createPlayerFeature({
  request: {
    enterFullscreen: (_, { target }) => {
      // Try container fullscreen
      if (document.fullscreenEnabled) {
        target.container.requestFullscreen();
        return;
      }

      // iOS fallback — use media fullscreen (flat access)
      const mediaFS = getFeature(target.media, media.fullscreen);
      mediaFS.enterFullscreen?.();
    },
  },

  subscribe: ({ target, update, signal }) => {
    // Subscribe to media fullscreen changes (iOS)
    if (hasFeature(target.media, media.fullscreen)) {
      subscribe(target.media, (s) => s.isFullscreen, update, { signal });
    }
  },
});
```

## Feature Registry

Each store maintains a registry of its features as a `ReadonlyMap<symbol, AnyFeature>` keyed by `feature.id`.

```ts
store.features.has(playbackFeature.id); // boolean
store.features.get(playbackFeature.id); // AnyFeature | undefined
```

Used by `hasFeature()` type guard for primitives. See [primitives.md](primitives.md).

## Proxy Access

Feature authors access media via the flat proxy on `target.media`. See [primitives.md](primitives.md) for `hasFeature()`, `getFeature()`, and `subscribe()` usage.

## State Unification

`createPlayer` merges both stores into a unified API:

```
┌─────────────────────────────────────────────────────────┐
│                      usePlayer()                         │
│                                                          │
│   Media State          Player State         Requests     │
│   ───────────          ────────────         ────────     │
│   paused               isFullscreen         play()       │
│   volume               isIdle               pause()      │
│   currentTime          ...                  setVolume()  │
│   ...                                       toggleFS()   │
│                                             ...          │
└─────────────────────────────────────────────────────────┘
                            │
                  Flattened via Proxy
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      Media Store                   Player Store
```

The proxy:

1. Merges state from both stores
2. Merges requests from both stores
3. Tracks property access for fine-grained subscriptions

## Reactive System

Proxy-based tracking (based on `SnapshotController`):

1. **Access** — Property access during render is tracked
2. **Subscribe** — Tracker subscribes to changes on accessed keys
3. **Update** — On change, trigger re-render
4. **Next** — After render, finalize tracked keys for next cycle

Works identically in React (`usePlayer()`) and Lit (`controller.value`).

## File Structure

| Path                                     | Purpose                                      |
| ---------------------------------------- | -------------------------------------------- |
| `packages/core/src/dom/features/media/`  | Media features (playback, volume, time)      |
| `packages/core/src/dom/features/player/` | Player features (fullscreen, keyboard, idle) |
| `packages/html/src/`                     | Lit player + presets/skins                   |
| `packages/react/src/`                    | React player + presets/skins                 |

## Player Features

| Feature        | Description                                    |
| -------------- | ---------------------------------------------- |
| **Fullscreen** | Container fullscreen with iOS media fallback   |
| **Idle**       | Tracks user activity for auto-hide UI          |
| **Keyboard**   | Maps keys to requests (`Space` → `togglePlay`) |
| **Gestures**   | Touch gestures (double-tap seek, swipe volume) |

## Progressive Complexity

| Level           | Example                                         | Sees internal stores? |
| --------------- | ----------------------------------------------- | --------------------- |
| Use skin        | `<FrostedSkin>`                                 | No                    |
| Use preset      | `createPlayer(presets.website)`                 | No                    |
| Custom features | `createPlayer([...presets.website, myFeature])` | No                    |
| Use hooks       | `usePlayer()`                                   | No                    |
| Write feature   | `createPlayerFeature({ ... })`                  | Yes (target.media)    |

Internal stores are implementation details until you author features.

## Constraints

- Player features live in `@videojs/core/dom`
- `createPlayer` lives in `@videojs/html` and `@videojs/react`
- Skins are tied to presets — stores don't extend from skins
- Two stores internally, one API externally
- `hasFeature`, `getFeature`, `subscribe` are framework-agnostic (from `@videojs/store`)
