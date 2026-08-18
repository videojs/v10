---
name: migrate-css-to-tailwind
description: Migrate site styles to Tailwind v4. Use for CSS, modules, SCSS, styled components, theme tokens, semantic variants, or arbitrary values.
---

# CSS to Tailwind

1. Read the source CSS and affected markup together.
2. Inspect `site/src/styles/globals.css` and nearby components for existing tokens, utilities, and variants.
3. Preserve cascade, specificity, responsive states, interaction states, and runtime-driven selectors; do not translate declarations in isolation.
4. Load `references/migration.md` for the migration mapping and site-specific Tailwind conventions.
5. Prefer theme-backed tokens and semantic utilities. For site code, use inline styles for non-token one-offs and CSS custom-property bridges when variants are required; do not introduce arbitrary-value classes.
6. Compare rendered behavior across affected states and breakpoints.

Keep the change scoped to migration; report unrelated styling problems separately.

## Example

Input: “Migrate the site header module to Tailwind v4.”

Output: Equivalent utilities and tokens with preserved cascade, responsive and interaction states, plus rendered parity checks.
