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

## Host-page CSS hardening

- Source: `packages/skins/src/default/css/components/reset.css`, `packages/skins/src/minimal/css/components/reset.css`, and the rem-to-px unit changes in the legacy CSS outputs alongside them
- Gap: Legacy CSS outputs now normalize buttons (margin, font, text-transform, and letter-spacing in the skin resets; appearance, color, and background on the `.media-button` base), re-assert authored SVG icon fill and stroke at class specificity, and use px instead of rem for container-query breakpoints, so light-DOM embeds are unaffected by host-page element rules and root font-size changes. VJSC's `base.css` reset only inherits button font, color, and letter-spacing, and its `captions.css` breakpoint and theme radii still use rem. Tailwind outputs are intentionally exempt: they run inside the consumer's Tailwind build, which assumes a 16px root and Preflight.
- Affected: Default and Minimal skins; HTML and React targets; CSS outputs only.
- Recommendation: Extend the VJSC `@scope (.media-skin)` reset with the same button normalization and `svg[fill]` re-assertions, convert the `captions.css` breakpoint and theme radii from rem to px in the CSS output, and verify with hostile host CSS across the skin matrix.

## Dialog exit duration

- Source: `packages/skins/src/default/css/audio.css`, `packages/skins/src/default/css/video.css`, `packages/skins/src/minimal/css/audio.css`, and `packages/skins/src/minimal/css/video.css`
- Gap: Legacy dialogs shorten their exit transition by 100ms with a 50ms minimum, while VJSC uses the full configured duration for both entry and exit.
- Affected: Default and Minimal Audio and Video skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Apply the shortened duration to VJSC dialog ending styles and verify entry and exit timing across the skin matrix.
