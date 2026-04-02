---
status: draft
date: 2026-04-02
---

# CLI for LLM-friendly installation

Generate installation code from the command line — the same code the installation page produces, without the interactive UI that breaks in plain text.

This is the MVP scope for `@videojs/cli`. The same package will later support skin ejection and other workflows.

## Problem

The installation page walks users through framework, use case, skin, and renderer choices via React pickers. Each combination produces different code. This works in a browser, but the LLM markdown pipeline only captures a single default snapshot. Pickers render as bare labels, tabs flatten into unlabeled lists, and the branching logic disappears. LLMs see one confusing path through a multi-path guide.

Related: videojs/v10#1185

## Solution

**`@videojs/cli create`** — a `create` subcommand that takes the same choices as the installation page and prints the corresponding code to stdout. The CLI owns the code generation functions. The site imports them — no drift because both run the same code path.

**`HumanCase` / `LLMCase` components** — Astro components that show different content to browsers and the LLM markdown pipeline. The installation MDX wraps interactive pickers in `HumanCase` and CLI instructions in `LLMCase`. Same file, both audiences. Three consumer types are covered: agentic LLMs run the CLI directly, chat LLMs recommend it to the user, and humans run it when prompted.

## API

```
npx @videojs/cli create [flags]

Flags:
  --framework <html|react>                                    (required)
  --use-case <video|audio|background-video>                   (default: video)
  --skin <default|minimal>                                    (default: default)
  --renderer <html5-video|html5-audio|hls|background-video>   (default: per use case)
  --install-method <cdn|npm|pnpm|yarn|bun>                    (default: npm, HTML only)
```

No flags starts interactive prompts. With `--framework`, the CLI prints code to stdout and defaults the rest. Invalid combinations exit non-zero with an error explaining the constraint.

```bash
# Interactive
npx @videojs/cli create

# Flags — defaults everything except framework and renderer
npx @videojs/cli create --framework react --renderer hls
```

## Alternatives considered

- **CSS visibility toggle** — Render all variants in HTML, toggle visibility with CSS so the markdown pipeline captures everything. The combinatorial explosion (framework × use case × skin × renderer × install method) makes the output unwieldy, and it gets worse as we add options.

- **Separate LLM guide** — Write a purpose-built markdown page for LLMs. Two documents to maintain, guaranteed drift.

- **Expand variants in the markdown pipeline** — Teach `llms-markdown.ts` to understand the picker components and render every combination under structured headers. The pipeline would need to understand component semantics it currently ignores, and the output would be long.

The CLI avoids the combinatorial problem entirely — it lets the consumer narrow their own path.

## Open questions

- **Prompt library** — `@inquirer/prompts` vs `@clack/prompts` vs something else?
- **`--source-url` flag** — The site lets users paste a source URL that gets embedded in generated code. Should the CLI support this?
- **Output format** — Should the CLI support `--format json` for machine consumption later?
