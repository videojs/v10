---
name: create-rolldown-plugin
description: Create Rolldown plugins. Use for hooks.
---

# Rolldown plugin implementation

Inspect the installed Rolldown version, relevant package config and exports, neighboring plugins, and host-level tests before choosing hooks. Prefer a Rolldown plugin when the behavior is about modules or build output rather than Vite configuration, HTML, the dev server, or HMR.

## Workflow

1. Define the host contract first: selected modules, source shape entering and leaving each hook, virtual IDs, graph information required, output ownership, watch inputs, and whether the plugin is safe in ordinary application builds or only a dedicated build. Use `transform` for source-module semantics and `renderChunk` only when the edit depends on final generated chunks or output options.
2. Let Rolldown own resolution, traversal, ordering, caching, watching, and output. Use `this.resolve`, normal graph entries, `this.addWatchFile`, and `this.emitFile`; do not invoke another compiler plugin directly or start a nested build to simulate the host graph.
3. Use host-native object hook filters for `resolveId`, `load`, and `transform`. Keep a matching handler guard only when compatibility with hosts lacking the filter is intentional and tested. Normalize query-bearing IDs without dropping parameters that distinguish transformed module identities.
4. Keep virtual modules private unless consumers genuinely import them. Prefix internal IDs with `\0`, resolve them explicitly, return the correct `moduleType`, and add every non-imported source dependency as a watch file.
5. Keep mutable state per plugin instance and reset build-derived state in `buildStart`. Prefer module `meta` for JSON-serializable information that must survive later transforms or host caching; namespace it and explicitly merge updates within that namespace because hook results merge `meta` only one level deep. Read graph-wide information no earlier than `buildEnd` unless the hook contract guarantees completeness.
6. Extend existing input rather than replacing it. Use `packages/vjsc/src/plugins/input.ts` in VJSC. Remember that an `options()` result does not deep-merge `input`, while an emitted chunk follows chunk naming unless `fileName` is forced.
7. Emit generated output with `this.emitFile`. Do not write staging source. Never delete unrelated chunks or assets; complete bundle replacement is valid only for an explicitly asset-only build with tests proving the boundary.
8. When `transform` or `renderChunk` consumes host-provided `magicString`, explicitly enable `experimental.nativeMagicString: true` in the owning Rolldown input config. In tsdown, configure it under `inputOptions.experimental`. Return the native object rather than stringifying it so Rolldown can compose maps, enable output `sourcemap` when consumers need emitted maps, and fail clearly if a repository-owned host violates this contract. Reserve JavaScript fallbacks for intentional compatibility adapters.
9. Test through real Rolldown builds. Cover existing entries, virtual resolution and module type, filters, query identities, static/dynamic/type-only dependencies, graph timing, watched inputs, rebuild state, output names/content, and path or name collisions.

Read [references/api-and-host-contracts.md](references/api-and-host-contracts.md) when the plugin uses virtual entries, graph inspection, editable source capture, inter-plugin communication, declarations, or output replacement.

Use `packages/vjsc/src/plugins/vjsc.ts` as the transform-pipeline anchor, `packages/vjsc/src/plugins/component-schema.ts` for virtual package entries and declaration-aware hosts, and `packages/vjsc/src/plugins/shadcn.ts` for a dedicated asset build.

## Validation

Run the narrow plugin tests, the owning package build, host-consumer tests, `pnpm typecheck`, and `pnpm check:workspace`. If the plugin claims Vite compatibility, exercise the same contract through both Rolldown and Vite rather than relying on structural types alone.

## Example

Input: “Create a build plugin that publishes transformed component metadata as JSON.”

Output: One Rolldown plugin that loads components through the host graph, retains namespaced metadata, assembles complete graph data at the proper hook, watches discovery inputs, emits JSON assets, preserves unrelated output, and has direct Rolldown plus host-compatibility tests.
