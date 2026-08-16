# Canonical Skin source

This directory contains the framework-neutral source for generated Video.js skins and components. The existing package skins under `../src` remain separate while the canonical projections reach parity.

Canonical source:

- Uses constrained JSX from `@videojs/jsx`.
- Imports Video.js primitives only through stable package exports.
- Keeps independently installable components in role-based directories.
- Contains semantic structure without React- or HTML-specific markup.
- Imports named Tailwind utility tokens from locally owned style modules.
- Does not copy Media, Store, feature, or SVG implementations.

`catalog.ts` is the authoritative inventory of public skins, components, dependencies, and shared style resources. Supporting relative modules remain private to their importing catalog entry.

Canonical components import icon roles from `@videojs/icons/components`; target emission replaces that compiler-only contract with public React icon exports or exact HTML registrations. Registered source entries form catalog dependencies, while other relative modules remain private to the importing item and are emitted with it. The Tailwind v4 input maps semantic utilities to media variables, so the same source can produce editable registry utilities or role-based vanilla CSS. `registry/config.ts` owns the complete React/Tailwind publication target; generated projections are build artifacts and are not tracked.
