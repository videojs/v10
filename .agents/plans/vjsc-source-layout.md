# VJSC source layout and bundler boundary implementation plan

Owner: VJSC maintainers

Status: planned

Branch: `t3code/ignore-compiler-artifacts`

Next step: move the TypeScript compiler and shared Rolldown implementation without changing package behavior.

## Outcome

Organize `packages/vjsc/src` by domain instead of by incidental implementation mechanism. Rolldown is the shared bundler implementation. Vite consumes compatible Rolldown plugins and adds no duplicate bundler behavior. Each feature keeps its plugin beside its implementation and the `/rolldown` and `/vite` entry points only assemble supported public exports.

The target layout is:

```text
packages/vjsc/src/
├── index.ts
├── ts/
│   ├── index.ts
│   ├── types.ts
│   ├── transform.ts
│   ├── diagnostics.ts
│   ├── parse.ts
│   ├── source-map.ts
│   ├── rolldown.ts
│   ├── html-runtime.ts
│   ├── jsx/
│   ├── rewrite/
│   ├── transforms/
│   ├── utils/
│   └── tests/
├── components/
│   ├── index.ts
│   ├── types.ts
│   ├── meta.ts
│   ├── jsx-runtime.ts
│   └── schema/
│       ├── generate.ts
│       ├── declaration.ts
│       ├── rolldown.ts
│       └── tests/
├── registry/
│   ├── index.ts
│   ├── types.ts
│   ├── resolve.ts
│   ├── transform.ts
│   └── jsx-runtime.ts
├── styles/
│   ├── index.ts
│   ├── types.ts
│   ├── transform.ts
│   └── ...
├── shadcn/
│   ├── index.ts
│   ├── types.ts
│   ├── analyze.ts
│   ├── graph.ts
│   ├── registry.ts
│   ├── rolldown.ts
│   └── tests/
├── rolldown/
│   └── index.ts
└── vite/
    └── index.ts
```

Do not replace `bundle/` with another generic shared directory. Keep TypeScript-specific helpers under `ts/utils/`; add a root utility only when it is demonstrably shared across independent domains.

## Boundaries

### TypeScript compiler

`ts/` owns the compiler pipeline and the advanced TypeScript API:

- compiler configuration and result types;
- parsing, diagnostics, source maps, and transforms;
- JSX and rewrite helpers;
- TypeScript AST utilities;
- the VJSC Rolldown transform plugin;
- the internal HTML JSX runtime loaded by transformed modules.

The bundler-facing implementation belongs in `ts/rolldown.ts`. It remains an ordinary source-transform plugin and knows nothing about Shadcn publication, installation paths, or registry JSON.

Rename predicates and helpers to state their actual contract. In particular:

- `isCanonicalSourceModule` becomes `isVjscModule`;
- `canonicalPath` becomes `resolveModulePath` or another operation-specific name;
- `canonicalImport` becomes `resolveGraphModuleId` or another operation-specific name;
- errors describe resolved module IDs, query removal, or real paths directly.

Do not use “canonical” as a catch-all for unrelated normalization operations.

### Feature-local plugins

Plugins live with the feature that owns their behavior:

- VJSC transform plugin: `ts/rolldown.ts`;
- component schema entry/output plugin: `components/schema/rolldown.ts`;
- Shadcn publication plugin: `shadcn/rolldown.ts`;
- compiler registry transform: `registry/transform.ts`;
- compiler styles transform: `styles/transform.ts`.

Use explicit names such as `registryPlugin` and `stylesPlugin` at public call sites where the current generic `plugin` name is ambiguous. Preserve compatibility during the move unless all workspace callers are migrated in the same commit.

### Rolldown and Vite entry points

`rolldown/index.ts` is the complete bundler-plugin entry point. It re-exports feature-local implementations and their public option types; it contains no plugin logic.

```ts
export { vjscPlugin, type VjscPluginOptions, type VjscTransformer } from '../ts/rolldown';
export { schemaPlugin, type SchemaPluginOptions } from '../components/schema/rolldown';
export { shadcnPlugin, type ShadcnPluginOptions } from '../shadcn/rolldown';
```

`vite/index.ts` is a thin compatibility entry point for plugins intended to run in ordinary Vite serve and build flows. It re-exports the Rolldown-backed VJSC transform plugin instead of wrapping or reimplementing it.

```ts
export { vjscPlugin, type VjscPluginOptions, type VjscTransformer } from '../ts/rolldown';
```

Shadcn remains build-only and is configured through `build.rolldownOptions.plugins`. Do not export a second Shadcn Vite plugin. The schema output plugin remains under `/rolldown` unless a concrete Vite caller requires a Vite-facing export.

After the adapters are unified, audit whether the `vite` package dependency is still required by VJSC runtime or declaration output. Remove it only after the package build and all downstream typechecks prove it is unnecessary.

## Shadcn organization

### `shadcn/types.ts`

Own the public Shadcn publication types:

- `ShadcnRegistry`;
- `ShadcnRegistryDefinition`;
- `ShadcnRegistryFile` and file types;
- shared item/file definitions;
- published item descriptions;
- `ShadcnPluginOptions` if keeping the plugin options beside the publication contract improves discovery.

`shadcn/index.ts` contains only explicit type exports from `types.ts`. Do not hide public configuration interfaces inside an implementation file or add a root catch-all `types.ts`.

### `shadcn/analyze.ts`

Own editable source analysis and rewriting primitives:

- find static imports and export-from declarations;
- find dynamic imports;
- retain type-only references needed for installed editable source;
- record source ranges and quote style;
- apply specifier replacements without formatting generated source.

The analyzer finds authored relationships. Rolldown remains responsible for resolving each specifier to a module ID.

### `shadcn/graph.ts`

Own a private graph representation tailored to registry assembly:

```ts
interface SourceImport {
  readonly specifier: string;
  readonly resolvedId?: string;
  readonly kind: 'static' | 'dynamic' | 'type';
}

interface SourceModule<Item extends ComponentMeta> {
  readonly id: string;
  readonly source: string;
  readonly imports: readonly SourceImport[];
  readonly meta?: Item;
}

interface SourceGraph<Item extends ComponentMeta> {
  readonly root: string;
  readonly modules: ReadonlyMap<string, SourceModule<Item>>;
}
```

The exact private names may follow nearby code, but the shape must map each authored specifier directly to its resolved module ID. Remove ordinal fallbacks such as `importedIds[index]`; source import order is not a stable module-graph contract.

`graph.ts` owns:

- graph validation;
- module indexing;
- published component boundaries;
- private dependency ownership;
- missing source and duplicate module errors.

Do not export graph types through `vjsc/shadcn`, `vjsc/rolldown`, the root package, or a plugin `api` property.

### `shadcn/registry.ts`

Own only Shadcn publication and JSON assembly:

- source and installation paths;
- published import mappings;
- relative installed imports;
- exceptional mappings;
- `registryDependencies`;
- npm dependencies;
- shared styles and utilities;
- collision validation;
- official Shadcn schema validation;
- final registry and item assets.

It accepts the private source graph and plain `ShadcnRegistryDefinition`, then returns JSON assets for the host to emit. It does not discover files, inspect Rolldown state, or implement plugin hooks.

### `shadcn/rolldown.ts`

Own only the build lifecycle:

- discover the declared editable source inventory;
- add source and shared files as watch inputs;
- create the private graph trigger for otherwise disconnected modules;
- obtain VJSC-transformed editable source;
- use Rolldown resolution and module information to build direct import edges;
- call the registry assembler;
- emit JSON assets with `this.emitFile`;
- remove graph-trigger JavaScript without deleting unrelated application output.

It does not implement installation layout, registry schema construction, or source formatting.

## Rolldown graph integration

Prefer the host’s module graph over a parallel traversal:

- enumerate loaded modules with `this.getModuleIds()`;
- inspect completed runtime edges with `this.getModuleInfo(id)` at `buildEnd`;
- use `importedIds` and `dynamicallyImportedIds` for host-known dependencies;
- resolve editable type-only and otherwise erased references with `this.resolve`;
- emit final JSON with `this.emitFile` in `generateBundle`.

Rolldown runtime edges are not sufficient for editable TypeScript source because type-only imports may be removed before runtime graph construction. `shadcn/analyze.ts` finds those references, but it must not implement filesystem-style module resolution itself.

Rolldown rewrites imports in emitted JavaScript chunks, not import strings contained in Shadcn JSON assets. Installation-path rewriting therefore remains narrow Shadcn packaging behavior.

### Transformed source handoff

Replace Shadcn’s ordered transform observer with private Rolldown module metadata if the pinned Vite and Rolldown hosts preserve the exact post-VJSC, pre-internal-transform source:

```ts
return {
  code: result.code,
  map: result.map,
  meta: {
    vjsc: {
      source: result.code,
      parameters: Object.fromEntries(parameters),
    },
  },
};
```

At `buildEnd`, Shadcn reads the private value through `getModuleInfo(id).meta`. This removes the Shadcn `transform` hook, plugin-order capture state, and a duplicate source map keyed by opportunistic hook execution.

Constraints:

- keep the metadata shape internal and JSON-serializable;
- do not export or name a public `VjscModuleMeta` API;
- keep VJSC metadata generic and free of Shadcn concepts;
- verify the metadata contains editable React/Tailwind source before Rolldown’s TypeScript/JSX lowering;
- verify Vite build preserves it through its Rolldown host;
- retain the existing ordered capture until these assertions pass;
- do not use `this.load()` from `transform` or introduce direct VJSC invocation.

The private trigger remains necessary for inventory modules that are not reachable from an application entry. Do not make the trigger ID public or require callers to configure it as an entry.

## Package exports

Target shallow package exports:

```text
vjsc
vjsc/ts
vjsc/components
vjsc/registry
vjsc/shadcn
vjsc/styles
vjsc/rolldown
vjsc/vite
```

Rules:

- add `vjsc/ts` as the advanced TypeScript/compiler-author API;
- retain `vjsc/ast` temporarily as a compatibility alias to the same explicit exports;
- migrate workspace callers from `vjsc/ast` to `vjsc/ts` before removing the alias;
- keep `vjsc/shadcn` limited to public publication types;
- keep bundler factories under `vjsc/rolldown`;
- keep `vjsc/vite` as a small compatibility surface, not a second implementation;
- use explicit exports instead of adding new `export *` barrels;
- do not export internal graph, analyzer, virtual trigger, metadata, or assembler types;
- preserve `sideEffects: false` only while all entry modules remain inert until their exported factories are called;
- update `tsdown.config.ts`, `package.json`, and `scripts/check-exports.mjs` together.

## Implementation sequence

### Commit 1: Organize the TypeScript compiler

- Create `src/ts/` and move compiler configuration, transform, parsing, diagnostics, source maps, JSX, rewrite, transforms, and TypeScript-specific utilities under it.
- Move `bundle/plugin.ts` to `ts/rolldown.ts` and `bundle/html-runtime.ts` to `ts/html-runtime.ts`.
- Move schema generation under `components/schema/`, including declaration emission and its Rolldown plugin.
- Split the mixed bundle tests between the new feature-local test directories.
- Rename `isCanonicalSourceModule` to `isVjscModule` and remove ambiguous “canonical” naming from touched VJSC code.
- Preserve current package exports with forwarding entry points while paths move.

Gate: VJSC tests, build output, generated declarations, and downstream imports must remain behaviorally unchanged.

### Commit 2: Separate Shadcn types, analysis, graph, and registry assembly

- Move public Shadcn interfaces from `shadcn/index.ts` to `shadcn/types.ts`.
- Rename `shadcn/imports.ts` to `shadcn/analyze.ts`.
- Add private `shadcn/graph.ts` and move graph validation, indexing, ownership, and dependency partitioning into it.
- Replace `importedIds[index]` and other ordinal inference with explicit source-reference edges.
- Reduce `shadcn/registry.ts` to paths, rewritten installed source, dependency lists, shared items, schema validation, and JSON asset construction.
- Keep source unchanged apart from required import-specifier edits; do not format it.

Gate: all existing Shadcn fixtures produce equivalent schema-valid JSON, with exact dependency ownership and install targets.

### Commit 3: Use Rolldown as the shared plugin implementation

- Make feature-local Rolldown plugins authoritative.
- Reduce `rolldown/index.ts` to explicit re-exports.
- Reduce `vite/index.ts` to compatible re-exports needed by Vite serve/build consumers.
- Install Shadcn only through `build.rolldownOptions.plugins`.
- Prove private module metadata transports post-VJSC editable source to `buildEnd`; remove Shadcn’s transform observer only after the proof passes.
- Resolve analyzed source references through Rolldown and assemble direct graph edges.
- Audit Vite and Rolldown dependencies after generated type declarations pass.

Gate: the same VJSC transform plugin works directly in Rolldown and in Vite without adapter-specific behavior or filter differences.

### Commit 4: Finalize exports and remove compatibility scaffolding

- Add the `vjsc/ts` export and migrate workspace callers from `vjsc/ast`.
- Decide whether to retain `vjsc/ast` for one follow-up or remove it in this private-package change.
- Remove dead forwarding files, wrappers, duplicate option types, imports, scripts, and dependencies.
- Replace ambiguous public `plugin` aliases with feature names where compatibility permits.
- Re-audit `packages/vjsc/src`, the export map, tsdown entries, generated declarations, and all workspace VJSC imports.
- Delete this temporary plan before merge after all steps and verification are complete.

## Required tests

Add or retain focused coverage for:

- VJSC module recognition across `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.mts`, `.cjs`, and `.cts` with transform queries;
- query propagation through relative VJSC module imports;
- identical VJSC plugin behavior under direct Rolldown and Vite;
- transformed source metadata containing editable TSX rather than runtime-lowered JavaScript;
- complete static, dynamic, export-from, and type-only source edges;
- cyclic source dependencies without `this.load()` deadlocks;
- graph ownership stopping at published component boundaries;
- exact npm and registry dependency derivation;
- installed relative and exceptional import rewriting;
- component metadata available for assembly but absent from installed source;
- shared style and utility items;
- path traversal and collision rejection;
- every emitted registry and item JSON parsing through official Shadcn schemas;
- unrelated application chunks remaining intact;
- no trigger-owned JavaScript in registry-only output;
- Vite serve/HMR never initializing Shadcn publication;
- sequential rebuild state reset.

## Verification

Run narrow tests after each move. Before handoff run:

```bash
pnpm -F vjsc test
pnpm -F vjsc build
pnpm -F @videojs/skins test
pnpm -F @videojs/skins build
pnpm typecheck
pnpm check:workspace
```

Also confirm:

- `packages/vjsc/package.json` exports match generated files;
- no package imports a removed internal path;
- Vite and Rolldown use the same transform implementation;
- Shadcn registry builds emit JSON only;
- no generated compiler or registry artifacts are tracked;
- the worktree contains no unrelated changes.

## Non-goals

- Public module-graph or transformed-source metadata APIs.
- A new generic bundler abstraction above Rolldown.
- Unplugin or a second Vite implementation.
- Shadcn development-server or HMR behavior.
- E2E or visual parity work.
- Framework package cutover to VJSC source.
- Replacing tsdown builds with Vite.
- HTML Shadcn registry output.
- Formatting generated editable source.
- Unrelated compiler behavior cleanup.
