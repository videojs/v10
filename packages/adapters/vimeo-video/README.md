# @videojs/vimeo-video

The Video.js playback adapter for Vimeo. It owns the supported `@vimeo/player` runtime and exposes `VimeoAdapter` for
low-level use.

```bash
pnpm add @videojs/html @videojs/vimeo-video
# or
pnpm add @videojs/react @videojs/vimeo-video
```

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then print installation instructions with this adapter selected:

```sh
npx @videojs/react agents init --media vimeo
npx @videojs/html agents init --media vimeo
```

If `npx` reports `could not determine executable to run`, the project has an older `@videojs/react` or `@videojs/html` without this command. Upgrade the package, or follow the [React installation guide](https://videojs.org/docs/guides/installation/react) or the [HTML installation guide](https://videojs.org/docs/guides/installation/html).

## Usage

```ts
import '@videojs/html/media/vimeo-video';
```

```tsx
import { VimeoVideo } from '@videojs/react/media/vimeo-video';
```

## License

[Apache-2.0](../../LICENSE)
