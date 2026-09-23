# @videojs/wistia-video

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then list the version-matched installation choices for your player:

```sh
npx @videojs/react agents init
npx @videojs/html agents init
```

The Video.js playback adapter for Wistia. It owns the supported `@wistia/wistia-player` runtime and exposes
`WistiaAdapter` for low-level use.

## Installation

```bash
pnpm add @videojs/html @videojs/wistia-video
# or
pnpm add @videojs/react @videojs/wistia-video
```

## Usage

```ts
import '@videojs/html/media/wistia-video';
```

```tsx
import { WistiaVideo } from '@videojs/react/media/wistia-video';
```

## License

[Apache-2.0](../../LICENSE)
