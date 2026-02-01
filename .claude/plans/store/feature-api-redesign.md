# Feature API Redesign

Merge `getSnapshot` and `subscribe` into a single `attach` method with explicit `set()`.

## Overview

| Before | After |
|--------|-------|
| `state` (factory) | `state` (factory) — unchanged |
| `getSnapshot` | Merged into `attach` |
| `subscribe` | Renamed to `attach`, `update` → `set` |

## Current vs New

### Before

```ts
const playbackFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task }) => ({
    paused: true,
    play: () => task({ handler: ({ target }) => target.play() }),
  }),

  getSnapshot: ({ target }) => ({
    paused: target.paused,
  }),

  subscribe: ({ target, update, signal }) => {
    listen(target, 'play', update, { signal });
    listen(target, 'pause', update, { signal });
  },
});
```

### After

```ts
const playbackFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task, target }) => ({
    paused: true,
    play: () => task({ handler: () => target().play() }),
  }),

  attach({ target, signal, set }) {
    const sync = () => set({ paused: target.paused });

    sync();

    listen(target, 'play', sync, { signal });
    listen(target, 'pause', sync, { signal });
  },
});
```

## Changes

### 1. Remove `getSnapshot`

Initial sync now happens in `attach` by calling `set()` immediately.

### 2. Rename `subscribe` → `attach`

Better name — it's called when the store attaches to a target.

### 3. Replace `update` → `set(partial)`

Instead of calling `update()` which triggers `getSnapshot`, features call `set()` directly with the changed values:

```ts
// Before: update() triggers getSnapshot() internally
subscribe: ({ target, update, signal }) => {
  listen(target, 'play', update, { signal });
}

// After: set() directly with partial state
attach({ target, signal, set }) {
  const sync = () => set({ paused: target.paused });

  sync();

  listen(target, 'play', sync, { signal });
}
```

### 4. Add `get` to attach context

For features that need to read current state during sync:

```ts
attach({ target, signal, set, get }) {
  const sync = () => {
    const current = get();
    set({ started: current.started || !target.paused });
  };

  sync();

  listen(target, 'play', sync, { signal });
}
```

## Type Changes

```ts
// Remove
interface GetSnapshotContext<Target, State> { ... }
type GetSnapshot<Target, State> = ...

// Rename + modify
interface SubscribeContext<Target, State> { ... }  // Remove
interface AttachContext<Target, State> {           // New
  target: Target;
  signal: AbortSignal;
  set: (partial: Partial<State>) => void;
  get: () => Readonly<State>;
}

// Update FeatureConfig
interface FeatureConfig<Target, State> {
  state: (ctx: StateFactoryContext<Target>) => State;
  attach?: (ctx: AttachContext<Target, State>) => void;  // Optional, replaces getSnapshot + subscribe
}
```

## Store Changes

### Remove from `createStore`

- `syncAll()` — features call `set()` in attach
- `syncFeature()` — no more `getSnapshot` to call
- `getSnapshot` handling — merged into attach

### Simplified attach

```ts
function attach(newTarget: Target): () => void {
  // ... setup ...

  // Define context once, share across all features
  const attachCtx = {
    target: newTarget,
    signal,
    set: (partial: Partial<State>) => state.patch(partial),
    get: () => state.current,
  };

  for (const feature of features) {
    feature.attach?.(attachCtx);
  }

  return detach;
}
```

## Migration Examples

### volume.ts

```ts
// Before
export const volumeFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task }) => ({
    volume: 1,
    muted: false,
    changeVolume(volume: number) {
      return task({ key: 'volume', handler: ({ target }) => { target.volume = volume; } });
    },
  }),
  getSnapshot: ({ target }) => ({ volume: target.volume, muted: target.muted }),
  subscribe: ({ target, update, signal }) => {
    listen(target, 'volumechange', update, { signal });
  },
});

// After
export const volumeFeature = defineFeature<HTMLMediaElement>()({
  state: ({ task, target }) => ({
    volume: 1,
    muted: false,
    changeVolume(volume: number) {
      return task({ key: 'volume', handler: () => { target().volume = volume; } });
    },
  }),

  attach({ target, signal, set }) {
    const sync = () => set({ volume: target.volume, muted: target.muted });

    sync();

    listen(target, 'volumechange', sync, { signal });
  },
});
```

### buffer.ts (no actions, just sync)

```ts
// Before
export const bufferFeature = defineFeature<HTMLMediaElement>()({
  state: () => ({
    buffered: [] as [number, number][],
    seekable: [] as [number, number][],
  }),
  getSnapshot: ({ target }) => ({
    buffered: serializeTimeRanges(target.buffered),
    seekable: serializeTimeRanges(target.seekable),
  }),
  subscribe: ({ target, update, signal }) => {
    listen(target, 'progress', update, { signal });
    listen(target, 'emptied', update, { signal });
  },
});

// After
export const bufferFeature = defineFeature<HTMLMediaElement>()({
  state: () => ({
    buffered: [] as [number, number][],
    seekable: [] as [number, number][],
  }),

  attach({ target, signal, set }) {
    const sync = () => set({
      buffered: serializeTimeRanges(target.buffered),
      seekable: serializeTimeRanges(target.seekable),
    });

    sync();

    listen(target, 'progress', sync, { signal });
    listen(target, 'emptied', sync, { signal });
  },
});
```

## Files to Update

### Store Package

```
packages/store/src/core/feature.ts
  - Remove GetSnapshot, GetSnapshotContext, Subscribe, SubscribeContext
  - Add AttachContext
  - Update FeatureConfig (attach replaces getSnapshot + subscribe)

packages/store/src/core/store.ts
  - Remove syncAll(), syncFeature()
  - Update attach() to call feature.attach with new context
```

### Core Package

```
packages/core/src/dom/store/features/playback.ts
packages/core/src/dom/store/features/volume.ts
packages/core/src/dom/store/features/time.ts
packages/core/src/dom/store/features/source.ts
packages/core/src/dom/store/features/buffer.ts
```

### Tests

```
packages/store/src/core/tests/feature.test.ts
packages/store/src/core/tests/store.test.ts
```
