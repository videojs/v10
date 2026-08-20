---
status: draft
date: 2026-08-19
---

# Canonical Skin compilation and delivery

This record separates the canonical Skin authoring model from the tools that preview, package, and publish it. It is the working architecture for [#2183](https://github.com/videojs/v10/issues/2183) and the Vite workflow validation in [#2260](https://github.com/videojs/v10/issues/2260).

## One source, several projections

`packages/skins/canonical` is the source of truth for Skin composition and styling. Core owns the framework-neutral component schema. React, HTML, and Icons own the registries that lower that schema to their public components. Skins owns catalog discovery and policy, Skin-specific transforms, style/theme policy, and delivery adapters.

Each canonical item describes itself through a colocated `meta` export. VJSC discovers those entries and generates the catalog index, including their source ownership and dependency closure. A compiler projection selects a framework and a style representation. A delivery adapter then decides whether that projection is served live, emitted as package source, or published as an editable registry.

```text
Core schema + React/HTML/Icon registries
                         │
Canonical item modules ──┼── generated catalog ── compiler projection ── React or HTML
TSX/styles + `meta`      │                                      └─ Tailwind or vanilla CSS
                         │
                         ├── Vite preview: live modules and CSS for every matrix cell
                         ├── package output: public modules, declarations, and CSS
                         └── Shadcn output: editable React/Tailwind files and registry metadata
```

The full React/HTML × Tailwind/vanilla matrix is a validation surface. Publication policy may select only some cells. In particular, the Shadcn registry is a React/Tailwind source distribution; it is not another framework package build.

## Tool boundaries

| Owner | Responsibility |
| --- | --- |
| VJSC transforms | Schema-aware component lowering, Skin-specific AST transforms, style-token projection, scoped vanilla CSS, diagnostics, and source maps. |
| VJSC catalog | Item discovery, static `meta` extraction, source ownership, dependency closure, allowed imports, and reference collection needed by source-preserving outputs. |
| Vite | Development module graph, source transforms, virtual CSS delivery, dependency invalidation, HMR, React Fast Refresh, and the production preview build. |
| Package build | Stable public entry layout, development/default builds, declarations, side effects, and copied CSS for `@videojs/react` and `@videojs/html`. |
| Shadcn adapter | Editable file layout, import rewriting, package and registry dependencies, shared files, metadata, and the final registry manifest. |
| Turbo | Repository task ordering and caching only while a consumer still requires a materialized intermediate artifact. |

Vite should not reproduce compiler semantics. Conversely, VJSC should not implement a second development server, JavaScript module graph, CSS injector, or HMR runtime.

## Where Vite replaces compiler work

The active preview does not need catalog emission. Its entry can import a canonical Skin module, allowing Vite to follow normal source imports and run the VJSC transform on each canonical TSX module. This avoids writing a projected React tree to disk before the browser can render it.

For Tailwind preview cells, VJSC should project style references to utility class names and `@tailwindcss/vite` should compile and hot-reload the Tailwind input. For vanilla cells, VJSC must still derive semantic class names and scoped CSS; the Vite adapter can expose those CSS assets as virtual modules and let Vite inject, replace, and bundle them.

Vite or its underlying Rolldown pipeline can also replace generic module bundling inside a preview or browser-oriented package build. It does not replace the parts of HTML emission that statically render a template, preserve required custom-element registration imports, or format the exported template module. Any shared bundling integration should be a VJSC/Rolldown plugin usable by Vite and the package builder, rather than two compiler implementations.

Catalog resolution remains necessary for package and Shadcn outputs. Those outputs need facts that an application bundle intentionally erases: which editable files belong to an item, which catalog items are dependencies, which external imports remain, and how files map into an installable registry.

## Vite development contract

The preview should expose one stable module identity per selected Skin, framework, and style mode. Changing the selection changes the projection, while editing source keeps the identity stable.

- A canonical TSX edit invalidates the transformed module. React output then passes through the React plugin so Fast Refresh can preserve state when it is a valid refresh boundary.
- A style-module or Tailwind-input edit invalidates every transformed owner that consumed it. Vanilla CSS is replaced without retaining rules from the previous virtual module; Tailwind CSS follows the Tailwind Vite graph.
- A schema or registry edit invalidates every projection that uses it. A compiler configuration edit may restart the Vite server, but must not require a manual generation step or leave the old projection cached.
- HTML output uses a browser-safe VJSC HTML runtime and a preview boundary that replaces the rendered template. Custom-element definition modules remain side-effect imports and must tolerate reevaluation; full reload is acceptable only where platform registration makes state-preserving HMR unsafe.
- Compiler diagnostics retain canonical source locations and appear through Vite's error overlay. Production preview builds use the same projection configuration as development.

`addWatchFile` makes Vite observe compiler-discovered dependencies, but observation alone is not the contract. The Vite adapter must retain dependency-to-owner relationships and explicitly invalidate affected owner and virtual CSS modules when a dependency changes. Its integration tests must exercise a real Vite dev server, not only repeated calls to the transform hook.

## Generated metadata is a separate problem

The Core schema and React, HTML, and Icon registry-entry modules are compiler metadata, not Skin delivery outputs. Vite constructs them from source descriptors before registering virtual modules, so loading `vite.config.ts` no longer imports generated files. Invalidating a schema or registry input reconstructs that metadata before the affected Skin projection is compiled again.

Vite-only modules cannot satisfy a separate TypeScript declaration process. The Core package build therefore creates its schema entry automatically under `.vjsc/virtual` before tsdown runs; tsdown emits the public JavaScript and declarations from that disposable workspace. This is package-build plumbing, not an authored or published intermediate. React and HTML registry entries remain entirely in memory because their package builds do not expose compiler metadata.

Shadcn remains deliberately different: editable files and its manifest are the delivery product. The explicit registry build materializes those files under its ignored staging directory and then builds `dist/registry`. No generic `generate` task or Turbo dependency is required by dev, test, or build.

## Virtual modules and synchronized types

VJSC should follow the framework pattern of separating runtime modules from editor types. Vite resolves generated runtime code through virtual modules, while VJSC writes only a hidden, gitignored type workspace such as `.vjsc/types`. [Astro sync](https://docs.astro.build/en/reference/cli-reference/#astro-sync) generates `.astro/types.d.ts` automatically before dev, build, and check; [SvelteKit sync](https://svelte.dev/docs/kit/cli#svelte-kit-sync) generates `.svelte-kit` types and a TypeScript configuration that exposes them through `rootDirs`. VJSC should provide the equivalent lifecycle rather than generating implementation modules inside package source directories.

```text
Runtime module                         Type declaration
virtual:vjsc/core-schema               .vjsc/types/core-schema.d.ts
virtual:vjsc/icons-schema              .vjsc/types/icons-schema.d.ts
virtual:vjsc/registry/react            .vjsc/types/registry-react.d.ts
virtual:vjsc/registry/html             .vjsc/types/registry-html.d.ts
virtual:vjsc/catalog                   .vjsc/types/catalog.d.ts
virtual:vjsc/skin/<target>/<skin>      declarations for public build entries
```

Vite's [`resolveId` and `load` hooks](https://vite.dev/guide/api-plugin.html#importing-a-virtual-file) supply runtime modules. VJSC synchronizes declarations when the Vite configuration starts, while the Core package build creates the hidden source needed by tsdown's independent declaration process. The result is zero generated intermediates in `src`; transient declarations, build inputs, and caches may exist under `.vjsc`.

Any module that imports a VJSC virtual module must be evaluated through the VJSC module graph. Vite and Vitest receive the Vite adapter, and other Rolldown consumers can use the bundler-neutral virtual-module adapter. Plain Node configuration passes source descriptors to VJSC instead of eagerly importing generated registries. Direct emitters such as Shadcn use the same in-memory schema, registry, catalog, and projection factories without routing through Vite.

Schema, registry, and virtual entry changes participate in one invalidation graph:

```text
component or icon definition
  -> virtual schema and synchronized declaration
    -> framework registry
      -> affected virtual Skin entries and CSS

canonical item `meta` or module graph
  -> virtual catalog and synchronized declaration
    -> affected virtual Skin entries and catalog consumers
```

Implementation-only changes may preserve React state through Fast Refresh. Registry mappings, exported schema shape, and HTML templates may remount or trigger a full browser reload, but they must update automatically without a manual generation step or server restart.

## Catalog boundary

The catalog item inventory is generated from canonical modules rather than maintained as a second authored list. Every catalog entry exports a statically analyzable `meta` object containing its `name`, `type`, title, description, and type-specific properties such as Skin style configuration. Its source path comes from the owning module; dependencies, files, and component or icon references come from the analyzed module graph.

```tsx
import type { CatalogItemMeta } from 'vjsc/catalog';

export const meta = {
  name: 'play-button',
  type: 'component',
  title: 'Play Button',
  description: 'A state-aware play, pause, and restart control.',
} as const satisfies CatalogItemMeta;
```

VJSC aggregates entry modules found under configured discovery roots into `virtual:vjsc/catalog` and synchronizes its item-name and metadata types under `.vjsc/types`. Modules without `meta` remain ordinary implementation dependencies rather than independently addressable catalog items. Duplicate names, invalid metadata, and import cycles are catalog diagnostics. Adding, removing, or changing an item invalidates the virtual catalog and its affected consumers without requiring a generation command.

The `meta` object is authoring-time information, not part of a delivered component. VJSC statically extracts it without executing the canonical module and removes the export from framework and editable Shadcn output. A type-only contract keeps canonical source type-safe without adding a runtime compiler dependency to published files.

Catalog-wide concerns remain explicit authored configuration: discovery roots, shared resources and themes, allowed imports, schema sources, and reference groups. Delivery policy also remains outside item metadata. In particular, the Shadcn adapter owns which items are published, registry paths, shared registry entries, and output-wide metadata. This keeps each item self-describing without coupling canonical components to one publication target.

## Implementation status and cutover

The development architecture is now in place:

- Default and Minimal Skins are available as stable virtual entries for React and HTML in Tailwind and vanilla modes.
- Vite development starts from a clean generated-artifact state, serves all eight matrix cells, applies React Fast Refresh where possible, and invalidates projections for canonical styles, schema inputs, and registry inputs.
- `vite build` compiles the same matrix. The Core package build creates its compiler schema automatically in `.vjsc`; React, HTML, and Icons build without VJSC source generation.
- Catalog inventory comes from static colocated `meta` exports and is also available as `virtual:vjsc/catalog` with synchronized hidden declarations.
- Shadcn output remains an explicit, tested React/Tailwind delivery adapter.
- The old schema, registry-entry, and framework Skin source trees, their snapshot, generation scripts, and temporary Turbo `generate` tasks have been removed.

The remaining cutover belongs to [#2183](https://github.com/videojs/v10/issues/2183): the existing public React and HTML Skin modules still come from their established package sources while canonical output reaches visual, interaction, accessibility, and API parity. Replacing those public entries requires an explicit publication mapping—for example, how `DefaultVideoSkin` maps to the existing `VideoSkin` API—and should not be inferred by the build. Once that mapping is approved, the package configs can consume the same projection factories and materialize only their public `dist` modules, declarations, and CSS.

## Current sources of truth

- Canonical item identity and description: colocated `meta` exports under `packages/skins/canonical/components` and `packages/skins/canonical/skins`
- Catalog-wide discovery, resource, import, and delivery policy: `packages/skins/canonical/catalog.ts`
- Framework and style delivery adapters: `packages/skins/build/output/`
- Vite and Rolldown adapters: `packages/compiler/src/bundlers/`
- Catalog resolution and emission: `packages/compiler/src/catalog/`
- Vite preview configuration: `packages/skins/vite.config.ts`
- Core schema source descriptor: `packages/core/vjsc.ts`
- React, HTML, and Icon registry metadata: `packages/skins/build/metadata.ts` and package-local `vjsc/` factories
- Shadcn materialization: `packages/skins/scripts/build-registry.ts`
