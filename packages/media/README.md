# @videojs/media

## AI Quickstart

Using an AI coding agent? Install the [Video.js skill](https://github.com/videojs/skills) so it reads the docs that
match this package version before writing code. Then list the version-matched installation choices for your player:

```sh
npx @videojs/react agents init
npx @videojs/html agents init
```

[![package-badge]][package]

> **⚠️ Release candidate** Close to stable. Adoption in real projects encouraged.

## Overview

`@videojs/media` provides the engine-neutral media contracts, state types, DOM hosts, and shared behavior used by
Video.js packages.

Runtime-agnostic APIs are exported from `@videojs/media`. Browser hosts and the custom media element live at
`@videojs/media/dom`. Playback adapters such as `@videojs/hlsjs-video`, `@videojs/mux-video`,
`@videojs/dash-video`, or `@videojs/shaka-video` are separate packages.

## Community

If you need help with anything related to Video.js v10, or if you'd like to casually chat with other
members:

- [Join Discord Server][discord]
- [See GitHub Discussions][gh-discussions]

## License

[Apache-2.0](./LICENSE)

[package]: https://www.npmjs.com/package/@videojs/media
[package-badge]: https://img.shields.io/npm/v/@videojs/media?label=@videojs/media
[discord]: https://discord.gg/JBqHh485uF
[gh-discussions]: https://github.com/videojs/v10/discussions
