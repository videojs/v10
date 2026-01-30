# Primitives API

Guide for library authors building UI primitives (like `<media-play-button>`, `<media-slider>`).

## Problem

Primitives don't know which features the user configured:

```tsx
// Inside @videojs/react — shipped to users
export function PlayButton() {
  // User might use features.video or a custom subset
  // We don't know if playback feature is included
}
```

They need:

1. Access to the player store
2. A way to check if a feature exists
3. Type narrowing when the feature is present

## Solution: Feature Access Pattern

### React

```tsx
import { usePlayer, features } from '@videojs/react';

export function PlayButton() {
  const playback = usePlayer(features.playback);

  if (!playback) return null;

  // TypeScript knows playback is PlaybackSlice
  return (
    <button onClick={playback.paused ? playback.play : playback.pause}>
      {playback.paused ? 'Play' : 'Pause'}
    </button>
  );
}
```

### HTML

```ts
import { features, MediaElement, PlayerController } from '@videojs/html';

class MediaPlayButton extends MediaElement {
  #playback = new PlayerController(this, features.playback);

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.#handleClick);
  }

  #handleClick = () => {
    this.#playback.value?.toggle();
  };
}
```

## Types

### FeatureKey

Type carrier for feature keys:

```ts
type FeatureKey<F extends Feature> = symbol & { __feature?: F };
```

Use with `store.get()` for typed access:

```ts
import { playbackKey } from '@videojs/core/features';

const playback = store.get(playbackKey); // PlaybackSlice | undefined
```

### InferFeatureSlice

Infer the slice type from a feature:

```ts
type PlaybackSlice = InferFeatureSlice<typeof playbackFeature>;
// { paused: boolean; ended: boolean; play(): void; pause(): void; toggle(): void }
```

## Patterns

### Required Feature

If a primitive requires a feature to function:

```tsx
export function VolumeSlider() {
  const volume = usePlayer(features.volume);

  // Return nothing if feature not available
  if (!volume) return null;

  return <Slider value={volume.volume} onChange={volume.setVolume} />;
}
```

### Optional Feature Enhancement

If a primitive works without a feature but enhances with it:

```tsx
export function TimeSlider() {
  const time = usePlayer(features.time);
  const playback = usePlayer(features.playback);

  if (!time) return null;

  return (
    <Slider
      value={time.currentTime}
      max={time.duration}
      onChange={time.seek}
      // Optional: pause during drag
      onDragStart={playback?.pause}
      onDragEnd={playback?.play}
    />
  );
}
```

### Multiple Required Features

```tsx
export function Controls() {
  const playback = usePlayer(features.playback);
  const volume = usePlayer(features.volume);
  const fullscreen = usePlayer(features.fullscreen);

  // All required
  if (!playback || !volume || !fullscreen) return null;

  return (
    <div>
      <PlayButton playback={playback} />
      <VolumeSlider volume={volume} />
      <FullscreenButton fullscreen={fullscreen} />
    </div>
  );
}
```

## Cross-Framework Consistency

Same pattern works in React and HTML:

| Concept         | React                | HTML                                        |
| --------------- | -------------------- | ------------------------------------------- |
| Hook/Controller | `usePlayer(feature)` | `new PlayerController(this, feature)`       |
| Get slice       | returns slice        | `controller.value`                          |
| Check existence | `if (!slice)`        | `if (!slice)`                               |
| Access state    | `slice.paused`       | `slice.paused`                              |
| Call request    | `slice.play()`       | `slice.play()`                              |
## Package Exports

### @videojs/store

```ts
import { shallowEqual } from '@videojs/store';
```

### @videojs/core

```ts
import { 
  features, createMediaFeature, createPlayerFeature,  
  playbackKey, volumeKey, timeKey  
} from '@videojs/core/dom';
```

### @videojs/react

```ts
import { createPlayer, usePlayer, features } from '@videojs/react';
```

### @videojs/html

```ts
import { createPlayer, features, MediaElement, PlayerController } from '@videojs/html';
```

## Feature Availability

Features may target capabilities the platform doesn't support.

```ts
// iOS Safari doesn't allow programmatic volume control
const volume = usePlayer(features.volume);
volume?.volumeAvailability; // 'available' | 'unavailable' | 'unsupported'
```

| Value           | Meaning                                                |
| --------------- | ------------------------------------------------------ |
| `'unsupported'` | Platform can never do this (e.g., iOS volume)          |
| `'unavailable'` | Could work, not ready yet (e.g., waiting for manifest) |
| `'available'`   | Ready to use                                           |

### Handling Unavailable Features

```tsx
export function VolumeSlider() {
  const volume = usePlayer(features.volume);

  if (!volume) return null;

  // Hide if platform doesn't support volume control
  if (volume.volumeAvailability === 'unsupported') return null;

  // Disable if temporarily unavailable
  const disabled = volume.volumeAvailability !== 'available';

  return <Slider value={volume.volume} onChange={volume.setVolume} disabled={disabled} />;
}
