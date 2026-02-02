# API

Surface API for React and HTML.

## createPlayer

### React

```ts
import { createPlayer } from '@videojs/react';
import { features } from '@videojs/core/dom';

const { Provider, Container, usePlayer, useMedia } = createPlayer({
  features: [...features.video],
});
```

**Returns:**

| Export      | Purpose                                      |
| ----------- | -------------------------------------------- |
| `Provider`  | Creates store, provides context              |
| `Container` | Attaches container element, observes media   |
| `usePlayer` | Access player state via selector             |
| `useMedia`  | Access current media element                 |

### HTML

```ts
import { createPlayer } from '@videojs/html';
import { features } from '@videojs/core/dom';

const {
  context,
  create,
  PlayerElement,
  PlayerController,
  PlayerMixin,
  ProviderMixin,
  ContainerMixin,
} = createPlayer({
  features: [...features.video],
});

customElements.define('video-player', PlayerElement);
```

**Returns:**

| Export             | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `context`          | Player context for controllers                      |
| `create`           | Factory to create store instance                    |
| `PlayerElement`    | Combined provider + container element (common case) |
| `PlayerController` | Controller for accessing player state               |
| `PlayerMixin`      | Mixin for custom player elements                    |
| `ProviderMixin`    | Mixin for provider-only elements                    |
| `ContainerMixin`   | Mixin for container-only elements                   |

### Config

```ts
import { features } from '@videojs/core/dom';

// Feature bundles (recommended)
createPlayer({
  features: [...features.video],
});

// Extended bundle
createPlayer({
  features: [...features.video, ...features.streaming],
});

// Custom features
createPlayer({
  features: [...features.video, myCustomSlice],
});
```

## usePlayer (React)

Access player state with selector-based subscriptions.

### Overloads

```ts
// 1. No selector — returns full store (re-renders on any change)
usePlayer(): Store

// 2. With selector — returns selected value (re-renders when selected value changes)
usePlayer(selector): R
```

### Examples

```tsx
import { selectPlayback, selectVolume, selectTime } from '@videojs/core/dom';

// Get playback state
const playback = usePlayer(selectPlayback);
if (!playback) return null;
playback.paused;  // boolean
playback.ended;   // boolean

// Get specific value
const paused = usePlayer((s) => s.paused);

// Derive value
const isPlaying = usePlayer((s) => !s.paused && !s.ended);

// Select across multiple properties
const state = usePlayer((s) => ({
  paused: s.paused,
  volume: s.volume,
}));
```

### Performance

> **Warning:** Selectors without scoping subscribe to all state changes. During playback, `currentTime` updates frequently (4-60 times/sec). Use feature selectors for optimal performance.

```tsx
// Bad — re-renders on every currentTime update
const state = usePlayer((s) => s);

// Good — only re-renders when playback state changes
const playback = usePlayer(selectPlayback);

// Good — only re-renders when paused changes
const paused = usePlayer((s) => s.paused);
```

### Selector Comparison

Selectors returning objects use `shallowEqual` comparison:

```tsx
// Re-renders only when paused OR volume changes
const state = usePlayer((s) => ({
  paused: s.paused,
  volume: s.volume,
}));
```

`shallowEqual` is exported from `@videojs/store` for custom use.

## useMedia (React)

Access the current media element.

```tsx
const media = useMedia();

if (media) {
  console.log(media.currentTime);
}
```

Returns `Media | null` — null if no media element is registered.

## PlayerController (HTML)

Reactive controller for accessing player state in custom elements.

### Constructor Overloads

```ts
// Without selector — store access only, no subscription
new PlayerController(host, context)

// With selector — subscribes, triggers update on change
new PlayerController(host, context, selector)
```

### Examples

```ts
import { createPlayer, MediaElement } from '@videojs/html';
import { features, selectPlayback } from '@videojs/core/dom';

const { context, PlayerController } = createPlayer({
  features: [...features.video],
});

class MediaPlayButton extends MediaElement {
  // With selector: subscribes, .value is selected state
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

### Controller API

| Property | Type                      | Description                              |
| -------- | ------------------------- | ---------------------------------------- |
| `store`  | `Store`                   | Direct store access                      |
| `value`  | `R \| undefined`          | Selected state (with selector) or state snapshot (without) |

### Without Selector

When no selector is provided, the controller provides store access without subscribing:

```ts
class SomeElement extends MediaElement {
  // No subscription, just store access
  #ctrl = new PlayerController(this, context);

  someMethod() {
    // Read current state (not reactive)
    const state = this.#ctrl.store.state;

    // Call actions
    this.#ctrl.store.play();
  }
}
```

## Feature Selectors

Pre-built selectors for standard features:

```ts
import {
  selectPlayback,
  selectVolume,
  selectTime,
  selectSource,
  selectBuffer,
} from '@videojs/core/dom';
```

### Creating Custom Selectors

```ts
import { createSelector } from '@videojs/store';

const selectMyFeature = createSelector(mySlice);
```

## Type Exports

### From `@videojs/store`

```ts
import { shallowEqual, createSelector } from '@videojs/store';
```

| Export           | Purpose                          |
| ---------------- | -------------------------------- |
| `shallowEqual`   | Shallow comparison for selectors |
| `createSelector` | Create selector from slice       |

### From `@videojs/core/dom`

```ts
import {
  features,
  selectPlayback,
  selectVolume,
  selectTime,
} from '@videojs/core/dom';
```

| Export           | Purpose                    |
| ---------------- | -------------------------- |
| `features`       | Feature bundles            |
| `select*`        | Pre-built feature selectors |

### From `@videojs/react`

```ts
import { createPlayer } from '@videojs/react';
```

### From `@videojs/html`

```ts
import { createPlayer, MediaElement } from '@videojs/html';
```

| Export          | Purpose                           |
| --------------- | --------------------------------- |
| `createPlayer`  | Factory for player infrastructure |
| `MediaElement`  | Base class for UI primitives      |
