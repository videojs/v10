# Rolldown API and host contracts

Read this reference only for graph-sensitive, virtual-module, declaration, or output-producing plugins.

## Current sources

- Installed types are authoritative for the repository version: `node_modules/rolldown/dist/index.d.mts` and its referenced declarations.
- Official overview: <https://rolldown.rs/apis/plugin-api>
- Hook filters: <https://rolldown.rs/apis/plugin-api/hook-filters>
- Plugin interface: <https://rolldown.rs/reference/Interface.Plugin>
- Plugin context and graph/output methods: <https://rolldown.rs/reference/Interface.PluginContext>
- Module types: <https://rolldown.rs/in-depth/module-types>

Recheck both installed types and official documentation when the dependency changes. Rolldown is evolving quickly, and a documented current behavior may not exist in the pinned runtime.

## Hook and graph rules

- `options` receives and may return the whole input-options object. Spreading the object preserves top-level properties, but assigning `input` replaces that property. Normalize `string | string[] | Record<string, string>` deliberately and reject named-entry collisions.
- `buildStart` sees normalized options after all `options` hooks. It is the right place to reset state, discover build inputs, register watches, and emit additional graph entries.
- `resolveId`, `load`, and `transform` participate in the host graph. Return `null` to defer. When recursively resolving from `resolveId`, pass relevant resolve options and `skipSelf: true`.
- Prefer native hook filters. String ID filters are globs; regular expressions are tested against normalized separators. Composable `@rolldown/pluginutils` filters are Rolldown-only unless the target Vite version explicitly supports them.
- Returning `moduleType` lets the host route TS, TSX, CSS, JSON, and other source correctly. A module-type change does not restart the earlier transform chain, so type-changing plugins belong early.
- `ModuleInfo` becomes progressively complete. Use `moduleParsed` or `buildEnd` for resolved dependencies and `buildEnd` for final `isEntry`, importers, and graph ownership.
- `importedIds` and `dynamicallyImportedIds` represent runtime graph edges. Type-only imports are erased before the runtime graph and require analysis of retained editable source followed by `this.resolve` for identity. Resolution alone does not guarantee the target was loaded.
- Module `meta` is the stable handoff for source or annotations needed after later transforms. Namespace it, such as `meta.vjsc`, and do not replace the entire metadata object.

## Repository-proven constraints

- In the pinned Rolldown 1.1.x hosts, a build-start `this.load({ resolveDependencies: true })` did not reliably populate an otherwise unreachable graph. Use a real configured or emitted entry and prove traversal in both direct Rolldown and Vite tests before depending on it.
- An emitted chunk without `fileName` follows `output.chunkFileNames`, not `entryFileNames`. Add a named input when package exports require entry naming; emit a chunk when graph inclusion matters and chunk naming is acceptable.
- Treat a full query-bearing resolved ID as module identity. Keep the physical filename separately. Stripping queries cross-wires multiple transformations of the same source file.
- Capture editable transformed source before runtime JSX lowering. Later `ModuleInfo.code` is host-dependent; namespaced transform metadata is the portable handoff.
- Discovery globs need watches for both matched files and a containing directory so add/remove events rebuild. Watch each additional source at the hook that consumes it.
- Mutable maps belong to one plugin instance and one build lifecycle. Clear them on rebuild. Do not reuse a stateful instance across concurrent builds unless state is partitioned explicitly.
- tsdown declaration generation runs through a separate declaration program and may not discover a Rolldown-only virtual TypeScript entry. Keep declaration-entry wiring in an explicit tsdown adapter and verify the exact exported `.d.ts` path.

## Output ownership

- Emit arbitrary content as assets. Use `originalFileName` for file-backed assets when useful so Rolldown can connect watching and metadata.
- `emitFile({ type: 'chunk', id })` creates an entry through the normal graph and may split or deduplicate chunks.
- If a private trigger creates helper chunks, track ownership precisely. Removing every JavaScript chunk is only safe for a dedicated asset-only build; otherwise preserve application entries and assets.
- Validate output paths after normalization, reject traversal and collisions, and test final emitted content rather than merely checking asset names.
