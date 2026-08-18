---
status: implemented
date: 2026-03-25
---

# Internationalization

This record preserves the rationale behind Video.js 10 internationalization. The package source, exports, tests, and generated locale modules define the current API and supported locales.

## Problem

Video.js needed one framework-neutral translation system for HTML, React, and CDN consumers without coupling language state to a skin or making English copy part of the translation key contract.

## Decisions

- Translation keys are stable camelCase identifiers. English strings remain values, so copy changes do not invalidate every locale.
- A global core registry loads each locale once per page. Explicit registration keeps locale modules tree-shakeable; self-registering modules support CDN use.
- Providers are independent of skins and can scope one or many players. Without an explicit locale, they inherit the nearest DOM language declaration rather than browser preference.
- React and HTML integrations are created by `createI18n()` factories so contexts can be isolated and their providers, hooks, and controllers remain paired.
- A control's translated label also supplies built-in tooltip text. `<media-text>` exists only for standalone copy in custom or ejected templates.
- Interpolation uses lightweight `{param}` replacement. Native `Intl` APIs own locale-aware number, duration, percentage, and plural formatting.
- Browser translation is opportunistic only when its model is already installed; it must never trigger a large implicit download.

## Consequences

Consumers can switch languages for an entire provider tree while skins remain presentation-only. The registry and core translator stay framework-neutral, and applications opt into only the locale modules they need. SSR callers that must avoid an English first render provide translations synchronously.

This intentionally does not define locale negotiation, right-to-left layout, caption-language selection, ICU message syntax, CAT-tool integration, or a consumer-supplied translator adapter.

## Current sources of truth

- Core registry, resolution, formatting, locale loading, and tests: `packages/core/src/core/i18n/`
- HTML provider, controller, text integration, and tests: `packages/html/src/i18n/`
- React provider, hooks, and tests: `packages/react/src/i18n/`
- Generated locale inputs and output task: `packages/core/src/core/i18n/locales.ts` and `packages/core/scripts/generate-i18n-locales.ts`
- Public package behavior: package exports, README files, and generated API reference
