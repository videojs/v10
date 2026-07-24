# CSS to Tailwind Migration

Use this guidance when migrating vanilla CSS, CSS modules, SCSS, or styled-components to Tailwind class names.

Video.js 10 targets **Tailwind CSS v4** (CSS-first config: **`@import "tailwindcss"`**, **`@theme`**, **`@utility`**, **`@custom-variant`**). Skin packages extend shared theme and keyframes via **`packages/skins/src/shared/tailwind.css`**.

## Goal

Convert CSS declarations to readable Tailwind utilities while preserving behavior. Prefer **theme tokens exposed through `@theme`** (and the utilities they generate) plus semantic wrappers over arbitrary values.

In this repo, skin work often means keeping **`packages/skins/*/css/`** and the matching **`packages/skins/*/tailwind/`** definitions in parity when both exist.

## Tailwind v4 specifics

| Concern | Prefer |
| ------- | ------ |
| New design tokens | Add to **`@theme { }`** (skin shared sheet or app entry CSS) so utilities like `rounded-*`, `gap-*`, and custom namespaces stay consistent |
| One-off escapes | Arbitrary utilities that reuse **`theme()`**, e.g. **`bg-[theme(--surface)]`**, whenever the backing variable already exists in **`@theme`** |
| Repeated arbitrary variants / long class strings | **`@utility`** blocks in CSS |
| Repeated selector shapes | **`@custom-variant`** (see **`site`** / **`apps/sandbox`** for examples) |
| Keyframes tied to animations | Registered in CSS (`@keyframes`) and wired through **`@theme`** (see comments in skins `input-feedback` tailwind components) |

Legacy **`tailwind.config.js`** theme spreads are not the primary path here—extend the **CSS** theme surface when adding tokens.

## Rules

### 1. Prefer built-in Tailwind utilities

- `display: flex` → `flex`
- `align-items: center` → `items-center`
- `gap: 1rem` → `gap-4`

### 2. Prefer `@theme` / built-in scale before arbitrary values

- `color: var(--color-text-muted)` → use an existing utility or add a token under **`@theme`** and use the generated class
- `border-radius: 8px` → prefer `rounded-lg` (or a theme radius key) if equivalent/acceptable
- `font-size`, `spacing`, `colors`, `shadow`, `z-index`, `radius` should map to **`@theme` or default v4 scales** when acceptable

### 3. Use Tailwind's `--spacing` scale

Tailwind v4 spacing utilities are based on the `--spacing` variable. Translate spacing calculations directly to native utilities:

- `padding: calc(var(--spacing) * 2)` → `p-2`
- `margin-inline: calc(var(--spacing) * 3)` → `mx-3`
- `gap: var(--spacing)` → `gap-1`

Use built-in responsive or named container variants (`md:`, `@md:`, `@md/media-root:`) for media-query behavior. If a scoped design needs to scale all spacing, overriding `--spacing` at that scope is valid because native utilities inherit it. Ignore `--base-size` and `--size`; resolve font and icon sizes to rem values.

For arbitrary values, Tailwind v4 also provides the build-time `--spacing(N)` function. Use it for literal spacing multipliers that do not map cleanly to a native utility:

- `border-radius: calc(var(--spacing) * 7)` → `rounded-[--spacing(7)]`
- `[--max-width:calc(var(--spacing)*44)]` → `[--max-width:--spacing(44)]`
- `[bottom:calc(100% + var(--spacing) * 4.8)]` → `[bottom:calc(100%+--spacing(4.8))]`

`rounded-(--spacing(7))` is not the equivalent syntax: the parenthesized form is for a custom-property utility and would look for `var(--spacing(7))`. Keep `calc(var(--spacing) * var(...))` when the multiplier is runtime-derived because `--spacing()` only replaces literal values.

### 4. When arbitrary values are allowed

Only when:

- The value is truly one-off,
- No existing token matches closely,
- The value is required for pixel-perfect migration, **or**
- The CSS property has no Tailwind utility

### 5. Avoid arbitrary values for common scale values

Bad:

- `mt-[16px]`
- `gap-[1rem]`
- `rounded-[8px]`
- `text-[14px]`

Good:

- `mt-4`
- `gap-4`
- `rounded-lg`
- `text-sm`

### 6. Prefer theme-backed utilities (not raw `var()` in class strings)

Avoid lots of:

- `text-[var(--color-text)]`
- `bg-[var(--color-surface)]`

Prefer:

- Semantic utilities that map to **`@theme`** variables (`text-fg`, `bg-surface`, `border-border`, etc.)
- Or **`bg-[theme(--surface)]`**-style arbitrary values only until a dedicated utility exists (replace with **`@utility`** once repeated)

(Adapt names to the project's **`@theme`** variable names; add tokens to CSS when missing.)

### 7. Use arbitrary variants/properties sparingly

Allowed examples:

- `[container-type:inline-size]`
- Arbitrary positions that must reference a **`@theme`** custom property: **`bg-[theme(--color-fg)]`**-style values (use the actual **`--*`** names from your **`@theme`** block—see Tailwind v4 **`theme()`** documentation)

If repeated, recommend **`@utility`** or extending **`@theme`** instead of copying the same arbitrary class everywhere.

### 8. Preserve responsive, state, and media behavior

- `@media (min-width: 768px)` → `md:` (match project breakpoints from **`@theme`** / default v4 screens)
- Named container queries (e.g. **`@container media-root`**) → match existing utilities such as **`@*/media-root:`** / **`max-*` / `@2xl`** patterns used in skins—do not silently switch to plain `md:` if the source is container-based
- `:hover` → `hover:`
- `:focus-visible` → `focus-visible:`
- `[data-state='open']` → `data-[state=open]:`

### 9. Avoid legacy semantic class hooks

Do not add `media-*` semantic or BEM marker classes to Tailwind templates, including forms such as `media-button--*`, `media-popover--*`, `media-menu__*`, or `media-sr-only`. Use the corresponding Tailwind utility, component class, data attribute, or custom-element selector. Before reporting completion, scan Tailwind source files for `media-...--` and `media-...__` marker classes.

### 10. After migration — short report

Include:

- Converted utilities (what replaced which declarations)
- Arbitrary values used and why each is justified
- Values that should become theme tokens later
- Any CSS that should remain CSS (-keyframes, `@property`, unsupported selectors, etc.)
