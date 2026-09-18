# @videojs/cli

[![package-badge]][package]

> **⚠️ Release candidate** Close to stable. Adoption in real projects encouraged.

The Video.js 10 CLI. Read documentation from your terminal and generate installation guides tailored to your method, framework, player, skin, media source, and package manager.

## Install

Run without installing:

```bash
npx @videojs/cli --help
```

Or install globally:

```bash
npm install -g @videojs/cli
videojs --help
```

> Scripts below use `videojs` for brevity — substitute `npx @videojs/cli` if you don't install globally.

## Examples

Read a doc page:

```bash
videojs docs concepts/overview
```

Generate a framework-specific installation snippet interactively:

```bash
videojs docs guides/installation/react \
  --preset video \
  --skin default \
  --media hls \
  --package-manager pnpm \
  --source-url https://example.com/video.m3u8
```

Presets are `video`, `audio`, `live-video`, `live-audio`, and `background-video`. Live video supports HLS and Mux video; live audio supports Mux audio:

```bash
videojs docs guides/installation/cdn \
  --preset live-video \
  --skin default \
  --media hls \
  --source-url https://example.com/live.m3u8
```

Add editable React skin source with Shadcn:

```bash
videojs docs guides/installation/shadcn \
  --framework react \
  --preset video \
  --theme default \
  --media html5-video \
  --source-url '' \
  --package-manager pnpm \
  --template next \
  --styling tailwind
```

The generic `guides/installation` slug also accepts `--method packaged`, `--method shadcn`, or `--method cdn`. The older `--install-method` flag remains compatible.

For full usage, run `videojs --help`, `videojs docs --help`, or `videojs config --help`.

## Community

If you need help with anything related to Video.js 10, or if you'd like to casually chat with other
members:

- [Join Discord Server][discord]
- [See GitHub Discussions][gh-discussions]

## License

[Apache-2.0](./LICENSE)

[package]: https://www.npmjs.com/package/@videojs/cli
[package-badge]: https://img.shields.io/npm/v/@videojs/cli?label=@videojs/cli
[discord]: https://discord.gg/JBqHh485uF
[gh-discussions]: https://github.com/videojs/v10/discussions
