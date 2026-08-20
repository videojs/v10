---
status: draft
date: 2026-08-19
---

# VJSC Skin transforms and delivery

This record is the working architecture for the Skin authoring work related to
[#2183](https://github.com/videojs/v10/issues/2183) and the Vite workflow in
[#2260](https://github.com/videojs/v10/issues/2260). E2E migration and public React or HTML package cutover are explicitly outside its current scope.

## Decision

`packages/skins/vjsc` is the framework-neutral Skin source. VJSC is a transform layer hosted by Vite, Rolldown, or tsdown; it does not own a second module graph, bundling pipeline, output layout, development server, or HMR implementation. The host resolves and traverses imports, orders transforms, compiles JSX, delivers CSS, emits build assets, and invalidates watched dependencies.

One Rolldown-compatible `vjscPlugin` serves all three hosts. It applies schema-aware component registries, Skin-specific source transforms, semantic style transforms, diagnostics, and source maps. Build-only contributors such as schema declarations and the Shadcn registry compose inside that plugin and emit final assets through host hooks.

## Module identity

The plugin's `include` and `exclude` filters decide which real source modules receive VJSC transforms, so imports do not need a redundant `vjsc` query marker. A projection query is present only when one source must have multiple identities in the same graph, such as React and HTML or Tailwind and vanilla:

```text
/packages/skins/vjsc/skins/default-video/skin.tsx?framework=react&style=vanilla
```

A single-projection build can select its registry and style mode entirely through plugin configuration and use the unqualified source ID. When a query is present, VJSC propagates its normalized projection fields through relative imports inside the included source root so the host cannot reuse a child transformed for another projection.

Virtual catalog-item imports may provide stable entry names for previews or builds. They are thin facades that re-export the matching real source module with its projection identity; they do not contain precompiled Skin output or start a nested build. Truly fileless internals continue to use the standard `virtual:vjsc/*` and `\0virtual:vjsc/*` convention.

## Registries, transforms, and imports

Framework component registries own semantic mappings from schema components to framework imports, prop types, primitives, and registry-local transforms. The VJSC plugin composes the Core and Icon registries needed by a projection. Skins may contribute Skin-specific transforms, but it does not construct a `reactOutput`, an `htmlOutput`, or a `resolveImport` adapter.

Normal development and package-build import resolution belongs to host aliases and externals. Registry mappings should emit the intended public framework specifiers, while Vite or tsdown aliases those specifiers to workspace sources when necessary. Target-specific source distribution remains an exception: editable Shadcn files need install-time specifiers rather than workspace resolution, so that rewrite belongs to the Shadcn transform/output contributor rather than a general React output abstraction.

VJSC's compiled result is transformed module source plus any imported semantic CSS. The outer host follows that source graph and produces runtime chunks or package entries.

## Catalog boundary

Normal React and HTML projection no longer needs catalog traversal: the host graph supplies dependency closure, ordering, and invalidation. Colocated item metadata can still support stable virtual item names and Shadcn descriptions, but it should be discovered only when those features are used.

The remaining catalog responsibilities are source-distribution concerns: item metadata, editable file ownership, publication policy, shared resources, install paths, and Shadcn dependency metadata. These may collapse into a smaller item inventory plus Shadcn configuration. The existing catalog API should not survive merely to preserve its name; it remains only until the Shadcn transform proves which information cannot be obtained from the host module graph.

## Consequences

- Remove VJSC's generic `build()` and nested Rolldown path after HTML and Shadcn use host-backed transforms.
- Remove VJSC module-result caching, reverse dependency maps, and custom Vite HMR together; every non-imported schema, registry, style, or Icon input read by a transform must still be registered with `addWatchFile`.
- Replace precompiled virtual Skin modules with thin virtual item facades or direct included source entries.
- Move retained compiler terminology toward transforms: transform configuration, transform plugins, and transform diagnostics.
- Keep static HTML rendering and editable Shadcn projection as semantic transforms until host-backed replacements preserve their current contracts.
- Keep Core's generated declaration as a real package artifact even when its schema module is virtual.

## Implementation sequence

1. Consolidate the Vite and Rolldown adapters into `vjscPlugin` under `packages/vjsc/src/bundle`, without changing output.
2. Move framework defaults and import references into registries; replace normal `resolveImport` callbacks with host aliases.
3. Add projection-aware source transforms and thin virtual item entries, then let Vite own their imported graph and HMR.
4. Remove the cached VJSC graph, nested React build, virtual compiled Skin modules, and obsolete Skins build wiring.
5. Reduce catalog code to the metadata and source-distribution facts Shadcn demonstrably needs; delete it if no independent catalog contract remains.
6. Run a dependency and dead-code audit in every touched package after each removal.

Current source and configuration entry points are
[`packages/skins/vjsc`](../../../packages/skins/vjsc),
[`packages/skins/vite.config.ts`](../../../packages/skins/vite.config.ts),
[`packages/vjsc/src`](../../../packages/vjsc/src), and the framework registries under
[`packages/react/vjsc`](../../../packages/react/vjsc),
[`packages/html/vjsc`](../../../packages/html/vjsc), and
[`packages/icons/vjsc`](../../../packages/icons/vjsc).
