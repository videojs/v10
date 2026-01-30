# API

Surface API for React and HTML.

## createPlayer

### React

```ts
import { createPlayer, features } from '@videojs/react';

const { Provider, Container, usePlayer } = createPlayer({
  features: [features.video]
});
```

**Returns:**

| Export      | Purpose                                  |
| ----------- | ---------------------------------------- |
| `Provider`  | Creates stores, provides context         |
| `Container` | Attaches container element to player store |
| `usePlayer` | Access player state (typed to features)  |

### HTML

```ts
import { createPlayer, features } from '@videojs/html';

const { PlayerElement, PlayerController } = createPlayer({
  features: [features.video]
});

customElements.define('my-video-player', PlayerElement);
```

**Returns:**

| Export             | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `PlayerElement`    | Combined provider + container element (common case) |
| `PlayerController` | Reactive controller for accessing player state      |
| `ProviderElement`  | Provider-only element (advanced, split cases)       |
| `ContainerElement` | Container-only element (advanced, split cases)      |
| `ProviderMixin`    | Mixin for custom provider elements                  |
| `ContainerMixin`   | Mixin for custom container elements                 |

### Config

```ts
// Individual features
createPlayer({
  features: [features.playback, features.volume, features.fullscreen]
});

// Feature bundles (sugar)
createPlayer({
  features: [features.video]
});

// Extended bundle
createPlayer({
  features: [features.video, features.streaming]
});
```

## usePlayer (React)

Access player state with selector-based subscriptions.

### Overloads

```ts
// 1. Feature only — returns full feature slice
usePlayer(feature): FeatureSlice | undefined

// 2. Feature + selector — returns selected value from feature
usePlayer(feature, selector): R | undefined

// 3. Global selector — returns selected value from all state
usePlayer(selector): R
```

### Examples

```tsx
// Get full playback feature slice
const playback = usePlayer(features.playback);
if (!playback) return null;
playback.paused;
playback.play();

// Get specific value from feature
const paused = usePlayer(features.playback, s => s.paused);

// Derive value from feature
const isPlaying = usePlayer(features.playback, s => !s.paused && !s.ended);

// Select across multiple features (global selector)
const state = usePlayer(s => ({
  paused: s.paused,
  volume: s.volume
}));
```

### Performance

> **Warning:** Global selectors without feature scoping subscribe to all state changes. During playback, `currentTime` updates frequently (4-60 times/sec). Always scope to features or use specific selectors.

```tsx
// Bad — re-renders on every currentTime update
const state = usePlayer(s => s);

// Good — only subscribes to playback feature
const playback = usePlayer(features.playback);

// Good — only subscribes to paused
const paused = usePlayer(features.playback, s => s.paused);
```

### Selector Comparison

Selectors returning objects use `shallowEqual` comparison:

```tsx
// Re-renders only when paused OR volume changes
const state = usePlayer(s => ({
  paused: s.paused,
  volume: s.volume
}));
```

`shallowEqual` is exported from `@videojs/store` for custom use.
## store.get / store.has

Access features within feature context (subscribe/request handlers).

### store.get(feature | key | name)

Returns typed feature slice or `undefined`.

```ts
// By feature reference
store.get(features.playback)     // PlaybackSlice | undefined

// By feature key (Symbol)
store.get(playbackKey)           // PlaybackSlice | undefined

// By name (string)
store.get('playback')            // Slice | undefined (loose typing)
```

### store.has(feature | key | name)

Returns `boolean`.

```ts
store.has(features.playback)     // boolean
store.has('playback')            // boolean
```

### Usage in Features

```ts
const keyboardFeature = createPlayerFeature({
  subscribe: ({ store, update, signal }) => {
    const playback = store.get(features.playback);

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ') playback?.toggle();
    }, { signal });
  }
});
```

## PlayerController (HTML)

Reactive controller for accessing player state in custom elements.

```ts
import { createPlayer, features, MediaElement } from '@videojs/html';

const { PlayerController } = createPlayer({
  features: [features.video]
});

class MediaPlayButton extends MediaElement {
  #playback = new PlayerController(this, features.playback);

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
    // ...
  }
}
```

### Controller API

| Property | Returns              | Description                                     |
| -------- | -------------------- | ----------------------------------------------- |
| `value`  | `FeatureSlice \| undefined` | Feature slice, triggers update on change        |
## Type Exports

### From `@videojs/store`

```ts
import { shallowEqual } from '@videojs/store';
```

| Export         | Purpose                          |
| -------------- | -------------------------------- |
| `shallowEqual` | Shallow comparison for selectors |

### From `@videojs/react`

```ts
import { createPlayer, features, usePlayer } from '@videojs/react';
```

### From `@videojs/html`

```ts
import { createPlayer, features, MediaElement } from '@videojs/html';
```

| Export          | Purpose                           |
| --------------- | --------------------------------- |
| `createPlayer`  | Factory for player infrastructure |
| `features`      | Feature definitions and bundles   |
| `MediaElement`  | Base class for UI primitives      |
