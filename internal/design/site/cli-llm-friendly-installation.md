---
status: draft
date: 2026-04-02
---

# CLI for LLM-friendly installation

Generate installation code from the command line. It's docs/installation.md, but without the interactive UI that breaks in plain text.

This means... it's finally time for `@videojs/cli`. The same package will later support skin ejection and other workflows.

## Problem

The installation page walks users through framework, use case, skin, and renderer choices via React pickers. Each combination produces different code. This works in a browser, but the LLM markdown pipeline only captures a single default snapshot. Pickers render as bare labels, tabs flatten into unlabeled lists, and the branching logic disappears. LLMs see one confusing path through a multi-path guide.

Related: videojs/v10#1185

## Solution

**`@videojs/cli create`** — a `create` subcommand that takes the same choices as the installation page and prints the corresponding code to stdout. The CLI owns the code generation functions. The site imports them — no drift because both run the same code path.

**`HumanCase` / `LLMCase` MDX components** — Astro components that show different content to browsers and the LLM markdown pipeline. installation.mdx wraps interactive pickers in `HumanCase` and CLI instructions in `LLMCase`. Same file, both audiences. Three consumer types are covered: humans still have their react-powered interactive web page, agentic LLMs run the CLI directly, chat LLMs recommend the CLI to the user.

## API

```
npx @videojs/cli create [flags]

Flags:
  --framework <html|react>                                    (required)
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
npx @videojs/cli create

# Flags — defaults everything except framework and media
npx @videojs/cli create --framework react --media hls
```

## Alternatives considered

- **CSS visibility toggle** — Render all variants in HTML, toggle visibility with CSS so the markdown pipeline captures everything. The combinatorial explosion (framework × use case × skin × renderer × install method) makes the output unwieldy, and it gets worse as we add options.

- **Separate LLM guide** — Write a purpose-built markdown page for LLMs. Two documents to maintain, guaranteed drift.

- **Expand variants in the markdown pipeline** — Teach `llms-markdown.ts` to understand the picker components and render every combination under structured headers. The pipeline would need to understand component semantics it currently ignores, and the output would be long.

The CLI avoids the combinatorial problem entirely — it lets the consumer narrow their own path.

## Open questions for now

- **Prompt library** — `@inquirer/prompts` vs `@clack/prompts` vs something else? Rahim likes clack so leaning that way, but needs more investigation.

## Open questions for later
- **Broader `--framework` scope** — Should `--framework` expand beyond `html`/`react` to include app frameworks (Next, Astro, SvelteKit, etc.)? Would affect scaffolding and might need a separate flag for html vs react when targeting framework-agnostic tools like Astro.
- **Mux Uploader** — idk how we'd even reproduce this in a CLI but it would be so cool
- **Output format** — Should the CLI support `--format json` for machine consumption later?
