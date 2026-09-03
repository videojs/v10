# @videojs/shaka-video

The Video.js playback adapter for [Shaka Player](https://github.com/shaka-project/shaka-player). Install it with the
HTML or React package when your player uses Shaka.

## Installation

```bash
pnpm add @videojs/html @videojs/shaka-video
# or
pnpm add @videojs/react @videojs/shaka-video
```

## Usage

```ts
import '@videojs/html/media/shaka-video';
```

```tsx
import { ShakaVideo } from '@videojs/react/media/shaka-video';
```

Low-level consumers can import `ShakaAdapter` and the supported `shaka` runtime from `@videojs/shaka-video`.

## License

[Apache-2.0](../../LICENSE)
