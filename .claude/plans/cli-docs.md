# Plan: `@videojs/cli` — Docs CLI for LLM-friendly installation

## Context

The installation page (`site/src/content/docs/how-to/installation.mdx`) uses interactive React pickers that break when converted to plain text by the LLM markdown pipeline. LLMs see a single confusing snapshot instead of the multi-path guide. The CLI lets LLMs (and humans) generate the right installation code by passing flags.

**Issues:** videojs/v10#1205 (design doc), videojs/v10#1185 (problem report)

**Design decisions made (from interactive review):**
- Five codegen functions in the site, shared by site components and CLI
- `HumanCase`/`LLMCase` Astro components split browser vs. LLM content
- CLI markers via `data-cli-replace` attribute + Turndown rule (HTML comments don't survive Turndown)
- Bundled docs: site builds → .md files copied into CLI package at build time
- Tooling: `@bomb.sh/args` (flag parsing), `@clack/prompts` (interactive), `@bomb.sh/tab` (completions — deferred, not needed for MVP)
- Hard-coded installation handling (no premature abstraction for other pages)
- Interactive behavior: zero flags → prompt all; `--framework` only → prompt install options; `--framework` + any install flag → default the rest

---

## Phase 1: Extract codegen logic into pure functions

**Goal:** Move template generation out of React components into importable pure functions. Site behavior unchanged.

### Create: `site/src/utils/installation/types.ts`

Move from `site/src/stores/installation.ts`:
- `Renderer`, `Skin`, `UseCase`, `InstallMethod` types
- `VALID_RENDERERS` constant

### Modify: `site/src/stores/installation.ts`

- Remove type definitions and `VALID_RENDERERS`
- Import types for the nanostore atoms: `import type { Renderer, Skin, UseCase, InstallMethod } from '@/utils/installation/types';`
- Keep nanostore atoms untouched
- **No re-exports** — all downstream files update their imports directly

### Update all importers to use `@/utils/installation/types`

Files that import types/constants from `@/stores/installation` must move those imports to `@/utils/installation/types`. Files that also import nanostore atoms keep that import from `@/stores/installation`.

**Fully migrate** (only import types/constants, no atoms):
- `site/src/utils/installation/detect-renderer.ts` — types + `VALID_RENDERERS`
- `site/src/utils/installation/cdn-code.ts` — types only

**Split imports** (types from `types.ts`, atoms stay from `stores/installation.ts`):
- `site/src/components/installation/HTMLUsageCodeBlock.tsx` — types → types.ts; atoms (`installMethod`, `renderer`, `skin`, `sourceUrl`, `useCase`) stay
- `site/src/components/installation/ReactCreateCodeBlock.tsx` — types → types.ts; atoms stay
- `site/src/components/installation/ReactUsageCodeBlock.tsx` — types → types.ts; atoms stay
- `site/src/components/installation/HTMLInstallTabs.tsx` — `InstallMethod` type → types.ts; `installMethod` atom stays
- `site/src/components/installation/RendererSelect.tsx` — types + `VALID_RENDERERS` → types.ts; atoms stay
- `site/src/components/installation/UseCasePicker.tsx` — `UseCase` type → types.ts; `useCase` atom stays
- `site/src/components/installation/SkinPicker.tsx` — `Skin` type → types.ts; atoms stay

**No change needed** (only import atoms, no types):
- `site/src/components/installation/MuxUploaderPanel.tsx`
- `site/src/components/installation/HTMLCdnCodeBlock.tsx`
- `site/src/components/installation/SkinPickerSectionClient.tsx`

### Create: `site/src/utils/installation/codegen.ts`

Shared input type:
```ts
interface InstallationOptions {
  framework: 'html' | 'react';
  useCase: UseCase;
  skin: Skin;
  renderer: Renderer;
  sourceUrl: string;
  installMethod: InstallMethod;
}
```

Five codegen functions + validation:

| Function | Extracts from | Returns |
|---|---|---|
| `generateHTMLInstallCode(opts)` | `HTMLInstallTabs.tsx` + `cdn-code.ts` | `{ cdn: string, npm: string, pnpm: string, yarn: string, bun: string }` |
| `generateReactInstallCode(opts)` | Static strings | `{ npm: string, pnpm: string, yarn: string, bun: string }` |
| `generateHTMLUsageCode(opts)` | `HTMLUsageCodeBlock.tsx` | `{ html: string, js?: string }` |
| `generateReactCreateCode(opts)` | `ReactCreateCodeBlock.tsx` | `{ "MyPlayer.tsx": string }` |
| `generateReactUsageCode(opts)` | `ReactUsageCodeBlock.tsx` | `{ "App.tsx": string }` |
| `validateInstallationOptions(opts)` | New (uses `VALID_RENDERERS`) | `{ valid: true } \| { valid: false, reason: string }` |

**Validation rules:**
- `cdn + react` → invalid
- `renderer` not in `VALID_RENDERERS[useCase]` → invalid

Mapping tables to extract (currently inline in React components):
- Renderer → HTML tag: `{ 'background-video': 'background-video', hls: 'hls-video', 'html5-audio': 'audio', 'html5-video': 'video' }`
- UseCase → provider tag: `{ 'default-video': 'video-player', 'default-audio': 'audio-player', 'background-video': 'background-video-player' }`
- Skin → skin tag, skin component, CSS import path, etc.
- Default source URLs from `VJS10_DEMO_VIDEO` in `site/src/consts.ts`

### Modify: Site React components to consume codegen functions

- `site/src/components/installation/HTMLUsageCodeBlock.tsx` — replace inline template logic with `generateHTMLUsageCode()`
- `site/src/components/installation/ReactCreateCodeBlock.tsx` — replace with `generateReactCreateCode()`
- `site/src/components/installation/ReactUsageCodeBlock.tsx` — replace with `generateReactUsageCode()`
- `site/src/components/installation/HTMLInstallTabs.tsx` — replace with `generateHTMLInstallCode()`

### Create: `site/src/utils/installation/__tests__/codegen.test.ts`

Test all five functions + validation across key combos:
- HTML + video + default skin + npm + html5-video
- HTML + video + default skin + cdn + hls (CDN code + media script)
- React + video + minimal skin + npm + hls
- React + audio + default skin + pnpm + html5-audio
- Invalid: react + cdn, audio + hls

### Verify

```bash
pnpm -F site test
pnpm typecheck
pnpm -F site build
# Manual: dev server, click through all picker combos, confirm identical output
```

---

## Phase 2: `HumanCase` / `LLMCase` components + CLI markers

### Create: `site/src/components/docs/HumanCase.astro`

Renders children normally in browser, stripped from LLM markdown:
```astro
---
---
<div class="contents" data-llms-ignore>
  <slot />
</div>
```

### Create: `site/src/components/docs/LLMCase.astro`

Visible in LLM markdown, hidden from browsers:
```astro
---
---
<div class="contents" hidden data-llms-only>
  <slot />
</div>
```

**Critical:** Turndown may skip `hidden` elements. Must add Turndown rule (see below).

### Modify: `site/integrations/llms-markdown.ts`

Add two Turndown rules after creating the `turndown` instance (after line 35):

1. **`llms-only` rule** — ensures `[data-llms-only]` content passes through cleanly despite `hidden` attribute:
   ```ts
   turndown.addRule('llms-only', {
     filter: (node) => node.nodeType === 1 && (node as Element).getAttribute('data-llms-only') !== null,
     replacement: (content) => content,
   });
   ```

2. **`cli-replace` rule** — wraps `[data-cli-replace]` content with text markers the CLI can find:
   ```ts
   turndown.addRule('cli-replace', {
     filter: (node) => node.nodeType === 1 && (node as Element).getAttribute('data-cli-replace') !== null,
     replacement: (content, node) => {
       const id = (node as Element).getAttribute('data-cli-replace');
       return `\n<!-- cli:replace ${id} -->\n${content}\n<!-- /cli:replace ${id} -->\n`;
     },
   });
   ```

   **Note on filters:** Cannot use `instanceof dom.window.HTMLElement` — the `turndown` instance is created once before the per-page loop, and Turndown internally creates its own DOM for the HTML string it receives. The `nodeType === 1` + `getAttribute` pattern works across DOM implementations.

   These `<!-- -->` markers in the markdown OUTPUT are just literal text strings — they're not parsed as HTML again. This is why they survive.

   **Processing order:** Turndown processes inner nodes first. The `data-cli-replace` div is nested inside the `data-llms-only` div, so `cli-replace` fires first (adding markers), then `llms-only` passes the result through.

### Modify: `site/src/content/docs/how-to/installation.mdx`

Add imports for `HumanCase` and `LLMCase`. Wrap the interactive section:

```mdx
import HumanCase from '@/components/docs/HumanCase.astro';
import LLMCase from '@/components/docs/LLMCase.astro';

{/* After the intro prose, before CSP section: */}

<LLMCase>
  <div data-cli-replace="installation">

Run `npx @videojs/cli docs how-to/installation` to generate installation code for your setup.

**Flags:**
- `--framework <html|react>` — JS framework
- `--preset <video|audio|background-video>` — player preset (default: video)
- `--skin <default|minimal>` — skin (default: default)
- `--media <html5-video|html5-audio|hls|background-video>` — media type (default: per preset)
- `--source-url <url>` — media URL (default: demo URL per media type)
- `--install-method <cdn|npm|pnpm|yarn|bun>` — install method (default: npm)

  </div>
</LLMCase>

<HumanCase>
  {/* All the existing interactive pickers, install tabs, code blocks */}
</HumanCase>
```

Remove the placeholder `<!-- cli-remove-start -->`, `<!-- cli-remove-end -->`, `<!-- cli-insert-code -->` HTML comments.

### Verify

```bash
pnpm -F site build
# Check site/dist/docs/framework/html/how-to/installation.md:
#   - No interactive picker HTML
#   - Contains <!-- cli:replace installation --> markers
#   - Contains CLI usage instructions between markers
# Check site/dist/docs/framework/html/how-to/installation/index.html:
#   - Shows interactive pickers
#   - Does NOT show CLI instructions
```

---

## Phase 3: `@videojs/cli` package

### Create: `packages/cli/` directory structure

```
packages/cli/
├── package.json
├── tsconfig.json
├── tsdown.config.ts
├── vitest.config.ts
├── scripts/
│   └── copy-docs.js          # Copies .md from site/dist into cli/docs
├── docs/                      # Populated at build time (gitignored)
├── src/
│   ├── index.ts               # Entry: arg parsing, subcommand routing
│   ├── commands/
│   │   ├── docs.ts            # docs subcommand
│   │   └── config.ts          # config subcommand
│   └── utils/
│       ├── config.ts          # ~/.videojs/config.json read/write
│       ├── prompts.ts         # @clack/prompts interactive flows
│       ├── replace.ts         # Find/replace CLI markers in markdown
│       ├── format.ts          # Assemble codegen output into markdown sections
│       ├── docs.ts            # Read bundled .md files
│       └── tests/
│           ├── replace.test.ts
│           ├── format.test.ts
│           └── config.test.ts
```

### `packages/cli/package.json`

```json
{
  "name": "@videojs/cli",
  "type": "module",
  "version": "10.0.0-beta.14",
  "bin": "./dist/index.js",
  "files": ["dist", "docs"],
  "scripts": {
    "copy-docs": "node scripts/copy-docs.js",
    "build": "pnpm run copy-docs && tsdown",
    "dev": "tsdown --watch",
    "test": "vitest run",
    "clean": "rimraf dist docs"
  },
  "dependencies": {
    "@bomb.sh/args": "...",
    "@clack/prompts": "...",
  },
  "devDependencies": {
    "site": "workspace:*",
    "tsdown": "...",
    "typescript": "...",
    "vitest": "..."
  }
}
```

- `"site": "workspace:*"` as devDep — allows importing codegen at build time; tsdown bundles it (no runtime dep)
- `bin` shorthand: `"./dist/index.js"` — npx resolves the binary name from the package name automatically, so `npx @videojs/cli docs ...` works

### `packages/cli/tsdown.config.ts`

```ts
export default defineConfig({
  entry: { index: './src/index.ts' },
  platform: 'node',
  format: 'es',
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  noExternal: ['site'],
  // Alias site's @/ path aliases so codegen imports resolve
});
```

The alias config maps `@/utils/installation/*` and `@/consts` to their actual paths in `../../site/src/`. This lets tsdown bundle the codegen functions into the CLI output.

### `packages/cli/vitest.config.ts`

Must include the same `@/` alias resolution as `tsdown.config.ts` so that tests can import codegen functions:
```ts
export default defineConfig({
  test: { globals: true },
  resolve: {
    alias: {
      '@/': '../../site/src/',
    },
  },
});
```

### `packages/cli/src/index.ts` — Entry point

```ts
import { parse } from '@bomb.sh/args';

const parsed = parse(process.argv.slice(2), {
  alias: { f: 'framework', l: 'list', v: 'version', h: 'help' },
  string: ['framework', 'preset', 'skin', 'media', 'source-url', 'install-method'],
  boolean: ['list', 'version', 'help'],
});

const [command, ...rest] = parsed._;

if (command === 'docs') handleDocs(parsed, rest);
else if (command === 'config') handleConfig(rest);
else printHelp();
```

### `packages/cli/src/commands/docs.ts` — Docs command

```
handleDocs(flags, positionals):
  1. framework = resolveFramework(flags)  // flag → config → prompt
  2. if flags.list → readLlmsTxt(framework) → print → return
  3. slug = positionals[0]
  4. markdown = readBundledDoc(framework, slug)
  5. if slug is 'how-to/installation':
       opts = resolveInstallationOptions(flags, framework)
       validate(opts) or exit(1)
       generated = formatInstallationCode(opts)  // calls codegen, assembles markdown
       output = replaceMarker(markdown, 'installation', generated)
     else:
       output = markdown
  6. print version header
  7. print output
```

**Framework resolution order:**
1. `--framework` flag (overrides saved, doesn't change it)
2. Saved preference from `~/.videojs/config.json`
3. Interactive prompt via `@clack/prompts` (suggests saving)

**Installation option resolution:**
- Zero flags → `p.group()` prompts for all: preset, skin, media, source-url, install-method
- `--framework` only → `p.group()` prompts for installation options
- `--framework` + any install flag → defaults for unspecified (`video`, `default`, per-preset media, `""`, `npm`)

**Flag-to-type mappings:**
- `--preset video` → `useCase: 'default-video'`
- `--preset audio` → `useCase: 'default-audio'`
- `--preset background-video` → `useCase: 'background-video'`
- `--skin default` → keep preset's default skin (`video` or `audio`)
- `--skin minimal` → `minimal-video` or `minimal-audio` per preset
- `--source-url <url>` without `--media` → `detectRenderer(url, useCase)` to auto-detect media type (imported from site via tsdown alias, same as codegen functions)

### `packages/cli/src/utils/format.ts` — Code assembly

Calls the codegen functions, returns markdown string with headings and fenced code blocks. Must handle two HTML install paths:

For HTML + npm/pnpm/yarn/bun:
```md
## Install Video.js

```bash
npm install @videojs/html
```

## JavaScript imports

```javascript
import '@videojs/html/video/player';
...
```

## HTML

```html
<video-player>...</video-player>
```
```

For HTML + CDN (no JS imports section — script tags are the install step):
```md
## Install Video.js

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>
```

## HTML

```html
<video-player>...</video-player>
```
```

For React:
```md
## Install Video.js

```bash
npm install @videojs/react
```

## Create your player

```tsx
'use client';
...
```

## Use your player

```tsx
import { MyPlayer } from ...
```
```

### `packages/cli/src/utils/replace.ts` — Marker replacement

```ts
export function replaceMarker(markdown: string, id: string, replacement: string): string {
  const re = new RegExp(`<!-- cli:replace ${id} -->\\n[\\s\\S]*?\\n<!-- /cli:replace ${id} -->`);
  return markdown.replace(re, replacement);
}
```

### `packages/cli/src/commands/config.ts`

Reads/writes `~/.videojs/config.json`. Currently only `framework` setting.

```
config set framework react
config get framework
config list
```

### `packages/cli/scripts/copy-docs.js`

Copies from `site/dist/docs/framework/{html,react}/` into `packages/cli/docs/{html,react}/`. Uses `cpSync` with recursive copy, filtering to only include `.md` files, `.txt` files (llms.txt), and directories.

### Tests

- `src/utils/tests/replace.test.ts` — marker find/replace, no-match passthrough, surrounding content preserved
- `src/utils/tests/format.test.ts` — HTML + CDN, HTML + npm, React formatting
- `src/utils/tests/config.test.ts` — read/write with temp dirs

### Verify

```bash
pnpm -F @videojs/cli test
pnpm -F @videojs/cli build  # (after site is built)
node packages/cli/dist/index.js --version
node packages/cli/dist/index.js docs --list --framework html
node packages/cli/dist/index.js docs how-to/installation --framework html --preset video
node packages/cli/dist/index.js docs how-to/installation --framework react --media hls --install-method pnpm
node packages/cli/dist/index.js docs concepts/skins --framework react
```

---

## Phase 4: Build pipeline integration

### Modify: `commitlint.config.js`

Add `'cli'` to `scope-enum` array (after `'claude'`).

### Modify: root `tsconfig.json`

Add project reference:
```json
{ "path": "packages/cli" }
```

### Add: `.gitignore` entry

Add `packages/cli/docs/` to gitignore (populated at build time).

### Release: CLI versioned and released with core

The CLI uses the same version as `@videojs/core` (`10.0.0-beta.14`). It must be included in the monorepo's existing changeset/release workflow so it gets bumped and published alongside the other packages.

### Build order

The `"site": "workspace:*"` devDep on the CLI package creates the turbo dependency: site builds before CLI. The CLI's `prebuild` script copies `.md` files from `site/dist/`, then tsdown bundles everything.

Full sequence: `packages/* build` → `site build` → `cli copy-docs && tsdown`

### Verify

```bash
pnpm install
pnpm turbo run build --filter=@videojs/cli... --dry-run  # Confirm: site before cli
pnpm build  # Full monorepo build succeeds
pnpm typecheck
npx @videojs/cli docs how-to/installation --framework html
```

---

## Key files reference

| File | Role |
|---|---|
| `site/src/utils/installation/types.ts` | Shared types (Renderer, Skin, UseCase, etc.) |
| `site/src/utils/installation/codegen.ts` | Five codegen functions + validation |
| `site/src/utils/installation/detect-renderer.ts` | URL → renderer detection (already exists) |
| `site/src/consts.ts` | `VJS10_DEMO_VIDEO` default URLs |
| `site/src/stores/installation.ts` | Nanostore atoms only (types moved to types.ts) |
| `site/src/components/docs/HumanCase.astro` | Browser-only wrapper (data-llms-ignore) |
| `site/src/components/docs/LLMCase.astro` | LLM-only wrapper (hidden + data-llms-only) |
| `site/integrations/llms-markdown.ts` | Turndown rules for llms-only + cli-replace |
| `site/src/content/docs/how-to/installation.mdx` | Updated with HumanCase/LLMCase |
| `packages/cli/src/index.ts` | CLI entry point |
| `packages/cli/src/commands/docs.ts` | Docs command handler |
| `packages/cli/src/utils/format.ts` | Codegen output → markdown assembly |
| `packages/cli/src/utils/replace.ts` | Marker find/replace |
