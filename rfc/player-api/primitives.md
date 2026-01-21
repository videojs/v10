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

## Solution: `hasFeature` Type Guard

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

## `hasFeature` Implementation

```ts
// @videojs/store - framework-agnostic

function hasFeature<T extends UnknownPlayer | UnknownMedia, F extends AnyFeature>(
  target: T,
  feature: F
): target is T & InferFeatureState<F> & ResolveFeatureRequestHandlers<F> {
  return getStore(target).features.has(feature.id);
}
```

The type guard:

1. Uses `getStore()` to access the underlying store
2. Checks `store.features.has(feature.id)` at runtime
3. Intersects the feature's state and request types for narrowing

## Cross-Framework Consistency

The same API works in React and Lit:

| Concept              | React                           | Lit/ReactiveElement                     |
| -------------------- | ------------------------------- | --------------------------------------- |
| Loosely typed player | `usePlayer()` → `UnknownPlayer` | `controller.value` → `UnknownPlayer`    |
| Store access         | `getStore(player)`              | `controller.store`                      |
| Type guard           | `hasFeature(player, feature)`   | `hasFeature(controller.value, feature)` |

### Package Exports

```ts
// @videojs/store (generic utilities)
export { hasFeature, getStore };

// @videojs/core/dom (player/media specific types)
export type { UnknownPlayer, UnknownMedia, UnknownPlayerStore, UnknownMediaStore };

// @videojs/react (re-exports + React-specific)
export { hasFeature, getStore } from '@videojs/store';
export type { UnknownPlayer, ... } from '@videojs/core/dom';
export { usePlayer, useMedia, createPlayer };

// @videojs/html (re-exports + Lit-specific)
export { hasFeature, getStore } from '@videojs/store';
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

### Optional Feature Enhancement

Primitives can use features optionally for enhanced behavior:

```tsx
import { features, hasFeature, usePlayer } from '@videojs/react';

export function TimeSlider() {
  const player = usePlayer();

  // Required feature
  if (!hasFeature(player, features.time)) {
    return null;
  }

  // Optional enhancement - pause while scrubbing
  const hasPlayback = hasFeature(player, features.playback);

  const onDragStart = () => {
    if (hasPlayback) player.pause();
  };

  const onDragEnd = () => {
    if (hasPlayback) player.play();
  };

  return (
    <Slider
      value={player.currentTime}
      max={player.duration}
      onChange={player.seek}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
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
