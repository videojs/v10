# Examples

Usage examples for React, HTML, and Lit.

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

### Custom Player (Preset)

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

  return (
    <div className="controls">
      <button onClick={player.paused ? player.play : player.pause}>{player.paused ? 'Play' : 'Pause'}</button>
      <button onClick={player.toggleFullscreen}>{player.isFullscreen ? 'Exit' : 'Fullscreen'}</button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={player.volume}
        onChange={(e) => player.setVolume(Number(e.target.value))}
      />
    </div>
  );
}
```

### Extended Preset

```tsx
import { createPlayer, createPlayerFeature, features, presets, Video } from '@videojs/react';

// Custom analytics feature
const analytics = createPlayerFeature({
  initialState: { events: [] as string[] },
  getSnapshot: ({ initialState }) => initialState,
  subscribe: ({ target, update }) => {
    target.media.subscribe(
      (s) => s.paused,
      (paused) => {
        console.log(paused ? 'paused' : 'playing');
        update();
      }
    );
  },
  request: {
    trackEvent: (name: string) => {
      console.log('Track:', name);
    },
  },
});

const { Provider, Container, usePlayer } = createPlayer({
  features: [...presets.website, analytics],
});

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

  const handlePlay = () => {
    player.play();
    player.trackEvent('play_clicked');
  };

  return <button onClick={handlePlay}>Play</button>;
}
```

### Media Escape Hatch

```tsx
import { createPlayer, presets } from '@videojs/react';

const { usePlayer, useMedia } = createPlayer(presets.website);

function DebugPanel() {
  const player = usePlayer();
  const media = useMedia();

  return (
    <pre>
      {JSON.stringify(
        {
          // Player state (preferred)
          isFullscreen: player.isFullscreen,

          // Media state directly (escape hatch)
          mediaFullscreen: media.isFullscreen,
          readyState: media.readyState,
          networkState: media.networkState,
        },
        null,
        2
      )}
    </pre>
  );
}
```

### Headless (No UI)

```tsx
import { createMedia, features } from '@videojs/react';

const { Provider, useMedia } = createMedia([features.playback, features.time]);

function AudioPlayer() {
  const media = useMedia();

  // Programmatic control, no UI
  useEffect(() => {
    if (media.currentTime > 30) {
      media.pause();
    }
  }, [media.currentTime]);

  return <audio src="podcast.mp3" />;
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

Import registers both provider and skin — zero config.

### Custom Provider

```ts
import { createPlayer, presets } from '@videojs/html';

const { ProviderElement } = createPlayer(presets.website);

customElements.define('my-website-provider', ProviderElement);
```

```html
<my-website-provider>
  <video src="video.mp4"></video>
</my-website-provider>
```

### Extended Preset

```ts
import { createPlayer, features, presets } from '@videojs/html';

const { ProviderElement } = createPlayer({
  features: [...presets.background, features.keyboard],
});

customElements.define('vjs-background-provider', ProviderElement);
```

### Split Provider/Container

When media element and fullscreen target need different DOM locations.

```ts
import { createPlayer, presets, VjsElement } from '@videojs/html';

const { ProviderMixin, ContainerMixin } = createPlayer(presets.website);

class MediaProviderElement extends ProviderMixin(VjsElement) {}
class MediaContainerElement extends ContainerMixin(VjsElement) {}

customElements.define('my-provider', MediaProviderElement);
customElements.define('my-container', MediaContainerElement);
```

```html
<my-provider>
  <video src="video.mp4"></video>
  <my-container>
    <my-controls></my-controls>
  </my-container>
</my-provider>
```

### Headless (No UI)

```ts
import { createMedia, features, VjsElement } from '@videojs/html';

const { ProviderMixin, MediaController } = createMedia([features.playback, features.time]);

class VjsAudioController extends ProviderMixin(VjsElement) {
  // Programmatic control, no UI
}

customElements.define('vjs-audio-controller', VjsAudioController);
```

## Lit

### Custom Play Button

```ts
import { html } from 'lit';

import { createPlayer, presets, VjsElement } from '@videojs/html';

const { PlayerController } = createPlayer(presets.website);

class VjsPlayButton extends VjsElement {
  #player = new PlayerController(this);

  render() {
    const { paused, play, pause } = this.#player.value;

    return html`
      <button class="play-button" @click=${paused ? play : pause} aria-label=${paused ? 'Play' : 'Pause'}>
        ${paused ? 'Play' : 'Pause'}
      </button>
    `;
  }
}

customElements.define('vjs-play-button', VjsPlayButton);
```

### Volume Slider

```ts
import { html } from 'lit';

import { createPlayer, presets, VjsElement } from '@videojs/html';

const { PlayerController } = createPlayer(presets.website);

class VjsVolumeSlider extends VjsElement {
  #player = new PlayerController(this);

  render() {
    const { volume, muted, setVolume, toggleMute } = this.#player.value;

    return html`
      <div class="volume-control">
        <button @click=${toggleMute} aria-label=${muted ? 'Unmute' : 'Mute'}>${muted ? 'Unmuted' : 'Muted'}</button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          .value=${String(volume)}
          @input=${(e: Event) => setVolume(Number((e.target as HTMLInputElement).value))}
          aria-label="Volume"
        />
      </div>
    `;
  }
}

customElements.define('vjs-volume-slider', VjsVolumeSlider);
```

### Time Display

```ts
import { html } from 'lit';

import { createPlayer, presets, VjsElement } from '@videojs/html';

const { PlayerController } = createPlayer(presets.website);

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

class VjsTimeDisplay extends VjsElement {
  #player = new PlayerController(this);

  render() {
    const { currentTime, duration } = this.#player.value;

    return html` <span class="time-display"> ${formatTime(currentTime)} / ${formatTime(duration)} </span> `;
  }
}

customElements.define('vjs-time-display', VjsTimeDisplay);
```

### Fullscreen Button

```ts
import { html } from 'lit';

import { createPlayer, presets, VjsElement } from '@videojs/html';

const { PlayerController } = createPlayer(presets.website);

class VjsFullscreenButton extends VjsElement {
  #player = new PlayerController(this);

  render() {
    const { isFullscreen, toggleFullscreen } = this.#player.value;

    return html`
      <button
        class="fullscreen-button"
        @click=${toggleFullscreen}
        aria-label=${isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        ${isFullscreen ? 'Exit' : 'Fullscreen'}
      </button>
    `;
  }
}

customElements.define('vjs-fullscreen-button', VjsFullscreenButton);
```

### Complete Controls Bar

```ts
import { css, html } from 'lit';

import { createPlayer, presets, VjsElement } from '@videojs/html';

const { PlayerController } = createPlayer(presets.website);

class VjsControlsBar extends VjsElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.7);
    }
  `;

  #player = new PlayerController(this);

  render() {
    const { paused, volume, currentTime, duration, isFullscreen, play, pause, setVolume, seek, toggleFullscreen } =
      this.#player.value;

    return html`
      <button @click=${paused ? play : pause}>${paused ? 'Play' : 'Pause'}</button>

      <input
        type="range"
        min="0"
        max=${duration}
        .value=${String(currentTime)}
        @input=${(e: Event) => seek(Number((e.target as HTMLInputElement).value))}
      />

      <span>${this.#formatTime(currentTime)} / ${this.#formatTime(duration)}</span>

      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        .value=${String(volume)}
        @input=${(e: Event) => setVolume(Number((e.target as HTMLInputElement).value))}
      />

      <button @click=${toggleFullscreen}>${isFullscreen ? 'Exit FS' : 'FS'}</button>
    `;
  }

  #formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

customElements.define('vjs-controls-bar', VjsControlsBar);
```

## Skins

### Using a Skin (React)

```tsx
import { createPlayer, presets } from '@videojs/react';
import { FrostedSkin } from '@videojs/react/presets/website';

const { Provider } = createPlayer(presets.streaming);

// Skins work with any preset that has the required features
<Provider>
  <FrostedSkin>
    <Video src="video.mp4" />
  </FrostedSkin>
</Provider>;
```

### Skin Structure

```
packages/react/src/
└── presets/
    └── website/
        ├── index.ts              # preset features
        └── skins/
            └── frosted/
                ├── index.ts      # FrostedSkin component
                └── ui/           # UI components only
```

Skins are tied to presets — they assume certain features are available.
