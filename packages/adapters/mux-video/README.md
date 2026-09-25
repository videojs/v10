# @videojs/mux-video

The Video.js playback adapter for Mux-hosted video, over [hls.js](https://github.com/video-dev/hls.js). It owns the Mux
source model (playback IDs, tokens, DRM, posters, storyboards) and builds on `@videojs/hlsjs-video`, which owns the
hls.js runtime.

Install the adapter with the framework façade your player uses:

```bash
pnpm add @videojs/html @videojs/mux-video
# or
pnpm add @videojs/react @videojs/mux-video
```

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then print installation instructions with this adapter selected:

```sh
npx @videojs/react agents init --media mux-video
npx @videojs/html agents init --media mux-video
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
