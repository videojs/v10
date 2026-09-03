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

### Thumbnail loading ownership

- Source: `e20e54255` / #2259 and `packages/skins/src/styles/sliders/thumbnail.styles.ts`
- Gap: No observable parity gap is known, but VJSC infers thumbnail loading from descendant image state with `has-*` and `group-has-*` selectors. Isolated transforms can emit these local selectors, though the styles remain coupled to rendered child markup.
- Affected: Default and Minimal skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Hold new anatomy until loading behavior or target markup needs to change. Then consider propagating loading state to the Thumbnail root or adding explicit image and spinner parts, with generated-output and matrix verification.
