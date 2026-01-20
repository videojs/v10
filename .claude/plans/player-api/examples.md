# Examples

Usage examples for React, HTML, and Lit.

> **Note:** Some examples here are for demonstration. In practice, UI primitives like `<PlayButton>`, `<VolumeSlider>`, etc. would be provided.

## React

### Declarative (Skin)

```tsx
import { createPlayer, presets, Video } from '@videojs/react';
import { FrostedSkin } from '@videojs/react/presets/website';

const { Provider } = createPlayer(presets.website);

function App() {
  return (
    <Provider>
      <FrostedSkin>
        <Video src="video.mp4" />
      </FrostedSkin>
    </Provider>
  );
}
```

### Custom Player

```tsx
import { createPlayer, presets, Video } from '@videojs/react';

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

  return <button onClick={player.paused ? player.play : player.pause}>{player.paused ? 'Play' : 'Pause'}</button>;
}
```

### Extended Preset

```tsx
import { createPlayer, features, presets } from '@videojs/react';

const { Provider, usePlayer } = createPlayer({
  features: [...presets.website, features.keyboard],
});
```

### Custom Feature

```tsx
import { createPlayer, createPlayerFeature, presets } from '@videojs/react';

const pip = createPlayerFeature({
  initialState: { active: false },
  getSnapshot: ({ target }) => ({
    active: document.pictureInPictureElement === target.media.element,
  }),
  subscribe: ({ update, signal }) => {
    document.addEventListener('enterpictureinpicture', update, { signal });
    document.addEventListener('leavepictureinpicture', update, { signal });
  },
  request: {
    enterPip: (_, { target }) => target.media.element.requestPictureInPicture(),
    exitPip: () => document.exitPictureInPicture(),
  },
});

const { Provider, usePlayer } = createPlayer({
  features: [...presets.website, pip],
});
```

### Media Escape Hatch

Direct media access when player features don't expose what you need.

```tsx
const { usePlayer, useMedia } = createPlayer(presets.website);

function DebugPanel() {
  const player = usePlayer();
  const media = useMedia();

  // player.isFullscreen vs media.isFullscreen (raw)
}
```

### Headless (No UI)

```tsx
import { createMedia, features } from '@videojs/react';

const { Provider, useMedia } = createMedia([features.playback, features.time]);

function AudioPlayer() {
  const media = useMedia();
  // Programmatic control, no UI
}
```

## HTML

### Declarative (Skin)

```html
<script type="module" src="@videojs/html/presets/website/skins/frosted.js"></script>

<vjs-website-provider>
  <vjs-frosted-skin>
    <video src="video.mp4"></video>
  </vjs-frosted-skin>
</vjs-website-provider>
```

### Custom Provider

```ts
import { createPlayer, presets } from '@videojs/html';

const { ProviderElement } = createPlayer(presets.website);

customElements.define('my-provider', ProviderElement);
```

```html
<my-provider>
  <video src="video.mp4"></video>
</my-provider>
```

### Extended Preset

```ts
import { createPlayer, features, presets } from '@videojs/html';

const { ProviderElement } = createPlayer({
  features: [...presets.website, features.keyboard],
});

customElements.define('my-provider', ProviderElement);
```

### Split Provider/Container

When media element and container need different DOM locations.

```ts
import { createPlayer, presets, VjsElement } from '@videojs/html';

const { ProviderMixin, ContainerMixin } = createPlayer(presets.website);

class MyProvider extends ProviderMixin(VjsElement) {}
class MyContainer extends ContainerMixin(VjsElement) {}

customElements.define('my-provider', MyProvider);
customElements.define('my-container', MyContainer);
```

```html
<my-provider>
  <video src="video.mp4"></video>
  <my-container>...</my-container>
</my-provider>
```

### Headless (No UI)

```ts
import { createMedia, features, VjsElement } from '@videojs/html';

const { ProviderMixin } = createMedia([features.playback, features.time]);

class AudioController extends ProviderMixin(VjsElement) {
  // Programmatic control
}

customElements.define('audio-controller', AudioController);
```

## Lit

### PlayerController

```ts
import { html } from 'lit';

import { createPlayer, presets, VjsElement } from '@videojs/html';

const { PlayerController } = createPlayer(presets.website);

class PlayButton extends VjsElement {
  #player = new PlayerController(this);

  render() {
    const { paused, play, pause } = this.#player.value;

    return html`<button @click=${paused ? play : pause}>${paused ? 'Play' : 'Pause'}</button>`;
  }
}

customElements.define('play-button', PlayButton);
```
