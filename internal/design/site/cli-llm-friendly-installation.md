---
status: draft
date: 2026-04-02
---

# CLI for LLM-Friendly Installation

A CLI tool (`@videojs/cli`) that generates installation code, solving the problem of interactive documentation that degrades for LLM consumers. This is the MVP scope — the same package will later support skin ejection and other workflows.

## Problem

The installation page is a multi-path interactive guide. Users pick a framework, use case, skin, and renderer through React pickers, and code generation functions produce tailored snippets. This works well for humans in a browser.

The LLM markdown pipeline captures a single snapshot of the rendered HTML — the default Nanostores state. Pickers render as bare labels, tabs flatten into unlabeled lists, and the branching logic is invisible. LLMs see one confusing path through a multi-path guide.

Related: videojs/v10#1185

## Solution

Two changes:

1. **`@videojs/cli`** — A new package at `packages/cli` that owns the code generation logic. It takes the same choices as the installation page and prints corresponding code to stdout. The site imports these generators instead of owning them — no drift because it's the same code path. Supports interactive prompts (no flags) and pure flag-driven output.

2. **`HumanCase` / `LLMCase` components** — Astro components using the existing `data-llms-ignore` system. The installation MDX wraps interactive pickers in `HumanCase` and CLI instructions in `LLMCase`. Same file, both audiences.

## Quick Start

### Interactive (humans, chatbot-assisted)

```bash
npx @videojs/cli create

# ? Framework: (html / react)
# ? Use case: (video / audio / background-video)
# ? Skin: (default / minimal)
# ? Renderer: (html5-video / hls)
# ? Install method: (cdn / npm / pnpm / yarn / bun)  ← HTML only
```

### Flags (agentic LLMs)

```bash
npx @videojs/cli create --framework react --use-case video --renderer hls
```

### LLMCase in MDX

```mdx
<HumanCase>
  <UseCasePicker client:idle />
  <SkinPickerSection />
  <RendererPicker client:idle />
  <HTMLUsageCodeBlock client:idle />
</HumanCase>

<LLMCase>
To generate installation code tailored to your project, run:

```bash
npx @videojs/cli create
```

If you already know your choices, pass them as flags:

```bash
npx @videojs/cli create --framework react --use-case video --skin default --renderer hls
```
</LLMCase>
```

## API

### CLI

```
npx @videojs/cli create [flags]

Flags:
  --framework <html|react>
  --use-case <video|audio|background-video>
  --skin <default|minimal>
  --renderer <html5-video|html5-audio|hls|background-video>
  --install-method <cdn|npm|pnpm|yarn|bun>  (HTML framework only)

No flags → interactive prompts.
All flags → prints code to stdout.
Partial flags → error listing what's missing.
```

Invalid combinations produce a non-zero exit code and an error explaining the constraint.

Each dimension has a default value. Choices constrain subsequent options (e.g., `audio` use case filters renderers to `html5-audio`).

### Generator Functions

Pure functions — no React, no Nanostores, no Node APIs. These are the same functions currently in the site's code block components, extracted to `@videojs/cli` as the source of truth.

```ts
function generateHTMLCode(useCase, skin, renderer, sourceUrl?): string;
function generateJS(useCase, skin, renderer): string;
function generateCdnCode(useCase, skin, renderer): string;
function generateReactCode(useCase, skin, renderer): string;
```

The site components import these and wire Nanostores state as arguments. The CLI calls them with parsed flags. Same functions, different input sources.

### HumanCase / LLMCase

`HumanCase` renders normally but marks content `data-llms-ignore="all"` — the markdown pipeline strips it. `LLMCase` renders with `hidden` (invisible in browsers) but without `data-llms-ignore` — the pipeline captures it.

## Alternatives Considered

- **CSS visibility toggle** — Render all variants in the HTML, toggle with CSS so the markdown pipeline captures everything. Simple, but the combinatorial explosion (framework × use case × skin × renderer × install method) makes the output unwieldy and gets worse as options grow.

- **Separate LLM installation guide** — Purpose-built markdown for LLMs. Optimized for the consumer, but two documents to maintain with guaranteed drift.

- **Expand all variants in the markdown pipeline** — Teach `llms-markdown.ts` to understand the picker components and render every combination under structured headers. Keeps one source of truth, but the output is long and the pipeline needs to understand component semantics it currently ignores.

- **One page per combination** — Generate separate pages like `installation/react-video.md`, `installation/html-audio.md`. Each is short and linear, but page count grows multiplicatively and most combinations aren't worth their own page.

- **Base example + modification deltas** — Show one canonical installation, describe each axis as a diff. Compact and mirrors how developers think, but privileges one combination as "default" and gets hard to follow beyond 2-3 axes.

- **Structured data (JSON/YAML)** — Expose the installation matrix as machine-parseable data. Most machine-friendly, but it's a data sheet, not a guide — not useful without an agent that knows what to do with it.

The CLI approach wins because it serves all three consumer types (agentic LLMs run it, chat LLMs recommend it, humans run it when told to), avoids drift by sharing code with the site, and doesn't fight the combinatorial problem — it lets the user narrow their path interactively.

## Open Questions

- **Prompt library** — `@inquirer/prompts` vs `@clack/prompts` vs something else?
- **Partial flags** — Current spec says partial flags error. Should the CLI instead prompt for only the missing flags?
- **`--source-url` flag** — The site lets users paste a source URL that gets embedded in generated code. Should the CLI support this too?
- **Output format** — Should the CLI support `--format json` for machine consumption down the road?
