# VJSC skin gaps

This file tracks known parity and anatomy work carried forward from the retired legacy skins. Remove an entry once it is implemented and verified for every affected skin, target, and styling output.

## RTL control layout

- Source: `caf179b83` / #2281
- Gap: VJSC handles menu direction, submenu motion, and chevrons, but its control regions and time groups do not yet preserve the legacy skins' physical control order under `dir="rtl"`.
- Affected: Default and Minimal skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Add `:dir(rtl)` layout rules to the current wrapper-free control regions and time groups, then add RTL cases to the VJSC skin matrix before removing this entry.

## Minimal volume tooltip and spacing

- Source: `2e9c1e221` / #2386
- Gap: VJSC keeps the Minimal volume thumb visible, but it does not show a sticky mute tooltip while the volume popover is open and compact layouts retain the wider trigger-to-slider gap.
- Affected: Minimal Video skin; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Compose a sticky button tooltip around the Minimal volume-popover trigger, use zero side offset with internal horizontal padding, and add VJSC matrix coverage for the tooltip and popover remaining visible together.

## Deferred anatomy considerations

These selectors currently preserve observable parity. Keep them as known ownership concerns rather than introducing new anatomy solely to remove a diagnostic warning.

### Poster image ownership

- Source: `6c8472118` / #2453 and `packages/skins/src/styles/layout/poster.styles.ts`
- Gap: No observable parity gap is known, but the VJSC Poster root sizes authored `img` and Shadow DOM `::slotted(img)` descendants through structural selectors. An explicit image part would need to preserve target-specific and optional Shadow DOM rendering.
- Affected: Default and Minimal skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Hold the current selectors until Poster target markup and Shadow DOM requirements are settled. If ownership becomes a practical problem, evaluate `Poster.Image` across both targets rather than adding a styling-only wrapper.

### Thumbnail loading ownership

- Source: `e20e54255` / #2259 and `packages/skins/src/styles/sliders/thumbnail.styles.ts`
- Gap: No observable parity gap is known. React now reports `data-loading` on `Slider.Thumbnail.Root`, but the HTML root is still a plain wrapper around `<media-slider-thumbnail>`, so the styles keep `has-*` and `group-has-*` selectors beside the root-state variants until both targets share one anatomy.
- Affected: Default and Minimal skins; HTML target; CSS and Tailwind outputs.
- Recommendation: Once `<media-slider-thumbnail>` adopts a supplied `<img>` child, map the HTML root to that element, drop the descendant selectors, and verify generated output for both targets.
