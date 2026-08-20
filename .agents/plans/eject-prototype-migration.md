# Eject prototype migration

Prototype reference: PR #1696 at `compiler-prototype` (`b44e532c796d69832190c1ca9aa8886e04be960c`).

This table is the temporary path-level ledger for moving the prototype into focused stacked PRs. Paths are restored or recreated intentionally; the prototype commit stack is not cherry-picked.

| Prototype path or area | Destination | Issue | First-pass disposition |
| --- | --- | --- | --- |
| `packages/compiler/src/{compile,config,diagnostics,load-config,parse,project,transform}.ts` | PR 1: `eject/01-compiler-foundation` | #1957 | Reuse and adapt as the generic compiler API. |
| `packages/compiler/src/transforms/**` | PR 1: `eject/01-compiler-foundation` | #1957 | Reuse import rewriting and generic cleanup transforms with focused tests. |
| `packages/compiler/src/jsx/**` | PR 1: `eject/01-compiler-foundation` | #1957 | Reuse generic TypeScript-JSX matchers/transforms; keep free of Video.js component semantics. |
| `packages/compiler/src/bundlers/**` | PR 1: `eject/01-compiler-foundation` | #1957 | Reuse the generic Vite adapter and tests. |
| `packages/compiler/{package.json,tsconfig.json,tsdown.config.ts,vitest.config.ts}` plus root workspace references | PR 1: `eject/01-compiler-foundation` | #1957 | Recreate minimal private-package wiring; remove the prototype `vjs` bin and defer style/Tailwind entry points. |
| `packages/compiler/src/cli.ts` and `src/tests/cli.test.ts` | Deferred to public CLI integration | #1974, #1975 | Do not migrate into the compiler foundation; `@videojs/cli` owns `vjs`. |
| `packages/compiler/src/styles/**` | PR 5 target/style output | #1963, #1964 | Defer semantic style analysis until component style ownership is established. |
| `packages/compiler/src/tailwind/**` | PR 5 target/style output | #1962 | Defer Tailwind generation from the generic foundation boundary. |
| `packages/core/src/jsx-runtime.ts`, `jsx-dev-runtime.ts`, `components.config.js`, `scripts/generate-components.ts`, and `src/core/ui/**/*-component.ts` | PR 2: `eject/02-canonical-source` | #1953 | Reuse constrained JSX, manifest generation, compound-part typing, `Slot`, and `Text` after reconciling against current Core. |
| `internal/decisions/constrained-jsx-boundaries.md` | PR 2: `eject/02-canonical-source` | #1953 | Restore only if source and tests still support every recorded decision. |
| `packages/skins/src/default/video.skin.tsx` and `packages/skins/src/index.ts` | PR 3/5 canonical ownership and core Skin source | #1955, #1967, #1968, #1969 | Split the monolith into installable domain components and Skin composition; do not restore as one final artifact. Stage authored source under isolated `packages/skins/canonical/` while current packaged assets remain the runtime baseline. |
| `packages/skins/package.json`, `tsconfig.json`, `tsdown.config.ts` | PR 3: `eject/03-canonical-skins` | #1953, #1955 | Add only canonical authoring dependencies and validation; keep the existing `src` build and exports unchanged. |
| `packages/skins/src/**/{css,tailwind}/**` and prototype `packages/skins/__old__/**` | PR 5/6 style source and output | #1964, #1965, #1962, #1963 | Use as migration evidence; do not restore parked or generated layouts wholesale. |
| Future `packages/skins/artifacts.ts` plus dependency analysis/output model | PR 4: `eject/04-artifact-graph` | #1958, #1959 | Implement after the canonical workspace boundary is reviewed; keep it out of the canonical-source PR. |
| `packages/react/skins.compiler.config.ts` | PR 5 React output | #1960 | Reuse target-specific transforms after canonical component boundaries settle. |
| `packages/react/src/presets/video/__generated__/**` | Later generated package/parity PR | #1972, #1973 | Regenerate from the production graph; never copy prototype output as authored source. |
| Prototype HTML Skin/template edits | PR 5 HTML output | #1961 | Use as parity evidence; create idiomatic light-DOM output with exact registrations rather than restoring flattened generated files. |
| `packages/icons/components.config.js`, `scripts/build.ts`, generated icon families, and manifest/export changes | Focused icon contract before icon-bearing source | #1956 | Reconcile with current icon sources without importing private cross-package build scripts; publish stable exports before source-owned output depends on them. |
| Registry adapter/catalog (not implemented as a clean prototype boundary) | PR 6 registry and parity | #1966, #1970, #1971 | Implement outside compiler core from the artifact graph. |
| Existing `apps/e2e/tests/visual/*-skin.spec.ts` and current ejected-Skin fixtures | Later parity PR | #1972, #1973 | Extend the existing harness; do not create a second parity system. |

## Stack guardrails

- PR 1 contains no Video.js component names, canonical Skin source, shadcn registry types, public `vjs` binary, Tailwind/CSS generation, or large generated output changes.
- PR 2 contains constrained JSX/manifests only, with no Skin workspace ownership, artifact graph, registry files, or target output.
- PR 3 adds isolated canonical Skin ownership without moving or replacing the current packaged `packages/skins/src` assets.
- Do not begin `eject/04-artifact-graph` until the canonical workspace boundary is reviewed.
