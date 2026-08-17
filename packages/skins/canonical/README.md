# Canonical Skin source

This directory contains the next source root for source-owned Video.js UI. It remains isolated from `../src`, which still feeds the currently published package build until generated output proves parity.

Canonical source:

- Uses constrained JSX from `@videojs/jsx`.
- Imports Video.js primitives only through stable package exports.
- Keeps independently installable components in role-based directories.
- Contains semantic structure without React- or HTML-specific markup.
- Imports named Tailwind utility tokens from locally owned style modules.
- Does not copy Media, Store, feature, or SVG implementations.

The current authored paths are:

- `skins/default-video/skin.tsx`
- `components/buttons/button-tooltip.tsx`
- `components/buttons/fullscreen-button.tsx`
- `components/buttons/mute-button.tsx`
- `components/buttons/play-button.tsx`
- `components/buttons/seek-button.tsx`
- `components/controls/volume-popover.tsx`
- `components/layout/container.tsx`
- `components/layout/overlay.tsx`
- `components/layout/poster.tsx`
- `components/sliders/volume-slider.tsx`
- `components/sliders/time-slider.tsx`

Canonical components import icon roles from `@videojs/icons/components`; target emission replaces that compiler-only contract with public React icon exports or exact HTML registrations. Registered source entries form catalog dependencies, while other relative modules remain private to the importing item and are emitted with it. The Tailwind v4 input maps semantic utilities to media variables, so the same source can produce editable registry utilities or role-based vanilla CSS. `catalog.ts` owns the source catalog and shared resources, while `registry/config.ts` owns the complete React/Tailwind publication target and `registry/default` contains its generated projection.
