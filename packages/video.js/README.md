# video.js

The `video.js` npm package for Video.js 10: the install every Video.js 8 snippet points at.

It is not published yet. The package is `private` until the v8 → v10 cutover.

## What's here

- **A mirror of `@videojs/html`.** Every public `@videojs/html` entry point exists under the same path here, so `import 'video.js/video/player'` is `import '@videojs/html/video/player'`. `scripts/generate-html-entries.ts` derives the re-export modules (`src/html/**`, gitignored) and the mirrored `package.json` fields from `@videojs/html`'s manifest and source tree before every build, so the surface cannot drift by hand.
- **Coded stubs for the Video.js 8 module surface** on the root entry (`src/videojs.ts`): the `videojs()` default export, `registerPlugin` / `getPlugin`, `registerComponent` / `getComponent`, `getPlayer`, and `options`. Each throws its `VJS10_LEGACY_*` code, so a v8 snippet fails with a searchable code instead of "undefined is not a function". Patterns only reachable through a v8 player instance are not stubbed; setup goes through `videojs()` and stops there.
- **`video.js/errors`** — the registry behind those codes (`src/errors/`): one entry per code with a one-sentence explanation, the v10 equivalent in HTML and React, the `videojs.org/errors/<slug>` URL, and the stay-on-v8 line. It is the single source for the thrown message and for error-page generation; `getLegacyErrorRecords()` enumerates it for the site build. Dev builds throw the full explanation; production builds throw only the code and URL, and never import the registry text.
- **`video.js/dist/video-js.css`** — the Video.js 8 stylesheet path, resolving to an empty file so a stale import does not fail at module resolution before `videojs()` can.

Legacy detection lives only in this package. The `@videojs/*` packages never carry it, so they never pay for it in bundle size.

## License

[Apache-2.0](../../LICENSE)
