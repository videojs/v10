---
status: draft
date: 2026-04-02
---

# CLI for LLM-friendly installation docs

Generate installation code from the command line. It's docs/installation.md, but without the interactive React UI that breaks in plain text.

This means... it's finally time for `@videojs/cli`. The same package will later support skin ejection and other workflows.

## Problem

The installation page walks users through framework, preset, skin, and media choices via React pickers. Each combination produces different code. This works in a browser, but the LLM markdown pipeline only captures a single default snapshot. Pickers render as bare labels, tabs flatten into unlabeled lists, and the branching logic disappears. LLMs see one confusing path through a multi-path guide.

Related: videojs/v10#1185

## Solution

**`@videojs/cli docs how-to/installation`** — a command that takes the same choices as the installation page and prints the corresponding code to stdout.

**`HumanCase` / `LLMCase` MDX components** — Astro components that show different content to browsers and the LLM markdown pipeline. installation.mdx wraps interactive pickers in `HumanCase` and CLI instructions in `LLMCase`. Same file, both audiences. Three consumer types are covered: humans still have their react-powered interactive web page, agentic LLMs run the CLI directly, chat LLMs recommend the CLI to the user.

## API

```
npx @videojs/cli docs how-to/installation [flags]

Flags:
  --framework <html|react>                                    (see "framework resolution" below.)
  --preset <video|audio|background-video>                   (default: video)
  --skin <default|minimal>                                    (default: default)
  --media <html5-video|html5-audio|hls|background-video>   (default: per preset)
  --source-url <url>                                          (default: per media)
  --install-method <cdn|npm|pnpm|yarn|bun>                    (default: npm)
```

When no `--source-url` is provided, the CLI uses a default demo URL matching the media type (HLS gets an `.m3u8`, others get `.mp4`). When a URL is provided, the CLI auto-detects the media type from the file extension (`.m3u8` → HLS, `.mp4`/`.webm` → HTML5 Video, `.mp3`/`.wav` → HTML5 Audio) — matching the installation page's detection behavior. A poster URL is included in defaults.

No flags starts interactive prompts. With `--framework`, the CLI prints code to stdout and defaults the rest. Invalid combinations exit non-zero with an error explaining the constraint.

```bash
# Interactive
npx @videojs/cli docs how-to/installation

# Flags — defaults everything except framework and media
npx @videojs/cli docs how-to/installation --framework react --media hls
```

## Single source of truth
If this command is serving the same content as installation.mdx... how do we keep the two in sync? Honestly, that's a tricky question. Obviously we have a single source of truth, but where is that truth?

I'm thinking that the codegen is going to live in the site and be imported by the CLI. After all, that's what this CLI is doing. Taking content from the site and displaying it in the CLI. 

And then... it's neat that this CLI can generate code examples, but what of the content around the code examples? I'm a bit fuzzier on this, but I'm imagining the CLI will take installation.md and string-replace the static code examples with the generated ones.

## Wait, I noticed you called this @videojs/cli docs...

PLOT TWIST.

Yeah. So we had a few conversations around this and there was this desire to scope creep. To write to the directory. Stuff like that. But really, the only problem I'm trying to solve right now is... how do I serve _this_ doc to an LLM? 

Calling this utility @videojs/cli docs how-to/installation really clarifies things for me. Obvious scope, obvious implementation, obvious consumption to the user.

Aaaand... I mean, we already have markdown docs lying around... it seems trivial to just... copy them over here, right?  Why not serve all the docs through the cli? It'll be nice that they're versioned and local.

### @videojs/cli docs API

#### Reading a doc

```
npx @videojs/cli docs <slug> [--framework <html|react>]
```

The slug mirrors the site's URL structure. For example, the page at `/docs/framework/react/how-to/installation/` is:

```
npx @videojs/cli docs how-to/installation --framework react
```

Most pages serve their markdown directly. Pages with interactive content (like installation) override the default behavior and accept additional flags.

#### Framework resolution

Every doc requires a framework. Resolution order:

1. **`--framework` flag** — overrides saved preference, doesn't change it
2. **Saved preference** — set via `config set`
3. **Interactive prompt** — if nothing above resolves, the CLI asks and suggests saving the preference:

```
💡 Tip: run `npx @videojs/cli config set framework XYZ` to save this preference
```

#### Listing sections

```
npx @videojs/cli docs --list
```

Lists available doc pages, built from the site's sidebar config. Follows framework resolution rules above

#### Config

```
npx @videojs/cli config set <key> <value>
npx @videojs/cli config get <key>
npx @videojs/cli config list
```

Persists to `~/.videojs/config.json`. Currently the only setting is `framework`.

## Anything else?

I'm thinking of using bombshell-dev/clack, /args/ and /tab because it's a trendy combo and Rahim likes it. Idk. We can throw it out later. This seems portable.

## Alternatives considered

- **CSS visibility toggle** — Render all variants in HTML, toggle visibility with CSS so the markdown pipeline captures everything. The combinatorial explosion (framework × use case × skin × renderer × install method) makes the output unwieldy, and it gets worse as we add options.

- **Separate LLM guide** — Write a purpose-built markdown page for LLMs. Two documents to maintain, guaranteed drift.

- **Expand variants in the markdown pipeline** — Teach `llms-markdown.ts` to understand the picker components and render every combination under structured headers. The pipeline would need to understand component semantics it currently ignores, and the output would be long.

The CLI avoids the combinatorial problem entirely — it lets the consumer narrow their own path.

## Open questions for later
- **Broader `--framework` scope** — Should `--framework` expand beyond `html`/`react` to include app frameworks (Next, Astro, SvelteKit, etc.)? That's a good conversation that affects the docs, too, so I'm going to leave that aside for now.
- **MCP** — is a thing
- **Mux Uploader** — idk how we'd even reproduce this in a CLI but it would be so cool
