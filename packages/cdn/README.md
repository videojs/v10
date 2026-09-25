# @videojs/cdn

Browser-ready Video.js bundles for script-tag and self-hosted installations. This package assembles the HTML player,
selected playback adapters, shared chunks, source maps, and standalone stylesheets in one build graph.

Load a version-pinned player and one media implementation:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/cdn@10/video.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/cdn@10/media/hlsjs-video.js"></script>
```

Every browser-ready media entry uses the same URL shape: `@videojs/cdn@10/media/<media-name>.js`, extensions use
`@videojs/cdn@10/extensions/<extension-name>.js`, and individual UI elements use `@videojs/cdn@10/ui/<element-name>.js`.
Adapter and extension runtimes are already included in these bundles, so do not add the npm packages to a script-tag
installation.

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then print a complete CDN installation without downloading this full
browser distribution just for its instructions:

```sh
npx @videojs/html agents init --method cdn
```

## Build output

Run `pnpm build:cdn` from the workspace root. The task writes publishable files directly to `packages/cdn/`, which is
the npm package root; it does not use a separate `dist` directory. Player entries and hashed shared chunks sit at the
top level, while locale, media, extension, and UI element entries sit under `locales`, `media`, `extensions`, and `ui`.

`pnpm --filter @videojs/cdn run build:archive` writes the self-hosting zip, tarball, and checksums to
`packages/cdn/archive/` after the CDN build completes.

## Self-hosting

Install the package when the browser-ready directory will be copied to your own origin:

```bash
pnpm add @videojs/cdn
```

Copy the entire published package, including the top-level hashed chunks and the `locales`, `media`, `extensions`, and
`ui` directories; individual entry files can import shared chunks by relative URL.

Application builds should install `@videojs/html` or `@videojs/react` instead. Neither package depends on
`@videojs/cdn`, so normal npm installs do not include these prebuilt bundles.

## License

[Apache-2.0](../../LICENSE)
