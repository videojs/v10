# Canonical Skin source

This directory contains target-neutral, authored source for source-owned Video.js UI. It is intentionally isolated from `../src`, which remains the input for the currently packaged React and HTML skins until generated output proves parity.

Canonical source:

- Uses constrained JSX from `@videojs/jsx`.
- Imports Video.js primitives only through stable package exports.
- Keeps independently installable components in role-based directories.
- Contains semantic structure without React- or HTML-specific markup.
- Imports named Tailwind utility tokens from locally owned style modules.
- Does not copy Media, Store, feature, or SVG implementations.

The current canonical paths are:

- `skins/default-video/skin.tsx`
- `components/buttons/button-tooltip.tsx`
- `components/buttons/fullscreen-button.tsx`
- `components/buttons/mute-button.tsx`
- `components/buttons/play-button.tsx`
- `components/buttons/seek-button.tsx`
- `components/controls/volume-popover.tsx`
- `components/sliders/volume-slider.tsx`
- `components/sliders/time-slider.tsx`

Canonical components import icon roles from `@videojs/icons/components`; target emission replaces that compiler-only contract with public React icon exports or exact HTML registrations. The Tailwind v4 input maps semantic utilities to media variables, so the same source can produce editable registry utilities or role-based vanilla CSS. The manifest in `../src/manifest.ts` owns the item inventory; registry publication policy lives in `../src/registry/config.ts`.
