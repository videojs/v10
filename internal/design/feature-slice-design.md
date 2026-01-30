---
status: draft
date: 2025-01-29
---

# Feature Slice Design

## Problem

Primitives don't know which preset the user chose:

```tsx
// Inside @videojs/react - shipped to users
export function PlayButton() {
  const player = usePlayer(); // What type is this?
  // User will use custom feature configuration
  // We don't know if `playbackFeature` is included
}
```

They need:

1. Loosely typed access to the player
2. A way to check if a feature exists
3. Type narrowing when the feature is present

## Solution

A `FeatureSlice` provides typed, scoped access to a feature's state and requests. Two API layers:

1. **Primitive** — generic, explicit store/feature
2. **Player-specific** — typed by registry, uses context

## Design

### Feature Definition

Features have a typed `name` (literal type preserved):

```ts
const playbackFeature = createFeature<HTMLMediaElement>()({
  name: 'playback',  // Type: 'playback' (literal)
  initialState: { paused: true },
  request: { play, pause },
});
```

### Store API

```ts
// By reference — typed from feature
store.getFeature(playbackFeature);

// By name — typed from store's features array
store.getFeature('playback');
```

Returns `FeatureSlice | undefined`. Flat access to state and requests:

```ts
const playback = store.getFeature(playbackFeature);

if (!playback) return null;

playback.paused;          // State (flat)
playback.play();          // Request (flat)
playback.subscribe(cb);   // Scoped subscription
```

### Primitive Layer (`@videojs/store`)

Generic APIs that require explicit store/feature:

```ts
// React — explicit store + feature
const playback = useFeature(store, playbackFeature);

// Lit — explicit store + feature
#playback = new FeatureController(host, store, playbackFeature);
```

### Player Layer (`@videojs/core/dom`, `@videojs/react`, `@videojs/html`)

Typed by `PlayerFeatureRegistry`, uses context:

```ts
// Registry (manually maintained)
interface PlayerFeatureRegistry {
  playback: typeof playbackFeature;
  volume: typeof volumeFeature;
  time: typeof timeFeature;
}

// Utility
getPlayerFeature(store, 'playback');  // Typed

// React — uses player context
usePlayerFeature('playback');  // Typed, store from context

// Lit — uses player context
new PlayerFeatureController(host, 'playback');  // Typed
```

### Usage Examples

**React primitive (custom feature):**

```tsx
function CustomControl() {
  const store = useStore();
  const custom = useFeature(store, myCustomFeature);
  // ...
}
```

**React player-specific:**

```tsx
function PlayButton() {
  const playback = usePlayerFeature('playback');
  
  if (!playback) return null;

  // ...
}
```

**Lit player-specific:**

```ts
class PlayButton extends ReactiveElement {
  #core = new PlayButtonCore();
  #playback = new PlayerFeatureController(this, 'playback');
  
  protected override update(changed: PropertyValues) {
    super.update(changed);
    applyElementProps(this, this.#core.getProps(this.#playback.value));
  }
}
```

## FeatureSlice

A thin lens over the store — flat access, scoped subscription:

- State keys exposed directly (not `.state.paused`)
- Request keys exposed directly (not `.request.play()`)
- `subscribe()` for scoped updates (reserved name)

## Rationale

1. **Type safety** — Types flow from feature reference or registry
2. **No collisions** — Features keyed by symbol (unique)
3. **Layered API** — Primitive layer is generic, player layer is typed and convenient
4. **Familiar pattern** — Similar to Jotai atoms, Vue InjectionKey

## Related

See [feature-availability-design](feature-availability-design.md) for capability detection patterns.

## Files

| Package | File | Change |
|---------|------|--------|
| `store` | `src/core/feature-slice.ts` | New — `FeatureSlice` class |
| `store` | `src/core/store.ts` | Add `getFeature()` |
| `store` | `src/react/use-feature.ts` | New — `useFeature` hook |
| `store` | `src/lit/feature-controller.ts` | New — `FeatureController` |
| `core/dom` | `src/store/registry.ts` | New — `PlayerFeatureRegistry` |
| `react` | `src/use-player-feature.ts` | New — `usePlayerFeature` hook |
| `html` | `src/player-feature-controller.ts` | New — `PlayerFeatureController` |
