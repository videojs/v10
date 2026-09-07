# @videojs/mux-video

The Video.js playback adapter for Mux-hosted video, over [hls.js](https://github.com/video-dev/hls.js). It owns the Mux
source model (playback IDs, tokens, DRM, posters, storyboards) and builds on `@videojs/hlsjs-video`, which owns the
hls.js runtime.

## Installation

Install the adapter with the framework façade your player uses:

```bash
pnpm add @videojs/html @videojs/mux-video
# or
pnpm add @videojs/react @videojs/mux-video
```

## Usage

```ts
import '@videojs/html/media/mux-video';
```

```tsx
import { MuxVideo } from '@videojs/react/media/mux-video';
```

Low-level consumers can import the Media directly:

```ts
import { MuxVideoAdapter } from '@videojs/mux-video';
```

## License

[Apache-2.0](../../LICENSE)
