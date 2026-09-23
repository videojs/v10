# @videojs/dash-video

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then print installation instructions with this adapter selected:

```sh
npx @videojs/react agents init --media dash
npx @videojs/html agents init --media dash
```

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
