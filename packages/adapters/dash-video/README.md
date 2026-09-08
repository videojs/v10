# @videojs/dash-video

The Video.js playback adapter for [dash.js](https://github.com/Dash-Industry-Forum/dash.js). Install it with the HTML
or React package when your player uses DASH playback.

## Installation

```bash
pnpm add @videojs/html @videojs/dash-video
# or
pnpm add @videojs/react @videojs/dash-video
```

## Usage

```ts
import '@videojs/html/media/dash-video';
```

```tsx
import { DashVideo } from '@videojs/react/media/dash-video';
```

Low-level consumers can import `DashAdapter` from `@videojs/dash-video`.

## License

[Apache-2.0](../../LICENSE)
