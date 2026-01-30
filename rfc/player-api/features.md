# Features

Features are the primary abstraction. They bundle related state and requests.

## Feature Definition

### createFeature

```ts
import { createFeature } from '@videojs/store';

const playbackFeature = createFeature<HTMLMediaElement>()({
  name: 'playback',

  initialState: { 
    paused: true, 
    ended: false 
  },

  getSnapshot: ({ target }) => ({
    paused: target.paused,
    ended: target.ended,
  }),

  subscribe: ({ target, update, signal }) => {
    target.addEventListener('play', update, { signal });
    target.addEventListener('pause', update, { signal });
    target.addEventListener('ended', update, { signal });
  },

  request: {
    play: (_, { target }) => target.play(),
    pause: (_, { target }) => target.pause(),
    toggle: (_, { target }) => target.paused ? target.play() : target.pause(),
  },
});
```

### Config Properties

| Property       | Type                          | Description                              |
| -------------- | ----------------------------- | ---------------------------------------- |
| `key`          | `symbol` (optional)           | Unique identifier. Auto-generated if not provided. |
| `name`         | `string`                      | Human-readable name for debugging        |
| `initialState` | `object`                      | Initial state before target attached     |
| `getSnapshot`  | `(ctx) => State`              | Derive state from target                 |
| `subscribe`    | `(ctx) => void`               | Set up subscriptions, call `update()` on changes |
| `request`      | `Record<string, RequestHandler>` | Actions that modify target           |

### Context Object

Both `getSnapshot`, `subscribe`, and `request` handlers receive a context:

```ts
interface FeatureContext {
  target: Target;        // HTMLMediaElement or PlayerTarget
  store: Store;          // Access other features via store.get()
  signal: AbortSignal;   // For cleanup (subscribe only)
  update: () => void;    // Trigger re-snapshot (subscribe only)
}
```

## Feature Keys

Features can define a custom key for identity and type-carrying.

### Pattern

```ts
// Define key
const PLAYBACK_KEY = Symbol.for('@videojs/playback');

// Create feature with key
const playbackFeature = createFeature({
  key: PLAYBACK_KEY,
  name: 'playback',
  // ...
});

// Export typed key
export const playbackKey: FeatureKey<typeof playbackFeature> = PLAYBACK_KEY;

// Export feature
export { playbackFeature };
```

### Usage

```ts
// Import just the key (smaller bundle, no feature code)
import { playbackKey } from '@videojs/core/features';

// Typed access
const playback = store.get(playbackKey); // PlaybackSlice | undefined
```

### FeatureKey Type

```ts
// Type carrier — key holds the feature's type info
type FeatureKey<F extends Feature> = symbol & { __feature?: F };
```

### Why Keys?

1. **Smaller imports** — Import just the key when you don't need the feature definition
2. **Cross-realm identity** — `Symbol.for()` works across module boundaries
3. **Type inference** — `FeatureKey<F>` carries the feature type for `store.get()`
## Feature Bundles

Bundles are sugar for common feature combinations.

### Base Bundles

```ts
// Video player base
features.video = [
  features.playback,
  features.volume,
  features.time,
  features.presentation,
  features.userActivity,
];

// Audio player base
features.audio = [
  features.playback,
  features.volume,
  features.time,
];
```

### Additional Bundles (Beta+)

```ts
features.streaming = [
  features.qualitySelection,
  features.audioTracks,
  features.textTracks,
];

features.ads = [
  features.adMarkers,
  features.adSkip,
  features.adCountdown,
];

features.live = [
  features.liveIndicator,
  features.lowLatency,
  features.seekToLive,
  features.dvr,
];
```

### Granular vs Bundled

```ts
// Granular — import individual features
import '@videojs/html/feature/quality-selection';
import '@videojs/html/feature/audio-tracks';

// Bundled — sugar for above + more
import '@videojs/html/feature/streaming';
```

### Extending Bundles

```ts
createPlayer({
  features: [features.video, features.streaming, myCustomFeature]
});
```

## Media vs Player Features

### Media Features

Target `HTMLMediaElement`. Handle playback, volume, time, etc.

```ts
const volumeFeature = createMediaFeature({
  name: 'volume',
  initialState: { 
    volume: 1, 
    muted: false 
  },
  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),
  // ...
});
```

### Player Features

Target the container element. Have access to media store via `store.get()`.

```ts
createPlayerFeature({
  subscribe: ({ store, target, update, signal }) => {
    // Access media features from player store
    const playback = store.get(features.playback);
});
```