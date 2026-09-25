# @videojs/google-cast

The Google Cast extension for Video.js.

```bash
pnpm add @videojs/html @videojs/google-cast
# or
pnpm add @videojs/react @videojs/google-cast
```

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then print installation instructions that include Google Cast:

```sh
npx @videojs/react agents init --media hls --extensions google-cast
npx @videojs/html agents init --media hls --extensions google-cast
```

If `npx` reports `could not determine executable to run`, the project has an older `@videojs/react` or `@videojs/html` without this command. Upgrade the package, or follow the [React installation guide](https://videojs.org/docs/guides/installation/react) or the [HTML installation guide](https://videojs.org/docs/guides/installation/html).

## Usage

```ts
import '@videojs/html/extensions/google-cast';
```

```tsx
import { GoogleCast } from '@videojs/react/extensions/google-cast';
```

## License

[Apache-2.0](../../LICENSE)
