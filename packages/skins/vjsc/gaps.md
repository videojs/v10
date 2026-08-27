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

## Skin class naming

- Source: `packages/skins/src/default/css`, `packages/skins/src/minimal/css`, and the root class strings in `packages/html/src/presets` and `packages/react/src/presets`
- Gap: Legacy skin roots now carry a shared `media-skin` base class with BEM modifiers (`media-skin--default`, `media-skin--minimal`, `media-skin--video`, `media-skin--audio`), and the shared reset in `packages/skins/src/shared/css/reset.css` scopes on `.media-skin`. VJSC output uses `media-skin` with single-dash modifiers and theme classes (`media-skin-video`, `media-theme-default`), so the base class matches but modifier naming diverges, and the unlayered legacy reset now also matches VJSC roots when both stylesheets load on one page.
- Affected: Default and Minimal skins; HTML and React targets; CSS outputs.
- Recommendation: Align VJSC modifier naming with the legacy BEM scheme (or vice versa), and decide whether VJSC should adopt the shared reset file instead of its `@scope (.media-skin)` base rules before removing this entry.

## Host-page CSS hardening

- Source: `packages/skins/src/shared/css/reset.css` and the rem-to-px unit changes in the legacy CSS outputs alongside it
- Gap: Legacy CSS outputs now normalize buttons (margin, font, text-transform, and letter-spacing in the shared reset; appearance, color, and background on the `.media-button` base), re-assert authored SVG icon fill and stroke at class specificity, and use px instead of rem for container-query breakpoints, so light-DOM embeds are unaffected by host-page element rules and root font-size changes. VJSC's `base.css` reset only inherits button font, color, and letter-spacing, and its `captions.css` breakpoint and theme radii still use rem. Tailwind outputs are intentionally exempt: they run inside the consumer's Tailwind build, which assumes a 16px root and Preflight.
- Affected: Default and Minimal skins; HTML and React targets; CSS outputs only.
- Recommendation: Extend the VJSC `@scope (.media-skin)` reset with the same button normalization and `svg[fill]` re-assertions, convert the `captions.css` breakpoint and theme radii from rem to px in the CSS output, and verify with hostile host CSS across the skin matrix.

## Audio hover contrast

- Source: `packages/skins/src/default/css/components/container.css`, `packages/skins/src/minimal/css/components/container.css`, and the audio entry overrides alongside them
- Gap: Legacy skins resolve the un-themed accent text color through `--media-internal-accent-text-base` (black for video surfaces, light-dark for audio surfaces), so audio hover text stays legible in browsers that support `contrast-color()`. VJSC's `tailwind.shared.css` still hardcodes `contrast-color(var(--media-accent-color, oklch(0 0 0)))`, which resolves hover text to white on the light audio surface.
- Affected: Default and Minimal Audio skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Introduce the same surface base variable in VJSC's shared accent tokens, override it in the audio themes, and add hover contrast coverage to the VJSC skin matrix.

## Dialog exit duration

- Source: `packages/skins/src/default/css/audio.css`, `packages/skins/src/default/css/video.css`, `packages/skins/src/minimal/css/audio.css`, and `packages/skins/src/minimal/css/video.css`
- Gap: Legacy dialogs shorten their exit transition by 100ms with a 50ms minimum, while VJSC uses the full configured duration for both entry and exit.
- Affected: Default and Minimal Audio and Video skins; HTML and React targets; CSS and Tailwind outputs.
- Recommendation: Apply the shortened duration to VJSC dialog ending styles and verify entry and exit timing across the skin matrix.

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
