# @videojs/cli

[![package-badge]][package]

> **⚠️ Release candidate** Close to stable. Adoption in real projects encouraged.

The Video.js 10 command line. `agents init` prints version-matched installation instructions for a coding agent or
for you to follow: the packages to install, the files to add, and the commands to run for your framework, installation
method, player, skin, and media source.

## Usage

Run it without installing anything:

```sh
npx @videojs/cli agents init
```

Without selection flags, the command lists every option, the valid combinations, and the order to decide them in. Add
flags to print one complete plan:

```sh
npx @videojs/cli agents init --framework react --media hls
npx @videojs/cli agents init --framework html --method shadcn --styling css
npx @videojs/cli agents init --framework html --method cdn --project existing --template none
```

Add `--json` for a structured document instead of Markdown, or `--version` to print the CLI version.

Each plan ends with a command that reproduces it with every choice spelled out. When you omit `--framework`, the command
reads the nearest `package.json`: React, Next.js, TanStack Start, and React Router projects get React instructions, Vue
and Nuxt projects get Vue, Svelte and SvelteKit projects get Svelte, and anything else gets plain HTML. React
instructions install `@videojs/react`; HTML, Vue, and Svelte instructions install `@videojs/html`.

## What it does not do

The command only prints instructions. It never installs packages, writes files, prompts, or saves preferences. The
package is a single bundled file with no dependencies, so `npx` downloads it without the player packages it describes.

## Versions

Package versions in the instructions match the CLI version. When the project already has a different `@videojs/react`
or `@videojs/html` version, the plan says so and shows the pinned command for that release, such as
`npx @videojs/cli@10.0.0 agents init …`. Releases before `agents init` moved into this package do not include the
command; upgrade the project's Video.js packages instead.

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
