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

### Loosely Typed Proxies

```ts
type UnknownPlayer = {
  [key: string]: unknown; // Any property accessible
};

type UnknownMedia = {
  [key: string]: unknown;
};
```

The index signature `[key: string]: unknown` allows any property access. After `hasFeature` narrows, explicit properties take precedence.

Use `getStore()` to access the underlying store from a proxy.

### Unknown Stores

```ts
type UnknownPlayerStore = Store<PlayerTarget, []>;
type UnknownMediaStore = Store<MediaTarget, []>;
```

The `[]` for features means "no features statically typed" — the store has features at runtime, but TypeScript doesn't know which ones. Use `hasFeature` to narrow.

### Type Summary

| Type                 | Description                 |
| -------------------- | --------------------------- |
| `UnknownPlayer`      | Loosely typed player proxy  |
| `UnknownMedia`       | Loosely typed media proxy   |
| `UnknownPlayerStore` | Store with unknown features |
| `UnknownMediaStore`  | Store with unknown features |

## Store Access

### Via `getStore()`

Access the underlying store from a player proxy:

```ts
import { getStore, usePlayer } from '@videojs/react';

const player = usePlayer();
const store = getStore(player); // UnknownPlayerStore (inferred)

// Check feature registry directly
store.features.has(playbackFeature.id);
```

`getStore()` infers the correct store type based on the input:

- `getStore(player)` → `UnknownPlayerStore`
- `getStore(media)` → `UnknownMediaStore`

### Via Controller (Lit/ReactiveElement)

Controllers expose `.store` directly:

```ts
const controller = new PlayerController(this);
controller.store; // UnknownPlayerStore (direct)
controller.value; // UnknownPlayer (tracked proxy)
```

## Implementation

Both `hasFeature` and `getFeature` work with **stores** and **proxies** via the `StoreHost` contract.

### `StoreHost` Contract

```ts
const STORE_SYMBOL: unique symbol;

interface StoreHost {
  readonly [STORE_SYMBOL]: AnyStore;
}

// Proxy: STORE_SYMBOL returns underlying store
proxy[STORE_SYMBOL]; // → store

// Store: STORE_SYMBOL returns itself
store[STORE_SYMBOL]; // → store (self-referential)
```

### `hasFeature` — Overloaded

```ts
// For stores - returns boolean
function hasFeature(store: AnyStore, feature: AnyFeature): boolean;

// For proxies - type guard that narrows
function hasFeature<T extends StoreHost, F extends AnyFeature>(
  target: T,
  feature: F
): target is T & InferFeatureState<F> & ResolveFeatureRequestHandlers<F>;

// Implementation
function hasFeature(target, feature) {
  const store = target[STORE_SYMBOL];
  return store.features.has(feature.id);
}
```

### `getFeature` — Overloaded

```ts
// Return type for proxies: flat, each property T | undefined
type MaybeFeature<F extends AnyFeature> = {
  [K in keyof (InferFeatureState<F> & ResolveFeatureRequestHandlers<F>)]:
    | (InferFeatureState<F> & ResolveFeatureRequestHandlers<F>)[K]
    | undefined;
};

// Return type for stores: { state, request } typed to feature
type StoreFeatureView<F extends AnyFeature> = {
  state: InferFeatureState<F>;
  request: ResolveFeatureRequestHandlers<F>;
};

// For stores - returns store typed to feature, or undefined
function getFeature<S extends AnyStore, F extends AnyFeature>(
  store: S,
  feature: F
): (S & StoreFeatureView<F>) | undefined;

// For proxies - returns proxy typed to feature (props T | undefined)
function getFeature<T extends StoreHost, F extends AnyFeature>(target: T, feature: F): MaybeFeature<F>;

// Implementation
function getFeature(target, feature) {
  const store = target[STORE_SYMBOL];
  const isStore = store === target;

  if (!store.features.has(feature.id)) {
    return isStore ? undefined : target;
  }

  return isStore ? store : target;
}
```

| Input | `getFeature` returns                            | `hasFeature` returns |
| ----- | ----------------------------------------------- | -------------------- |
| Store | Store typed to feature, or `undefined`          | `boolean`            |
| Proxy | Proxy typed to feature (props `T \| undefined`) | Type guard (narrows) |

## Cross-Framework Consistency

The same API works in React and Lit:

| Concept              | React                           | Lit/ReactiveElement                     |
| -------------------- | ------------------------------- | --------------------------------------- |
| Loosely typed player | `usePlayer()` → `UnknownPlayer` | `controller.value` → `UnknownPlayer`    |
| Store access         | `getStore(player)`              | `controller.store`                      |
| Type guard           | `hasFeature(player, feature)`   | `hasFeature(controller.value, feature)` |
| Direct access        | `getFeature(player, feature)`   | `getFeature(controller.value, feature)` |

### Package Exports

```ts
// @videojs/store (generic utilities)
export { hasFeature, getFeature, getStore };

// @videojs/core/dom (player/media specific types)
export type { UnknownPlayer, UnknownMedia, UnknownPlayerStore, UnknownMediaStore };

// @videojs/react (re-exports + React-specific)
export { hasFeature, getFeature, getStore } from '@videojs/store';
export type { UnknownPlayer, ... } from '@videojs/core/dom';
export { usePlayer, useMedia, createPlayer };

// @videojs/html (re-exports + Lit-specific)
export { hasFeature, getFeature, getStore } from '@videojs/store';
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

### Direct Store Access

For advanced cases, access the store directly:

```tsx
import { getStore, usePlayer } from '@videojs/react';

function DebugPanel() {
  const player = usePlayer();
  const store = getStore(player);

  return (
    <pre>
      Features: {store.features.size}
      Attached: {store.target !== null}
    </pre>
  );
}
```
