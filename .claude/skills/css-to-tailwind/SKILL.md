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
