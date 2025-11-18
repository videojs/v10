# Video.js Website

For docs, blog, and more: [v10.videojs.org](https://v10.videojs.org).

Mostly a standard [Astro](https://astro.build/) project.

## Project Structure

```text
├── public/               # assets served, un-transformed, as v10.videojs.org/[filename]
├── src/
│  ├── assets/            # assets that might be imported into components, pages, etc.
│  ├── components/
│  ├── content/           # MDX goes here
│  ├── examples/          # temporary, until we figure out how to generate component docs
│  ├── layouts/           # Astro components that are typically used to wrap pages
│  ├── pages/             # where Astro looks to generate routes
│  ├── stores/            # we communicate between components with nanostores
│  ├── styles/
│  ├── types/
│  ├── utils/
│  ├── consts.ts          # stuff a lot of components, utils, pages, etc. use
│  ├── content.config.ts  # [read more](https://docs.astro.build/en/guides/content-collections/)
│  ├── docs.config.ts     # Where we define the docs sidebar
│  └── test-setup.ts      # for vitest
├── astro.config.mjs
├── CLAUDE.md
├── package.json
├── README.md
├── TODO.md               # not comprehensive. Should be turned into issues, eventually.
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
| `pnpm astro ...`     | Run CLI commands like `astro add`, `astro check` |
| `pnpm test`          | Run tests with Vitest                            |
| `pnpm test:watch`    | Run tests in watch mode                          |
| `pnpm test:ui`       | Run Vitest with its web-based UI                 |
| `pnpm test:coverage` | Generate test coverage report                    |

## Technology Stack

Here are most of the technologies you should get to know when you're building this site:

- [**Astro**](https://astro.build) - Mostly-static site generation with [island architecture](https://docs.astro.build/en/concepts/islands/)
- [**React**](https://react.dev) - Most of our client-side interactivity is built with React components (each with `client:*` is an isolated React root)
- [**Tailwind v4**](https://tailwindcss.com) - CSS utility class generator
- [**Nanostores**](https://github.com/nanostores/nanostores) - Shared client-side state (React Context doesn't work across islands)
- [**Base UI**](https://base-ui.com) - Headless accessible components
- [**Pagefind**](https://pagefind.app) - Static search with build-time indexing

## Content

### The blog

Let's start with the blog because it's more simple.

- Blog posts are written in and stored in [`src/content/blog/`](src/content/blog/) as [MDX](https://mdxjs.com) files
- Astro's [Content Collections API](https://docs.astro.build/en/guides/content-collections/) transforms the MDX into data
- That data is rendered in `src/pages/blog/[...slug].astro`
- Standard MDX typography is defined in `src/components/typography/`

The only weird thing about the blog? Blog posts use date-prefixed filenames: `YYYY-MM-DD-slug.mdx`. For example: `2024-01-15-new-release.mdx`. The date prefix is removed by [utils/globWithParser.ts](src/utils/globWithParser.ts) during content collection transformation, so the post's slug just becomes `new-release` (and its url, `/blog/new-release/`).

### The docs

#### How to add a docs page

Just looking to add a doc and don't really care about the implementation?

Check out [`src/content/docs/docs/how-to/write-docs.mdx`](src/content/docs/docs/how-to/write-docs.mdx).

Still interested in implementation? Ok, let's dive in:

#### Docs are generated for multiple frameworks and styles

We want docs to feel idiomatic, no matter your framework or styling preference. React users shouldn't have to learn about Web Components, HTML users shouldn't have to understand React Hooks, and so on.

We currently support two frameworks (HTML, React) and one styling approach (CSS). This is defined in [types/docs.ts](src/types/docs.ts).

Every doc is generated for every framework / style combination. E.g., `how-to/installation.mdx` becomes:

- `/docs/framework/html/style/css/how-to/installation/`
- `/docs/framework/react/style/css/how-to/installation/`

Content that applies to only certain frameworks or styles can be restricted in two ways:

1. Within the MDX content itself, by wrapping framework- or style-specific content in `<FrameworkCase>` or `<StyleCase>` components. (Read more about these components in [`src/content/docs/docs/how-to/write-docs.mdx`](src/content/docs/docs/how-to/write-docs.mdx).)
2. In the sidebar config ([docs.config.ts](src/docs.config.ts)), by specifying `frameworks` and/or `styles` on a per-guide basis, e.g.,

```ts
const sidebar = {
  title: 'React Concepts',
  guides: [
    { slug: 'concepts/hooks' }, // Available to all
    {
      slug: 'concepts/styling',
      frameworks: ['react'], // Only for React
      styles: ['styled-components'] // Only for styled-components
    }
  ]
};
```

### Guides

The docs consist of two parts:

1. Guides, written in [MDX](https://mdxjs.com)
2. 🚧 Not yet built 🚧 References, generated from source code

Let's talk about guides, first.

You'll learn most of what you need to know about writing guides by reading [`src/content/docs/docs/how-to/write-docs.mdx`](src/content/docs/docs/how-to/write-docs.mdx).

High-level primer?

- Guides are written in MDX and stored in `src/content/docs/`
- Guides are separated into how-to guides (focused on an outcome) and concept guides (focused on understanding) according to the [Diátaxis](https://diataxis.fr) framework.
- Astro's [Content Collections API](https://docs.astro.build/en/guides/content-collections/) transforms the MDX into data
- That data is rendered in `src/pages/docs/framework/[framework]/style/[style]/[...slug].astro`
- Standard MDX typography is defined in `src/components/typography/`

### Generated references

🚧 Under construction 🚧
