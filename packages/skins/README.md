# @videojs/skins

> **Internal package — do not install directly.**

Canonical VJSC skin sources and the generators that deliver them through [`@videojs/html`](../html), [`@videojs/react`](../react), CDN templates, and the Shadcn registry.

The package is private (`"private": true` in `package.json`) and is not published to npm.

## Structure

- `vjsc/` — target-neutral skin components, styles, target transforms, and contract tests.
- `build/` — shared Skin and framework-package output helpers.
- `registry/` — Shadcn catalog items, build configuration, and focused policy validation.
- `dev/` — the VJSC React/HTML and CSS/Tailwind development matrix.

## License

[Apache-2.0](../../LICENSE)
