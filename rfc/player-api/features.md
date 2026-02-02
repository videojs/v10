# Features

Features are the primary abstraction. They bundle related state and actions as slices.

## Slice Definition

### defineSlice

```ts
import { defineSlice } from '@videojs/store';
import type { PlayerTarget } from '@videojs/core/dom';

const playbackSlice = defineSlice<PlayerTarget>()({
  state: ({ task }) => ({
    paused: true,
    ended: false,
    play: task('play', async ({ target }) => {
      await target.media.play();
    }),
    pause: task('pause', ({ target }) => {
      target.media.pause();
    }),
    toggle: task('toggle', async ({ target }) => {
      if (target.media.paused) {
        await target.media.play();
      } else {
        target.media.pause();
      }
    }),
  }),

  attach: ({ target, set, signal }) => {
    const { media } = target;

    const sync = () => set({
      paused: media.paused,
      ended: media.ended,
    });

    media.addEventListener('play', sync, { signal });
    media.addEventListener('pause', sync, { signal });
    media.addEventListener('ended', sync, { signal });
    sync();
  },
});
```

### Config Properties

| Property | Type                     | Description                              |
| -------- | ------------------------ | ---------------------------------------- |
| `state`  | `(ctx) => State`         | Initial state factory with task helper   |
| `attach` | `(ctx) => void`          | Set up subscriptions when target attached |

### State Context

The `state` function receives a context for defining tasks:

```ts
interface StateContext<Target> {
  task: TaskFactory<Target>;  // Create async actions
  target: () => Target;       // Get current target (throws if not attached)
}
```

### Attach Context

The `attach` function receives a context for syncing state:

```ts
interface AttachContext<Target, State> {
  target: Target;                       // The attached target
  signal: AbortSignal;                  // Cleanup signal
  get: () => State;                     // Read current state
  set: (partial: Partial<State>) => void; // Update state
  store: { state: State; subscribe: ... }; // Store access
}
```

## Combining Slices

Slices are combined into a single store:

```ts
import { combine, createStore } from '@videojs/store';

const playerSlice = combine(
  playbackSlice,
  volumeSlice,
  timeSlice,
  sourceSlice,
  bufferSlice,
);

const store = createStore<PlayerTarget>()(playerSlice);
```

## Feature Bundles

Bundles are pre-composed arrays of slices for common use cases.

### Base Bundles

```ts
import { features } from '@videojs/core/dom';

// Video player base
features.video = [
  playbackSlice,
  volumeSlice,
  timeSlice,
  sourceSlice,
  bufferSlice,
];

// Audio player base
features.audio = [
  playbackSlice,
  volumeSlice,
  timeSlice,
  sourceSlice,
  bufferSlice,
];
```

### Usage

```ts
import { createPlayer } from '@videojs/react';
import { features } from '@videojs/core/dom';

// Use bundle (spread required)
createPlayer({
  features: [...features.video],
});

// Extend bundle
createPlayer({
  features: [...features.video, myCustomSlice],
});
```

### Additional Bundles (Future)

```ts
features.streaming = [
  qualitySelectionSlice,
  audioTracksSlice,
  textTracksSlice,
];

features.ads = [
  adMarkersSlice,
  adSkipSlice,
  adCountdownSlice,
];

features.live = [
  liveIndicatorSlice,
  seekToLiveSlice,
  dvrSlice,
];
```

## Feature Selectors

Each slice has a corresponding selector for typed access:

```ts
import { createSelector } from '@videojs/store';

export const selectPlayback = createSelector(playbackSlice);
export const selectVolume = createSelector(volumeSlice);
export const selectTime = createSelector(timeSlice);
```

### Pre-built Selectors

Standard selectors are exported from `@videojs/core/dom`:

```ts
import {
  selectPlayback,
  selectVolume,
  selectTime,
  selectSource,
  selectBuffer,
} from '@videojs/core/dom';
```

### Usage

```tsx
import { selectPlayback } from '@videojs/core/dom';

function PlayButton() {
  const playback = usePlayer(selectPlayback);

  if (!playback) return null;

  return (
    <button onClick={playback.toggle}>
      {playback.paused ? 'Play' : 'Pause'}
    </button>
  );
}
```

## Feature Availability

Features may target capabilities the platform doesn't support.

```ts
const volumeSlice = defineSlice<PlayerTarget>()({
  state: () => ({
    volume: 1,
    muted: false,
    volumeAvailability: 'unsupported' as FeatureAvailability,
    // ...
  }),

  attach: ({ target, set, signal }) => {
    const { media } = target;

    // Check platform capability
    set({ volumeAvailability: canSetVolume(media) });

    // ...
  },
});
```

### FeatureAvailability Type

```ts
type FeatureAvailability = 'available' | 'unavailable' | 'unsupported';
```

| Value           | Meaning                                                |
| --------------- | ------------------------------------------------------ |
| `'unsupported'` | Platform can never do this (e.g., iOS volume)          |
| `'unavailable'` | Could work, not ready yet (e.g., waiting for manifest) |
| `'available'`   | Ready to use                                           |

### Handling Unavailable Features

```tsx
function VolumeSlider() {
  const volume = usePlayer(selectVolume);

  if (!volume) return null;

  // Hide if platform doesn't support volume control
  if (volume.volumeAvailability === 'unsupported') return null;

  // Disable if temporarily unavailable
  const disabled = volume.volumeAvailability !== 'available';

  return (
    <input
      type="range"
      value={volume.volume}
      onChange={(e) => volume.setVolume(Number(e.target.value))}
      disabled={disabled}
    />
  );
}
```

## Future Work

### Feature Keys

Typed symbols for feature identity (not yet implemented):

```ts
const PLAYBACK_KEY = Symbol.for('@videojs/playback');
export const playbackKey: FeatureKey<typeof playbackSlice> = PLAYBACK_KEY;

// Usage: smaller imports when you don't need the slice
import { playbackKey } from '@videojs/core/dom';
const playback = store.get(playbackKey);
```

**Deferred:** `createSelector` provides equivalent type-safe access without the complexity.
