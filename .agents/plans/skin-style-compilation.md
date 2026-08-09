# Skin style compilation simplification

## Goal

Replace the inferred, stateful compiler style pipeline with an explicit style model owned by `packages/skins`, while preserving the generated behavior for React vanilla CSS, HTML vanilla CSS, and the React Tailwind registry.

The canonical authoring API is a default export whose value is directly usable in TSX:

```ts
export default defineStyles({
  role: 'buttons',
  styles: {
    button: '...',
    playButtonIcon: {
      pause: '...',
    },
  },
});
```

```tsx
import styles from '../styles/components/button.tailwind';

<Button className={[styles.button, styles.playButton]} />;
```

`defineStyles()` preserves the exact inferred token tree and attaches non-enumerable definition metadata for generation. Canonical components do not need a separate token-access API.

## Ownership and boundaries

- `packages/skins/canonical` owns style definitions and semantic token paths.
- `packages/skins/build/styles` loads those definitions, creates a normalized manifest, transforms known style references, and compiles vanilla CSS.
- `packages/skins/build/framework` owns framework output layout and writes the fixed role-based stylesheet tree.
- `packages/skins/build/registry` projects the same canonical skin and manifest into the React Tailwind registry.
- `packages/compiler` remains responsible for reusable TypeScript/JSX compilation and structural AST transforms. It does not own Tailwind, semantic class naming, CSS roles, output files, or a style-program lifecycle.

HTML post-composition markup policy and a future program-level structured HTML emitter are separate concerns. This refactor must not move AST work outside the compiler or entangle style generation with the current HTML rendering bridge.

## Model

Each style module declares:

- one explicit role: `buttons`, `controls`, `popups`, or `sliders`;
- a nested semantic token tree;
- Tailwind utility strings at its leaves.

The manifest derives a stable record for every leaf:

```ts
interface SkinStyleRecipe {
  modulePath: string;
  tokenPath: readonly string[];
  className: string;
  role: SkinStyleRole;
  utilities: readonly string[];
}
```

Class names derive only from token paths: `button` becomes `media-button`, and `playButtonIcon.pause` becomes `media-play-button-icon-pause`. CSS roles are never inferred from names. Named group and peer bindings are derived from utilities and validated against explicit semantic recipes.

## Pipeline

1. Load the controlled canonical `*.tailwind.ts` modules directly and validate their default `defineStyles()` exports.
2. Normalize them into one immutable manifest, diagnosing token/class collisions.
3. Run a skin-specific compiler plugin over canonical TSX:
   - vanilla target: style references become semantic `media-*` classes;
   - Tailwind target: the same references become their utility strings;
   - unrelated literal classes remain literal;
   - arrays, dotted access, simple conditionals, and local static aliases remain supported.
4. Record referenced recipes and co-applied semantic classes as generation facts, not as a mutable CSS-emission lifecycle.
5. Compile the union of referenced Tailwind candidates once.
6. Use Lightning CSS structurally to map candidate selectors to semantic selectors, rewrite named group/peer selectors, inline or remove private `--tw-*` implementation variables, and validate co-applied declaration conflicts.
7. Return `Map<SkinStyleRole, string>`.
8. Framework generation writes:

   ```text
   styles/
     styles.css
     preflight.css
     base.css
     theme.css
     buttons.css
     controls.css
     popups.css
     sliders.css
   ```

9. Registry generation uses the Tailwind projection and does not compile or inline CSS.

## Migration sequence

1. Add `defineStyles()` and manifest tests.
2. Migrate canonical style modules to default exports without changing generated output.
3. Add the skin-owned JSX style transform and switch registry Tailwind expansion to it.
4. Switch framework semantic-class rewriting to the same manifest.
5. Move Tailwind design-system loading and Lightning CSS selector rewriting into a narrow skin-local compiler.
6. Switch framework stylesheet generation to the skin-local `Map<Role, string>` result.
7. Compare and regenerate all framework and registry goldens.
8. Remove `StyleProgram`, style registries, generic output modes, token-module evaluation, inferred naming/role logic, and compiler-only Tailwind exports and dependencies.
9. Retain only genuinely reusable structural compiler AST helpers.

## Required invariants

- React and HTML consume the same manifest and therefore share one semantic class contract.
- Semantic names never derive from JSX component names or literal utility strings.
- Empty utility leaves may still produce semantic classes in vanilla output.
- Named group/peer relationships resolve through explicit manifest bindings.
- Co-applied classes cannot silently reverse authored precedence when declarations conflict.
- Framework vanilla CSS contains no private `--tw-*` variables.
- Scoped preflight remains present.
- Registry output remains Tailwind source and does not inline CSS.
- Generated framework modules remain a single skin module plus role-organized vanilla styles.

## Acceptance

- Existing React `skin.tsx`, HTML `skin.ts`, registry source, semantic classes, markup, props, and attributes remain equivalent except for intentional fixes already on the branch.
- `pnpm check:skins` passes.
- Skin framework, registry, and compiler tests pass.
- Relevant package builds and workspace checks pass.
- `packages/skins` no longer depends on a generic stateful `StyleProgram` or inferred style naming/chunking.
