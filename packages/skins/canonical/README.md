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

- `skins/default/video-controls.skin.tsx`
- `components/buttons/button-tooltip.skin.tsx`
- `components/buttons/fullscreen-button.skin.tsx`
- `components/buttons/mute-button.skin.tsx`
- `components/buttons/play-button.skin.tsx`
- `components/buttons/seek-button.skin.tsx`
- `components/controls/volume-popover.skin.tsx`
- `components/sliders/volume-slider.skin.tsx`
- `components/sliders/time-slider.skin.tsx`

Canonical components import icon roles from `@videojs/icons/components`; target lowering replaces that compiler-only source contract with local named React exports or exact HTML registrations. The Tailwind v4 input in `styles/tailwind.css` maps semantic utilities to scoped media variables, so Tailwind source can be preserved or lowered into vanilla CSS from the same authored utilities. Artifact entries are authored in `../artifacts.ts`; generated target output remains a separate stack boundary.
