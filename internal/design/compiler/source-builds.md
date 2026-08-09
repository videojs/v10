---
status: implemented
date: 2026-08-09
---

# Source transforms and builds

## Decision

The compiler exposes two source operations with bundler-style meanings:

- `transform()` rewrites one independent source module.
- `build()` resolves and bundles the complete graph reachable from one or more entries.

`rewrite()` creates declarative AST rewrite plugins for either operation. Module graphs and emit state remain implementation details; callers do not create or retain a compiler program.

Rolldown owns graph resolution, linking, tree shaking, and chunk construction during a build. The compiler applies its TypeScript AST pipeline to each source module loaded by that graph. A JSX build preserves JSX, while an HTML build evaluates the transformed graph with the compiler's static HTML emitter.

Target-specific structure remains ordinary compiler policy. For example, the Skin HTML configuration resolves trigger and popup attributes while the relationship is still represented as JSX. Static HTML emission only evaluates expressions and serializes the already-transformed tree; it does not repair rendered markup.

## Context

The original `compile()` API transformed one source string, while `compileProject()` only repeated that operation for several unrelated files. Skin generation separately invoked Rolldown for React and HTML, and HTML then reparsed the rendered string to attach popup relationships. The names obscured the important boundary between a module transform and a graph build, while the post-render pass placed source semantics outside the compiler.

The compiler must support both reusable framework source and static HTML from the same canonical TSX. React and registry output preserve component semantics where appropriate. HTML needs the complete entry graph evaluated at generation time, but its structural changes must still happen in the compiler AST pipeline.

## Alternatives considered

- **Expose `createCompilerProgram()` and `program.emit()`** — This leaks lifecycle and graph state without a current need for incremental or repeated emission. A direct `build()` operation is smaller and matches established bundler APIs.
- **Use TypeScript emit as the bundler** — A TypeScript `Program` provides semantic source information but does not produce the ESM bundles required here. Rolldown remains responsible for bundling.
- **Add generic JSX composition or connection configuration** — Tooltip and popover relationships are target policy, not general JSX concepts. Named transforms built from reusable AST primitives keep that policy explicit.
- **Repair final HTML** — Reparsing serialized HTML loses source identities and makes diagnostics and ownership less clear. Relationships are resolved before emission instead.

## Consequences

- Vite and registry integrations use `transform()` for per-module work.
- Framework Skin generation uses `build()` for linked entry output.
- HTML serialization is compiler-owned and contains no Skin-specific relationship logic.
- The Skins package owns its React and HTML policies, semantic element mappings, and generated file layout.
- A public program API should only be introduced if watch mode, incremental compilation, or repeated graph emission creates a concrete lifecycle requirement.

The implementation surfaces are [`packages/compiler/src/transform.ts`](../../../packages/compiler/src/transform.ts), [`packages/compiler/src/build.ts`](../../../packages/compiler/src/build.ts), and [`packages/skins/build/compiler/html.ts`](../../../packages/skins/build/compiler/html.ts).
