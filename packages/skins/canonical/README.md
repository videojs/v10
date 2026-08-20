# Canonical Skin source

This directory contains the framework-neutral source for generated Video.js skins and components. The existing package skins under `../src` remain separate while the canonical outputs reach parity.

Canonical source:

- Uses constrained JSX from `vjsc/components`.
- Imports Video.js primitives only through stable package exports.
- Keeps independently installable components in role-based directories.
- Contains semantic structure without React- or HTML-specific markup.
- Imports named Tailwind utility tokens from locally owned style modules.
- Does not copy Media, Store, feature, or SVG implementations.

Each public Skin or component declares its identity and description through a static `meta` export. `catalog.ts` owns discovery roots, shared style resources, allowed imports, and reference groups; VJSC derives dependencies and files from the discovered module graph. Supporting relative modules without `meta` remain private to their importing catalog entry.

Canonical components import icon roles from `@videojs/icons/vjsc`; target emission replaces that compiler-only contract with public React icon exports or exact HTML registrations. Registered source entries form catalog dependencies, while other relative modules remain private to the importing item and are emitted with it. The Tailwind v4 inputs map shared semantic utilities to media variables while keeping compiler and registry scanning explicit. `registry/shadcn.ts` owns the React/Tailwind publication target; generated registry output is an ignored build artifact.
