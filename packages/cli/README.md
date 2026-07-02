# @videojs/cli

[![package-badge]][package]

> **⚠️ Beta** Experimental adoption in real projects.

The Video.js 10 CLI. Read documentation from your terminal and generate installation snippets tailored to your setup (framework, preset, skin, media engine, package manager).

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
videojs docs how-to/installation \
  --framework react \
  --preset video \
  --skin default \
  --media hls \
  --install-method pnpm \
  --source-url https://example.com/video.m3u8
```

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
