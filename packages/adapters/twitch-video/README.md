# @videojs/twitch-video

Twitch embed playback adapter for Video.js. It exposes the adapter, its props, and defaults; the HTML and React façades live in `@videojs/html` and
`@videojs/react`.

```bash
pnpm add @videojs/html @videojs/twitch-video
# or
pnpm add @videojs/react @videojs/twitch-video
```

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then print installation instructions with this adapter selected:

```sh
npx @videojs/react agents init --media twitch
npx @videojs/html agents init --media twitch
```

## Usage

```ts
import '@videojs/html/media/twitch-video';
```

## License

[Apache-2.0](../../LICENSE)
