# Video.js Website

For docs, blog, and more: [v10.videojs.org](https://v10.videojs.org).

Mostly a standard [Astro](https://astro.build/) project.

> [!NOTE]
> This README serves as a high-level introduction to the site. For detailed technical documentation — architecture, conventions, patterns, quirks, features — see [CLAUDE.md](CLAUDE.md). It may be written for Claude, but it's useful for humans, too ;)

## Project Structure

```text
├── public/                  # Static assets served as v10.videojs.org/[filename]
├── scripts/
│  └── api-docs-builder/     # Generates API reference JSON from TypeScript sources
├── integrations/            # Custom Astro integrations (pagefind, llms-markdown, etc.)
├── src/
│  ├── assets/               # Assets imported into components, pages, etc.
│  ├── components/
│  │  └── docs/
│  │     ├── api-reference/  # API reference Astro components
│  │     └── demos/          # Interactive component demos
│  ├── content/              # Content collections (blog/, docs/, authors.json)
│  │  └── generated-api-reference/  # Generated JSON (gitignored)
│  ├── examples/             # Temporary, until folded into component docs
│  ├── layouts/              # Astro layout components
│  ├── pages/                # File-based routing
│  ├── stores/               # Nanostores for cross-island client-side state
│  ├── styles/               # Global CSS and Tailwind config
│  ├── types/
│  ├── utils/
│  ├── consts.ts             # Site-wide constants
│  ├── content.config.ts     # Content collection schemas
│  ├── docs.config.ts        # Docs sidebar structure
│  └── test-setup.ts         # Vitest setup
├── astro.config.mjs
├── CLAUDE.md                # Detailed technical docs for this site
├── package.json
├── README.md
├── TODO.md
├── tsconfig.json
└── vitest.config.ts
```

## Commands

If you're in the monorepo's root...

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `pnpm dev:site`   | Starts local dev server at `localhost:4321` |
| `pnpm build:site` | Build the production site to `site/dist/`   |

If you're in `site/`...

| Command              | Action                                           |
| :------------------- | :----------------------------------------------- |
| `pnpm install`       | Installs dependencies                            |
| `pnpm dev`           | Starts local dev server at `localhost:4321`      |
| `pnpm build`         | Build your production site to `./dist/`          |
| `pnpm preview`       | Preview your build locally, before deploying     |
| `pnpm api-docs`      | Regenerate API reference JSON from TypeScript    |
| `pnpm astro ...`     | Run CLI commands like `astro add`, `astro check` |
| `pnpm test`          | Run tests with Vitest                            |
| `pnpm test:watch`    | Run tests in watch mode                          |
| `pnpm test:ui`       | Run Vitest with its web-based UI                 |
| `pnpm test:coverage` | Generate test coverage report                    |

## Environment Variables

The installation page's video uploader uses OAuth + Mux. See [CLAUDE.md](CLAUDE.md) for the full list of environment variables. The site works without these — the uploader just won't be available.

## Technology Stack

Here are some of the technologies you should get to know when you're building this site:

- [**Astro**](https://astro.build) - Mostly-static site generation with [island architecture](https://docs.astro.build/en/concepts/islands/)
- [**Tailwind v4**](https://tailwindcss.com) - CSS utility class generator. We use custom tokens — see [globals.css](styles/globals.css) before reaching for standard Tailwind classes. We also have a few patterns we try to stick to — see [CLAUDE.md](CLAUDE.md) for details.
- [**clsx**](https://github.com/lukeed/clsx) - Class name concatenation (in React; Astro has `class:list`)
- [**React**](https://react.dev) - Most of our client-side interactivity is built with React components. **React Compiler is enabled**.
- [**Nanostores**](https://github.com/nanostores/nanostores) - Shared client-side state (React Context doesn't work across islands)
- [**Base UI**](https://base-ui.com) - Headless accessible components
- [**Shiki**](https://shiki.style) - Syntax highlighting
- [**Vitest**](https://vitest.dev) - Testing framework

## Content

We have three-ish main types of content on the site. The blog, docs guides, and docs references. Each of these is created and rendered in a slightly different way.

### Blog

Let's start with the blog because it's more simple.

- Blog posts are written in and stored in [`src/content/blog/`](src/content/blog/) as [MDX](https://mdxjs.com) files
- Astro's [Content Collections API](https://docs.astro.build/en/guides/content-collections/) transforms the MDX into data
- That data is rendered in `src/pages/blog/[...slug].astro`
- Standard MDX typography is defined in `src/components/typography/`

The only weird thing about the blog? Blog posts use date-prefixed filenames: `YYYY-MM-DD-slug.mdx`. For example: `2024-01-15-new-release.mdx`. The date prefix is removed by [utils/globWithParser.ts](src/utils/globWithParser.ts) during content collection transformation, so the post's slug just becomes `new-release` (and its url, `/blog/new-release/`).

### Guides

You'll learn most of what you need to know about writing guides by reading [`src/content/docs/how-to/write-guides.mdx`](src/content/docs/how-to/write-guides.mdx).

High-level primer?

- Guides are written in MDX and stored in `src/content/docs/`
- Guides are separated into how-to guides (focused on an outcome) and concept guides (focused on understanding) according to the [Diataxis](https://diataxis.fr) framework.
- Astro's [Content Collections API](https://docs.astro.build/en/guides/content-collections/) transforms the MDX into data
- That data is rendered in `src/pages/docs/framework/[framework]/[...slug].astro`
- Standard MDX typography is defined in `src/components/typography/`

It's also worth pausing and explaining one big quirk of our docs...

#### Guides are generated for multiple frameworks

We want docs to feel idiomatic, no matter your framework or styling preference. React users shouldn't have to learn about Web Components, HTML users shouldn't have to understand React Hooks, and so on.

We currently support two frameworks (HTML, React) and one styling approach (CSS). This is defined in [types/docs.ts](src/types/docs.ts).

Every doc generates a route per framework. E.g., `how-to/installation.mdx` becomes:

- `/docs/framework/html/how-to/installation/`
- `/docs/framework/react/how-to/installation/`

Content that applies to only certain frameworks or styles can be restricted in two ways:

1. Within the MDX content itself, by wrapping framework- or style-specific content in `<FrameworkCase>` or `<StyleCase>` components. (Read more about these components in [`src/content/docs/how-to/write-guides.mdx`](src/content/docs/how-to/write-guides.mdx).)
2. In the sidebar config ([docs.config.ts](src/docs.config.ts)), by specifying `frameworks` on a per-guide basis, e.g.,

```ts
const sidebar: Sidebar = [
  {
    sidebarLabel: "Getting started",
    contents: [
      { slug: "how-to/installation" }, // Available to all
      {
        slug: "how-to/react-hooks",
        frameworks: ["react"], // Only for React
      },
    ],
  },
];
```

### References

API reference pages are generated from TypeScript source code by the builder in [`scripts/api-docs-builder/`](scripts/api-docs-builder/). It extracts props, state, data attributes, and part information, then outputs JSON to `src/content/generated-api-reference/` (gitignored).

The JSON is regenerated automatically on `pnpm dev` and `pnpm build`, or manually via `pnpm api-docs`.

See [`scripts/api-docs-builder/README.md`](scripts/api-docs-builder/README.md) for full documentation.

## MDX Plugins

MDX content is transformed by custom remark/rehype plugins during build:

- **remarkConditionalHeadings** — Tracks which headings are inside `<FrameworkCase>` / `<StyleCase>` so the table of contents only shows headings relevant to the active framework and style. Also injects API reference headings into the TOC.
- **remarkReadingTime** — Calculates and injects reading time metadata
- **rehypePrepareCodeBlocks** — Prepares code blocks for styled rendering in tabs
- **shikiTransformMetadata** — Enables `title="..."` on code fences

See [CLAUDE.md](CLAUDE.md) for details on each plugin.

## Custom Integrations

Three custom Astro integrations in `integrations/`:

- **pagefind** — Indexes HTML after build for static search; serves previous index in dev
- **llms-markdown** — Generates LLM-optimized `.md` files and `llms.txt` index from `[data-llms-content]` elements
- **check-v8-urls** — Audits Video.js v8 URL migration coverage at build time

See [CLAUDE.md](CLAUDE.md) for implementation details.
