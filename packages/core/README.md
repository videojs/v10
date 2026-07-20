# @videojs/core

[![package-badge]][package]

> **⚠️ Beta** Close to stable. Experimental adoption in real projects.

## Overview

`@videojs/core` provides runtime-agnostic core components and utilities shared across Video.js
packages. These are foundational building blocks used by platform-specific implementations
(DOM, HTML, React, React Native) to create consistent media player experiences.

## Update i18n copy

The i18n source of truth lives in `src/core/i18n`. Translation keys are the default English
phrases, so changing English copy also changes the typed key consumers use.

When you add, rename, or remove player copy:

1. Update `src/core/i18n/types.ts`.
   Add the new phrase to `TranslationParams`, include any placeholder params, and remove replaced
   phrases so stale keys fail typecheck.
2. Update `src/core/i18n/locales/en.ts`.
   Keep the English locale complete. It must satisfy `Translations`, not `Partial<Translations>`.
3. Update every non-English file in `src/core/i18n/locales`.
   Move existing translations to the new phrase keys when the meaning is unchanged, add translations
   for new phrases, and remove replaced phrase keys.
4. Update call sites and tests.
   Any helper that returns a translation key, such as error-dialog copy, must return the new phrase.
5. Run `pnpm -F @videojs/core run generate:locales`.
   This refreshes `locales/all.ts`, `load-locale.ts`, and the HTML/React locale re-export files.
6. Run focused tests and typecheck.
   At minimum, run the package tests that cover the changed copy and `pnpm typecheck`.

## Community

If you need help with anything related to Video.js v10, or if you'd like to casually chat with other
members:

- [Join Discord Server][discord]
- [See GitHub Discussions][gh-discussions]

## License

[Apache-2.0](./LICENSE)

[package]: https://www.npmjs.com/package/@videojs/core
[package-badge]: https://img.shields.io/npm/v/@videojs/core?label=@videojs/core
[discord]: https://discord.gg/JBqHh485uF
[gh-discussions]: https://github.com/videojs/v10/discussions
