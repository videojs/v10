# video.js

The `video.js` npm package for Video.js 10: the install every Video.js 8 snippet points at.

It is not published yet. The package is `private` until the v8 → v10 cutover.

## What's here

- **A working player from one import.** `import 'video.js'` registers `<video-player>`, `<video-skin>`, and the i18n elements — the same set the CDN `video.js` bundle registers — and re-exports `@videojs/html`'s root. Someone arriving from a v8 snippet keeps the import, removes the `videojs()` call, and writes the three tags. This is the batteries-included entry; anything granular (other presets, media elements, individual UI elements, locales) lives in `@videojs/html`, which is what the docs use.
- **Coded stubs for the Video.js 8 module surface** on the same root entry (`src/videojs.ts`): the `videojs()` default export, `registerPlugin` / `getPlugin`, `registerComponent` / `getComponent`, `getPlayer`, and `options`. Each throws its `VJS8_LEGACY_*` code, so a v8 snippet fails with a searchable code instead of "undefined is not a function". Patterns only reachable through a v8 player instance are not stubbed; setup goes through `videojs()` and stops there.
- **`video.js/errors`** — the registry behind those codes (`src/errors/`): one entry per code with a one-sentence explanation, the v10 equivalent in HTML and React, the API reference URL, and the stay-on-v8 line. It is the single source for the thrown message and the reference page content. Dev builds throw the full explanation; production builds throw only the code and URL, and never import the registry text.
- **`video.js/dist/video-js.css`** — the Video.js 8 stylesheet path, resolving to an empty file so a stale import does not fail at module resolution before `videojs()` can.

Unlike `@videojs/html`, importing this package's root has side effects: it registers custom elements. That is deliberate — it is the point of the package — and it matches the CDN bundle of the same name.

Legacy detection lives only in this package. The `@videojs/*` packages never carry it, so they never pay for it in bundle size.

## Usage

Import the package once, then write the player markup:

```ts
import 'video.js';
```

```html
<video-player>
  <video-skin style="aspect-ratio: 16 / 9">
    <video src="https://example.com/video.mp4" playsinline></video>
  </video-skin>
</video-player>
```

To drive the player from script, wait for the element to upgrade and read its `store`. TypeScript types `document.querySelector('video-player')` for you, and the selectors come from the same import:

```ts
import { selectPlayback } from 'video.js';

await customElements.whenDefined('video-player');

const { store } = document.querySelector('video-player')!;

store.subscribe(() => {
  console.log(selectPlayback(store.state)?.paused);
});
```

Actions such as `play()` and `setVolume()` need attached media, so check `store.target` before calling them.

## AI Quickstart

Using an AI coding agent? Print the steps to install the [Video.js skill](https://github.com/videojs/skills), which teaches your agent to read the docs that match this package version before writing code:

```sh
npx @videojs/cli@<version> agents skills
```

Then print HTML installation instructions:

```sh
npx @videojs/cli@<version> agents init --framework html
```

Replace `<version>` with your installed `video.js` version. Video.js packages release together, and the CLI checks `@videojs/html` and `@videojs/react` but not `video.js`, so pinning it is what keeps the instructions matched. Neither command changes your project.

The instructions install `@videojs/html`, the granular package the docs use. This package already depends on it, so keep the version `video.js` brings rather than adding a second one.

## License

[Apache-2.0](../../LICENSE)
