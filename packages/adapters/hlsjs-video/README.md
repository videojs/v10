# @videojs/hlsjs-video

The Video.js playback adapter for [hls.js](https://github.com/video-dev/hls.js). It owns the supported hls.js runtime,
browser playback implementation, and compatibility tests. `@videojs/mux-video` builds on it.

## Installation

Install the adapter with the framework façade your player uses:

```bash
pnpm add @videojs/html @videojs/hlsjs-video
# or
pnpm add @videojs/react @videojs/hlsjs-video
```

## Usage

Use the HTML or React façade for normal player integration:

```ts
import '@videojs/html/media/hlsjs-video';
```

```tsx
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
```

Low-level consumers can import the Media and supported hls.js class directly:

```ts
import { Hls, HlsJsAdapter } from '@videojs/hlsjs-video';
```

## License

[Apache-2.0](../../LICENSE)
