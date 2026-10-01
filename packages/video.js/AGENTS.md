# video.js package guide

The unscoped `video.js` package: `@videojs/html`'s video preset from one import, plus coded stubs for the Video.js 8 module surface. It stays `private` until the v8 → v10 cutover, and the site still tells readers that `npm install video.js` is v8. Do not document `import 'video.js'` on the site before that cutover.

## Boundaries

- Legacy detection lives only here. Never add v8 compatibility, `VJS8_LEGACY_*` codes, or registry text to `@videojs/*` packages.
- `src/index.ts` registers the same elements as `packages/cdn/src/video.ts`. Change both together.
- Stub only setup-time v8 entry points. Anything reached through a v8 player instance is unreachable once `videojs()` throws.
- The root entry's production build must not include registry text; only the `video.js/errors` entry ships it, for the site's error pages. Stub paths import `./errors/codes` and `./errors/legacy-error`, where only `__DEV__` branches read `LEGACY_ERRORS`. Never import `./errors/registry` from `src/videojs.ts` or `src/index.ts`.

## Add a legacy code

`src/errors/registry.ts` is the single source for the thrown message and the site's error reference pages. A new code needs all of:

1. The code in `LEGACY_ERROR_CODES` (`src/errors/codes.ts`). The `satisfies` on `LEGACY_ERRORS` then requires its registry entry.
2. A throwing stub in `src/videojs.ts`, exported from `src/index.ts` and attached to the `videojs` default.
3. A case in `src/tests/videojs.test.ts`.
4. `site/src/content/docs/reference/api/<slug>.mdx` rendering `LegacyErrorReference`, plus its sidebar entry in `site/src/docs.config.ts`. `legacy-error-routes.test.ts` in the site fails without the page.

## Types

`src/tests/index.test-d.ts` resolves `@videojs/html` through its built declarations, so it catches a define entry that drops its `HTMLElementTagNameMap` augmentation. Rebuild `@videojs/html` before trusting it, and delete a stale `tsconfig.tsbuildinfo` if the result disagrees with `dist`.

## Verification

```bash
pnpm -F video.js test
pnpm -F site test legacy-error
pnpm typecheck
```

Use `review-api` before changing the root's exports, and `write-docs` for this README or the registry copy.
