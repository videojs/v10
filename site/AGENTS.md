# Video.js site guide

This file contains site-specific gotchas. Read `site/README.md`, `site/package.json`, the relevant implementation, and its tests for the current architecture and commands.

## Sources of truth

- Commands and versions: `package.json`
- Astro/Vite/Markdown configuration: `astro.config.ts`
- Content schemas: `src/content.config.ts`
- Framework/style support and type guards: `src/types/docs.ts`
- Sidebar and route availability: `src/docs.config.ts`
- Design tokens and variants: `src/styles/globals.css`
- Guide authoring: `src/content/docs/how-to/write-guides.mdx`
- API builder contract: `scripts/api-docs-builder/src/tests/e2e.test.ts`
- Deployment workflow: root `.github/workflows/`

If this guide conflicts with those files, use the executable source and update this guide.

## Commands

From the repository root:

```bash
pnpm dev:site
pnpm build:site
pnpm -F site test [path-or-pattern]
pnpm -F site api-docs
pnpm -F site astro check
```

## Styling and components

- Inspect `src/styles/globals.css` before choosing Tailwind classes. Prefer existing theme tokens and semantic utilities.
- Use the custom `intent:` variant for pointer/focus intent where existing site code does; do not replace it mechanically with `hover:`.
- Prefer a token-based utility when one fits. For a non-token one-off, use an inline style instead of an arbitrary-value class such as `min-h-[120px]`.
- When a non-token value needs a responsive, dark-mode, or other Tailwind variant, bridge it through an inline CSS custom property, for example `style="--md-min-h: 120px"` with `class="md:min-h-(--md-min-h)"`.
- Use `clsx` in React and `class:list` in Astro for conditional classes.
- React islands are independent roots. Use Nanostores for cross-island state instead of React context.
- React Compiler is enabled; do not add memoization without a measured or documented need.

## Content

- Read `src/content/docs/how-to/write-guides.mdx` before adding or reviewing site prose. It owns document types, frontmatter, sidebar registration, framework/style variants, voice, and MDX conventions.
- Changelog source format and generation are owned by `src/content.config.ts` and the root changelog workflows; follow those sources rather than duplicating their extension rules here.
- Blog filenames are `YYYY-MM-DD-slug.mdx`; `src/utils/globWithParser.ts` removes the date from the route slug.
- Use `write-docs` or `review-docs` for prose workflows and `write-api-reference` for generated reference pages.

## Demos

- Use `{{VJS*}}` placeholders from `scripts/replace-demo-placeholders.ts` for shared media URLs in HTML and React demos.
- Keep demo-specific CSS scoped under a unique root class.
- Prefix demo classes with framework, component, and variant.
- Reflect meaningful HTML demo state to `data-*` attributes and style those attributes.
- Use React state for React demo rendering; avoid querying the DOM for application state.
- Set explicit media attributes needed by the scenario (`muted`, `playsinline`, `crossorigin`, and preload behavior).

## Site-specific gotchas

- `astro.config.ts` has a root `vite.optimizeDeps` block that can shadow renderer-provided includes. Keep React client dependencies in its explicit `include` list when changing renderer setup.
- Markdown uses Satteri MDAST plugins, not remark/rehype plugins. Add transformations with `defineMdastPlugin` and write derived frontmatter through `ctx.data.astro.frontmatter`.
- Shiki highlighting is configured independently from the Markdown processor.
- React context does not cross Astro islands.
- Never expose `context.locals.accessToken` to client code. Auth and Mux integration are only for the installation uploader; trace the middleware and server actions before changing that flow.

## Analytics

PostHog loads production-only from `src/components/Posthog.astro`. It runs cookieless, so there is no durable person:
never call `identify`, `alias`, or any person-property API. `register()` super properties last for one page load, so
`Posthog.astro` re-registers `docs_framework` and `docs_style` from storage on every load, and components re-register
after a change.

- Custom events go through `src/utils/analytics.ts`. Add a name to `ANALYTICS_EVENTS` and its properties to
  `AnalyticsEventProperties` rather than passing a bare string.
- Tag clickable markup declaratively with three `data-ph-capture-attribute-*` names, which PostHog reads from the
  clicked element or any ancestor: `location` for the region (`nav`, `footer-docs`, `hero`, `docs-sidebar`,
  `install-page`, `mux-uploader`, …), `cta` for a specific call-to-action (`get-started`, `edit-page`, `mux-login`, …),
  and `destination` for outbound or cross-section links (`mux`, `github`, `discord`, `docs`, `blog`, `external`).
- Put `location` on a container and `cta`/`destination` on the individual anchor or button.
- Never send upload IDs, playback IDs, tokens, or free-form user text beyond a search query.

## API references

Generated reference JSON is gitignored and rebuilt by `pnpm -F site api-docs`, dev, and build. Do not hand-edit it. Change the TypeScript/JSDoc input or the builder, run the generator, and inspect the output. Keep the builder E2E suite passing.

## Verification

Run the narrowest unit tests while iterating. For content or UI work, verify affected framework/style variants in the browser. For builder changes, run its E2E test plus `pnpm -F site api-docs`. Finish with `pnpm -F site astro check` or the relevant site build when the change affects compilation.
