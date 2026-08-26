---
name: create-vite-plugin
description: Create Vite plugins. Use for hooks.
---

# Vite plugin implementation

Inspect the installed Vite and Rolldown versions, application config, neighboring plugins, and serve/build tests before implementing. Vite 8's `Plugin` extends Rolldown's `Plugin`; keep generic resolution, loading, transforms, graph work, and output in a Rolldown plugin and add a Vite layer only for Vite-specific behavior.

## Workflow

1. Classify the requirement. Use a Rolldown plugin directly for host-generic module/build behavior. Use a Vite plugin for `config`, environments, `configureServer`, HTML, HMR, preview, or behavior that intentionally differs between serve and build.
2. Decide activation explicitly. Use `apply: 'serve'` or `apply: 'build'` when only one command is valid. A generic build-only Rolldown plugin may instead live in `build.rolldownOptions.plugins`; do not initialize asset generation or destructive output logic during dev.
3. Enable `build.rolldownOptions.experimental.nativeMagicString: true` in repository-owned Vite builds and set `build.sourcemap: true` when production maps should be emitted. This affects Vite's production Rolldown build but does not add Rolldown AST or MagicString metadata to Vite transform hooks; use the VJSC Vite adapter for transforms that need it.
4. Use `enforce` only for a real Vite tier requirement. Prefer per-hook `order` for a specific Rolldown hook. Prove ordering with behavior tests rather than depending on array position.
5. Use `config` to return a partial Vite config that may be deeply merged. Do not attempt to inject plugins from that hook. Read final values in `configResolved`; keep environment-specific state out of global app hooks.
6. Treat resolve/load/transform hooks as per-environment. Use Vite's environment APIs or separate plugin instances when builds may run concurrently. Worker plugins must be created by `worker.plugins` and receive fresh instances.
7. Normalize paths before Vite-specific ID comparisons. For cross-host VJSC code, reuse package `src/utils` module-ID and path helpers instead of importing Vite utilities into the generic plugin.
8. Remember that aliases affect module resolution, not authored import text retained in generated source or JSON. Resolve dependencies through the host, then perform only the packaging rewrite required by the output format.
9. Test serve and build separately. Cover activation, resolved config, virtual modules, transform order, SSR/environment flags when relevant, HMR invalidation, HTML output, existing application entries, and emitted assets.

Read [references/api-and-host-contracts.md](references/api-and-host-contracts.md) when choosing between a raw Rolldown plugin, `build.rolldownOptions.plugins`, a top-level Vite plugin, or an environment-aware plugin.

Use `packages/vjsc/src/vite/index.ts` as the thin-adapter example, `packages/vjsc/src/plugins/tests` for direct Rolldown coverage, and `packages/skins/vjsc/tests/vite.test.ts` as the Vite host test anchor.

## Validation

Run focused programmatic Vite serve/build tests, the underlying Rolldown tests when shared, the owning package build, `pnpm typecheck`, and `pnpm check:workspace`. Avoid E2E coverage unless the requested behavior genuinely crosses the browser boundary.

## Example

Input: “Make this source transform available in Vite and rebuild when its config changes.”

Output: A host-generic Rolldown transform reused by a thin Vite entry, Vite-only watch/config handling where needed, explicit serve/build activation, and tests proving identical transformed source through direct Rolldown and Vite.
