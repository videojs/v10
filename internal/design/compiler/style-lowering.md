---
status: decided
date: 2026-08-07
---

# Compiler Style Lowering

The compiler lowers Tailwind-authored component styles into preserved utilities or framework-owned semantic CSS. This document defines the intended pipeline and the refactor of [PR 2021](https://github.com/videojs/v10/pull/2021).

## Problem

Canonical skins use Tailwind utilities and shared style tokens. Source presets need Tailwind source for applications that compile Tailwind and vanilla CSS with stable semantic classes for applications that do not.

Vanilla lowering must preserve base declarations, variant order, named group and peer relationships, at-rules, cross-rule custom properties, registered properties, and keyframes. Its output should remain conventional component CSS: every static utility resolved for a target such as `.vjs-button-play` contributes to that target's rules.

The initial PR achieves the desired output shape by compiling and analyzing utilities individually, reconstructing declarations and variant paths, evaluating custom properties, sorting, and serializing a new stylesheet. This duplicates Tailwind behavior that depends on the complete candidate set. It has already exposed risks around rule order, cross-rule variable setters, keyframes, and silent analysis failures.

## Contract

The pipeline is target-first. Extraction rewrites a static style expression to one resolved semantic class and materializes the expression's complete utility recipe around that class:

```tsx
<PlayButtonPrimitive className={button.play} />
// becomes
<PlayButtonPrimitive className="vjs-button-play" />
```

```css
.vjs-button-play {
  display: grid;
  width: var(--media-control-size);
  height: var(--media-control-size);
}
@media (hover: hover) {
  .vjs-button-play:hover {
    background: var(--media-control-hover-background);
  }
}
```

If `.vjs-menu-item` also uses `grid`, its rule independently contains `display: grid`. Readable output does not combine unrelated semantic selectors merely because declarations overlap. A separate minified distribution artifact may perform safe size optimization.

The plugin retains three modes:

| Mode | Result |
| --- | --- |
| `preserve` | Leave authored class expressions unchanged and emit no CSS. |
| `inline` | Resolve tokens to literal Tailwind utilities and emit no CSS. |
| `extract` | Replace static utilities with semantic classes, retain pass-through expressions, and emit vanilla CSS. |

## Boundaries

- JSX and token analysis determine static candidates and opaque pass-through expressions.
- Target configuration determines semantic class names and optional output chunks.
- Tailwind determines candidate meaning, ordering, theme resolution, and supporting rules.
- Lightning CSS performs structural selector replacement and final CSS transforms.
- Source-output generation assigns CSS assets to artifacts and copies base/theme resources.

The compiler does not own Video.js component names, reinterpret Tailwind syntax, deduplicate unrelated component classes, or require internal `--tw-*` removal for correctness.

## Style program

Extract mode collects recipes before compiling CSS:

```ts
interface StyleRecipe {
  className: string;
  candidates: readonly string[];
  segments: readonly StyleSegment[];
  scaffoldClassReplacements: ReadonlyMap<string, string>;
  chunk?: string;
}
```

Collections may use maps and sets, but candidate encounter order is preserved. Incompatible recipes sharing an implicitly derived class produce a collision diagnostic. An explicit resolver may intentionally merge compatible recipes into one target.

Unknown static candidates remain as classes or produce an explicit diagnostic. Opaque expressions remain in generated source. Supported conditional branches keep runtime selection and resolve to distinct recipes when their utility sets differ.

## Pipeline

```text
TSX → analyze classes/tokens → resolve targets and recipes
    → compile the candidate union once with Tailwind
    → instantiate rules onto targets with Lightning CSS
    → preserve support rules and apply browser transforms
    → emit transformed source and CSS assets
```

### Analysis and recipes

Reuse the existing literal, array, dotted-token, conditional, and opaque-expression analysis. For each extractable expression, resolve its ordered candidates, semantic class, and chunk; record scaffold bindings; then rewrite only the static source portion.

`group`, `peer`, and named forms such as `group/play` are selector markers, not declaration utilities. Remove them from markup only after recording bindings scoped to the recipe or chunk. Do not use one ambiguous global marker replacement.

### Tailwind compilation

Compile the union of recipe candidates as one Tailwind build for the current output program. Use the canonical Tailwind configuration while excluding base/theme resources already handled by source output. Preserve Tailwind's rule order, custom-property interactions, `@property`, `@keyframes`, and other support output.

Tailwind compiler builders are incremental. A builder must not be shared across output programs because later builds otherwise retain candidates from earlier ones. Design-system loading may be cached, but each emitted program gets a fresh compiler build.

Single-candidate design-system queries may remain for recognition and pass-through decisions. Per-candidate CSS is not an emission source.

### Lightning CSS lowering

Parse Tailwind's complete CSS structurally. For each generated utility rule, identify its candidate anchor, clone the rule for every recipe containing that candidate, replace only the anchor with the recipe class, and replace group/peer marker classes from chunk-scoped bindings. Rules without a candidate anchor remain global support CSS.

Preserve Tailwind order and emit clones in stable recipe order. Lower each recipe independently in readable output so Lightning CSS may merge compatible rules for that target without combining unrelated semantic targets. Do not decompose declarations, classify Tailwind variants, reconstruct at-rule paths, sort declarations, or infer ownership in Lightning CSS.

Baseline extraction preserves Tailwind custom-property setters and registrations. Hoisting or inlining is a separate whole-stylesheet optimization requiring data-flow and computed-style parity tests.

## Mapping onto PR 2021

| Current area | Change |
| --- | --- |
| `styles/{analyze,class-list,token-env,token-module}.ts` | Keep as shared analysis; preserve unresolved expressions as pass-through source. |
| `styles/naming.ts` | Keep target-neutral naming and collision context. |
| `tailwind/plugin.ts` | Replace accumulated per-utility rules with semantic recipes and a candidate union. |
| `tailwind/design-system.ts` | Add whole-set compile/build; use single-candidate queries only for recognition. |
| `tailwind/utility-css.ts` | Remove the per-utility declaration and variant model after parity coverage. |
| `tailwind/selectors.ts` | Retain only selector AST helpers for anchor and marker replacement. |
| `tailwind/css/render.ts` | Replace manual composition, sorting, serialization, and variable evaluation with the whole-stylesheet rewrite. |
| `tailwind/css/assets.ts` | Keep merged/split asset packaging. |
| React/HTML configs | Keep framework transforms and `vjs-*` policy; share one lowering implementation. |
| Source fixtures | Preserve semantic class contracts; update only intentional support/serialization changes. |

## Implementation

This is one coherent replacement on PR 2021. There is no compatibility bridge or old/new renderer boundary.

- Plugin state collects semantic recipes, the ordered candidate union, and chunk-scoped scaffold replacements.
- `DesignSystem` uses single-candidate queries only for recognition and a fresh whole-set Tailwind build for emission.
- Lightning CSS selects candidate rules, rewrites selector ASTs, lowers nesting, and performs final per-recipe optimization.
- Global support rules are emitted once per compiler output. Split mode keeps support and theme definitions in the index asset.
- The per-utility parser, manual renderer, rule-resolution hook, and custom-property rewrite options are removed.
- React and HTML target configuration chooses semantic names, chunks, base CSS, and the theme selector; it does not interpret Tailwind output.

## Acceptance criteria

- Generated markup keeps the current semantic-class contract.
- Every static candidate for a target is present in that target's CSS behavior; atomic class names do not leak.
- Tailwind order, variables, keyframes, and support rules have parity coverage; group/peer relationships lower without global ambiguity.
- React and HTML have equivalent style semantics.
- Unknown or unevaluated style input is never silently discarded.
- Lightning CSS owns structural rewriting, while Tailwind owns utility semantics.
- The per-utility analyzer and manual renderer are removed.

## Alternatives and prior art

Keeping the per-utility renderer duplicates Tailwind semantics. `@apply` remains awkward for conditional, relationship, and stacked variants. Retaining utilities for all outputs does not provide standalone semantic CSS. Combining selectors by utility makes utilities the output boundary. Maintaining separate authored vanilla CSS would drift.

[Vidstack's player styles](https://github.com/vidstack/player/tree/main/packages/vidstack/styles/player) are output prior art: structural CSS is separate from component-family CSS; complete styles use semantic primitives and parts; state is expressed through pseudo-classes, ARIA/data attributes, and relationships; CSS variables form the customization surface. Video.js can follow these conventions without copying its names or layout.

Internal-variable cleanup remains a possible later whole-stylesheet optimization. It is intentionally outside baseline lowering and requires data-flow plus computed-style parity coverage before adoption.
