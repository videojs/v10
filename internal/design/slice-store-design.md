---
status: implemented
---

# Slice-Based Store

Refactor `@videojs/store` to use "slice" terminology and add explicit `combine` primitive for composition.

## Problem

1. **"Feature" terminology in store package** - `@videojs/store` exports `defineFeature` which suggests media player concepts. Store primitives should be generic.

2. **Composition is hidden** - Features are passed as an array to `createStore`, which handles merging internally. No first-class composition primitive.

## Solution

Rename "feature" to "slice" in store package, add explicit `combine` function. "Feature" moves to `@videojs/core` as domain-specific alias.

**Layering:**
- `@videojs/store` - generic primitives: `defineSlice`, `combine`, `createStore`
- `@videojs/core` - `definePlayerFeature` (= `defineSlice<PlayerTarget>()`), pre-built features
- `createPlayer` accepts `features: []` array, uses `combine` internally

## Quick Start

```ts
// @videojs/store - Generic slice (config object pattern)
const volumeSlice = defineSlice<MediaElement>()({
  state: ({ task, target }) => ({
    volume: 1,
    setVolume(v: number) {
      return task(({ target }) => { target.volume = v; return v; });
    },
  }),
  attach: ({ target, set, signal }) => {
    const sync = () => set({ volume: target.volume });
    target.addEventListener('volumechange', sync);
    signal.addEventListener('abort', () => {
      target.removeEventListener('volumechange', sync);
    });
  },
});

// Compose slices
const store = createStore<MediaElement>()(combine(volumeSlice, playbackSlice));

// @videojs/core - definePlayerFeature = defineSlice<PlayerTarget>()
const volumeFeature = definePlayerFeature({
  state: ({ task }) => ({ volume: 1, setVolume: ... }),
  attach: ({ set }) => { ... },
});

// @videojs/html - createPlayer unchanged
createPlayer({ features: [volumeFeature, playbackFeature] });
```

## API

### defineSlice

Config object pattern - same structure as current `defineFeature`:

```ts
function defineSlice<Target>(): <State>(
  config: SliceConfig<Target, State>
) => Slice<Target, State>;

interface SliceConfig<Target, State> {
  state: (ctx: StateContext<Target>) => State;
  attach?: (ctx: AttachContext<Target, State>) => void;
}

interface StateContext<Target> {
  task: Task<Target, any>;
  target: () => Target;
}
```

### combine

Merge multiple slices into one:

```ts
function combine<Target, Slices extends Slice<Target, any>[]>(
  ...slices: Slices
): Slice<Target, UnionSliceState<Slices>>;
```

- State factories called, results merged (last wins on conflict)
- Attach handlers all run, errors caught and reported via `reportError`

### createStore

```ts
function createStore<Target>(): <State>(
  slice: Slice<Target, State>,
  options?: StoreOptions<Target, State>
) => Store<Target, State>;

// StoreOptions extends StoreCallbacks
interface StoreOptions<Target, State> extends StoreCallbacks<Target, State> {}
```

## Error Handling

`AttachContext` includes `reportError` for error reporting (named after the web standard `reportError()` API):

```ts
interface AttachContext<Target, State> {
  target: Target;
  signal: AbortSignal;
  store: AttachStore;
  get: () => Readonly<State>;
  set: (partial: Partial<State>) => void;
  reportError: (error: Error) => void;
}
```

`combine` catches errors in attach handlers and reports via `reportError`, allowing other handlers to continue.

## Package Layering

| Package | Exports | Description |
|---------|---------|-------------|
| `@videojs/store` | `defineSlice`, `combine`, `createStore`, `createSelector`, `Slice`, `AnySlice` | Generic primitives |
| `@videojs/core` | `definePlayerFeature`, pre-built features | `definePlayerFeature` = `defineSlice<PlayerTarget>()` |
| `@videojs/html` | `createPlayer` | Uses `combine` internally |

## Migration

Minimal changes - same config object pattern, just renamed:

```ts
// Before (store package)
import { defineFeature, createFeatureSelector } from '@videojs/store';
const feature = defineFeature<Target>()({ state: ..., attach: ... });
const store = createStore<Target>()({ features: [f1, f2] });
const select = createFeatureSelector(feature);

// After (store package)
import { defineSlice, combine, createSelector } from '@videojs/store';
const slice = defineSlice<Target>()({ state: ..., attach: ... });
const store = createStore<Target>()(combine(s1, s2));
const select = createSelector(slice);

// Core package - definePlayerFeature for player features
import { definePlayerFeature } from '@videojs/core';
const feature = definePlayerFeature({ state: ..., attach: ... }); // No <Target>() needed
```

## Trade-offs

| Gain | Cost |
|------|------|
| Cleaner package separation | Migration effort |
| Explicit composition via `combine` | One more concept |
| Generic store primitives | None |
