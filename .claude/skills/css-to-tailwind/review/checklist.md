# CSS → Tailwind review checklist

Single-pass checklist against [references/migration.md](../references/migration.md).

## Utilities and readability

- [ ] Common layout/properties use core utilities (`flex`, `grid`, spacing, typography) not inlined longhand equivalents
- [ ] Class lists are grouped logically (layout → spacing → typography → visuals → states) consistent with nearby code

## Theme tokens (Tailwind v4)

- [ ] Colors, spacing, radii, fonts, shadows, and z-index prefer **`@theme`** / default v4 scales or semantic utilities over raw arbitrary values where a close match exists
- [ ] Repeated `*- [var(...)]` patterns are flagged for **`@theme`** entries and generated utilities (`theme(...)`) instead of one-off brackets

## Arbitrary values

- [ ] No arbitrary spacing/radius/type for values that fit the v4 scale or an existing **`@theme`** key (`mt-[16px]` → scale / theme token)
- [ ] Remaining arbitrary values are justified (one-off, pixel-perfect requirement, no utility/property gap) and noted in report; repeated patterns flagged for **`@utility`**

## Variants and selectors

- [ ] Breakpoints and **named container** variants match project conventions (viewport `md:` vs **`@container media-root`** variants such as **`@xl/media-root:`** — do not conflate them)
- [ ] Pseudos preserved (`hover:`, `focus-visible:`, `active:`, etc.)
- [ ] Data/state/`aria` attribute selectors preserved as Tailwind variants or justified as remaining CSS

## Parity

- [ ] Responsive and motion behavior unchanged vs source (including `motion-safe:` / reduced-motion where relevant)
- [ ] For skins: counterpart **CSS file** behavior considered when only Tailwind presets were touched (or vice versa)

## Deliverables

- [ ] Migration report present for non-trivial changes: converted mapping, arbitrary list, suggested tokens, leftover CSS rationale
