---
status: implemented
date: 2026-08-07
---

# Compiler Style Extraction

The compiler can preserve Tailwind authoring or extract it into framework-owned semantic CSS. This record defines the architecture introduced in [PR 2021](https://github.com/videojs/v10/pull/2021).

## Decision

Extraction is element-first by default: every recognized utility in one static `className` expression contributes to one semantic class chosen for that element. A target may instead resolve imported token references independently when the authored tokens define reusable public roles:

```tsx
<PlayButtonPrimitive className={[button, playButton]} />
// becomes
<PlayButtonPrimitive className="media-button media-play-button" />
```

```css
.media-button {
  display: grid;
  width: var(--media-control-size);
  height: var(--media-control-size);
}

@media (hover: hover) {
  .media-button:hover {
    background: var(--media-control-hover-background);
  }
}
```

All utilities contributed by one token still belong to one semantic class. The compiler never infers sharing from overlapping utilities: sharing occurs only because multiple elements apply the same token. Unrelated semantic selectors remain independent even when their declarations overlap.

The plugin has three modes:

| Mode | Source result | CSS result |
| --- | --- | --- |
| `preserve` | Authored expressions remain unchanged. | None. |
| `inline` | Static tokens become literal Tailwind utilities. | None. |
| `extract` | Static utilities become semantic classes; opaque expressions remain. | Vanilla CSS. |

## Ownership

- JSX and token analysis determine static candidates and opaque pass-through expressions.
- Target configuration determines semantic class names, optional token-level recipes, and chunks. Video.js framework output uses the `media-*` namespace.
- `StyleProgram` owns all recipes, candidates, chunks, and relationship bindings for one CSS output program.
- Tailwind determines candidate meaning, rule precedence, theme values, keyframes, and support rules.
- Lightning CSS structurally reads and rewrites selectors, discovers custom-property references, and serializes browser-ready CSS.
- `packages/skins/src/manifest.ts` owns the output-neutral inventory of authored Skins and Skin components. It is the common input for framework packages, the source registry, and future documentation projections.
- `packages/skins/build` owns dependency analysis, HTML and React compiler configuration, Rolldown integration, and output emitters. Framework packages do not own compiler configuration or generation scripts.
- `packages/skins/src/registry` contains the React/Tailwind shadcn source registry. Publication policy is separate from the authored Skin manifest, so an internal component may be embedded in an item without becoming independently published.
- Tailwind input controls whether theme variables remain configurable or are substituted into generated declarations. Framework extraction inlines Tailwind theme/private variables while preserving `--media-*`; registry CSS keeps Tailwind theme references configurable.

The compiler does not infer component ownership from utilities. Component ownership is established when the JSX transform records a recipe for the semantic class selected by the target configuration.

## Program model

`StyleProgram` is deliberately opaque. Compiler plugins collect into it; its owner finishes it:

```ts
const program = createStyleProgram({ design, output: 'styles.css', themeSelector: '.media-skin' });
await compile(moduleA, { plugins: [tailwind({ mode: 'extract', program })] });
await compile(moduleB, { plugins: [tailwind({ mode: 'extract', program })] });
await program.emit();
```

When `tailwind()` creates its own program, the plugin calls `emit()` during compiler finish and returns normal compiler assets. When a caller supplies `program`, the plugin only collects and the caller owns `emit()`.

A program may contain chunks, each with its own recipes and `groupPeerBindings` map. `group`, `peer`, and named forms such as `group/play` are selector relationship markers. The transform records their semantic target in the containing chunk before removing the marker from emitted markup, allowing the same marker name in independent chunks without a global ambiguous map.

## Pipeline

```text
TSX modules
   ├─ class/token analysis                   packages/compiler/src/styles/*
   ├─ target resolution + source rewrite     packages/compiler/src/tailwind/plugin.ts
   ▼
StyleProgram: candidate union + chunks + recipes + relationship bindings
   │                                          packages/compiler/src/tailwind/program.ts
   ├─ one fresh Tailwind candidate build      packages/compiler/src/tailwind/design-system.ts
   ├─ one Lightning CSS analysis pass         packages/compiler/src/tailwind/css/emit.ts
   ├─ clone candidate rules per semantic recipe
   ├─ rewrite utility anchors and group/peer selectors structurally
   ├─ verify no atomic candidate escaped
   ├─ discover and emit referenced theme variables
   ▼
program.emit() → merged, split, or styles + support CSS files
```

The compiler's general JSX transform API handles target-shape adaptation alongside style extraction. For example, the HTML target removes compound wrappers compositionally:

```ts
code.jsx.element('Popover.Root').unwrap({ forwardPropsTo: 'Popover.Popup' });
code.jsx.element('Popover.Trigger').unwrap();
```

`unwrap()` preserves children and can forward wrapper props to exactly one matching direct child. Ambiguous forwarding is a compiler diagnostic. Generic prop renaming, interface-heritage replacement, and type helpers cover the remaining HTML and React target differences; framework configs should not contain raw TypeScript AST visitors for these operations.

### Source extraction

`transformJsxElement()` reads literal, array, dotted-token, conditional, and opaque expressions. With `resolve.token`, each resolved token segment records its own recipe and class; remaining literal utilities retain the element recipe. `extractStaticClassName()` delegates to smaller stages:

- `resolveExtractedElementStyle()` chooses the semantic class, chunk, and explicit merge policy.
- `partitionUtilities()` separates Tailwind candidates from unrecognized classes that must remain in source.
- `registerGroupPeerBindings()` records relationship markers on the chunk.
- `addStyleRecipe()` validates and records the complete recipe.

Conditional branches keep their runtime condition and record a recipe for each static branch. Unknown static classes and opaque expressions are never silently discarded.

### Tailwind compilation

`StyleProgram.emit()` compiles the union of the program's candidates once. Tailwind compiler builders are incremental, so `DesignSystem.compileCandidates()` creates a fresh builder for every emitted program; otherwise a later output could retain candidates from an earlier one. The loaded design-system view and recognition cache may be reused safely.

Framework Skin generation uses Rolldown to load the root `skin.tsx` and its complete component closure. HTML compilation renders that closure to a template; React compilation preserves JSX while Rolldown combines the modules. Every compiler call contributes to one caller-owned `StyleProgram`, followed by one `program.emit()`. This gives each framework Skin one support section, correct ordering, and collision checks across every participating module. Rolldown only owns module loading and bundling; the compiler owns JSX and style transforms.

### CSS emission

`emitProgramCss()` parses the complete Tailwind result once and partitions top-level rules into prefix support, candidate rules, and suffix support. A support rule appearing between candidate rules is rejected because moving it would change ordering. A generated rule with more than one candidate anchor is also rejected because ownership would be ambiguous.

For readable output, `emitRecipes()` serializes each semantic recipe independently. It selects Tailwind rules in Tailwind order, clones them, and calls `rewriteRuleClasses()` to replace the candidate anchor and the chunk's relationship markers. `assertNoCandidateClasses()` ensures atomic utility selectors cannot leak into semantic output.

Lightning CSS owns declaration normalization, shorthand folding, value serialization, nesting transforms, and compatible declaration merging inside one semantic target. Tailwind rule precedence is preserved, but exact declaration text and order may change when Lightning CSS changes. Generated fixture changes from a Lightning CSS upgrade should be reviewed as serializer output, not assumed to be authored ordering changes.

Theme-variable discovery uses Lightning CSS visitors rather than serialized-text matching. Tailwind's `theme(inline)` option substitutes theme values such as spacing and font weights before extraction. With `tailwindVariables: 'inline'`, the compiler also resolves local/default private `--tw-*` values structurally, removes their setters and registrations, and fails when a value depends on cross-rule state that cannot be preserved safely. Without that option, Tailwind setters, `@property` rules, fallback layers, and keyframes remain intact. Video.js variables are never substituted because they are the public theming API.

Framework generation also asks the loaded design system to compile Tailwind's installed preflight and wraps it in `@scope (.media-skin)`, preventing resets from escaping the skin boundary.

## Output layouts

The compiler can emit merged CSS, an index/support file plus named chunks, or semantic recipes with global support in a separate sibling stylesheet.

Canonical framework CSS resolves all private Tailwind variables. Each Skin keeps CSS under `styles/`: `styles/styles.css` only imports scoped preflight, base/theme CSS, and role chunks such as `buttons.css`, `controls.css`, `popups.css`, and `sliders.css`; the Skin module does not import the stylesheet.

`pnpm generate:skins` creates two projections:

- Framework packages receive one complete Skin module plus role-based vanilla CSS. React receives `skin.tsx`; HTML receives `skin.ts`, registrations, explicit popup relationships, and the rendered template. Child component modules and Tailwind inputs are not copied.
- `packages/skins/src/registry` receives individual React components with editable Tailwind utilities, non-inlined Tailwind resources, and a shadcn-compatible manifest. Components do not side-effect import the registry stylesheet.

The current framework destination is `packages/{react,html}/src/__generated__/skins/default-video/`, but `__generated__` is not an architectural contract. `generateSkins()` accepts explicit package roots and output directories; moving generated sources into exported preset directories changes target configuration rather than compiler or manifest code. `pnpm check:skins` performs the corresponding drift check.

## Class contracts

An implicitly or explicitly resolved semantic class may not silently acquire incompatible recipes. Reuse is handled as follows:

- Equivalent recipes for the same class are accepted.
- Different recipes in one program produce a collision diagnostic.
- A resolver may return `merge: true` to explicitly compose compatible recipes in one chunk.
- A class cannot merge recipes across chunks.

Names derived from token paths become public CSS API, so applied tokens use public roles and parts rather than structural keys such as `base`. The shared `button` token intentionally produces `media-button`; state markers such as `playButton` still produce `media-play-button`. Tests audit representative role and part selectors.

## Alternatives

Compiling each utility or source module separately loses whole-program ordering and support behavior. Reconstructing declarations and variant paths duplicates Tailwind semantics. `@apply` is awkward for conditional, relationship, and stacked variants. Combining selectors by utility makes utilities—not components—the output boundary. Maintaining separately authored vanilla CSS would drift from Tailwind source.

[Vidstack's player styles](https://github.com/vidstack/player/tree/main/packages/vidstack/styles/player) are output prior art: structural CSS is separate from component-family CSS, complete styles use semantic primitives and parts, state uses pseudo-classes and data/ARIA relationships, and CSS variables form the customization surface. Video.js follows those conventions without copying its names or layout.
