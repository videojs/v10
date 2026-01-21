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

## Solution: `hasFeature` and `getFeature`

Two functions for feature access:

| Function                | Returns                              | Use case                           |
| ----------------------- | ------------------------------------ | ---------------------------------- |
| `hasFeature(player, f)` | `boolean` (type guard)               | Conditional narrowing, `if` blocks |
| `getFeature(player, f)` | Typed object, props `T \| undefined` | Direct access, optional chaining   |

### `hasFeature` — Type Guard

```tsx
import { features, hasFeature, usePlayer } from '@videojs/react';

export function PlayButton() {
  const player = usePlayer(); // UnknownPlayer - loosely typed

  if (!hasFeature(player, features.playback)) {
    return null; // Feature not in store
  }

  // TypeScript narrows: player.paused and player.play() are now typed
  return <button onClick={player.play}>{player.paused ? '▶' : '⏸'}</button>;
}
```

Early returns work fine in React — the hooks rule is about not _calling_ hooks conditionally, not conditional rendering.

### `getFeature` — Direct Access

```tsx
import { features, getFeature, usePlayer } from '@videojs/react';

export function PlayButton() {
  const player = usePlayer();
  const playback = getFeature(player, features.playback);

  // Properties are T | undefined - safe to access
  // If feature missing, properties return undefined
  return <button onClick={playback.paused ? playback.play : playback.pause}>{playback.paused ? '▶' : '⏸'}</button>;
}
```

With optional chaining:

```tsx
const playback = getFeature(player, features.playback);
playback.play?.(); // Safe - no crash if undefined
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

Both `hasFeature` and `getFeature` work with any `StoreProxy<T>`.

### `hasFeature`

```ts
function hasFeature<T extends StoreProxy, F extends AnyFeature>(
  target: T,
  feature: F
): target is T & InferFeatureState<F> & ResolveFeatureRequestHandlers<F> {
  const store = target[STORE_SYMBOL];
  return store.features.has(feature.id);
}
```

The type guard:

1. Accesses the underlying store via `[STORE_SYMBOL]`
2. Checks `store.features.has(feature.id)` at runtime
3. Narrows the proxy type to include feature's state and requests

### `getFeature`

```ts
// Return type: flat proxy, each property T | undefined
type MaybeFeature<F extends AnyFeature> = {
  [K in keyof (InferFeatureState<F> & ResolveFeatureRequestHandlers<F>)]:
    | (InferFeatureState<F> & ResolveFeatureRequestHandlers<F>)[K]
    | undefined;
};

function getFeature<T extends StoreProxy, F extends AnyFeature>(target: T, feature: F): MaybeFeature<F> {
  // Returns the same proxy - properties are undefined if feature missing
  return target as MaybeFeature<F>;
}
```

Returns the same proxy, typed to the feature. If feature is missing, property access returns `undefined` at runtime (proxy behavior), and types reflect this with `T | undefined`.

## Cross-Framework Consistency

The same API works in React and Lit:

| Concept              | React                           | Lit/ReactiveElement                     |
| -------------------- | ------------------------------- | --------------------------------------- |
| Loosely typed player | `usePlayer()` → `UnknownPlayer` | `controller.value` → `UnknownPlayer`    |
| Type guard           | `hasFeature(player, feature)`   | `hasFeature(controller.value, feature)` |
| Direct access        | `getFeature(player, feature)`   | `getFeature(controller.value, feature)` |

### Package Exports

```ts
// @videojs/store (generic utilities)
export { createProxy, hasFeature, getFeature, subscribe };
export type { StoreProxy };

// @videojs/core/dom (player/media specific types)
export type { UnknownPlayer, UnknownMedia, UnknownPlayerStore, UnknownMediaStore };

// @videojs/react (re-exports + React-specific)
export { hasFeature, getFeature } from '@videojs/store';
export type { UnknownPlayer, ... } from '@videojs/core/dom';
export { usePlayer, useMedia, createPlayer };

// @videojs/html (re-exports + Lit-specific)
export { hasFeature, getFeature } from '@videojs/store';
export type { UnknownPlayer, ... } from '@videojs/core/dom';
export { PlayerController, MediaController, createPlayer };
```

## Examples

### React Primitive

```tsx
import { features, hasFeature, usePlayer } from '@videojs/react';

export function PlayButton() {
  const player = usePlayer();

  if (!hasFeature(player, features.playback)) {
    return null;
  }

  return <button onClick={player.paused ? player.play : player.pause}>{player.paused ? '▶' : '⏸'}</button>;
}
```

### ReactiveElement Primitive

```ts
import { html } from 'lit';

import { features, hasFeature, PlayerController } from '@videojs/html';

export class PlayButton extends ReactiveElement {
  #player = new PlayerController(this);

  render() {
    const player = this.#player.value;

    if (!hasFeature(player, features.playback)) {
      return null;
    }

    const { paused, play, pause } = player;
    return html` <button @click=${paused ? play : pause}>${paused ? '▶' : '⏸'}</button> `;
  }
}

customElements.define('vjs-play-button', PlayButton);
```

### Optional Feature with `getFeature`

Use `getFeature` when you want optional access without conditional blocks:

```tsx
import { features, getFeature, hasFeature, usePlayer } from '@videojs/react';

export function TimeSlider() {
  const player = usePlayer();

  // Required feature - use hasFeature for early return
  if (!hasFeature(player, features.time)) {
    return null;
  }

  // Optional feature - use getFeature for safe access
  const playback = getFeature(player, features.playback);

  return (
    <Slider
      value={player.currentTime}
      max={player.duration}
      onChange={player.seek}
      onDragStart={playback.pause} // undefined if no playback feature
      onDragEnd={playback.play} // undefined if no playback feature
    />
  );
}
```

### Combining Multiple Features with `getFeature`

```tsx
import { features, getFeature, usePlayer } from '@videojs/react';

export function MediaInfo() {
  const player = usePlayer();

  const playback = getFeature(player, features.playback);
  const time = getFeature(player, features.time);
  const volume = getFeature(player, features.volume);

  return (
    <div>
      {playback.paused !== undefined && <span>{playback.paused ? 'Paused' : 'Playing'}</span>}
      {time.currentTime !== undefined && <span>{time.currentTime}s</span>}
      {volume.volume !== undefined && <span>{Math.round(volume.volume * 100)}%</span>}
    </div>
  );
}
```
