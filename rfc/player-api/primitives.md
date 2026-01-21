# Primitives API

Guide for library authors building UI primitives (like `<PlayButton>`, `<VolumeSlider>`).

## Problem

Primitives don't know which preset the user chose:

```tsx
// Inside @videojs/react - shipped to users
export function PlayButton() {
  const player = usePlayer(); // What type is this?
  // User might use presets.website or presets.background
  // We don't know if playbackFeature is included
}
```

They need:

1. Loosely typed access to the player
2. A way to check if a feature exists
3. Type narrowing when the feature is present

## Solution: `hasFeature`, `getFeature`, `throwMissingFeature`

Three utilities for feature access:

| Function                | Returns                              | Use case                           |
| ----------------------- | ------------------------------------ | ---------------------------------- |
| `hasFeature(player, f)` | `boolean` (type guard)               | Conditional narrowing, `if` blocks |
| `getFeature(player, f)` | Typed object, props `T \| undefined` | Direct access, optional chaining   |
| `throwMissingFeature`   | `never` (throws)                     | Critical features, fail fast       |

### `hasFeature` — Type Guard

```tsx
import { features, hasFeature, throwMissingFeature, usePlayer } from '@videojs/react';

export function PlayButton() {
  const player = usePlayer(); // UnknownPlayer - loosely typed

  if (!hasFeature(player, features.playback)) {
    throwMissingFeature(features.playback, { displayName: 'PlayButton' });
  }

  // TypeScript narrows: player.paused and player.play() are now typed
  return <button onClick={player.play}>{player.paused ? '▶' : '⏸'}</button>;
}
```

### `getFeature` — Direct Access

For optional features, use `getFeature` with safe access:

```tsx
const volume = getFeature(player, features.volume);
volume.setVolume?.(0.5); // Safe - no crash if undefined
```

## Types

### `StoreProxy<T>` Contract

All proxies implement `StoreProxy<T>`, which holds a reference to the underlying store:

```ts
const STORE_SYMBOL: unique symbol;

interface StoreProxy<T extends AnyStore = AnyStore> {
  readonly [STORE_SYMBOL]: T;
  [key: string]: unknown;
}
```

The index signature `[key: string]: unknown` allows any property access. After `hasFeature` narrows, explicit properties take precedence.

### Proxy Types

```ts
interface UnknownPlayerStore extends Store<PlayerTarget, []> {}
interface UnknownMediaStore extends Store<MediaTarget, []> {}

interface UnknownPlayer extends StoreProxy<UnknownPlayerStore> {}
interface UnknownMedia extends StoreProxy<UnknownMediaStore> {}
```

The `[]` for features means "no features statically typed" — the store has features at runtime, but TypeScript doesn't know which ones. Use `hasFeature` to narrow.

### Type Summary

| Type                 | Description                        |
| -------------------- | ---------------------------------- |
| `StoreProxy<T>`      | Base interface for all proxies     |
| `UnknownPlayer`      | Player proxy with unknown features |
| `UnknownMedia`       | Media proxy with unknown features  |
| `UnknownPlayerStore` | Player store with unknown features |
| `UnknownMediaStore`  | Media store with unknown features  |

### Creating Proxies

Internally, proxies are created from stores via `createProxy()`:

```ts
import { createProxy } from '@videojs/store';

const store = createStore({ ... });
const proxy = createProxy(store); // StoreProxy<typeof store>
```

This is used internally by `createPlayer` and controllers. Library authors typically receive proxies via `usePlayer()` or `controller.value`.

### Via Controller (Lit/ReactiveElement)

Controllers expose the proxy via `.value`:

```ts
const controller = new PlayerController(this);
controller.value; // UnknownPlayer (tracked proxy)
```

## Implementation

Both functions access `target[STORE_SYMBOL].features.has(feature.id)` at runtime:

- **`hasFeature`** — Type guard that narrows the proxy to include feature's state and requests
- **`getFeature`** — Returns same proxy typed to feature, with properties as `T | undefined`

## Cross-Framework Consistency

The same API works in React and Lit:

| Concept              | React                                | Lit/ReactiveElement                     |
| -------------------- | ------------------------------------ | --------------------------------------- |
| Loosely typed player | `usePlayer()` → `UnknownPlayer`      | `controller.value` → `UnknownPlayer`    |
| Type guard           | `hasFeature(player, feature)`        | `hasFeature(controller.value, feature)` |
| Direct access        | `getFeature(player, feature)`        | `getFeature(controller.value, feature)` |
| Throw on missing     | `throwMissingFeature(feature, opts)` | `throwMissingFeature(feature, opts)`    |

### Package Exports

| Package             | Exports                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `@videojs/store`    | `createProxy`, `hasFeature`, `getFeature`, `throwMissingFeature`, `subscribe`, `StoreProxy` |
| `@videojs/core/dom` | `UnknownPlayer`, `UnknownMedia`, `UnknownPlayerStore`, `UnknownMediaStore`                  |
| `@videojs/react`    | Re-exports above + `usePlayer`, `useMedia`, `createPlayer`                                  |
| `@videojs/html`     | Re-exports above + `PlayerController`, `MediaController`, `createPlayer`                    |

## Example: Mixing Required and Optional

```tsx
export function TimeSlider() {
  const player = usePlayer();

  // Required — throw if missing
  if (!hasFeature(player, features.time)) {
    throwMissingFeature(features.time, { displayName: 'TimeSlider' });
  }

  // Optional — graceful degradation
  const playback = getFeature(player, features.playback);
  return <Slider onDragStart={playback.pause} onDragEnd={playback.play} />;
}
```
