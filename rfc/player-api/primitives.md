# Primitives API

Guide for library authors building UI primitives (like `<media-play-button>`, `<media-slider>`).

## Problem

Primitives don't know which features the user configured:

```tsx
// Inside @videojs/react — shipped to users
export function PlayButton() {
  // User might use features.video or a custom subset
  // We don't know if playback slice is included
}
```

They need:

1. Access to the player store
2. A way to check if a feature exists
3. Type narrowing when the feature is present

## Solution: Selector-Based Access

### React

```tsx
import { selectPlayback } from '@videojs/core/dom';

export function PlayButton() {
  const playback = usePlayer(selectPlayback);

  if (!playback) return null;

  // TypeScript knows playback shape
  return (
    <button onClick={playback.toggle}>
      {playback.paused ? 'Play' : 'Pause'}
    </button>
  );
}
```

### HTML

```ts
import { MediaElement } from '@videojs/html';
import { selectPlayback } from '@videojs/core/dom';

class MediaPlayButton extends MediaElement {
  #playback = new PlayerController(this, context, selectPlayback);

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.#handleClick);
  }

  #handleClick = () => {
    this.#playback.value?.toggle();
  };

  override update() {
    const playback = this.#playback.value;
    if (!playback) return;

    this.setAttribute('aria-pressed', String(!playback.paused));
  }
}
```

## Selector Types

Selectors extract typed state from the store:

```ts
import { createSelector } from '@videojs/store';

const selectPlayback = createSelector(playbackSlice);
// Type: (state: Record<string, unknown>) => PlaybackState | undefined
```

Returns `undefined` when the slice isn't configured.

## Patterns

### Required Feature

If a primitive requires a feature to function:

```tsx
export function VolumeSlider() {
  const volume = usePlayer(selectVolume);

  // Return nothing if feature not available
  if (!volume) return null;

  return (
    <input
      type="range"
      value={volume.volume}
      onChange={(e) => volume.setVolume(Number(e.target.value))}
    />
  );
}
```

### Optional Feature Enhancement

If a primitive works without a feature but enhances with it:

```tsx
export function TimeSlider() {
  const time = usePlayer(selectTime);
  const playback = usePlayer(selectPlayback);

  if (!time) return null;

  return (
    <input
      type="range"
      value={time.currentTime}
      max={time.duration}
      onChange={(e) => time.seek(Number(e.target.value))}
      // Optional: pause during drag
      onMouseDown={() => playback?.pause()}
      onMouseUp={() => playback?.play()}
    />
  );
}
```

### Multiple Required Features

```tsx
export function Controls() {
  const playback = usePlayer(selectPlayback);
  const volume = usePlayer(selectVolume);
  const fullscreen = usePlayer(selectFullscreen);

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

### Custom Selectors

Derive values from state:

```tsx
// Select specific value
const paused = usePlayer((s) => s.paused);

// Derive value
const isPlaying = usePlayer((s) => !s.paused && !s.ended);

// Combine multiple properties
const state = usePlayer((s) => ({
  paused: s.paused,
  volume: s.volume,
}));
```

## Cross-Framework Consistency

Same pattern works in React and HTML:

| Concept         | React                      | HTML                                         |
| --------------- | -------------------------- | -------------------------------------------- |
| Hook/Controller | `usePlayer(selector)`      | `new PlayerController(this, ctx, selector)`  |
| Get state       | returns state              | `controller.value`                           |
| Check existence | `if (!state)`              | `if (!value)`                                |
| Access state    | `state.paused`             | `value.paused`                               |
| Call action     | `state.play()`             | `value.play()`                               |

## Feature Availability

Features may target capabilities the platform doesn't support.

```tsx
const volume = usePlayer(selectVolume);
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

## Package Exports

### @videojs/store

```ts
import { shallowEqual, createSelector } from '@videojs/store';
```

### @videojs/core/dom

```ts
import {
  features,
  selectPlayback,
  selectVolume,
  selectTime,
  selectSource,
  selectBuffer,
} from '@videojs/core/dom';
```

### @videojs/react

```ts
import { createPlayer } from '@videojs/react';

// From createPlayer result
const { Provider, Container, usePlayer, useMedia } = createPlayer({ ... });
```

### @videojs/html

```ts
import { createPlayer, MediaElement } from '@videojs/html';

// From createPlayer result
const {
  context,
  PlayerElement,
  PlayerController,
  PlayerMixin,
  ProviderMixin,
  ContainerMixin,
} = createPlayer({ ... });
```
