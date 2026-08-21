# Vite API and host contracts

Read this reference only when a plugin needs Vite lifecycle, environments, dev behavior, or build integration choices.

## Current sources

- Installed types are authoritative for the repository version: `node_modules/vite/dist/node/index.d.ts`.
- Official plugin API: <https://vite.dev/guide/api-plugin>
- Build and `build.rolldownOptions`: <https://vite.dev/config/build-options>
- Production customization: <https://vite.dev/guide/build.html>
- Worker plugin lifecycle: <https://vite.dev/config/worker-options.html>
- Rolldown native MagicString: <https://rolldown.rs/in-depth/native-magic-string>

Recheck installed types alongside the documentation after Vite or Rolldown upgrades. Environment APIs and compatibility details continue to evolve.

## Rolldown or Vite?

Vite 8 declares `interface Plugin extends Rolldown.Plugin`. A raw Rolldown plugin is therefore the default for:

- resolution, loading, and source transforms;
- module types, hook filters, module metadata, and graph inspection;
- build entries, chunks, assets, and watch files;
- behavior that should work in tsdown or direct Rolldown too.

Use Vite's extended interface for:

- root config and resolved config;
- command or mode selection;
- environment selection and environment-local state;
- dev or preview middleware;
- HTML transformation;
- HMR behavior.

A build-only Rolldown plugin under `build.rolldownOptions.plugins` behaves like a Vite plugin with build-only, post-tier activation. Put it there when it should not participate in dev. Put it in top-level `plugins` when it must also transform served modules or needs Vite fields.

Enable `build.rolldownOptions.experimental.nativeMagicString: true` for repository-owned Vite builds and `build.sourcemap: true` when final map files are required. In the pinned Vite 8.2.x host, transform hook options expose Vite fields but do not forward Rolldown's `ast` or `magicString`, whether a plugin is top-level or under `build.rolldownOptions.plugins`. The option still enables native MagicString in production output hooks such as `renderChunk`; it does not replace `packages/vjsc/src/vite/oxc.ts` for VJSC transforms in serve or build.

## Ordering and lifecycle

- `enforce: 'pre' | 'post'` moves the entire plugin into a Vite tier around core plugins. Rolldown object hooks can additionally set `order` for one hook. Use the narrowest ordering mechanism.
- `apply` gates by `serve` or `build`; a predicate can inspect raw config and command environment. `configResolved` sees the final config and is the better read-only source for later hooks.
- During dev, `options` and `buildStart` run when the plugin container starts, while `resolveId`, `load`, and `transform` run for requested modules. Output-generation hooks are build concerns.
- Vite resolve/load/transform hooks receive environment-specific extensions such as SSR context. Do not assume a single client graph when SSR, RSC, workers, or app builds are possible.
- App-level plugins and environment plugins have different lifecycles. Do not share mutable module maps across concurrent environments unless they are partitioned. Prefer fresh plugin instances; `worker.plugins` explicitly requires a factory for parallel worker builds.

## Config and IDs

- A Vite `config` hook may mutate config or return a deeply merged partial config, except that adding `plugins` there has no effect because plugins were already resolved.
- Rolldown's `options` hook has different semantics: returning an object manipulates/replaces input options, and assigning nested `input` replaces existing input. Do not transfer Vite config-merge assumptions to it.
- Vite normalizes resolved paths to POSIX separators. Use Vite's `normalizePath` only inside Vite-specific code. Cross-host plugins should own consistent module-ID parsing and normalization.
- Dev importers may reflect Vite's unbundled HTML request model and are not always equivalent to production importers. Pass hook options through when delegating to `this.resolve` and test both commands.
- Vite aliases select resolved modules but do not rewrite import strings preserved as editable source. Generated registries and source packages need an explicit, narrow import-packaging policy.

## Testing matrix

- Direct Rolldown test for the generic contract.
- Programmatic Vite build test for plugin ordering, source lowering, graph metadata, application entry preservation, and assets.
- Programmatic dev-server test when `apply: 'serve'`, middleware, HTML, module graph, or HMR is involved.
- Worker or multi-environment test only when the plugin claims that support.
- An assertion that build-only generation does not initialize during dev.

Structural type compatibility is not enough. Tests should prove the source stage being captured, complete dependency identities, query propagation, and final emitted output under the actual pinned host.
