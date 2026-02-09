# Examples

Progressive journey from simple to fully custom.

## 1. It Works (Minimal)

### React

```tsx
import { createPlayer } from '@videojs/react';
import { features } from '@videojs/core/dom';

const { Provider: VideoProvider, Container: VideoContainer } = createPlayer({
  features: [...features.video],
});

function App() {
  return (
    <VideoProvider>
      <VideoContainer>
        <video src="video.mp4" />
        {/* Custom UI */}
      </VideoContainer>
    </VideoProvider>
  );
}
```

### HTML

```ts
import '@videojs/html/video/player';
```

```html
<video-player>
  <video src="video.mp4">
  <!-- Custom UI -->
</video-player>
```

## 2. It's Pretty (Add Skin)

### React

```tsx
import '@videojs/react/video/skin.css';

import { createPlayer } from '@videojs/react';
import { features } from '@videojs/core/dom';
import { VideoSkin } from '@videojs/react/video/skin';

const { Provider: VideoProvider } = createPlayer({
  features: [...features.video],
});

function App() {
  return (
    <VideoProvider>
      <VideoSkin>
        <video src="video.mp4" />
      </VideoSkin>
    </VideoProvider>
  );
}
```

### HTML

```ts
import '@videojs/html/video/player';
import '@videojs/html/video/skin.css';
import '@videojs/html/video/skin';
```

```html
<video-player>
  <video-skin>
    <video src="video.mp4">
  </video-skin>
</video-player>
```

## 3. I Need a Feature (Chapters)

Skin detects chapters feature, shows chapter menu.

### React

```tsx
import '@videojs/react/video/skin.css';

import { createPlayer } from '@videojs/react';
import { features, chaptersSlice } from '@videojs/core/dom';
import { VideoSkin } from '@videojs/react/video/skin';

const { Provider: VideoProvider } = createPlayer({
  features: [...features.video, chaptersSlice],
});

function App() {
  return (
    <VideoProvider>
      <VideoSkin>
        <video src="video.mp4" />
      </VideoSkin>
    </VideoProvider>
  );
}
```

### HTML

```ts
import '@videojs/html/video/player';
import '@videojs/html/feature/chapters';
import '@videojs/html/video/skin.css';
import '@videojs/html/video/skin';
```

```html
<video-player>
  <video-skin>
    <video src="video.mp4">
  </video-skin>
</video-player>
```

## 4. I Need Streaming (HLS)

Skin detects streaming features, shows quality/tracks menus.

### React

```tsx
import '@videojs/react/video/skin.css';

import { createPlayer } from '@videojs/react';
import { features } from '@videojs/core/dom';
import { HlsVideo } from '@videojs/react/media/hls';
import { VideoSkin } from '@videojs/react/video/skin';

const { Provider: VideoProvider } = createPlayer({
  features: [...features.video, ...features.streaming],
});

function App() {
  return (
    <VideoProvider>
      <VideoSkin>
        <HlsVideo src="stream.m3u8" />
      </VideoSkin>
    </VideoProvider>
  );
}
```

### HTML

```ts
import '@videojs/html/video/player';
import '@videojs/html/feature/streaming';
import '@videojs/html/media/hls-video';
import '@videojs/html/video/skin.css';
import '@videojs/html/video/skin';
```

```html
<video-player>
  <video-skin>
    <hls-video src="stream.m3u8">
  </video-skin>
</video-player>
```

## 5. I Need Ads

Same skin adapts to show ad UI.

### React

```tsx
import '@videojs/react/video/skin.css';

import { createPlayer } from '@videojs/react';
import { features } from '@videojs/core/dom';
import { HlsVideo } from '@videojs/react/media/hls';
import { VideoSkin } from '@videojs/react/video/skin';

const { Provider: VideoProvider } = createPlayer({
  features: [...features.video, ...features.streaming, ...features.ads],
});

function App() {
  return (
    <VideoProvider>
      <VideoSkin>
        <HlsVideo src="stream.m3u8" />
      </VideoSkin>
    </VideoProvider>
  );
}
```

### HTML

```ts
import '@videojs/html/video/player';
import '@videojs/html/feature/streaming';
import '@videojs/html/feature/ads';
import '@videojs/html/media/hls-video';
import '@videojs/html/video/skin.css';
import '@videojs/html/video/skin';
```

## 6. Full Custom (Escape Hatch)

### React

```tsx
import { createPlayer } from '@videojs/react';
import { defineSlice } from '@videojs/store';
import { features, selectPlayback, selectTime, type PlayerTarget } from '@videojs/core/dom';
import { HlsVideo } from '@videojs/react/media/hls';

const analyticsSlice = defineSlice<PlayerTarget>()({
  state: ({ task }) => ({
    trackEvent: task('trackEvent', ({ get }, name: string) => {
      console.log('track', name, get());
    }),
  }),
});

const { Provider: VideoProvider, Container: VideoContainer, usePlayer } = createPlayer({
  features: [...features.video, ...features.streaming, analyticsSlice],
});

function App() {
  return (
    <VideoProvider>
      <VideoContainer>
        <HlsVideo src="stream.m3u8" />
        <MyCustomSkin />
      </VideoContainer>
    </VideoProvider>
  );
}

function MyCustomSkin() {
  const playback = usePlayer(selectPlayback);
  const time = usePlayer(selectTime);

  if (!playback || !time) return null;

  return (
    <div className="my-skin">
      <button onClick={playback.toggle}>
        {playback.paused ? 'Play' : 'Pause'}
      </button>
      <span>{time.currentTime} / {time.duration}</span>
    </div>
  );
}
```

### HTML

```ts
import { createPlayer, MediaElement } from '@videojs/html';
import { features, selectPlayback } from '@videojs/core/dom';

const { PlayerElement, PlayerController, context } = createPlayer({
  features: [...features.video, ...features.streaming, myCustomSlice],
});

// Define player element
customElements.define('my-video-player', PlayerElement);

// Custom play button
class MyPlayButton extends MediaElement {
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

    this.textContent = playback.paused ? 'Play' : 'Pause';
  }
}

customElements.define('my-play-button', MyPlayButton);
```

```html
<my-video-player>
  <hls-video src="stream.m3u8"></hls-video>
  <my-play-button></my-play-button>
</my-video-player>
```

## 7. Configure Media Engine

### HTML

```html
<hls-video
  src="stream.m3u8"
  buffer-size="30"
  abr-strategy="bandwidth"
>
```

### React

```tsx
<HlsVideo
  src="stream.m3u8"
  bufferSize={30}
  abrStrategy="bandwidth"
  onManifestLoaded={() => {}}
/>
```

## 8. Headless (No UI)

### React

```tsx
import { createPlayer } from '@videojs/react';
import { features, selectPlayback, selectTime } from '@videojs/core/dom';

const { Provider: AudioProvider, usePlayer } = createPlayer({
  features: [...features.audio],
});

function AudioController() {
  const playback = usePlayer(selectPlayback);
  const time = usePlayer(selectTime);

  // Programmatic control, no UI
  useEffect(() => {
    if (time && time.currentTime > 60) {
      playback?.pause();
    }
  }, [time?.currentTime, playback]);

  return <audio src="audio.mp3" />;
}
```

## 9. Using Selectors

### Performance-Optimized Access

```tsx
function TimeDisplay() {
  // Only re-renders when currentTime changes
  const currentTime = usePlayer((s) => s.currentTime);

  if (currentTime === undefined) return null;

  return <span>{formatTime(currentTime)}</span>;
}
```

### Derived Values

```tsx
function PlayState() {
  // Derived value, re-renders when paused OR ended changes
  const isPlaying = usePlayer((s) => !s.paused && !s.ended);

  if (isPlaying === undefined) return null;

  return <span>{isPlaying ? 'Playing' : 'Stopped'}</span>;
}
```

### Cross-Feature Selection

```tsx
function DebugPanel() {
  // Select across multiple properties
  const debug = usePlayer((s) => ({
    paused: s.paused,
    currentTime: s.currentTime,
    volume: s.volume,
  }));

  return <pre>{JSON.stringify(debug, null, 2)}</pre>;
}
```

## 10. Using Mixins (HTML)

When you need custom player behavior:

```ts
import { createPlayer, MediaElement } from '@videojs/html';
import { features } from '@videojs/core/dom';

const { PlayerMixin } = createPlayer({
  features: [...features.video],
});

class MyVideoPlayer extends PlayerMixin(MediaElement) {
  override connectedCallback() {
    super.connectedCallback();

    // Custom initialization
    this.addEventListener('fullscreenchange', this.#onFullscreen);
  }

  #onFullscreen = () => {
    // Custom fullscreen handling
  };
}

customElements.define('my-video-player', MyVideoPlayer);
```
