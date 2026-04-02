---
status: draft
date: 2026-04-02
---

# CLI for LLM-Friendly Installation

A CLI tool (`@videojs/cli`) that generates installation code for Video.js 10, solving the problem of interactive documentation that degrades poorly for LLM consumers.

## Problem

The installation page (`site/src/content/docs/how-to/installation.mdx`) is a multi-path interactive guide. Users pick a framework, use case, skin, and renderer through React pickers, and code generation functions produce tailored installation snippets. This works well for humans in a browser.

The LLM markdown pipeline (`llms-markdown.ts`) captures a single snapshot of the rendered HTML — the default Nanostores state (`html5-video` + `video` skin + `cdn`). Pickers render as bare labels, tabs flatten into unlabeled lists, and the branching logic is invisible. LLMs and other plain-text consumers see one confusing path through a multi-path guide.

Related: videojs/v10#1185

## Solution

Two changes:

1. **`@videojs/cli`** — A new package that owns the code generation logic. The CLI takes the same choices as the installation page (framework, use case, skin, renderer, install method) and prints the corresponding code to stdout. The site imports these generators from the CLI package instead of owning them.

2. **`HumanCase` / `LLMCase` components** — Astro components that conditionally show content to humans or LLMs using the existing `data-llms-ignore` system. The installation MDX wraps interactive pickers in `HumanCase` and CLI instructions in `LLMCase`. Same file, both audiences.

## Quick Start

### CLI — Interactive (humans, chatbot-assisted)

```bash
npx @videojs/cli

# Prompts:
# ? Framework: (html / react)
# ? Use case: (video / audio / background-video)
# ? Skin: (default / minimal)
# ? Renderer: (html5-video / hls)
# ? Install method: (cdn / npm / pnpm / yarn / bun)  ← HTML only
```

### CLI — Flags (agentic LLMs)

```bash
npx @videojs/cli --framework react --use-case video --renderer hls
```

### LLMCase in MDX

```mdx
<HumanCase>
  <UseCasePicker client:idle />
  <SkinPickerSection />
  <RendererPicker client:idle />
  <HTMLInstallTabs client:idle />
  <HTMLUsageCodeBlock client:idle />
</HumanCase>

<LLMCase>
To generate installation code tailored to your project, run:

```bash
npx @videojs/cli
```

This walks you through the same choices available on the interactive version
of this page: framework, use case, skin, and renderer.

If you already know your choices, pass them as flags:

```bash
npx @videojs/cli --framework react --use-case video --skin default --renderer hls
```

**Choice reference:**

| Flag | Options | Default |
|------|---------|---------|
| `--framework` | `html`, `react` | `html` |
| `--use-case` | `video`, `audio`, `background-video` | `video` |
| `--skin` | `default`, `minimal` | `default` |
| `--renderer` | `html5-video`, `html5-audio`, `hls`, `background-video` | depends on use case |
| `--install-method` | `cdn`, `npm`, `pnpm`, `yarn`, `bun` | `npm` (HTML only) |

Not all combinations are valid. The CLI will error if you pick an incompatible
combination (e.g., `--use-case audio --renderer hls`).
</LLMCase>
```

## API

### Generator Functions

Pure functions extracted from the current site components. No React, no Nanostores, no Node-specific APIs.

```ts
// @videojs/cli/generators (or similar export path)

function generateHTMLCode(useCase, skin, renderer, sourceUrl?): string;
function generateJS(useCase, skin, renderer): string;
function generateCdnCode(useCase, skin, renderer): string;
function generateReactCode(useCase, skin, renderer): string;
```

These are the same functions currently in `HTMLUsageCodeBlock.tsx`, `ReactCreateCodeBlock.tsx`, and `cdn-code.ts`, moved to `@videojs/cli` and re-exported.

### Types

The `UseCase`, `Skin`, `Renderer`, `InstallMethod` types and the `VALID_RENDERERS` constraint map currently live in `site/src/stores/installation.ts`. They move to `@videojs/cli` as the source of truth. The site re-exports or imports them from the CLI package.

### CLI Binary

```
videojs-cli [flags]

Flags:
  --framework <html|react>
  --use-case <video|audio|background-video>
  --skin <default|minimal>
  --renderer <html5-video|html5-audio|hls|background-video>
  --install-method <cdn|npm|pnpm|yarn|bun>  (HTML framework only)

With no flags: interactive prompts.
With all flags: prints code to stdout, no prompts.
With partial flags: errors, listing what's missing.
```

Invalid combinations produce a non-zero exit code and an error message explaining the constraint (e.g., "Renderer 'hls' is not valid for use case 'audio'. Valid renderers: html5-audio").

### HumanCase / LLMCase Components

```astro
<!-- HumanCase.astro -->
<!-- Visible in browsers. Stripped from LLM markdown output. -->
<div class="contents" data-llms-ignore="all">
  <slot />
</div>
```

```astro
<!-- LLMCase.astro -->
<!-- Hidden in browsers. Captured by LLM markdown pipeline. -->
<div class="contents" hidden>
  <slot />
</div>
```

`HumanCase` renders normally but marks content `data-llms-ignore="all"` so the markdown pipeline strips it. `LLMCase` renders with `hidden` (invisible to browsers) but without `data-llms-ignore`, so the pipeline captures it.

## Behavior

### Code Sharing

The CLI package owns the generation logic. The site is a consumer:

```
@videojs/cli (packages/cli)
├── src/
│   ├── generators/          # Pure code generation functions
│   │   ├── html.ts          # generateHTMLCode, generateJS
│   │   ├── react.ts         # generateReactCode
│   │   └── cdn.ts           # generateCdnCode
│   ├── types.ts             # UseCase, Skin, Renderer, InstallMethod, VALID_RENDERERS
│   └── bin.ts               # CLI entry point (prompts, flag parsing, stdout)
```

Site components import generators:

```ts
// site/src/components/installation/HTMLUsageCodeBlock.tsx
import { generateHTMLCode, generateJS } from '@videojs/cli/generators';
import { useStore } from '@nanostores/react';
import { renderer, skin, useCase } from '@/stores/installation';

export default function HTMLUsageCodeBlock() {
  const $useCase = useStore(useCase);
  // ... same as today, but the function comes from @videojs/cli
  return <ClientCode code={generateHTMLCode($useCase, $skin, $renderer, $sourceUrl)} />;
}
```

Site stores import types:

```ts
// site/src/stores/installation.ts
import { atom } from 'nanostores';
import type { Renderer, Skin, UseCase, InstallMethod } from '@videojs/cli';

export const renderer = atom<Renderer>('html5-video');
// ...
```

### Interactive Mode

When run with no flags, the CLI prompts through each choice in order. Choices constrain subsequent prompts (e.g., selecting `audio` use case filters the renderer list to `html5-audio`). Uses a prompting library like `@inquirer/prompts` or `@clack/prompts`.

### Flags Mode

When all flags are provided, the CLI validates the combination, generates code, and prints to stdout with no interactivity. This is the mode agentic LLMs use. A partial set of flags is an error — the CLI does not mix prompts and flags.

### Discoverability

Three places LLMs encounter the CLI:

1. **`LLMCase` on the installation page** — the primary discovery point in framework-specific docs markdown.
2. **`llms.txt` header** — a brief mention that a CLI exists for generating installation code.
3. **Training data / web search** — the CLI's npm page and README surface in LLM training corpora over time.

## Trade-offs

| Gain | Cost |
|------|------|
| Single source of truth for code generation | New package to maintain |
| LLMs get actionable instructions instead of garbled UI | CLI must stay in sync with supported renderers/skins |
| Works for agentic LLMs (run it), chat LLMs (recommend it), and humans (prompted by chatbot) | Adds a dependency from site → CLI package |
| Doesn't block future CLI expansion (skin ejection, scaffolding) | Interactive prompting library adds weight to the package |

## Prior Art

- **`create-next-app`**, **`create-vite`**, **`npm create`** — Interactive project scaffolding CLIs. These go further (write files, install deps). Our MVP is stdout-only but the interaction pattern is familiar.
- **`llms.txt` convention** — Established pattern for making docs LLM-readable. Our `LLMCase` component extends this by allowing per-section LLM-specific content within existing pages.
- **Starlight / Astro docs** — Other doc frameworks generate `llms.txt` but don't address interactive content degradation.

## Open Questions

- **Prompt library choice** — `@inquirer/prompts` (widely used, stable) vs `@clack/prompts` (prettier output, smaller) vs something else? The choice affects package size and DX but not architecture.
- **Export path design** — Should generators be at `@videojs/cli/generators` or a different subpath? Needs to work with the package's `exports` map and not conflict with future subcommands.
- **Partial flags behavior** — Current spec says partial flags are an error. Should the CLI instead prompt only for missing flags? This is friendlier for humans but complicates the "no interactivity with flags" contract for agents.
- **`--source-url` flag** — The site lets users paste a source URL that gets embedded in generated code. Should the CLI support this too? It's not a "choice" in the same way as the others — it's freeform input.
- **Output format** — Should the CLI support `--format json` for machine consumption? The MVP is plain text, but structured output could be useful for tooling later.
