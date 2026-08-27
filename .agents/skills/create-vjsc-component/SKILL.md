---
name: create-vjsc-component
description: Create VJSC modules. Use for UI and styles.
---

# Create a VJSC component

Author every module so VJSC can understand and transform it in isolation. Prefer explicit component anatomy and state over knowledge of surrounding markup.

## Component ownership

Keep schemas limited to parts owned by the component's real public compound API. Never copy an independent primitive into another component: `VolumePopover.Tooltip` and `Menu.Tooltip` are forbidden. Compose `Tooltip` instead.

## Shared triggers

Nest the component trigger inside the tooltip composition:

```tsx
<ButtonTooltip side="top">
  <$.Menu.Trigger>Settings</$.Menu.Trigger>
</ButtonTooltip>
```

Use the same pattern for `VolumePopover.Trigger`.

- React targets lower each primitive through its `render` composition so both behaviors reach one button.
- HTML root rewrites select `parts.Trigger.one()` and call `trigger.replaceWith(...)`. This preserves the tooltip wrapper while adding `commandfor` to the concrete button or `Host`.
- If two replaced parts share one wrapper, fix the canonical composition instead of duplicating the wrapper.

## Styling

Use the component's styling hooks and exported data attributes before introducing a structural relationship. Put a style on the canonical part that owns the visual, and put state on that same part when practical. If the required hook or state is missing, consider adding a real part, data attribute, ARIA state, or CSS custom property before reaching through the DOM.

Safe defaults include self `data-*` and `aria-*` variants, interaction pseudo-classes, pseudo-elements, media or container queries, and locally owned named groups.

The following break isolated transforms and are forbidden:

- `peer`, `peer-*`, and named peer relationships.
- Implicit ancestor variants such as `in-*`.
- Group consumers without an owner referenced by the same component module.
- Utilities whose compiled CSS escapes the semantic rule's scope.

Do not silence those isolation errors. A named group is acceptable only when the JSX module statically references both its owner and consumers, such as `sliderStyles.root` with `sliderStyles.thumb`.

Avoid structural selectors such as `:has()`, `has-*`, `group-has-*`, descendants, child or sibling combinators, `*`, and `**`. Treat `VJSC_STYLE_COMPLEX_SELECTOR` as design feedback: prefer a component part, colocated state attribute, or locally owned named group. Existing exceptions are gaps, not patterns to copy.

## Style modules

- Default-export `styles({...})` from a relative `*.styles.ts` module and reference static members directly inside JSX `className`. Do not hide references behind barrels, variables, spreads, or dynamic property access; per-module collection must see `styles.thumb` itself.
- Name rules after the part or shortest semantic role: `root`, `trigger`, `popup`, `content`, `track`, `fill`, `thumb`, or `playIcon`. Do not repeat the component name in the key. Keep the emitted class readable, such as `media-slider-thumb`.
- Put shared primitive rules in a generic module and component-specific deltas in a specific module. Follow the current `button.styles.ts` plus `play-button.styles.ts`, and `slider.styles.ts` plus `time-slider.styles.ts`, pattern.
- Compose classes from general to specific to caller override: `[sliderStyles.thumb, styles.thumb, className]`.
- Organize style modules and output assets by role (`buttons`, `sliders`, `popups`, `feedback`, `layout`). Keep skin-only layout in the skin rather than a generic primitive module.
- Put common utilities in `utilities` and selected skin or target differences in `variants` instead of duplicating a rule.

## Example

Input: “Add a tooltip to the volume-popover button.”

Output: Wrap `$.VolumePopover.Trigger` in `ButtonTooltip`; keep the schema at `Root`, `Trigger`, and `Popup`; preserve the wrapper in HTML with `replaceWith(...)`; style each primitive through its own part and state hooks.

## Validation

Build Core after schema changes. Run affected isolated transforms for HTML and React with CSS and Tailwind, inspect all style diagnostics, refresh generated snapshots, run `pnpm -F @videojs/skins test`, and verify no foreign parts or forbidden relationships remain.
