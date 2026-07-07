---
name: css-to-tailwind
description: >-
  Migrate vanilla CSS, CSS modules, SCSS, or styled-component styles to Tailwind
  v4 utilities. Prefer @theme-backed tokens and semantic utilities; document
  arbitrary values and parity gaps. For audits, load review/workflow.md.
  Triggers: "CSS to Tailwind", "migrate to Tailwind", "tailwind migration",
  "styled-components to Tailwind", "SCSS to Tailwind", "review Tailwind classes",
  "tailwind parity".
---

# CSS to Tailwind

Guidance for converting legacy CSS to Tailwind **v4** class strings while preserving behavior and readability.

## Tailwind v4 in this workspace

Theme and shared animation tokens are declared in CSS (**`@theme`**, keyed custom properties consumed by utilities). Apps use **`@import "tailwindcss"`**; **`packages/skins`** layers shared **`@keyframes` / `@property` / `@theme`** in **`shared/tailwind.css`**. When a pattern repeats across components, prefer **`@utility`** or **`@custom-variant`** in CSS (see **`site`** / **`apps/sandbox`** styles) rather than proliferating arbitrary values in TS presets.

## Video.js migration constraints

- Never add legacy `media-*` semantic or BEM marker classes to Tailwind markup or class strings, such as `media-button--mute` or `media-popover--volume`. Use Tailwind utilities, exported Tailwind component classes, named groups/container variants, data attributes, or custom-element selectors instead. Named Tailwind variants such as `@container/media-root` and `group/controls` are valid.
- Treat Tailwind v4's `--spacing` as the base spacing variable. Convert `calc(var(--spacing) * N)` to the native utility (`p-N`, `gap-N`, etc.) where one exists. For arbitrary values and custom properties with a literal multiplier, use Tailwind v4's build-time `--spacing(N)` function, such as `rounded-[--spacing(7)]`, rather than carrying the `calc(var(--spacing) * N)` expression into the class string. Keep a `calc(var(--spacing) * var(...))` expression when the multiplier is runtime-derived. Do not carry over `--base-size` or `--size`; resolve font and icon sizes to rem values.

See [references/migration.md](references/migration.md) for v4-focused rules.

## When to use

- Migrating stylesheet-based styles to Tailwind utilities
- Ensuring **`packages/skins`** CSS and **`tailwind`** component modules stay visually and behaviorally aligned (parallel `css/` and `tailwind/` trees)
- Auditing Tailwind output for unnecessary arbitrary values or missing theme mappings

## Reference

| File                                                     | Contents                                |
| -------------------------------------------------------- | --------------------------------------- |
| [references/migration.md](references/migration.md)       | Rules, priorities, migration report shape |

## Review

For checking a migration against these rules, load `review/workflow.md`.

| File                                                       | Contents                        |
| ---------------------------------------------------------- | ------------------------------- |
| [review/workflow.md](review/workflow.md)               | Review process                    |
| [review/checklist.md](review/checklist.md)              | Quick single-pass checklist       |

## Related skills

| Need                      | Use              |
| ------------------------- | ---------------- |
| Headless UI + skin hooks | `component` skill |
