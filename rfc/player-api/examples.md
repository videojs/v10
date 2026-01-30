# Examples

Progressive journey from simple to fully custom.

## 1. It Works (Minimal)

### React

```tsx
import { createPlayer, features } from '@videojs/react';

const { Provider: VideoProvider, Container: VideoContainer, usePlayer } = createPlayer({
  features: [features.video]
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
import '@videojs/html/player/video'; // includes features.video
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
import '@videojs/react/skin/video.css';

import { createPlayer, features } from '@videojs/react';
import { VideoSkin } from '@videojs/react/skin/video';

const { Provider: VideoProvider } = createPlayer({
  features: [features.video]
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
import '@videojs/html/player/video';
import '@videojs/html/skin/video.css';
import '@videojs/html/skin/video';
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
import { createPlayer, features } from '@videojs/react';
import '@videojs/react/skin/video.css';
import { VideoSkin } from '@videojs/react/skin/video';

const { Provider: VideoProvider } = createPlayer({
  features: [features.video, features.chapters]
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
import '@videojs/html/player/video';
import '@videojs/html/feature/chapters';
import '@videojs/html/skin/video.css';
import '@videojs/html/skin/video';
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
import { createPlayer, features } from '@videojs/react';
import { HlsVideo } from '@videojs/react/media/hls';
import '@videojs/react/skin/video.css';
import { VideoSkin } from '@videojs/react/skin/video';

const { Provider: VideoProvider } = createPlayer({
  features: [features.video, features.streaming]
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
import '@videojs/html/player/video';
import '@videojs/html/feature/streaming';
import '@videojs/html/media/hls-video';
import '@videojs/html/skin/video.css';
import '@videojs/html/skin/video';
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
import { createPlayer, features } from '@videojs/react';
import { HlsVideo } from '@videojs/react/media/hls';
import '@videojs/react/skin/video.css';
import { VideoSkin } from '@videojs/react/skin/video';

const { Provider: VideoProvider } = createPlayer({
  features: [features.video, features.streaming, features.ads]
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
import '@videojs/html/player/video';
import '@videojs/html/feature/streaming';
import '@videojs/html/feature/ads';
import '@videojs/html/media/hls-video';
import '@videojs/html/skin/video.css';
import '@videojs/html/skin/video';
```

## 6. Full Custom (Escape Hatch)

### React

```tsx
import { createPlayer, features } from '@videojs/react';
import { HlsVideo } from '@videojs/react/media/hls';

const myAnalytics = createMediaFeature({
  name: 'analytics',
  initialState: {},
  subscribe: ({ store, signal }) => {
    // Custom analytics logic
  },
  request: {
    trackEvent: (name) => console.log(name),
  },
});

const { Provider: VideoProvider, Container: VideoContainer, usePlayer } = createPlayer({
  features: [features.video, features.streaming, myAnalytics]
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
  const playback = usePlayer(features.playback);
  const time = usePlayer(features.time);
  const analytics = usePlayer(myAnalytics);

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
import { createPlayer, features, MediaElement } from '@videojs/html';

const { PlayerElement, PlayerController } = createPlayer({
  features: [features.video, features.streaming, myCustomFeature]
});

// Define player element
customElements.define('my-video-player', PlayerElement);

// Custom play button — host is the button
class MyPlayButton extends MediaElement {
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
import { createPlayer, features } from '@videojs/react';

const { Provider: VideoProvider, usePlayer } = createPlayer({
  features: [features.playback, features.time]
});

function AudioController() {
  const playback = usePlayer(features.playback);
  const time = usePlayer(features.time);

  // Programmatic control, no UI
  useEffect(() => {
    if (time && time.currentTime > 60) {
      playback?.pause();
    }
  }, [time?.currentTime]);

  return <audio src="audio.mp3" />;
}
```

## 9. Using Selectors

### Performance-Optimized Access

```tsx
function TimeDisplay() {
  // Only re-renders when currentTime changes
  const currentTime = usePlayer(features.time, s => s.currentTime);

  if (currentTime === undefined) return null;

  return <span>{formatTime(currentTime)}</span>;
}
```

### Derived Values

```tsx
function PlayState() {
  // Derived value, re-renders when paused OR ended changes
  const isPlaying = usePlayer(features.playback, s => !s.paused && !s.ended);

  if (isPlaying === undefined) return null;

  return <span>{isPlaying ? 'Playing' : 'Stopped'}</span>;
}
```

### Cross-Feature Selection

```tsx
function DebugPanel() {
  // Global selector across all features
  const debug = usePlayer(s => ({
    paused: s.paused,
    currentTime: s.currentTime,
    volume: s.volume,
  }));

  return <pre>{JSON.stringify(debug, null, 2)}</pre>;
}
