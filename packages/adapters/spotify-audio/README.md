# @videojs/spotify-audio

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then print installation instructions with this adapter selected:

```sh
npx @videojs/react agents init --preset audio --media spotify
npx @videojs/html agents init --preset audio --media spotify
```

Spotify embed playback adapter for Video.js. It exposes the adapter, its props, and defaults; the HTML and React façades live in `@videojs/html` and
`@videojs/react`.

## Installation

```bash
pnpm add @videojs/html @videojs/spotify-audio
# or
pnpm add @videojs/react @videojs/spotify-audio
```

## Usage

```ts
import '@videojs/html/media/spotify-audio';
```

## License

[Apache-2.0](../../LICENSE)
