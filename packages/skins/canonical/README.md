# Canonical Skin source

This directory contains the framework-neutral source for generated Video.js skins and components. The existing package skins under `../src` remain separate while the canonical outputs reach parity.

Canonical source:

- Uses constrained JSX from `vjsc/components`.
- Imports Video.js primitives only through stable package exports.
- Keeps independently installable components in role-based directories.
- Contains semantic structure without React- or HTML-specific markup.
- Imports named Tailwind utility tokens from locally owned style modules.
- Does not copy Media, Store, feature, or SVG implementations.

`catalog.ts` is the authoritative inventory of public skins, components, dependencies, and shared style resources. Supporting relative modules remain private to their importing catalog entry.

Canonical components import icon roles from `@videojs/icons/vjsc`; target emission replaces that compiler-only contract with public React icon exports or exact HTML registrations. Registered source entries form catalog dependencies, while other relative modules remain private to the importing item and are emitted with it. The Tailwind v4 inputs map shared semantic utilities to media variables while keeping compiler and registry scanning explicit. `registry/config.ts` owns the complete React/Tailwind publication target; generated outputs are build artifacts and are not tracked.
