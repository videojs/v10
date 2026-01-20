# Player API Design

Unified API for Media and Container concerns. Two stores internally, one API for users.

## Contents

| Document                           | Purpose                            |
| ---------------------------------- | ---------------------------------- |
| [index.md](index.md)               | Overview, quick start, surface API |
| [decisions.md](decisions.md)       | Design decisions and rationale     |
| [architecture.md](architecture.md) | Two-store architecture, internals  |
| [examples.md](examples.md)         | Usage examples (React, HTML, Lit)  |

## Problem

Two concerns, one player:

1. **Media** — play, pause, volume, time. Owned by `<video>`.
2. **Container** — fullscreen, keyboard, gestures, idle. Owned by the player UI wrapper.

Different targets, different lifecycles. Internally, they need separate stores.

But users want one API. This doc defines:

- How `createPlayer` exposes a unified API in React and HTML
- What it returns — hooks, controllers, providers
- How presets bundle features for common use cases
- How to extend with custom features

## Quick Start

### React

```tsx
import { createPlayer, presets } from '@videojs/react';

const { Provider, Container, usePlayer } = createPlayer(presets.website);

function App() {
  return (
    <Provider>
      <Container>
        <Video src="video.mp4" />
        <Controls />
      </Container>
    </Provider>
  );
}

function Controls() {
  const player = usePlayer();

  // Flat access — state and requests on same object
  // Proxy-based tracking — accessing .paused subscribes automatically
  return <button onClick={player.paused ? player.play : player.pause}>{player.paused ? 'Play' : 'Pause'}</button>;
}
```

### HTML / Lit

```ts
import { createPlayer, presets, VjsElement } from '@videojs/html';

const { ProviderElement, PlayerController } = createPlayer(presets.website);

customElements.define('vjs-website-provider', ProviderElement);

class VjsPlayButton extends VjsElement {
  #player = new PlayerController(this);

  render() {
    // .value returns tracking proxy — accessing .paused subscribes
    const { paused, play, pause } = this.#player.value;

    return html` <button @click=${paused ? play : pause}>${paused ? 'Play' : 'Pause'}</button> `;
  }
}
```

### Declarative (Skin)

```html
<script type="module" src="@videojs/html/presets/website/skins/frosted.js"></script>

<vjs-website-provider>
  <vjs-frosted-skin>
    <video src="video.mp4"></video>
  </vjs-frosted-skin>
</vjs-website-provider>
```

## Surface API

### createPlayer

```ts
// Shorthand — preset or feature array
createPlayer(presets.website);
createPlayer([features.playback, features.fullscreen]);

// Config object — extensible
createPlayer({
  features: presets.website,
  // future: devTools, middleware, etc.
});
```

### Returns (React)

```ts
const {
  Provider, // Creates both stores
  Container, // Attaches container to player store
  usePlayer, // Player state + requests (flattened)
  useMedia, // Media state + requests (escape hatch)
} = createPlayer(presets.website);
```

### Returns (HTML)

```ts
const {
  ProviderElement, // Ready-to-use element
  ProviderMixin, // Store provider (Media + Player stores)
  ContainerMixin, // Attaches container to player store
  PlayerController, // Player state + requests (like usePlayer)

  // Escape hatches (advanced)
  MediaProviderMixin, // Media store only
  MediaController, // Media state + requests
} = createPlayer(presets.website);
```

### usePlayer (React)

```tsx
function Controls() {
  const player = usePlayer();

  // State — proxy tracks access, subscribes automatically
  player.paused;
  player.volume;
  player.isFullscreen;

  // Requests — call directly
  player.play();
  player.pause();
  player.setVolume(0.5);
  player.toggleFullscreen();
}
```

### PlayerController (HTML/Lit)

```ts
class VjsControls extends VjsElement {
  #player = new PlayerController(this);

  render() {
    const { paused, isFullscreen, play, pause, toggleFullscreen } = this.#player.value;

    return html`
      <button @click=${paused ? play : pause} />
      <button @click=${toggleFullscreen} />
    `;
  }
}
```

### useMedia (Escape Hatch)

Direct media access. Rarely needed — use when player features don't expose what you need.

```tsx
function DebugPanel() {
  const media = useMedia();

  // Direct media state (bypasses player layer)
  return <pre>{JSON.stringify({ readyState: media.readyState })}</pre>;
}
```

## Features

Features bundle related state and requests. Include only what you need.

```ts
import { features } from '@videojs/react';

features.playback; // play, pause, ended
features.volume; // volume, muted
features.time; // currentTime, duration, seeking
features.fullscreen; // isFullscreen, enter/exit
features.keyboard; // keyboard shortcuts
features.idle; // idle detection
features.gestures; // touch gestures
```

### Presets

Presets are curated feature collections. Pick one, get the right features.

```ts
createPlayer(presets.website); // full-featured
createPlayer(presets.background); // minimal (autoplay, loop)
```

| Preset               | Use Case                             |
| -------------------- | ------------------------------------ |
| `presets.website`    | Default website player **(default)** |
| `presets.background` | Background/hero video                |
| `presets.news`       | Article embeds                       |
| `presets.creator`    | Creator platforms (YouTube)          |
| `presets.swipe`      | Short-form video (TikTok)            |
| `presets.streaming`  | Streaming apps (Netflix)             |
| `presets.live`       | Interactive live (Twitch)            |

### Extending Presets

```ts
createPlayer({
  features: [...presets.background, features.keyboard],
});
```

### Creating Features

```ts
import { createPlayerFeature } from '@videojs/react';

const analytics = createPlayerFeature({
  initialState: { events: [] },

  getSnapshot: ({ target, initialState }) => initialState,

  subscribe: ({ target, update, signal }) => {
    target.media.subscribe(
      (s) => s.paused,
      () => {
        track(target.media.state.paused ? 'pause' : 'play');
        update();
      },
      { signal }
    );
  },

  request: {
    trackEvent: (event, { target }) => {
      // Access media state and requests
      target.media.state.paused;
      target.media.request.play();
    },
  },
});

createPlayer({
  features: [...presets.website, analytics],
});
```

## Naming Convention

State and requests share the same flat namespace. Follow this convention to avoid collisions:

| Type     | Convention                          | Examples                                                      |
| -------- | ----------------------------------- | ------------------------------------------------------------- |
| State    | Nouns, adjectives, past participles | `paused`, `volume`, `muted`, `isFullscreen`, `currentTime`    |
| Requests | Verbs, imperative                   | `play`, `pause`, `setVolume`, `toggleMute`, `enterFullscreen` |

Runtime validation throws if duplicate keys are detected.

## Related Docs

- [decisions.md](decisions.md) — Why these choices were made
- [architecture.md](architecture.md) — Two-store internals
- [examples.md](examples.md) — Full usage examples
