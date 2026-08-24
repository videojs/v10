# Rolldown API and host contracts

Read this reference only for graph-sensitive, virtual-module, inter-plugin, declaration, or output-producing plugins.

## Current sources

- Installed types are authoritative for the repository version: `node_modules/rolldown/dist/index.d.mts` and its referenced declarations.
- Official overview: <https://rolldown.rs/apis/plugin-api>
- Hook filters: <https://rolldown.rs/apis/plugin-api/hook-filters>
- Source transformations: <https://rolldown.rs/apis/plugin-api/transformations>
- Inter-plugin communication: <https://rolldown.rs/apis/plugin-api/inter-plugin-communication>
- Plugin interface: <https://rolldown.rs/reference/Interface.Plugin>
- Plugin context and graph/output methods: <https://rolldown.rs/reference/Interface.PluginContext>
- Module types: <https://rolldown.rs/in-depth/module-types>
- Native MagicString: <https://rolldown.rs/in-depth/native-magic-string>

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

## Inter-plugin communication

- Pass context for a manual `this.resolve` call through `custom`, keyed by the receiving plugin's name. Prefer this to encoding plugin-only state in proxy IDs or query strings.
- Module `meta` must be JSON-serializable because Rolldown may persist it in the watch cache. Results from `resolveId`, `load`, and `transform` are shallow-merged: a later value replaces an earlier value under the same top-level key. Read the current namespace and merge its nested fields explicitly when several hooks or plugins contribute to it.
- Use a plugin object's `api` property for direct coordination that does not belong to resolution or module metadata. Discover the provider from normalized `plugins` in `buildStart`, fail clearly when a required provider is absent, and keep the dependency optional when the consumer can operate independently.
- Module `description` and plugin `meta` are descriptive tooling metadata, not communication state. Add a human-readable description for opaque virtual modules; package metadata is useful when a published package exposes several plugins.

## Repository-proven constraints

- In the pinned Rolldown 1.2.x hosts, a build-start `this.load({ resolveDependencies: true })` did not reliably populate an otherwise unreachable graph. Use a real configured or emitted entry and prove traversal in both direct Rolldown and Vite tests before depending on it.
- Explicitly enable `experimental.nativeMagicString: true` in repository-owned Rolldown input configs that run MagicString transforms; tsdown places Rolldown input options under `inputOptions`. Do not rely on an observed default from the pinned runtime.
- An emitted chunk without `fileName` follows `output.chunkFileNames`, not `entryFileNames`. Add a named input when package exports require entry naming; emit a chunk when graph inclusion matters and chunk naming is acceptable.
- Treat a full query-bearing resolved ID as module identity. Keep the physical filename separately. Stripping queries cross-wires multiple transformations of the same source file.
- Capture editable transformed source before runtime JSX lowering. Later `ModuleInfo.code` is host-dependent; namespaced transform metadata is the portable handoff.
- Discovery globs need watches for both matched files and a containing directory so add/remove events rebuild. Watch each additional source at the hook that consumes it.
- Mutable maps belong to one plugin instance and one build lifecycle. Clear them on rebuild. Do not reuse a stateful instance across concurrent builds unless state is partitioned explicitly.
- tsdown declaration generation runs through a separate declaration program and may not discover a Rolldown-only virtual TypeScript entry. Keep declaration-entry wiring in an explicit tsdown adapter and verify the exact exported `.d.ts` path.

## Output ownership

- Prefer `transform` when an edit belongs to one source module, needs its Oxc AST or module type, or should participate in module-level caching and graph analysis. Prefer `renderChunk` when an edit depends on final chunk code, filename, format, or the rendered chunk graph. Do not use `generateBundle` for code transforms: it runs after hashes and source-map assets are produced.
- With native MagicString enabled, `renderChunk` receives a lazy `magicString` through its fourth metadata argument. Return that object directly after editing it. Repository-owned hosts should fail clearly if it is missing; only intentional compatibility adapters should retain a JavaScript fallback.
- If a `renderChunk` edit changes imports or exports, update the corresponding mutable chunk metadata. When native MagicString is unavailable by design, return a generated map; use `map: null` only for edits that do not move code and `{ mappings: '' }` only when meaningful mappings cannot be produced.
- Emit arbitrary content as assets. Use `originalFileName` for file-backed assets when useful so Rolldown can connect watching and metadata.
- `emitFile({ type: 'chunk', id })` creates an entry through the normal graph and may split or deduplicate chunks.
- If a private trigger creates helper chunks, track ownership precisely. Removing every JavaScript chunk is only safe for a dedicated asset-only build; otherwise preserve application entries and assets.
- Validate output paths after normalization, reject traversal and collisions, and test final emitted content rather than merely checking asset names.
