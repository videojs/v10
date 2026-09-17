---
name: maintain-locale-strings
description: Correct or retranslate a Video.js locale pack. Use when en.ts copy changes, a native speaker reports a wrong string, or one pack needs an audit.
---

# Correct a locale pack

Bring one pack in `packages/core/src/core/i18n/locales/` back in line with current `en.ts`, with a citable source behind every changed value. Every value reaches the DOM as an `aria-label`, so a wrong word class is announced by a screen reader rather than merely displayed.

## Triggers

- `locales/en.ts` gained a key or reworded a value, so the non-English packs still translate the old English.
- A native speaker reported a wrong string, usually as an issue carrying a key/current/proposed/why table.
- One pack needs an audit before a release.

Do not use this workflow to add a new locale; follow "Adding a built-in locale" in `packages/core/src/core/i18n/README.md`. Do not use it for RTL layout work, or for the generated mirrors under `packages/html`, `packages/react`, and `packages/cdn`.

## Workflow

1. Scope one locale per branch and one file per change. Search open issues and PRs for that tag first; a bulk pass strands outside contributions (#2751 was closed as superseded by #2809).
2. Diff the pack against current `en.ts` key by key. Treat every value whose English source has changed as stale, and note the ones you deliberately leave alone.
3. Justify each new value against localized first-party UI for the same control. Read `references/evidence-sources.md` when choosing and citing a value. Never translate unsourced, and never derive one pack from a related one; zh-TW is not converted zh-CN.
4. Edit values only, preserving the key set, key order, and the full `{placeholder}` multiset. Read `references/language-pitfalls.md` before settling wording.
5. Re-derive the result independently: replay each row from `en.ts` and the old value, re-fetch every citation, and run a codepoint scan for homoglyphs, stray scripts, NBSP, and double spaces. cspell ignores non-English packs, so that scan is the only mechanical guard on the text itself.
6. Describe the change with the body in `references/pr-body-template.md`, stating plainly that the work is research-backed rather than native-authored, and requesting a native-speaker check before merge.

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
pnpm -F @videojs/core run generate:i18n-types  # only when en.ts keys or placeholders changed
pnpm lint:fix:file packages/core/src/core/i18n/locales/<tag>.ts
pnpm check:workspace
CI=1 pnpm -F @videojs/core exec vitest run src/core/i18n
git diff --check
```
