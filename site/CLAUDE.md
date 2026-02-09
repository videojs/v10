# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

The **Video.js v10 documentation site** is an Astro-based static site generator with React islands for interactivity. The site serves documentation, blog posts, and interactive demos for the Video.js v10 library.

Key architectural feature: **Multi-framework documentation** — the same content generates separate routes for different framework/style combinations (e.g., HTML + CSS, React + CSS), allowing framework-specific documentation from shared MDX sources.

## Commands

From `site/` directory:

| Command              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `pnpm dev`           | Start dev server at `localhost:4321`                 |
| `pnpm build`         | Build production site to `./dist/`                   |
| `pnpm preview`       | Preview production build locally                     |
| `pnpm api-docs`      | Regenerate API reference JSON files                  |
| `pnpm test`          | Run all tests once                                   |
| `pnpm test:watch`    | Run tests in watch mode                              |
| `pnpm test:ui`       | Run Vitest with web UI                               |
| `pnpm test:coverage` | Generate coverage report                             |
| `pnpm astro ...`     | Run Astro CLI (e.g., `pnpm astro check`)            |

**From monorepo root:**
- `pnpm dev:site` — Start site dev server
- `pnpm build:site` — Build site

**Running single test file:**
```bash
pnpm test sidebar.test.ts
```

## Astro MCP Server

An Astro MCP server is likely available. **Always use Astro best practices and standard patterns** for maintainability. Consult the MCP for Astro-specific guidance when working with:
- Astro components and layouts
- Content collections
- Routing patterns
- Integrations
- Build optimizations

Following Astro conventions ensures consistency and makes the codebase easier to maintain.

## Tailwind v4 Configuration & Gotchas

This project uses **Tailwind v4** with a **custom configuration**. Standard Tailwind tokens may not be available.

### CRITICAL: Always Check globals.css First

**Before using any Tailwind utility class**, read `src/styles/globals.css` to verify:
- Custom color tokens (e.g., `dark-110`, `light-100`, not standard Tailwind colors)
- Custom text size tokens (e.g., `text-h1`, `text-h2`, not standard `text-4xl`, `text-5xl`)
- Custom tracking values
- Custom font weight values
- Available custom variants
- And possibly more

### Custom Variant: `intent:` (NOT `hover:` or `focus-visible:`)

Use the **`intent:` variant** instead of `hover:` and `focus-visible:`:

```astro
<!-- ✅ CORRECT -->
<button class="intent:bg-dark-80">Click me</button>

<!-- ❌ WRONG -->
<button class="hover:bg-dark-80">Click me</button>
```

The `intent:` variant is defined as:
```css
@custom-variant intent (&:hover, &:focus-within);
```

### Arbitrary Tailwind: Last Resort Only

**Avoid arbitrary variants like `[&:hover]` or `text-[pink]`**. Use them only as a last resort.

**Prefer inline styles** when Tailwind utilities don't exist:

```astro
<!-- ✅ BETTER: Inline style -->
<div style="transform: rotate(45deg)">Content</div>

<!-- ❌ WORSE: Arbitrary variant -->
<div class="[transform:rotate(45deg)]">Content</div>
```

### Use `clsx` for Class Concatenation

Always use **`clsx`** (or `cn` helper if available) for conditional classes:

```tsx
import clsx from 'clsx';

<button class={clsx(
  'text-base bg-dark-100',
  isActive && 'bg-dark-80',
  isPrimary ? 'text-yellow' : 'text-light-100'
)}>
  Click me
</button>
```

### Avoiding Arbitrary Values

**Prefer token-based utilities or inline styles over arbitrary values:**

```astro
<!-- ✅ CORRECT: Use token if available -->
<div class="min-h-30">Content</div>

<!-- ✅ CORRECT: Inline style for non-token values -->
<div style="min-height: 120px">Content</div>

<!-- ❌ WRONG: Arbitrary value -->
<div class="min-h-[120px]">Content</div>
```

**For responsive/dark mode with non-token values, use CSS custom properties:**

```astro
<!-- ✅ CORRECT: Custom property bridge -->
<div
  style="--md-min-h: 120px"
  class="md:min-h-(--md-min-h)"
>Content</div>

<!-- ❌ WRONG: Arbitrary value in variant -->
<div class="md:min-h-[120px]">Content</div>
```

This limits the classnames Tailwind must generate.

## Project Structure

```
site/
├── src/
│   ├── components/          # Astro + React components
│   │   └── docs/
│   │       ├── api-reference/   # API reference Astro components
│   │       └── demos/           # Interactive component demos (see below)
│   ├── content/             # Content collections (blog/, docs/, authors.json)
│   ├── layouts/             # Page layouts (Base, Blog, Docs, Markdown)
│   ├── pages/               # Route pages (file-based routing)
│   ├── content/generated-api-reference/ # Generated API reference JSON (gitignored)
│   ├── stores/              # Nanostores for cross-island state
│   ├── styles/              # Global CSS, Tailwind imports
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utilities and helpers
│   │   └── docs/            # Documentation-specific utilities
│   │       ├── sidebar.ts   # Sidebar filtering and navigation
│   │       ├── routing.ts   # Docs URL building and redirects
│   │       └── __tests__/   # Tests for docs utilities
│   ├── consts.ts            # Site-wide constants
│   ├── content.config.ts    # Content collection schemas
│   ├── docs.config.ts       # Documentation sidebar structure
│   └── test-setup.ts        # Vitest setup file
├── scripts/
│   └── api-docs-builder/    # Generates API reference from TypeScript
├── public/                  # Static assets (served untransformed)
├── integrations/            # Custom Astro integrations
│   └── pagefind.ts          # Pagefind search integration
├── astro.config.mjs         # Astro configuration
├── tsconfig.json            # TypeScript config with path aliases
└── vitest.config.ts         # Test configuration
```

## Interactive Demos

Reference pages include live, interactive demos for each component. Demos are framework-specific (React, HTML) and style-specific (CSS).

### Directory Structure

```
src/components/docs/demos/
├── Demo.astro              # Shared shell (live preview + tabbed source code)
├── HtmlDemo.astro          # Renders raw HTML via set:html
└── {component}/{framework}/{style}/
    ├── BasicUsage.tsx      # React: component (+ .css)
    ├── BasicUsage.html     # HTML: markup + <style>, no <script>
    └── BasicUsage.ts       # HTML: side-effect imports for custom element registration
```

### CSS Scoping with BEM

Demos use BEM class names for scoping. Block = `{component}-{variant}`, element = `__{part}`:

```
.play-button-basic              /* block */
.play-button-basic__button      /* element */
```

React `.css` and HTML `<style>` blocks for the same demo should use identical BEM names.

### React Demos

A `.tsx` component + `.css` file. Rendered as an Astro island via `client:idle`, displayed as source via `?raw`:

```mdx
import BasicUsageDemo from "@/components/docs/demos/play-button/react/css/BasicUsage";
import basicUsageTsx from "@/components/docs/demos/play-button/react/css/BasicUsage.tsx?raw";
import basicUsageCss from "@/components/docs/demos/play-button/react/css/BasicUsage.css?raw";

<Demo files={[
  { title: "App.tsx", code: basicUsageTsx, lang: "tsx" },
  { title: "App.css", code: basicUsageCss, lang: "css" },
]}>
  <BasicUsageDemo client:idle />
</Demo>
```

### HTML Demos

Split into `.html` (markup + style) and `.ts` (custom element registration). The `.ts` file is bundled by Vite via `?url` and loaded as a module script:

```mdx
import basicUsageHtml from "@/components/docs/demos/play-button/html/css/BasicUsage.html?raw";
import basicUsageHtmlTs from "@/components/docs/demos/play-button/html/css/BasicUsage.ts?raw";
import basicUsageHtmlScript from "@/components/docs/demos/play-button/html/css/BasicUsage.ts?url";

<script src={basicUsageHtmlScript} type="module"></script>

<Demo files={[
  { title: "index.html", code: basicUsageHtml, lang: "html" },
  { title: "index.ts", code: basicUsageHtmlTs, lang: "ts" },
]}>
  <HtmlDemo html={basicUsageHtml} />
</Demo>
```

When multiple HTML demos on one page use the same custom elements, a single `<script>` tag suffices.

### State Reflection in HTML Demos

HTML custom elements expose state via `data-*` attributes. Use CSS to toggle labels:

```html
<media-play-button class="play-button-basic__button">
  <span class="show-when-paused">Play</span>
  <span class="show-when-playing">Pause</span>
</media-play-button>
```
```css
.play-button-basic__button .show-when-paused { display: none; }
.play-button-basic__button .show-when-playing { display: none; }
.play-button-basic__button[data-paused] .show-when-paused { display: inline; }
.play-button-basic__button:not([data-paused]) .show-when-playing { display: inline; }
```

The React equivalent uses the `render` prop: `render={(props, state) => <button {...props}>{state.paused ? 'Play' : 'Pause'}</button>}`.

### Video Attributes

All demo videos use `autoplay muted playsinline loop` (React: `autoPlay muted playsInline loop`).

## Multi-Framework Documentation Architecture

### Framework/Style Combinations

Documentation is generated for **multiple framework and style combinations** from the same MDX source files.

**Current support** (defined in `src/types/docs.ts`):
- **Frameworks**: `html`, `react`
- **Styles**: `css` (more may be added)

**URL pattern:**
```
/docs/framework/{framework}/{...slug}/
```

**Style handling:** Style is a **client-side preference** stored in localStorage per-framework (`vjs_docs_style_html`, `vjs_docs_style_react`). The `StyleInit.astro` component reads localStorage before paint and sets `html[data-style]`. CSS rules control content visibility via `[data-for-style]` attributes on `<StyleCase>` wrapped content.

**Example:**
- `src/content/docs/how-to/installation.mdx` generates:
  - `/docs/framework/html/how-to/installation/`
  - `/docs/framework/react/how-to/installation/`

### Content Restriction Mechanisms

**1. Within MDX content:**

Use `<FrameworkCase>` or `<StyleCase>` components to show framework/style-specific content:

```mdx
<FrameworkCase for="react">
  Use `useState` to manage state.
</FrameworkCase>

<FrameworkCase for="html">
  Use `data-` attributes to manage state.
</FrameworkCase>
```

**2. In sidebar config (`src/docs.config.ts`):**

Restrict entire guides to specific frameworks:

```ts
const sidebar: Sidebar = [
  {
    sidebarLabel: 'Getting started',
    contents: [
      { slug: 'how-to/installation' }, // Available to all frameworks
      {
        slug: 'how-to/react-hooks',
        frameworks: ['react'] // Only visible when viewing React docs
      },
    ],
  },
];
```

**Note:** Style restrictions on sidebar items are no longer supported. All docs are visible to all styles; use `<StyleCase>` within docs to show style-specific content.

### Sidebar Configuration

**Structure** (`src/docs.config.ts`):
- Export a `sidebar` constant of type `Sidebar`
- Hierarchical: Sections contain Guides
- Each Guide has:
  - `slug`: Path relative to `src/content/docs/` (without `.mdx`)
  - `sidebarLabel` (optional): Override display name
  - `frameworks` (optional): Restrict to specific frameworks
  - `devOnly` (optional): Show only in development mode

**Example:**
```ts
export const sidebar: Sidebar = [
  {
    sidebarLabel: 'Components',
    contents: [
      { slug: 'reference/play-button' },
      { slug: 'reference/mute-button', sidebarLabel: 'Mute' },
    ],
  },
];
```

## Documentation Utilities

### Key Utility Functions (`src/utils/docs/`)

**`sidebar.ts`** — Sidebar filtering and navigation:
- `filterSidebar()`: Filter sidebar by framework, remove empty sections
- `findFirstGuide()`: Get first available guide for framework
- `findGuideBySlug()`: Search sidebar recursively for a guide
- `getAdjacentGuides()`: Get prev/next guides for navigation
- `getSectionsForGuide()`: Get breadcrumb trail to a guide

**`routing.ts`** — URL building and redirect logic:
- `buildDocsUrl()`: Construct docs URLs from framework/style/slug
- `resolveIndexRedirect()`: Intelligent redirect for index pages
  - Handles user preferences from localStorage
  - Validates framework/style combinations
  - Falls back to defaults when invalid

### Docs Routing Pattern

**Nested index pages** handle redirects at each level:
```
/docs/                             → redirect to first guide
/docs/framework/                   → redirect to first guide
/docs/framework/{framework}/       → redirect to first guide
/docs/framework/{framework}/{slug} → render guide
```

Each index page uses `resolveIndexRedirect()` to determine where to redirect based on:
1. URL params (framework)
2. User preferences (framework from cookies)
3. Defaults (when invalid or missing)

**Style is not part of the URL.** Style preference is stored per-framework in localStorage and applied client-side via CSS.

## Content Collections

Defined in `src/content.config.ts` using Astro's Content Collections API.

### IMPORTANT: Only MDX Files Supported

**We only support `.mdx` files, NOT `.md` files.**

All content must be written in **MDX format** to support:
- React components within content
- Framework/style conditional rendering (`<FrameworkCase>`, `<StyleCase>`)
- Custom typography components
- Interactive examples

### Blog Collection (`src/content/blog/`)

**Filename convention:** `YYYY-MM-DD-slug.mdx`
- Date prefix automatically removed from slug
- Example: `2024-01-15-new-release.mdx` → slug: `new-release`, URL: `/blog/new-release/`

**Schema:**
```ts
{
  title: string;
  description: string;
  pubDate: Date;          // From filename or git history
  authors: string[];      // Reference to authors.json
  devOnly?: boolean;      // Show only in development
}
```

### Docs Collection (`src/content/docs/`)

**Subdirectories:**
- `how-to/` — Outcome-focused guides (per Diátaxis framework)
- `concepts/` — Understanding-focused guides
- `reference/` — API documentation

**Schema:**
```ts
{
  title: string;
  description: string;
  frameworkTitle?: {      // Per-framework title overrides
    html?: string;
    react?: string;
  };
  updatedDate?: Date;     // From git history
}
```

### Authors Collection (`src/content/authors.json`)

```ts
{
  [key: string]: {
    name: string;
    bio?: string;
    avatar?: string;
    socialLinks?: { platform: string; url: string }[];
  }
}
```

### Git Integration

`src/utils/gitService.ts` uses `simple-git` to enrich content with metadata:
- Blog posts: `pubDate` from filename or first commit
- All content: `updatedDate` from last modification

## State Management with Nanostores

**Why Nanostores?** Astro's island architecture means each React component with `client:load` is an isolated React root. React Context doesn't work across islands, so we use Nanostores for cross-island state.

**Store locations** (`src/stores/`):
- `preferences.ts`: User framework/style preferences (persisted to localStorage)
- `homePageDemos.ts`: Home page demo state
- `tabs.ts`: Tab component state

**Usage pattern:**
```ts
import { useStore } from '@nanostores/react';
import { $preferences } from '@/stores/preferences';

function MyComponent() {
  const prefs = useStore($preferences);
  // ...
}
```

## Testing

### Configuration (`vitest.config.ts`)

```ts
{
  globals: true,              // No import needed for describe, it, expect
  environment: 'jsdom',       // Browser-like environment
  setupFiles: ['./src/test-setup.ts'], // Imports @testing-library/jest-dom
  coverage: {
    provider: 'v8',
    include: ['src/utils/**', 'src/components/**', 'src/types/**'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
  },
}
```

### Test Organization

Tests are **colocated** with source code in `__tests__/` directories:
```
src/utils/docs/
├── sidebar.ts
├── routing.ts
└── __tests__/
    ├── sidebar.test.ts
    └── routing.test.ts
```

### Testing Patterns

**Mock framework/style configuration:**
```ts
vi.mock('@/types/docs', async () => {
  const actual = await vi.importActual('@/types/docs');
  return {
    ...actual,
    FRAMEWORK_STYLES: { html: ['css'], react: ['css'] },
  };
});
```

**Test complex utilities:**
- Sidebar filtering with nested sections
- Route resolution and redirect logic
- Framework/style validation

## Technology Stack

- **[Astro 5.14.4](https://astro.build)**: Static site generation with island architecture
- **[React 18](https://react.dev)**: Client-side interactive components (`client:load`)
- **[Tailwind v4](https://tailwindcss.com)**: CSS utility classes via `@tailwindcss/vite`
- **[Nanostores 1.0.1](https://github.com/nanostores/nanostores)**: Cross-island state
- **[Base UI 1.0.0-beta.4](https://base-ui.com)**: Headless accessible components
- **[Pagefind 1.4.0](https://pagefind.app)**: Static search with build-time indexing
- **[Shiki 3.13.0](https://shiki.style)**: Syntax highlighting
- **[Vitest 3.2.4](https://vitest.dev)**: Testing framework
- **[clsx](https://github.com/lukeed/clsx)**: Class name concatenation utility

## API Reference Generation

The API docs builder extracts type information from TypeScript sources and generates JSON files used by Astro components.

### How It Works

```
packages/core/html/react/  → JSON → <ApiReference /> → tables
```

1. **Builder script** (`scripts/api-docs-builder/`) parses TypeScript using `typescript-api-extractor`
2. **Extracts** from core files: Props interface, State interface, defaultProps
3. **Extracts** from data-attrs files: data attributes with JSDoc descriptions
4. **Extracts** from HTML element files: Lit `tagName`
5. **Detects** multi-part components via `packages/react/src/ui/{name}/index.parts.ts`
6. **Extracts** part descriptions from React component JSDoc
7. **Outputs** JSON to `src/content/generated-api-reference/{component}.json`
8. **`<ApiReference />`** Astro component renders the JSON as tables

### Generated Files Are Gitignored

The `src/content/generated-api-reference/` directory is **gitignored**. JSON files are regenerated:
- Automatically on `pnpm dev` (via `predev` hook)
- Automatically on `pnpm build` (via `prebuild` hook)
- Manually via `pnpm api-docs`

### Usage in MDX

Use the unified `<ApiReference />` component for both single-part and multi-part components:

```mdx
import ApiReference from '@/components/docs/api-reference/ApiReference.astro';

<ApiReference component="PlayButton" />
```

The component automatically handles:
- **Single-part**: Renders Props, State, and Data Attributes sections with h3 headings
- **Multi-part**: Renders each part with a framework-aware h3 heading, description from JSDoc, and h4 sub-sections

### Adding a New Component

When a new component is added to `packages/core/src/core/ui/`:
1. Run `pnpm api-docs` to generate its JSON
2. Add `<ApiReference component="{Name}" />` to the MDX reference page

For multi-part components:
1. Ensure `packages/react/src/ui/{name}/index.parts.ts` exports each part
2. Add JSDoc descriptions to each React component export for part descriptions
3. Ensure each part's HTML element is at `packages/html/src/ui/{name}/{name}-{part}-element.ts`
4. The primary part (whose element is just `{name}-element.ts`) gets the shared core props/state/data-attrs

See `scripts/api-docs-builder/README.md` for full documentation.

## Custom Astro Integration: Pagefind

**Location:** `integrations/pagefind.ts`

**Purpose:** Integrates Pagefind static search into Astro build pipeline.

**Development mode:**
- Serves Pagefind index from previous production build
- Uses `sirv` middleware to serve `/pagefind/*` routes
- Warns if index doesn't exist (needs `pnpm build` first)

**Production mode:**
- Runs Pagefind CLI after Astro build completes
- Indexes all HTML files in `dist/`
- Maps Astro logger levels to Pagefind CLI flags

**Usage in `astro.config.mjs`:**
```js
import pagefind from './integrations/pagefind';

export default defineConfig({
  integrations: [pagefind()],
});
```

## TypeScript Configuration

**Path aliases** (`tsconfig.json`):
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Import examples:**
```ts
import { sidebar } from '@/docs.config';
import type { Sidebar } from '@/types/docs';
import { filterSidebar } from '@/utils/docs/sidebar';
```

**Strict mode enabled:**
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

## Key Architecture Patterns

### 1. Recursive Sidebar Filtering

Sidebar filtering is recursive because sections can contain guides or nested sections:

```ts
export function filterSidebar(
  framework: SupportedFramework,
  sidebarToFilter?: Sidebar,
): Sidebar {
  const root = sidebarToFilter ?? sidebar;
  return root
    .map((item) => filterItem(item, framework))
    .filter(isNotFalsy);
}
```

### 2. Type Guards for Framework/Style Validation

**Defined in `src/types/docs.ts`:**

```ts
export const FRAMEWORK_STYLES = {
  html: ['css'],
  react: ['css'],
} as const;

export function isValidFramework(value: unknown): value is SupportedFramework {
  return typeof value === 'string' && value in FRAMEWORK_STYLES;
}

export function isValidStyleForFramework(
  framework: SupportedFramework,
  style: unknown,
): style is AnySupportedStyle {
  return typeof style === 'string'
    && FRAMEWORK_STYLES[framework].includes(style as any);
}
```

### 3. Git-Enriched Content Metadata

Content collections automatically enrich metadata from git history:

```ts
// In content.config.ts
const blog = defineCollection({
  loader: globWithParser({
    pattern: '**/*.mdx',
    base: './src/content/blog',
    async parseData(frontmatter, fileUrl) {
      const filePath = fileURLToPath(fileUrl);
      const updatedDate = await getLastModifiedDate(filePath);
      return { ...frontmatter, updatedDate };
    },
  }),
});
```

### 4. Island Architecture with React

Each React component with `client:load` is an **independent React root**:

```astro
---
import Tabs from '@/components/Tabs.tsx';
import Search from '@/components/Search/Search.tsx';
---

<Tabs client:load />  <!-- Independent React root #1 -->
<Search client:load /> <!-- Independent React root #2 -->
```

**Consequence:** React Context doesn't work across islands. Use Nanostores instead.

## MDX Component Typography

**Location:** `src/components/typography/`

Standard MDX elements (headings, paragraphs, lists, etc.) are defined here and used across all MDX layouts (blog, docs, markdown pages).

**Usage in layouts:**
```astro
---
import { components } from '@/components/typography';
---

<slot Components={components} />
```

## Important Development Notes

### Writing Documentation

Read `src/content/docs/how-to/write-guides.mdx` for comprehensive guide-writing instructions.

Key points:
- **Use `.mdx` files only** (not `.md`)
- Use `<FrameworkCase>` and `<StyleCase>` for framework/style-specific content
- Follow Diátaxis framework: how-to vs. concept guides
- Add new guides to `src/docs.config.ts` sidebar
- Use `devOnly: true` for internal documentation

### Search Indexing

Pagefind indexes HTML files after build. During development:
1. Run `pnpm build` at least once to generate search index
2. Dev server serves the index from previous build
3. Search won't include new content until next build

### Adding Framework/Style Support

To add a new framework or style:

1. Update `FRAMEWORK_STYLES` in `src/types/docs.ts`
2. Update type definitions (`SupportedFramework`, `AnySupportedStyle`)
3. Add corresponding page routes in `src/pages/docs/framework/[framework]/`
4. Update sidebar filtering logic if needed (usually automatic)
5. Update tests to include new framework/style

### Blog Post Naming

**CRITICAL:** Blog post filenames MUST be date-prefixed:
```
YYYY-MM-DD-slug.mdx
```

The date prefix is automatically removed from the slug during content collection transformation by `src/utils/globWithParser.ts`.

**Example:**
- File: `2024-01-15-new-release.mdx`
- Slug: `new-release`
- URL: `/blog/new-release/`

### Development-Only Content

Use `devOnly: true` in frontmatter or sidebar config to hide content in production:

```ts
// In docs.config.ts
{ slug: 'how-to/write-guides', devOnly: true }
```

```mdx
---
title: Internal Documentation
devOnly: true
---
```

## Common Tasks

### Adding a New Docs Guide

1. Create MDX file in `src/content/docs/{how-to|concepts|reference}/your-guide.mdx`
2. Add frontmatter with `title` and `description`
3. Add to sidebar in `src/docs.config.ts`
4. Optional: Restrict to specific frameworks/styles
5. Test with `pnpm dev` and verify all framework/style combinations

### Running Tests for Specific Utility

```bash
# Run sidebar tests
pnpm test sidebar.test.ts

# Run in watch mode
pnpm test:watch sidebar.test.ts

# With UI
pnpm test:ui
```

### Debugging Redirect Logic

The `resolveIndexRedirect()` function in `src/utils/docs/routing.ts` returns a `reason` field explaining why a particular redirect was chosen:

```ts
const result = resolveIndexRedirect({ preferences, params });
console.log(result.reason); // e.g., "using preference framework and style"
```

### Checking TypeScript

```bash
pnpm astro check
```

This runs Astro's built-in TypeScript checker across `.astro`, `.ts`, and `.tsx` files.
