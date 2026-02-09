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

Grouped by use case, then by concern:

### Video (default)

```ts
import '@videojs/html/video/player';       // includes features.video
import '@videojs/html/video/skin';
import '@videojs/html/video/skin.css';
```

### Audio (default)

```ts
import '@videojs/html/audio/player';       // includes features.audio
import '@videojs/html/audio/skin';
import '@videojs/html/audio/skin.css';
```

### Background Video

```ts
import '@videojs/html/background/player';  // includes features.background
import '@videojs/html/background/skin';
import '@videojs/html/background/skin.css';
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
import '@videojs/html/video/player';
import '@videojs/html/video/skin';
```

```html
<video-player>
  <video-skin>
    <video src="video.mp4">
  </video-skin>
</video-player>
```

### createPlayer (Programmatic)

For custom element names or full control:

```ts
import { createPlayer } from '@videojs/html';
import { features } from '@videojs/core/dom';

const { PlayerElement, PlayerController, context } = createPlayer({
  features: [...features.video],
});

customElements.define('my-video-player', PlayerElement);
```

```html
<my-video-player>
  <video src="video.mp4">
</my-video-player>
```

### Mixins (Advanced)

When you need to extend behavior or split provider/container:

```ts
import { createPlayer, MediaElement } from '@videojs/html';
import { features } from '@videojs/core/dom';

const { PlayerMixin, ProviderMixin, ContainerMixin } = createPlayer({
  features: [...features.video],
});

// Combined player (provider + container)
class MyPlayer extends PlayerMixin(MediaElement) {
  // Custom logic
}

// Or split for advanced cases
class MyProvider extends ProviderMixin(MediaElement) {}
class MyContainer extends ContainerMixin(MediaElement) {}
```

## PlayerElement

The simplest way to create a player element:

```ts
import { createPlayer } from '@videojs/html';
import { features } from '@videojs/core/dom';

const { PlayerElement } = createPlayer({
  features: [...features.video],
});

customElements.define('video-player', PlayerElement);
```

`PlayerElement` is a complete player that:

- Creates and manages the store
- Provides context to descendants
- Auto-attaches media elements
- Handles cleanup on disconnect

## Skins

### Adaptive Skins

Default skin adapts to available features:

```ts
import '@videojs/html/video/player';
import '@videojs/html/feature/streaming';  // skin will show quality menu
import '@videojs/html/video/skin';
```

```html
<video-skin>  <!-- adapts to registered features -->
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

## MediaElement Base Class

Base class for UI primitives. No shadow DOM — the host element IS the control.

```ts
import { MediaElement, PlayerController } from '@videojs/html';
import { selectPlayback } from '@videojs/core/dom';

export class MediaPlayButton extends MediaElement {
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

Reactive controller for accessing player state. Triggers `update()` when subscribed state changes.

### Constructor

```ts
// Without selector — store access only, no subscription
new PlayerController(host, context)

// With selector — subscribes, triggers update on change
new PlayerController(host, context, selector)
```

### Example

```ts
import { MediaElement, PlayerController } from '@videojs/html';
import { selectVolume } from '@videojs/core/dom';

export class MediaVolumeSlider extends MediaElement {
  #volume = new PlayerController(this, context, selectVolume);

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

    (this as unknown as HTMLInputElement).value = String(volume.volume);
  }
}
```

### Controller API

| Property | Type             | Description                                          |
| -------- | ---------------- | ---------------------------------------------------- |
| `store`  | `Store`          | Direct store access                                  |
| `value`  | `R \| undefined` | Selected state (with selector) or snapshot (without) |

## Mixins

For advanced customization when you need to extend behavior.

### PlayerMixin

Combined provider + container in one element:

```ts
const { PlayerMixin } = createPlayer({
  features: [...features.video],
});

class MyPlayer extends PlayerMixin(MediaElement) {
  // Custom player logic
}
```

### ProviderMixin

Provider-only — creates store and provides context:

```ts
const { ProviderMixin } = createPlayer({
  features: [...features.video],
});

class MyProvider extends ProviderMixin(MediaElement) {
  // Custom provider logic
}
```

### ContainerMixin

Container-only — consumes context and auto-attaches media:

```ts
const { ContainerMixin } = createPlayer({
  features: [...features.video],
});

class MyContainer extends ContainerMixin(MediaElement) {
  // Custom container logic
}
```

### Split Provider/Container

When media element and container need different DOM locations:

```html
<my-provider>
  <video src="video.mp4">
  <my-container>
    <!-- Controls here, separate from media -->
  </my-container>
</my-provider>
```

## Full Example

```ts
// main.ts
import '@videojs/html/video/player';
import '@videojs/html/feature/streaming';
import '@videojs/html/media/hls-video';
import '@videojs/html/video/skin.css';
import '@videojs/html/video/skin';
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
```
