# @videojs/skins

> **Internal package — do not install directly.**

Shared skin CSS and Tailwind classname tokens for Video.js 10. Consumed by [`@videojs/html`](../html) and [`@videojs/react`](../react), which re-export the skins you actually use in an app.

The package is private (`"private": true` in `package.json`) and is not published to npm.

## Structure

- `src/default/` — default skin tokens and CSS.
- `src/minimal/` — minimal skin tokens and CSS.
- `src/shared/` — tokens shared between skins.

## License

[Apache-2.0](../../LICENSE)
