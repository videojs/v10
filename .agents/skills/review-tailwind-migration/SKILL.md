---
name: review-tailwind-migration
description: Review Tailwind v4 migrations without editing code. Use for CSS parity, cascade, responsive states, tokens, variants, or arbitrary values.
---

# CSS-to-Tailwind review

Read the original CSS, affected markup, `site/src/styles/globals.css`, and nearby token or utility usage together.

1. Compare layout, cascade, specificity, breakpoints, pseudos, data or ARIA selectors, transitions, motion, and runtime-driven states.
2. Use `references/checklist.md` for a broad pass; skip sections outside the change.
3. Inspect the rendered result across affected states and breakpoints.
4. Separate behavior or parity regressions from maintainability suggestions.

For each finding, cite the source rule and target class, explain the user-visible impact, and suggest the smallest correction. For site code, require inline styles for non-token one-offs and custom-property bridges when a variant is needed.

## Example

Input: “Review the header’s CSS-module-to-Tailwind migration.”

Output: Parity findings tied to source rules and target classes, separated from optional maintainability suggestions.
