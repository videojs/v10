# @videojs/cli

[![package-badge]][package]

> **⚠️ Beta** Close to stable. Experimental adoption in real projects.

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

## Commands

Run any command with `--help` for full usage and flag reference:

```bash
videojs --help
videojs docs --help
videojs config --help
```

### `docs <slug>` — read a doc page

```bash
videojs docs concepts/overview
videojs docs how-to/customize-skins --framework react
```

If `--framework` is omitted, the CLI uses your saved preference (see `config`), otherwise prompts.

### `docs --list` — list available pages

```bash
videojs docs --list --framework html
```

### `docs how-to/installation` — generate an installation snippet

Interactive: prompts for any option you don't pass as a flag, validates the combination, and emits a ready-to-paste snippet.

```bash
videojs docs how-to/installation \
  --framework react \
  --preset video \
  --skin default \
  --media hls \
  --install-method pnpm \
  --source-url https://example.com/video.m3u8
```

### `config <set|get|list>` — manage preferences

Stores CLI preferences at `~/.videojs/config.json`.

```bash
videojs config set framework react
videojs config get framework
videojs config list
```

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
