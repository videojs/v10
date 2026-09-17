---
name: maintain-locale-strings
description: Translate or audit the values in a Video.js locale pack. Use when a key needs values, en.ts copy changes underneath a pack, or one pack needs an audit.
---

# Translate locale values

Produce translated values for one locale pack in `packages/core/src/core/i18n/locales/` that are backed by a citable source and free of the known pitfalls. Every value reaches the DOM as an `aria-label`, so a wrong word class is announced by a screen reader rather than merely displayed.

## Triggers

- A new key needs values in a pack.
- `locales/en.ts` reworded a value, so the pack still translates the old English.
- One pack needs an audit of the values it already carries.

Do not use this workflow to add a whole new locale; follow "Adding a built-in locale" in `packages/core/src/core/i18n/README.md`. Do not use it to author the English source copy, for RTL layout work, for the generated mirrors under `packages/html`, `packages/react`, and `packages/cdn`, or for branch and change-description mechanics.

## Workflow

1. Identify which values are stale by diffing the pack against current `en.ts` key by key, and note the ones you deliberately leave alone.
2. Research each value against localized first-party UI for the same control, with one citation per value. Read `references/evidence-sources.md` when choosing and citing. Never translate unsourced, and never derive one pack from a related one; zh-TW is not converted zh-CN.
3. Check the wording against `references/language-pitfalls.md`, then edit values only, preserving the key set, key order, and the full `{placeholder}` multiset.
4. Verify by re-deriving each value from `en.ts` and its old value, re-fetching every citation, and running a codepoint scan for homoglyphs, stray scripts, NBSP, and double spaces. cspell ignores non-English packs, so that scan is the only mechanical guard on the text itself. A translated value is research-backed rather than native-authored, so a native-speaker check is worth requesting.

## Example

Input: #1822 rewrote the English `errors.*` copy, so `es.ts` still translates the old text.

Output: Value-only edits to `es.ts`, one table row per key.

```md
| key | current | proposed | why (source) |
| errors.aborted | Ha anulado la reproducción… | Has detenido la reproducción… | YouTube Help es |
```

## Validation

```bash
pnpm -F @videojs/core run generate:locales     # validates every pack carries every en.ts key
pnpm lint:fix:file packages/core/src/core/i18n/locales/<tag>.ts
CI=1 pnpm -F @videojs/core exec vitest run src/core/i18n
git diff --check
```
