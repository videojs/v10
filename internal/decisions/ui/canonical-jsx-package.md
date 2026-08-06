---
status: decided
date: 2026-08-06
---

# Canonical JSX package ownership

## Decision

`@videojs/jsx` owns the target-neutral component manifest contract and inert JSX runtime used to author canonical Video.js UI source. It is a dependency-free leaf package consumed by component catalogs, canonical Skin source, and compiler tooling.

Video.js component manifests and generated component exports remain in `@videojs/core`. Icon definitions remain in `@videojs/icons`. Parsing, artifact graph construction, diagnostics, and target lowering remain in `@videojs/compiler`.

## Context

The canonical JSX runtime initially lived in `@videojs/core`. Adding compiler-readable icon roles then required `@videojs/icons` to depend on Core even though SVG assets and icon identities have no player-runtime dependency. The same authoring protocol is shared by Core components, icons, and Skins, so Core was not the narrowest owner.

The package is publishable because the public `@videojs/core/components` catalog exposes values and types backed by the JSX contract. Canonical customer-owned output is still expected to lower away this authoring protocol and use only its target's public runtime imports.

## Alternatives Considered

- **Keep the runtime in `@videojs/core`** — preserves the initial implementation but gives unrelated component catalogs a dependency on player Core.
- **Move the runtime into `@videojs/compiler`** — makes authored source depend on Node-oriented build tooling and reverses the intended compiler relationship.
- **Combine JSX, artifacts, and compilation in one pipeline package** — groups related work conceptually but mixes a small authoring protocol with filesystem analysis and target generation.

## Rationale

A small JSX package follows the actual dependency direction: catalogs and source describe nodes through a stable protocol, while the compiler interprets those nodes. It removes domain dependencies from icons without moving Video.js component, Skin, or artifact concerns into the protocol package.

The implementation and contract tests live in `packages/jsx`; Core's generated component catalog and Skin canonical-source checks exercise the integration boundary.
