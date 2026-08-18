---
name: design-api
description: Design Video.js TypeScript APIs. Use for public shape, inference, state, extension points, middleware, composition, or ergonomics.
---

# API design and DX

Inspect the current call sites, types, tests, exports, and relevant design records before applying general guidance. Existing local contracts beat generic patterns.

## Default priorities

1. Correct observable behavior
2. Type safety and useful inference
3. A small, coherent concept set
4. Consistency with adjacent Video.js APIs
5. Composable escape hatches and tree-shakable output

Prefer config objects once positional arguments become ambiguous, explicit contracts over hidden coupling, and inference over required annotations. Avoid adding a plugin system when ordinary composition or a narrow extension point solves the problem.

## Load references conditionally

- General API tradeoffs: `references/principles.md`
- Type inference or public type shape: `references/typescript.md`
- Store, signal, or state architecture: `references/state.md`
- Middleware, builders, adapters, or lifecycles: `references/extensibility.md`
- Suspected design smell: `references/anti-patterns.md`
- Prior-art comparison: `references/libraries.md` and, only if useful, `references/voices.md`
Do not load every reference by default.

## Example

Input: “Design a typed selector API for the store.”

Output: A concrete public shape with inference behavior, compatibility tradeoffs, extension points, and tests to prove the contract.
