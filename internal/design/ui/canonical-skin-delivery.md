---
status: draft
date: 2026-08-19
---

# Canonical Skin compilation and delivery

This record separates the canonical Skin authoring model from the tools that preview, package, and publish it. It is the working architecture for [#2183](https://github.com/videojs/v10/issues/2183) and the Vite workflow validation in [#2260](https://github.com/videojs/v10/issues/2260).

## One source, several projections

`packages/skins/canonical` is the source of truth for Skin composition and styling. Core owns the framework-neutral component schema. React, HTML, and Icons own the registries that lower that schema to their public components. Skins owns the catalog, Skin-specific transforms, style/theme policy, and delivery adapters.

The catalog describes named items and their dependency closure. A compiler projection selects a framework and a style representation. A delivery adapter then decides whether that projection is served live, emitted as package source, or published as an editable registry.

```text
Core schema + React/HTML/Icon registries
                    │
Canonical catalog ──┼── compiler projection ── React or HTML
Canonical TSX/styles│                         └─ Tailwind classes or vanilla CSS
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
| VJSC catalog | Item identity, source ownership, dependency closure, allowed imports, and reference collection needed by source-preserving outputs. |
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

The Core schema and React, HTML, and Icon registry-entry modules are compiler metadata, not Skin delivery outputs. They currently serve TypeScript, package builds, tests, the Skin generator, and the Vite configuration itself.

Vite cannot resolve an artifact imported while `vite.config.ts` is being loaded by a plugin that has not been created yet. From a clean tree, the current Skins Vite configuration therefore fails before the VJSC plugin starts when registry metadata is absent. Making the files ignored and ordering `generate` through Turbo is a valid transition, but it is not the desired development architecture.

Removing those task edges requires each remaining consumer to stop importing missing files from disk:

- The Vite adapter should construct or load schema and registry metadata behind its own source-level configuration, then expose any generated facades as virtual modules.
- Package builds and `tsgo` either need equivalent resolver support or must consume source-defined metadata. Vite-only virtual modules cannot satisfy TypeScript declarations or a non-Vite package build.
- Shadcn and package delivery may still materialize final output because files are the product. Intermediate schema, registry, and framework-projection trees should not be mistaken for publishable output.

The temporary Turbo `generate` tasks can be removed per consumer once a clean checkout can run that consumer without the generated metadata present. Removing all generation edges is not blocked on the Shadcn registry build, because that explicit materialization is a delivery action rather than a compiler prerequisite.

## Current state and validation sequence

The current Vite preview proves only React with compiler-emitted vanilla CSS and imports the canonical Default Video Skin directly. A production `vite build` succeeds after registry metadata exists. Development from a clean generated-artifact state currently fails while loading the Vite configuration; after generation, the server starts but the source-aliased React graph also needs the repository's `__DEV__` definition.

[#2260](https://github.com/videojs/v10/issues/2260) should establish the architecture in this order:

1. Start the preview from a clean checkout without materialized VJSC metadata or framework Skin output.
2. Provide selectable Default/Minimal × React/HTML × Tailwind/vanilla entries through stable Vite module identities.
3. Verify canonical TSX, style module, theme, schema/registry, and compiler-config updates independently, including React state preservation and HTML remount behavior.
4. Run the same matrix through `vite build` and compare its rendered result with development.
5. Keep catalog emission tests for package and Shadcn structure, then use [#2183](https://github.com/videojs/v10/issues/2183) for visual, style, interaction, and accessibility parity before the source-of-truth cutover.
6. Remove each temporary script or Turbo dependency only after its package, test, typecheck, and preview consumers work without the ignored artifact.

## Current sources of truth

- Canonical inventory and dependencies: `packages/skins/canonical/catalog.ts`
- Framework and style delivery adapters: `packages/skins/build/output/`
- Vite transform and virtual CSS adapter: `packages/compiler/src/bundlers/vite.ts`
- Catalog resolution and emission: `packages/compiler/src/catalog/`
- Vite preview configuration: `packages/skins/vite.config.ts`
- Package and Shadcn materialization: `packages/skins/scripts/generate-skins.ts`
- Schema and registry generation inputs: `packages/{core,html,react}/vjsc.config.ts` and `packages/icons/scripts/build-icons.ts`
