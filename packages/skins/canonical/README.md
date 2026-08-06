# Canonical Skin source

This directory contains target-neutral, authored source for source-owned Video.js UI. It is intentionally isolated from `../src`, which remains the input for the currently packaged React and HTML skins until generated output proves parity.

Canonical source:

- Uses constrained JSX from `@videojs/jsx`.
- Imports Video.js primitives only through stable package exports.
- Keeps independently installable components in role-based directories.
- Contains semantic structure without React- or HTML-specific markup.
- Does not copy Media, Store, feature, or SVG implementations.

The initial component paths are:

- `components/buttons/play-button.skin.tsx`
- `components/sliders/volume-slider.skin.tsx`
- `components/sliders/time-slider.skin.tsx`

PlayButton source waits for the named canonical icon export owned by #1956. Artifact entries are authored in `../artifacts.ts`; styles, complete Skin compositions, and generated target output remain separate stack boundaries.
