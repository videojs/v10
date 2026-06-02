# JSDoc Presence Check

Fails CI when any top-level public-API export in a published package lacks a JSDoc summary.
Wired into `pnpm check:workspace` as the "JSDoc presence" check. Enforces the
[JSDoc on Published Exports](../../../CLAUDE.md) rule so the documentation sweep can't silently regress.

## Architecture

```
package tsdown.config.ts  (entry: map | glob | array)
         ↓  resolveEntryFiles  (check.ts)
public-API entry source files
         ↓  collectPackageViolations  (check.ts, TypeScript Compiler API)
each module's exports → resolve alias → in-package? → carve-out? → has JSDoc summary?
         ↓  cli.ts
violations on stdout, exit 1
         ↓  build/scripts/check-workspace.mjs
"✗ JSDoc presence" with the failing exports
```

## How it works

For each package in the list (`cli.ts`):

1. **Resolve entries** (`resolveEntryFiles` in `check.ts`) — imports the package's `tsdown.config.ts`
   and reads its `entry` field, which is the authoritative set of public build outputs. It normalizes
   the three shapes tsdown allows (object map, glob string, array) into a flat list of source files
   via `fs.globSync`. To switch the check to parse built `.d.ts` instead, you'd rewrite this function
   (read `package.json` `exports`, glob `dist/`) and leave the engine untouched.

2. **Check exports** (`collectPackageViolations` in `check.ts`) — builds one `ts.Program` per package
   rooted at those entry files and walks each entry module's exports via the TypeScript `TypeChecker`:
   - **Resolve alias** — barrels are pure re-exports (`export { X } from './x'`), so each export is
     followed to its real declaration.
   - **In-package gate** — only symbols declared inside this package's `src/` are checked. Cross-package
     re-exports (e.g. `@videojs/core/dom` re-exported by `@videojs/react`) are skipped here and checked
     when their owning package runs.
   - **Namespace descent** — `export * as Ns from './mod'` (compound components like `AlertDialog`) is
     descended into, so its members (`AlertDialog.Root`, …) are checked where their JSDoc lives.
   - **Carve-outs** — leaf wrappers (`interface Foo extends Bar {}`, `type Foo = Bar`) and `@internal`
     exports are exempt, matching the documented rule.
   - **Presence test** — `symbol.getDocumentationComment(checker)` must produce non-empty prose.
     Tag-only JSDoc (`/** @deprecated */`) yields an empty summary and is flagged.

The check parses **source**, so it needs no build step — consistent with the other `check:workspace`
checks. On a branch without the JSDoc sweep merged it reports many gaps; that's expected.

## Usage

```bash
# Full workspace suite (this check is one of several)
pnpm check:workspace

# Just this check (prints each undocumented export, exit 1 if any)
node --import tsx site/scripts/jsdoc-presence/cli.ts
```

## Adding a package

Add one entry to `PACKAGES` in [`cli.ts`](cli.ts):

```ts
const PACKAGES: PackageRef[] = [
  { name: '@videojs/react', dir: 'packages/react' },
  // ...
  { name: '@videojs/store', dir: 'packages/store' }, // new
];
```

The package needs a `tsdown.config.ts` with an `entry` field (all published packages have one) and a
`tsconfig.json`. No other change is required.

## File structure

```
site/scripts/jsdoc-presence/
├── README.md   # This file
├── check.ts    # Entry resolution + engine (Program + export walk + alias/gate/carve-out/presence)
└── cli.ts      # Entry point: runs the package list, prints violations, sets exit code

site/scripts/tests/
├── jsdoc-presence.test.ts         # Unit tests for the engine
└── fixtures/jsdoc-presence/       # Mock monorepo exercising each rule
```

## Dependencies

- `typescript`: Compiler API for parsing and export resolution
- `tsx`: TypeScript execution

Both are in `site/package.json` devDependencies — which is why this checker lives under `site/` rather
than next to `check-workspace.mjs` (the repo root has no usable `typescript`).
