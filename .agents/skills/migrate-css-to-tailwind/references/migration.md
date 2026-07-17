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
| Site one-off values | Inline styles; use an inline CSS custom property with Tailwind custom-property syntax when a variant is required |
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

### 3. Handle site one-offs without arbitrary-value classes

For site code:

- Use an inline style when a non-token value is truly one-off.
- For responsive, dark-mode, or other variants, define an inline custom property and consume it with syntax such as `md:min-h-(--md-min-h)`.
- Add a theme token or semantic utility when the value repeats.

### 4. Avoid arbitrary values for common scale values

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

### 5. Prefer theme-backed utilities

Avoid:

- `text-[var(--color-text)]`
- `bg-[var(--color-surface)]`

Prefer:

- Semantic utilities that map to **`@theme`** variables (`text-fg`, `bg-surface`, `border-border`, etc.)
- An inline custom-property bridge for a one-off site value that needs a variant

(Adapt names to the project's **`@theme`** variable names; add tokens to CSS when missing.)

### 6. Prefer named variants and utilities

Use existing responsive, state, data, ARIA, and custom variants. Add **`@utility`**, **`@custom-variant`**, or an **`@theme`** token when a pattern repeats instead of copying bracket syntax.

### 7. Preserve responsive, state, and media behavior

- `@media (min-width: 768px)` → `md:` (match project breakpoints from **`@theme`** / default v4 screens)
- Named container queries (e.g. **`@container media-root`**) → match existing utilities such as **`@*/media-root:`** / **`max-*` / `@2xl`** patterns used in skins—do not silently switch to plain `md:` if the source is container-based
- `:hover` → `hover:`
- `:focus-visible` → `focus-visible:`
- `[data-state='open']` → `data-[state=open]:`

### 8. After migration — short report

Include:

- Converted utilities (what replaced which declarations)
- Inline one-offs or custom-property bridges used and why
- Values that should become theme tokens later
- Any CSS that should remain CSS (-keyframes, `@property`, unsupported selectors, etc.)
