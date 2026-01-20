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
                                       target.media.getFeature()
                                                  │
                                      ┌───────────┴───────────┐
                                      ▼                       ▼
                               Read media state        Call media requests
                               (iOS fallback)          (keyboard shortcuts)
```

**Key insight:** Player Store's target includes a reference to the Media Store. This enables coordination without tight coupling.

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
  media: Store<MediaTarget>;
}
```

Player features can:

- Control the container element (fullscreen, focus)
- Access media store for coordination

## Cross-Store Access

Player features access media via `target.media.getFeature()`.

```ts
const fullscreen = createPlayerFeature({
  request: {
    enterFullscreen: (_, { target }) => {
      // Try container fullscreen
      if (document.fullscreenEnabled) {
        target.container.requestFullscreen();
        return;
      }

      // iOS fallback — use media fullscreen
      const mediaFS = target.media.getFeature(media.fullscreen);
      mediaFS?.request.enterFullscreen();
    },
  },

  subscribe: ({ target, update, signal }) => {
    // Subscribe to media fullscreen changes (iOS)
    target.media.getFeature(media.fullscreen)?.subscribe((s) => s.isFullscreen, update, { signal });
  },
});
```

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

### Proxy-Based Tracking

Based on `SnapshotController` pattern:

```ts
// React
function Controls() {
  const player = usePlayer();

  // Accessing player.paused:
  // 1. Returns current value
  // 2. Tracks that this component uses "paused"
  // 3. Re-renders when paused changes
  return <button>{player.paused ? 'Play' : 'Pause'}</button>;
}
```

```ts
// Lit
class Controls extends VjsElement {
  #player = new PlayerController(this);

  render() {
    // Accessing #player.value.paused:
    // 1. Returns tracking proxy
    // 2. Tracks "paused" access
    // 3. Triggers requestUpdate() when paused changes
    const { paused } = this.#player.value;
    return html`<button>${paused ? 'Play' : 'Pause'}</button>`;
  }
}
```

### Tracking Lifecycle

1. **Access** — Property access during render is tracked
2. **Subscribe** — Tracker subscribes to changes on accessed keys
3. **Update** — On change, trigger re-render
4. **Next** — After render, finalize tracked keys for next cycle

## File Structure

```
packages/html/src/
├── create-player.ts
└── presets/
    └── website/
        ├── index.ts              # preset features
        └── skins/
            └── frosted/
                ├── index.ts
                └── define.ts

packages/react/src/
├── create-player.tsx
└── presets/
    └── website/
        ├── index.ts
        └── skins/
            └── frosted/

packages/core/src/dom/
├── features/
│   ├── media/                    # media features
│   │   ├── playback.ts
│   │   ├── volume.ts
│   │   └── time.ts
│   └── player/                   # player features
│       ├── fullscreen.ts
│       ├── keyboard.ts
│       └── idle.ts
└── index.ts
```

## Player Features

### Fullscreen

```ts
export const fullscreen = createPlayerFeature({
  initialState: {
    isFullscreen: false,
    fullscreenTarget: null as 'container' | 'media' | null,
  },

  getSnapshot: ({ target }) => {
    const containerFS = document.fullscreenElement === target.container;
    const mediaFS = target.media.getFeature(media.fullscreen)?.state.isFullscreen;
    return {
      isFullscreen: containerFS || mediaFS || false,
      fullscreenTarget: containerFS ? 'container' : mediaFS ? 'media' : null,
    };
  },

  subscribe: ({ target, update, signal }) => {
    // Container fullscreen
    listen(document, 'fullscreenchange', update, { signal });

    // iOS: media fullscreen
    target.media.getFeature(media.fullscreen)?.subscribe((s) => s.isFullscreen, update, { signal });
  },

  request: {
    enterFullscreen: (_, { target }) => {
      // container.requestFullscreen() || media fallback
    },
    exitFullscreen: (_, { target }) => {
      // document.exitFullscreen() || media fallback
    },
    toggleFullscreen: (_, { target, state }) => {
      // state.isFullscreen ? exit : enter
    },
  },
});
```

**Notes:**

- iOS Safari lacks container fullscreen — falls back to `media.fullscreen` feature
- `fullscreenTarget` indicates which element is fullscreen

### Other Features

**Idle** — Tracks user activity. Resets on `pointermove`, `pointerdown`, `keydown`. Optionally resets when media plays.

**Keyboard** — Keyboard shortcuts. Maps keys to requests (e.g., `Space` → `togglePlay`, `f` → `toggleFullscreen`).

**Gestures** — Touch gestures. Double-tap seek, swipe volume, pinch zoom.

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
