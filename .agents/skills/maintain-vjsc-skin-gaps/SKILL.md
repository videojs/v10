---
name: maintain-vjsc-skin-gaps
description: Maintain VJSC parity gaps. Use when changing legacy skins under packages/skins/src.
---

# Track VJSC skin parity

Keep `packages/skins/vjsc/gaps.md` synchronized with observable changes to the legacy skins.

## Triggers

- Changing behavior, markup, selectors, data attributes, tokens, responsive rules, motion, or styles under `packages/skins/src`.
- Fixing a legacy skin issue whose equivalent VJSC output may need the same fix.

Do not use this workflow for VJSC-only work, documentation-only edits, or generated-output changes that do not alter legacy skin behavior.

## Workflow

1. Describe the observable legacy behavior being added or changed and identify the affected Default or Minimal skin.
2. Inspect the equivalent VJSC component, style rule, and generated HTML and React output. Similar names or classes are not evidence of parity.
3. If the same change implements VJSC parity, verify all affected targets and CSS or Tailwind outputs, then remove any obsolete gap.
4. Otherwise, add or update one entry in `packages/skins/vjsc/gaps.md` with `Source`, `Gap`, `Affected`, and `Recommendation` fields. Use the PR or commit when known; otherwise cite the changed legacy paths.
5. Avoid duplicates. Describe user-visible behavior rather than copying a raw diff, and remove the entry only after implementation and verification.

## Example

Input: A legacy skin change adds RTL control ordering without the equivalent VJSC rules.

Output: Add or update this entry in `packages/skins/vjsc/gaps.md`:

```md
## RTL control layout

- Source: `caf179b83` / #2281
- Gap: VJSC menus are directional, but control regions do not preserve legacy control order under `dir="rtl"`.
- Affected: Default and Minimal; HTML and React; CSS and Tailwind.
- Recommendation: Add directional layout rules and VJSC matrix coverage.
```

## Validation

- Run the narrowest affected skin tests and refresh generated VJSC snapshots when output changes.
- Run `pnpm -F @videojs/skins test` for cross-target skin changes.
- Run `git diff --check`.
