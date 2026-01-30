# HTML API

HTML-specific concerns: element naming, imports, skins.

## Element Naming

| Layer  | Pattern                      | Examples                                       |
| ------ | ---------------------------- | ---------------------------------------------- |
| Player | `<{mediatype}-player>`       | `<video-player>`, `<audio-player>`             |
| Skin   | `<{mediatype}-skin>`         | `<video-skin>`, `<minimal-video-skin>`         |
| Media  | `<{source}-{mediatype}>`     | `<hls-video>`, `<dash-video>`, `<hls-audio>`   |
| UI     | `<media-{component}>`        | `<media-play-button>`, `<media-slider>`        |

### Special Players

Only fundamentally different behaviors get their own player:

```html
<background-video-player>  <!-- no controls, autoplay, loop -->
```

## Import Paths

### Player (includes base features)

```ts
import '@videojs/html/player/video';        // includes features.video
import '@videojs/html/player/audio';        // includes features.audio
import '@videojs/html/player/background-video';
```

### Features (additive)

```ts
import '@videojs/html/feature/streaming';
import '@videojs/html/feature/ads';
import '@videojs/html/feature/live';
import '@videojs/html/feature/chapters';

// Granular
import '@videojs/html/feature/quality-selection';
import '@videojs/html/feature/audio-tracks';
import '@videojs/html/feature/text-tracks';
```

### Media

```ts
import '@videojs/html/media/hls-video';
import '@videojs/html/media/hls-audio';
import '@videojs/html/media/dash-video';
```

### Skins

```ts
// Default skin
import '@videojs/html/skin/video.css';
import '@videojs/html/skin/video';

// Named variants
import '@videojs/html/skin/video/minimal.css';
import '@videojs/html/skin/video/minimal';

import '@videojs/html/skin/audio.css';
import '@videojs/html/skin/audio';
```

### UI Primitives (for custom skins)

```ts
import '@videojs/html/ui/menu';
import '@videojs/html/ui/radio-group';
import '@videojs/html/ui/slider';
```

## Registration Models

### Side-Effect Imports (Declarative)

Elements register globally when imported:

```ts
import '@videojs/html/player/video';
import '@videojs/html/skin/video';
```

```html
<video-player>
  <video-skin>
    <video src="video.mp4">
  </video-skin>
</video-player>
```

### createPlayer (Escape Hatch)

For custom element names or full control:

```ts
import { createPlayer, features } from '@videojs/html';

const { PlayerElement, PlayerController } = createPlayer({
  features: [features.video, myCustomFeature]
});

customElements.define('my-video-player', PlayerElement);
```

```html
<my-video-player>
  <video src="video.mp4">
</my-video-player>
```

### Split Provider/Container (Advanced)

When media element and container need different DOM locations:

```ts
import { createPlayer, features } from '@videojs/html';

const { ProviderElement, ContainerElement } = createPlayer({
  features: [features.video]
});

customElements.define('my-video-provider', ProviderElement);
customElements.define('my-video-container', ContainerElement);
```

```html
<my-video-provider>
  <video src="video.mp4">
  <my-video-container>
    <!-- Controls here, separate from media -->
  </my-video-container>
</my-video-provider>
```

## Skins

### Adaptive Skins

Default skin adapts to available features:

```ts
import '@videojs/html/player/video';
import '@videojs/html/feature/streaming';  // skin will show quality menu
import '@videojs/html/skin/video';
```

```html
<video-skin>  <!-- adapts to used features -->
```

### Named Skins

Specific UI compositions and style variants:

```html
<video-skin>           <!-- default style -->
<minimal-video-skin>   <!-- stripped down -->
<cinematic-video-skin> <!-- dark/immersive -->
```

### Skin Customization

Default skin handles optional feature UI via lazy loading.

**Ejected skin structure:**

```
skin/
  video/
    video-skin.ts
    video-skin.css
    features.ts
```

**features.ts:**

```ts
import { features } from '@videojs/html';

// Lazy-define element for a feature
// Shell element registers immediately, loads implementation when feature available
features.lazy(
  'qualitySelection',
  () => import('./ui/quality-menu')
);
```

## MediaElement Base Class

Base class for UI primitives. The host element IS the control (e.g., `<media-play-button>` extends button behavior).

```ts
// src/ui/media-play-button.ts
import { MediaElement, PlayerController, features } from '@videojs/html';

export class MediaPlayButton extends MediaElement {
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

    this.setAttribute('aria-pressed', String(!playback.paused));
  }
}
```

```ts
// define/ui/media-play-button.ts (side-effect import)
import { MediaPlayButton } from '../src/ui/media-play-button.js';

customElements.define('media-play-button', MediaPlayButton);
```

**Usage:**

```ts
import '@videojs/html/ui/media-play-button';
```

## PlayerController

Reactive controller for accessing player state. Triggers `update()` when subscribed feature changes.

```ts
import { PlayerController, features, MediaElement } from '@videojs/html';

export class MediaVolumeSlider extends MediaElement {
  #volume = new PlayerController(this, features.volume);

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('input', this.#handleInput);
  }

  #handleInput = (e: Event) => {
    this.#volume.value?.setVolume(parseFloat((e.target as HTMLInputElement).value));
  };

  override update() {
    const volume = this.#volume.value;
    if (!volume) return;

    // Host is the slider — update its value
    (this as unknown as HTMLInputElement).value = String(volume.volume);
  }
}
```

### Controller API

| Property | Returns              | Description                                |
| -------- | -------------------- | ------------------------------------------ |
| `value`  | `Slice \| undefined` | Feature slice, triggers update on change   |
## Mixins

For advanced customization when you need to extend behavior.

### ProviderMixin

```ts
import { createPlayer, features, MediaElement } from '@videojs/html';

const { ProviderMixin } = createPlayer({
  features: [features.video]
});

class MyProvider extends ProviderMixin(MediaElement) {
  // Custom provider logic
}
```

### ContainerMixin

```ts
const { ContainerMixin } = createPlayer({
  features: [features.video]
});

class MyContainer extends ContainerMixin(MediaElement) {
  // Custom container logic
}
```

## Full Example

```ts
// main.ts
import '@videojs/html/player/video';
import '@videojs/html/feature/streaming';
import '@videojs/html/media/hls-video';
import '@videojs/html/skin/video.css';
import '@videojs/html/skin/video';
```

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="main.ts"></script>
</head>
<body>
  <video-player>
    <video-skin>
      <hls-video src="https://example.com/stream.m3u8"></hls-video>
    </video-skin>
  </video-player>
</body>
</html>
