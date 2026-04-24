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

> The binary is published under the package name `@videojs/cli`. Scripts in this README use `videojs` for brevity — substitute `npx @videojs/cli` if you don't install globally.

## Commands

### `docs <slug>` — read a doc page

Prints a documentation page as Markdown to stdout.

```bash
videojs docs concepts/overview
videojs docs how-to/customize-skins --framework react
```

If you don't pass `--framework`, the CLI uses your saved preference (see `config`), otherwise prompts.

### `docs --list` — list available pages

Prints the framework-specific `llms.txt` index of every available doc slug.

```bash
videojs docs --list
videojs docs --list --framework html
```

### `docs how-to/installation` — generate an installation snippet

The installation page is interactive. It prompts for any option you don't pass as a flag, validates the combination, and emits a ready-to-paste code snippet.

```bash
videojs docs how-to/installation \
  --framework react \
  --preset video \
  --skin default \
  --media hls \
  --install-method pnpm \
  --source-url https://example.com/video.m3u8
```

Installation flags:

| Flag               | Values                                                      |
| ------------------ | ----------------------------------------------------------- |
| `--preset`         | `video`, `audio`, `background-video`                        |
| `--skin`           | `default`, `minimal`                                        |
| `--media`          | `html5-video`, `html5-audio`, `hls`, `background-video`     |
| `--install-method` | `cdn`, `npm`, `pnpm`, `yarn`, `bun` (CDN is `html` only)    |
| `--source-url`     | Any URL — the media source used in the generated snippet   |

### `config <set|get|list>` — manage preferences

Stores CLI preferences at `~/.videojs/config.json`.

```bash
videojs config set framework react
videojs config get framework
videojs config list
```

Supported keys:

| Key         | Values           | Used by                                    |
| ----------- | ---------------- | ------------------------------------------ |
| `framework` | `html`, `react`  | Default for `docs` when `--framework` is omitted |

## Global Options

| Flag              | Alias | Description                        |
| ----------------- | ----- | ---------------------------------- |
| `--framework`     | `-f`  | `html` or `react`                  |
| `--list`          | `-l`  | List available docs (with `docs`)  |
| `--help`          | `-h`  | Show command help                  |
| `--version`       | `-v`  | Print CLI version                  |

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
