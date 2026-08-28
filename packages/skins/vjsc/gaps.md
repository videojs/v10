# Legacy skin gaps

This file tracks observable behavior in `packages/skins/src` that is not yet implemented in VJSC. Remove an entry once it is implemented and verified for every affected skin, target, and styling output.

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

### Error dialog control suppression ownership

- Source: #2451 and `packages/skins/vjsc/styles/layout/container.styles.ts`
- Gap: No observable parity gap is known, but the VJSC Container suppresses controls while an error dialog is open by locating both parts with a structural `:has()` selector.
- Affected: Default and Minimal video skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Keep the selector until shared player state can expose error-dialog presence directly on Container or Controls. Then move the visibility rule to the state-owning part and remove the structural relationship.

### Poster image ownership

- Source: `packages/skins/src/*/css/components/poster.css` and `packages/skins/vjsc/styles/layout/poster.styles.ts`
- Gap: No observable parity gap is known, but the VJSC Poster root sizes authored `img` and Shadow DOM `::slotted(img)` descendants through structural selectors. An explicit image part would need to preserve target-specific and optional Shadow DOM rendering.
- Affected: Default and Minimal skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Hold the current selectors until Poster target markup and Shadow DOM requirements are settled. If ownership becomes a practical problem, evaluate `Poster.Image` across both targets rather than adding a styling-only wrapper.

### Thumbnail loading ownership

- Source: `packages/skins/src/*/css/components/thumbnail.css` and `packages/skins/vjsc/styles/sliders/thumbnail.styles.ts`
- Gap: No observable parity gap is known, but VJSC infers thumbnail loading from descendant image state with `has-*` and `group-has-*` selectors. Isolated transforms can emit these local selectors, though the styles remain coupled to rendered child markup.
- Affected: Default and Minimal skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Hold new anatomy until loading behavior or target markup needs to change. Then consider propagating loading state to the Thumbnail root or adding explicit image and spinner parts, with generated-output and matrix verification.
