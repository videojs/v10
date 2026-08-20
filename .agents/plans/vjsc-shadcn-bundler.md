# VJSC Shadcn bundler implementation plan

Status: planned

## Outcome

Vite and Rolldown own module discovery, resolution, traversal, watching, and output. VJSC only transforms canonical modules. A separate Shadcn output plugin consumes the VJSC-transformed module graph and emits the final Shadcn registry JSON assets.

```text
Skin source modules
  -> vjscPlugin transform hooks
  -> shadcnPlugin source capture and graph classification
  -> emitFile(registry.json and item JSON)
```

There is no generated source directory, nested VJSC build, filesystem writer, `generate:skins` script, or separate `shadcn build` command.

## Boundaries

### `vjscPlugin`

- Is an ordinary transform plugin.
- Uses the host's `include` and `exclude` filter types.
- Selects a transform from the module ID, query parameters, and source context.
- Propagates a selected transform query through relative canonical imports.
- Registers every schema, registry, style, and source dependency through `addWatchFile`.
- Returns transformed code, source maps, and virtual CSS imports when applicable.
- Knows nothing about Shadcn items, installation paths, publication policy, or JSON output.

### `shadcnPlugin`

- Is a build-only output adapter exported from both `vjsc/vite` and `vjsc/rolldown`.
- Discovers self-describing component modules from `root`, `include`, and `exclude`.
- Extracts the existing static `ComponentMeta` export from authored source.
- Loads each published root using a configured projection query so the normal bundler pipeline runs.
- Captures source immediately after `vjscPlugin`, before React/Oxc/Rolldown lowers it into runtime JavaScript.
- Uses the host module graph to classify component-to-component and external dependencies.
- Emits `registry.json` and one validated item JSON asset per item with `this.emitFile`.
- Does not run VJSC transforms directly and does not start a nested build.

The internal asset-only build trigger, if required by the host, stays private to the plugin. Skins configuration does not import or declare virtual modules.

### Shadcn-specific source rewriting

Bundler aliases resolve source imports but do not change the editable import strings embedded in registry JSON. The Shadcn adapter therefore retains only the source-distribution policy that the bundler cannot provide:

- map resolved component dependencies to `registryDependencies`;
- map package imports to npm `dependencies`;
- rewrite imports whose installed target differs from their authored specifier;
- preserve or rewrite relative imports according to installed file locations;
- attach shared style and utility items;
- validate final output with `shadcn/schema`.

This logic belongs to the Shadcn adapter, not the generic VJSC transform.

## Intended public configuration

The exact property names are finalized by tests, but the configuration should remain close to native Vite/Rolldown concepts:

```ts
import { shadcnPlugin, vjscPlugin } from 'vjsc/vite';

export default defineConfig({
  plugins: [
    vjscPlugin({
      include: [`${vjscDir}/**/*.tsx`],
      transform: createSkinTransform,
    }),
    shadcnPlugin({
      root: vjscDir,
      include: ['./components/**/*.tsx', './skins/*/skin.tsx'],
      query: {
        framework: 'react',
        skin: 'default-video',
        style: 'tailwind',
      },
      registry: skinRegistry,
    }),
  ],
});
```

Rules for the public API:

- Export host-native `Plugin` and `FilterPattern` types from `/vite` and `/rolldown`; do not introduce `VjscFilterPattern`.
- Return the host plugin type directly; do not expose `moduleId`, custom build handles, or a VJSC facade object.
- Keep `ComponentMeta` under `vjsc/components`; do not add `VjscModuleMeta`.
- Keep the registry definition as plain publication config. Do not recreate `Catalog`, `SourceDefinition`, `ShadcnSource`, projections, or a general graph API.
- Put bundler plugins only under the `/vite` and `/rolldown` exports.
- Keep the shared plugin factories private under `src/bundle/`.

## Implementation sequence

### Commit 1: Prove ordered source capture

- Add a minimal Rolldown test with `vjscPlugin` followed by a collector transform hook.
- Load a real TSX entry and a relative dependency using the React/Tailwind query.
- Prove the collector receives VJSC-transformed editable source before runtime JSX lowering.
- Prove `this.load({ resolveDependencies: true })` populates the graph without making source modules public runtime entries.
- Prove an internal asset-only trigger can be removed without deleting unrelated application chunks.
- Repeat the contract through Vite build using the `/vite` adapters.

Gate: if ordered capture is inconsistent between Vite and Rolldown, place the transformed source in standard Rolldown module `meta` from `vjscPlugin` and read it through `getModuleInfo`. Do not fall back to calling `transform()` from `shadcnPlugin`.

### Commit 2: Replace the parallel Shadcn transform pipeline

- Rewrite `src/bundle/shadcn.ts` as the graph consumer described above.
- Make the plugin build-only in the Vite adapter so registry discovery does not run during dev/HMR.
- Rescan entries and clear collected state in every `buildStart` for watch correctness.
- Resolve and load projected entry IDs through the host.
- Capture transformed code with a pre-transform hook ordered after `vjscPlugin`.
- Register source directories and shared files as watch inputs, including add/unlink discovery inputs.
- Emit assets through `emitFile`; do not write files directly.

Tests cover plugin order failure, duplicate names, missing metadata, missing published items, rebuild state, and an unrelated application entry remaining intact.

### Commit 3: Derive the registry from component metadata and the host graph

- Replace `SourceDefinition`, `Source`, and source inventory types with `ComponentMeta` plus a narrow Shadcn publication definition.
- Resolve component dependency edges from `getModuleInfo().importedIds` rather than reparsing and recursively building the source graph.
- Assign each transformed module to its published item or owning root.
- Calculate `registryDependencies` from component edges and npm dependencies from external imports.
- Preserve explicit config only for choices source metadata cannot express: published item names, install paths, shared files, namespace, homepage, and exceptional import mappings.
- Validate every source and output path and reject collisions.

Restore the useful origin-main Shadcn assertions as unit/snapshot tests: editable TSX, dependency partitioning, targets, shared styles/utils, and schema-valid JSON. Do not add E2E tests.

### Commit 4: Move Skins registry mode onto the shared graph

- Configure both `vjscPlugin` and `shadcnPlugin` directly in `packages/skins/vite.config.ts` for registry mode.
- Keep `skinRegistry` as plain config; remove `createSkinShadcnPlugin` and other Skins plugin wrappers.
- Reuse the same skin transform selector used by preview mode rather than maintaining a registry-only compiler configuration.
- Let the Shadcn plugin request the React/Tailwind/default-skin query.
- Keep Tailwind's Vite plugin responsible for preview CSS processing. Registry output embeds Tailwind source/classes and shared raw CSS; it does not invoke Tailwind compilation itself.
- Retain ordinary Vite aliases only where they are needed to run workspace source during preview. Do not encode Shadcn installation paths as Vite aliases.

Verify `vite build --mode registry` writes only the expected registry assets and `vite dev` does not initialize Shadcn generation.

### Commit 5: Delete superseded concepts and dead code

- Delete `src/shadcn/source/` and its `define`, `resolve`, `project`, and style abstractions.
- Remove `defineShadcnSource`, `ShadcnSource`, `SourceTransformer`, and the direct `transformSource` path.
- Remove public `moduleId` properties and registry-mode virtual entry declarations.
- Reduce `src/shadcn/` to registry policy, graph-to-item mapping, source import rewriting, schema validation, and JSON assembly.
- Re-review `packages/skins/vjsc/`, `packages/vjsc/src/bundle/`, and package exports for newly dead wrappers.
- Remove dependencies only after an import/dependency audit; retain `shadcn` while `shadcn/schema` validates output.
- Confirm generated registry assets remain ignored and no compiler artifacts are tracked.

### Commit 6: Simplify adjacent Skins/VJSC configuration

- Remove redundant source-inventory wiring from `vite.config.ts` where the Shadcn plugin now owns it.
- Revisit the preview-only skin inventory separately; prefer Vite-native module discovery when it can replace `discoverComponents` without creating a second graph.
- Move framework transform knowledge into the React/HTML registries or transform selector where appropriate.
- Keep bundler resolution in Vite aliases and package exports; retain only installation-path rewriting in Shadcn.
- Re-run dead-code and dependency reviews in VJSC, Skins, Core, Icons, React, and HTML after each deletion.

This commit does not cut framework packages over to new source imports.

## Verification

Run the narrow checks after each commit:

```bash
pnpm -F vjsc test
pnpm -F vjsc build
pnpm -F @videojs/skins test
pnpm -F @videojs/skins build
pnpm typecheck
pnpm check:workspace
```

Required behavioral assertions:

- VJSC transforms each canonical module once through the host graph.
- Relative canonical dependencies inherit the requested transform context.
- Shadcn captures editable React/Tailwind source, not runtime chunks.
- Component `meta` is absent from installed source but available to registry assembly.
- Registry dependencies and npm dependencies match the resolved graph.
- Shared style and utility files appear in the correct items.
- `registry.json` and every item JSON pass the official Shadcn schemas.
- Registry builds emit no synthetic JavaScript artifacts.
- Vite dev/HMR behavior remains unchanged because the Shadcn plugin is build-only.
- The worktree contains no newly generated tracked artifacts.

## Non-goals for this sequence

- E2E or visual parity tests.
- Framework package cutover to canonical/VJSC source.
- Replacing tsdown package builds with Vite.
- Generating HTML registry items.
- Formatting generated source.
- A public catalog, compiler graph, projection, or output framework.
