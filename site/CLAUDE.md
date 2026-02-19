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
│   ├── content/generated-component-reference/ # Generated component reference JSON (gitignored)
│   ├── content/generated-util-reference/      # Generated util reference JSON (gitignored)
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
│   ├── pagefind.ts          # Pagefind search integration
│   ├── llms-markdown.ts     # LLM-optimized markdown generation
│   └── check-v8-urls.ts     # v8 URL migration audit
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
    ├── BasicUsage.astro    # HTML: Astro wrapper (renders HTML, imports CSS, bundles script)
    ├── BasicUsage.html     # HTML: markup only, no <style> or <script>
    ├── BasicUsage.css      # HTML: styles (imported by .astro wrapper for live demo)
    └── BasicUsage.ts       # HTML: side-effect imports for custom element registration
```

### CSS Scoping with BEM

Demos use BEM class names for scoping. Block = `{component}-{variant}`, element = `__{part}`:

```
.play-button-basic              /* block */
.play-button-basic__button      /* element */
```

React `.css` and HTML `.css` files for the same demo should use identical BEM names.

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

Four files per demo: `.html` (markup only), `.css` (styles), `.ts` (custom element registration), and `.astro` (wrapper that ties them together). The `.astro` wrapper is needed because only Astro `<script>` tags go through Vite's bundling pipeline — MDX `<script>` tags compile as JSX and aren't bundled.

**`.astro` wrapper** (imports CSS for live demo, renders HTML, bundles the `.ts` script):
```astro
---
import HtmlDemo from '@/components/docs/demos/HtmlDemo.astro';
import html from './BasicUsage.html?raw';
import './BasicUsage.css';
---
<HtmlDemo html={html} />
<script>
  import './BasicUsage.ts';
</script>
```

**MDX usage:**
```mdx
import BasicUsageDemoHtml from "@/components/docs/demos/play-button/html/css/BasicUsage.astro";
import basicUsageHtml from "@/components/docs/demos/play-button/html/css/BasicUsage.html?raw";
import basicUsageHtmlCss from "@/components/docs/demos/play-button/html/css/BasicUsage.css?raw";
import basicUsageHtmlTs from "@/components/docs/demos/play-button/html/css/BasicUsage.ts?raw";

<Demo files={[
  { title: "index.html", code: basicUsageHtml, lang: "html" },
  { title: "index.css", code: basicUsageHtmlCss, lang: "css" },
  { title: "index.ts", code: basicUsageHtmlTs, lang: "ts" },
]}>
  <BasicUsageDemoHtml />
</Demo>
```

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
- `buildDocsUrl()`: Construct docs URLs from framework and slug
- `resolveIndexRedirect()`: Intelligent redirect for index pages
  - Validates framework from URL params or cookie preferences
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
  pubDate: Date;          // From filename date prefix
  authors: string[];      // Reference to authors.json
  canonical?: string;     // Canonical URL override
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
    shortName: string;
    bio?: string;
    avatar?: string;
    socialLinks?: {
      x?: string;
      bluesky?: string;
      mastodon?: string;
      github?: string;
      linkedin?: string;
      website?: string;
    };
  }
}
```

### Git Integration

`src/utils/gitService.ts` uses `simple-git` to enrich content with metadata:
- Blog posts: `pubDate` from filename date prefix
- All content: `updatedDate` from last modification

## State Management with Nanostores

**Why Nanostores?** Astro's island architecture means each React component with `client:load` is an isolated React root. React Context doesn't work across islands, so we use Nanostores for cross-island state.

**Store locations** (`src/stores/`):
- `preferences.ts`: User framework/style preferences (persisted to localStorage)
- `homePageDemos.ts`: Home page demo state
- `tabs.ts`: Tab component state
- `installation.ts`: Installation page state (renderer, skin, install method)

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
    reporter: ['text', 'json', 'html'],
    include: ['src/utils/**', 'src/components/**', 'src/types/**', 'scripts/api-docs-builder/src/**'],
    exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/test/**'],
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
- **[React Compiler](https://react.dev/learn/react-compiler)**: Enabled via `babel-plugin-react-compiler` targeting React 18
- **[Tailwind v4](https://tailwindcss.com)**: CSS utility classes via `@tailwindcss/vite`
- **[Nanostores 1.0.1](https://github.com/nanostores/nanostores)**: Cross-island state
- **[Base UI 1.0.0-beta.4](https://base-ui.com)**: Headless accessible components
- **[Pagefind 1.4.0](https://pagefind.app)**: Static search with build-time indexing
- **[Shiki 3.13.0](https://shiki.style)**: Syntax highlighting
- **[Vitest 3.2.4](https://vitest.dev)**: Testing framework
- **[clsx](https://github.com/lukeed/clsx)**: Class name concatenation utility

## API Reference Generation

The API docs builder extracts type information from TypeScript sources and generates JSON files used by Astro components. It produces two kinds of reference:

- **Component references** — props, state, data attributes for UI components
- **Util references** — parameters, return values for hooks, controllers, mixins, and utilities

### How It Works

```
packages/core/html/react/  → JSON → <ComponentReference /> → tables
packages/react/html/store/ → JSON → <UtilReference />      → tables
```

**Component references:**
1. **Builder script** (`scripts/api-docs-builder/`) parses TypeScript using `typescript-api-extractor`
2. **Extracts** from core files: Props interface, State interface, defaultProps
3. **Extracts** from data-attrs files: data attributes with JSDoc descriptions
4. **Extracts** from HTML element files: Lit `tagName`
5. **Detects** multi-part components via `packages/react/src/ui/{name}/index.parts.ts`
6. **Extracts** part descriptions from React component JSDoc
7. **Outputs** JSON to `src/content/generated-component-reference/{component}.json`

**Util references:**
1. Auto-discovered from package index files via naming conventions (`use*`, `*Controller`, `create*`) and `@public` JSDoc tag
2. Builder scans React and HTML entry points, resolves local modules, extracts types via TAE and raw TS AST
3. **Outputs** JSON to `src/content/generated-util-reference/{slug}.json`

### Generated Files Are Gitignored

Both `src/content/generated-component-reference/` and `src/content/generated-util-reference/` are **gitignored**. JSON files are regenerated:
- Automatically on `pnpm dev` (via `predev` hook)
- Automatically on `pnpm build` (via `prebuild` hook)
- Manually via `pnpm api-docs`

### Usage in MDX

**Component references** — for UI components (props, state, data attributes):

```mdx
import ComponentReference from '@/components/docs/api-reference/ComponentReference.astro';

<ComponentReference component="PlayButton" />
```

The component automatically handles:
- **Single-part**: Renders Props, State, and Data Attributes sections with h3 headings
- **Multi-part**: Renders each part with a framework-aware h3 heading, description from JSDoc, and h4 sub-sections

**Util references** — for hooks, controllers, mixins, and utilities (parameters, return values):

```mdx
import UtilReference from '@/components/docs/api-reference/UtilReference.astro';

<UtilReference util="usePlayer" />
```

The component automatically handles:
- **Single-overload**: Renders Parameters and Return Value as h3 sections
- **Multi-overload**: Renders each overload as an h3 with Parameters and Return Value as h4 sub-sections

### Adding a New Component

When a new component is added to `packages/core/src/core/ui/`:
1. Run `pnpm api-docs` to generate its JSON
2. Add `<ComponentReference component="{Name}" />` to the MDX reference page

For multi-part components:
1. Ensure `packages/react/src/ui/{name}/index.parts.ts` exports each part
2. Add JSDoc descriptions to each React component export for part descriptions
3. Ensure each part's HTML element is at `packages/html/src/ui/{name}/{name}-{part}-element.ts`
4. The primary part (whose element is just `{name}-element.ts`) gets the shared core props/state/data-attrs

### Adding a New Util

1. Export it from the appropriate package index file (`packages/react/src/index.ts` or `packages/html/src/index.ts`)
2. Add JSDoc with a description; if it doesn't match a naming convention (`use*`, `*Controller`, `create*`), add `@public`
3. Run `pnpm api-docs` to generate its JSON
4. Create an MDX page with `<UtilReference util="{Name}" />`
5. Add to the sidebar in the appropriate section (Hooks & Utilities or Controllers & Mixins)

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

## Environment Variables

The site uses OAuth for authentication and Mux for video management. Required variables are needed for auth features to work; the site degrades gracefully without them.

**Required for authentication:**

| Variable | Purpose |
| --- | --- |
| `OAUTH_CLIENT_ID` | OAuth client ID |
| `OAUTH_CLIENT_SECRET` | OAuth client secret |
| `OAUTH_REDIRECT_URI` | OAuth callback URL |
| `OAUTH_URL` | OAuth provider base URL |
| `SESSION_COOKIE_PASSWORD` | Encryption key for `iron-session` cookies |

**Optional:**

| Variable | Purpose |
| --- | --- |
| `MUX_API_URL` | Override Mux API endpoint (defaults to `https://api.mux.com`) |
| `MUX_TOKEN_ID` | Mux API token ID (for server-side health checks) |
| `MUX_TOKEN_SECRET` | Mux API token secret (for server-side health checks) |
| `SENTRY_AUTH_TOKEN` | Sentry error tracking auth token |

## Authentication & Mux Integration

OAuth and Mux integration exist to support the **video uploader** on the installation page (`src/components/installation/MuxUploaderPanel.tsx`). This is the only consumer of the auth system.

**Key files:**
- `src/middleware/index.ts` — Validates and refreshes OAuth sessions on every request via `iron-session`
- `src/utils/auth.ts` — Session encryption, JWKS verification, token refresh
- `src/pages/api/auth/callback.ts` — OAuth callback endpoint
- `src/actions/auth.ts` — `initiateLogin()`, `logout()` server actions
- `src/actions/mux.ts` — `createDirectUpload()`, `getUploadStatus()`, `getAssetStatus()`, `listAssets()`, `getAsset()` server actions

**How sessions work:**
1. Middleware decrypts session cookie, verifies access token via JWKS
2. If expired, automatically refreshes using the refresh token
3. Populates `context.locals.user` (safe to render) and `context.locals.accessToken` (server-only, never expose to client)
4. Invalid/corrupted sessions are silently cleared

**Action gating:** All `mux.*` actions (except `createDirectUpload`) return 401 without a valid session. `createDirectUpload` handles its own auth so the client can detect UNAUTHORIZED and show a login UI.

## MDX Processing Plugins

Four plugins transform MDX content during build. Registered in `astro.config.mjs`:

**`remarkConditionalHeadings`** (`src/utils/remarkConditionalHeadings.js`)
Walks the MDX AST and tracks headings inside `<FrameworkCase>` / `<StyleCase>` components, attaching conditional metadata (which frameworks/styles a heading belongs to). Also reads `<ComponentReference>` and `<UtilReference>` component props, loads the generated JSON, and injects heading entries so API reference sections appear in the table of contents. Outputs to `frontmatter.conditionalHeadings`.

**`remarkReadingTime`** (`src/utils/remarkReadingTime.mjs`)
Calculates reading time and injects `frontmatter.minutesRead` (text) and `frontmatter.readingTimeMinutes` (number).

**`rehypePrepareCodeBlocks`** (`src/utils/rehypePrepareCodeBlocks.js`)
Tags `<code>` children of `<pre>` with a `codeBlock` property, and marks `<pre>` blocks with `hasFrame: true` when inside a `<TabsPanel>` JSX component. This controls code block styling (framed vs. standalone).

**`shikiTransformMetadata`** (`src/utils/shikiTransformMetadata.js`)
Shiki transformer that extracts `title="..."` from code fence metadata, enabling titled code blocks:

~~~markdown
```tsx title="Example.tsx"
~~~

## Custom Astro Integration: LLM Markdown

**Location:** `integrations/llms-markdown.ts`

Generates LLM-optimized markdown files and a `llms.txt` index after build.

**How it works:**
1. Scans all built HTML pages for elements with `[data-llms-content]`
2. Strips elements with `[data-llms-ignore]` from the content
3. Converts remaining HTML to markdown via Turndown
4. Writes `.md` files alongside built HTML
5. Generates `llms.txt` index grouped by framework/style

**Data attributes for content authors:**

| Attribute | Purpose |
| --- | --- |
| `data-llms-content` | Mark an element's content for LLM markdown extraction |
| `data-llms-ignore` | Exclude an element (and its children) from LLM output |
| `data-llms-description` | Description text for the `llms.txt` index entry |
| `data-llms-sort` | Sort key for ordering entries in the index |

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
import defaultMarkdownComponents from '@/components/typography/defaultMarkdownComponents';
---

<Content components={{ ...defaultMarkdownComponents }} />
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

## SEO Metadata

When writing content for the site, especially page titles and descriptions, follow the conventions in `.claude/skills/docs/references/seo.md` for the full keyword list and guidelines.

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
