# @videojs/mux-audio

The Video.js playback adapter for Mux-hosted audio, over [hls.js](https://github.com/video-dev/hls.js). `MuxAudioAdapter`
extends the Mux video adapter from `@videojs/mux-video` and plays through an `<audio>` element, so audio installs by the
media it plays.

## Installation

```bash
pnpm add @videojs/html @videojs/mux-audio
# or
pnpm add @videojs/react @videojs/mux-audio
```

## Usage

```ts
import '@videojs/html/media/mux-audio';
```

```tsx
import { MuxAudio } from '@videojs/react/media/mux-audio';
```

## License

[Apache-2.0](../../LICENSE)
