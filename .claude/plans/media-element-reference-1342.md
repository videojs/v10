# PR #1342 — Media Element API Reference: Resuscitation Plan & Decision Log

**Status:** in progress (working draft — compact before merge)
**Branch:** `claude/refine-local-plan-ClRzU` (PR #1342). Work directly here (explicit owner approval to override default branch pin).
**Goal:** ship the media-element reference pages **live, accurate, and useful**. Team principle: "undocumented features don't exist."

## North star
- Document the *supported subset* truthfully. Our novel surface (host properties, element-specific events) gets full descriptions; native passthrough (attributes, native events, native methods) defers to MDN.
- The original sub-issues (#727 tree) are **stale guidance, not spec** — validate against current source.

## Current branch state (verified by regenerating real JSON — DO NOT re-investigate)
The generator is in good shape already:
- Host properties: mixin-aware extraction works (hls/mux=12, native-hls=7). Types resolved via TS checker (not `unknown`). Defaults extracted from `*DefaultProps`.
- JSDoc descriptions already authored on host getters (only `src` intentionally blank → native). **Workstream B (authoring JSDoc) is essentially DONE on this branch.**
- `@fires` element-specific events already present: streamtypechange, targetlivewindowchange (hls/native-hls/mux-audio).
- dash-video legitimately thin (2 props) — DashMedia is a minimal host; streamType is hls-specific. Not a bug.

## Decision log (Q1–Q11 from owner interview — these are LOCKED)
1. **Descriptions:** author novel surface only; native passthrough → MDN. (Mostly already done.)
2. **Native attributes presentation:** accurate enumerated subset list + MDN (NOT "all attributes", NOT a type/default table).
3. **Events presentation:** two-tier — native subset as a list + MDN; element-specific as a name/description table.
4. **Methods:** accurate supported-subset list + MDN; generator collects via prototype-forwarding rule (mirror events, per-mediaType from base host files). No per-method table.
5. **Slots:** OMIT entirely (the `media` slot is @deprecated; rest is advanced/internal).
6. **Demos:** HTML demos live now; React demos stay commented pending #1343 (window-at-import SSR crash).
7. **PR scope:** reference pages ONLY. Installation work (#1254/#1255) is a separate follow-up.
8. **Verification:** DON'T build the contract test now — OPEN AN ISSUE documenting the regression class (fixtures green while real output empty/wrong).
9. **background-video:** keep hand-authored, mirror generated structure, document novel surface (src; inverted defaults autoplay/muted/loop ON by default; nomuted/noloop/noautoplay opt-outs; --media-object-fit/--media-object-position; default slot).
10. **Host property ordering:** alphabetical; "advanced/escape hatch" conveyed via authored JSDoc (engine/config). No curated priority list.
11. **Attributes list = COMPLETE set:** include src/preload/stream-type (shown in BOTH Attributes and Host Properties — accurate, MDN-style content-attr vs IDL-prop). Requires un-dedup in generator + e2e spec update.

## Accuracy bugs being fixed (found in real JSON/prose)
- Prose overclaims: "Accepts common native media attributes [+examples]" and "All standard media events are re-dispatched" → replace with accurate enumerated subsets.
- False claim: "setting [host properties] as markup attributes has no effect" — false for src/preload/streamType. Replace with: lower-level props (engine/config) are JS-only.
- Dedup bug A: `stream-type` leaks into nativeAttributes despite `streamType` host prop (kebab-vs-camel). (Resolved by Q11 un-dedup: full list intended.)
- Dedup bug B: streamtypechange/targetlivewindowchange appear in BOTH events.native and elementSpecific → must be elementSpecific-only.

## Workstreams & status
- **A. Generator** (media-element-handler.ts, pipeline.ts): un-dedup nativeAttributes (full set); dedup element-specific OUT of native; add `methods: string[]` (per-mediaType from media-host.ts + video-host.ts/audio-host.ts). → DELEGATED to subagent.
- **B. Source JSDoc:** already done on branch (verify completeness only).
- **C. Rendering** (MediaReference.astro, mediaReferenceModel.js, types/media-reference.ts): accurate attribute list; events two-tier + native subset framing; new Methods section; drop curated-examples machinery; JS-only host-props note. → DELEGATED to subagent (exact prose specified).
- **D. background-video:** hand-author MDX mirroring structure + novel surface. → TODO (me).
- **E. Demos:** HTML only (no change needed). React deferred to #1343.
- **F. Regression issue:** file issue re fixtures-green-but-real-empty class. → TODO (me).
- **G. PR body:** rewrite for reviewability — call out important vs ignorable files, emphasize "the output is what matters," link key Netlify preview pages. → TODO (me).

## Key files
- Generator: `site/scripts/api-docs-builder/src/media-element-handler.ts`, `pipeline.ts`
- e2e spec + fixtures: `site/scripts/api-docs-builder/src/tests/e2e.test.ts`, `.../tests/fixtures/monorepo/`
- Rendering: `site/src/components/docs/api-reference/MediaReference.astro`, `MediaHostPropsTable.astro`, `ApiCSSVarsTable.astro`
- Model/types: `site/src/utils/mediaReferenceModel.js`, `site/src/types/media-reference.ts`
- Pages: `site/src/content/docs/reference/{hls,dash,mux-video,mux-audio,native-hls,simple-hls-video,simple-hls-audio-only,background}-*.mdx`
- Generated JSON (gitignored): `site/src/content/generated-media-reference/*.json`

## Verify
`cd site && pnpm api-docs && pnpm test e2e.test.ts && pnpm test mediaReferenceModel && pnpm exec astro check`
Then manual per-element sanity: host props non-empty, types not `unknown`, defaults present, nativeAttributes = full set, native events exclude element-specific, methods populated.

## ⚠️ POST-COMPACTION RE-ANCHOR (read first)
If resuming with fresh context: you are resuscitating PR #1342 on branch `claude/refine-local-plan-ClRzU`. Deps installed + packages built already. Committed checkpoints: `1a477bb` (generator+rendering accuracy), `19a518c`/this doc. A prose-polish subagent may have run — review its work via `git diff` on `MediaReference.astro` + the 8 `reference/*.mdx` intros, checking the HARD ACCURACY CONSTRAINTS below were not regressed (no "all attributes/events" overclaims; no "host props have no effect as attributes"; background-video inverted-defaults facts intact; MDN links + enumerated lists + JS-only note preserved). Then do the Remaining items. Verify with `cd site && pnpm test` (expect 433) + `pnpm exec astro check`. Commit + push at the end. Do NOT touch installation (#1254/#1255).

## Progress
- ✅ A (generator) + C (rendering): DONE & verified. Commit `1a477bb`. 433 site tests pass; e2e 122; model 8; astro check clean. Real JSON confirmed: full attrs (incl src/preload/stream-type), native events exclude element-specific, methods populated.
- ✅ D (background-video): page already documents novel surface (inverted defaults, no* opt-outs, css vars) — only prose polish needed, folded into prose pass.
- Plan doc committed `19a518c` (pushed). Implementation committed `1a477bb` (not yet pushed).

## Remaining
1. Prose-polish pass via subagent using `docs` skill / writing-style.md — MediaReference.astro prose + 8 per-page MDX intros + background-video.mdx. Preserve accuracy (no "all attributes/events" regressions), enumerated lists, MDN links, JS-only note, inverted-defaults facts. (IN PROGRESS)
2. File regression issue (F): fixtures-green-but-real-empty class.
3. Rewrite PR body (G): important vs ignorable files, "output is what matters," link key Netlify preview pages.
4. `pnpm -F site test` + build sanity; push to `claude/refine-local-plan-ClRzU`; do NOT touch installation.
