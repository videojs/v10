# SPF text-track selection → track-switching refactor

Working reference for migrating text-track selection onto the `track-switching`
rule chain so it gains **constraints** (failed-CDN pruning) and **CDN priority**,
and converting the bidirectional `syncTextTracks` write path to a **user-intent
signal** so `selectedTextTrackId` becomes single-writer.

Branch: `feat/spf-text-tracks-switching`. Shipped feature docs
(`internal/design/spf/features/subtitles.md`,
`internal/design/spf/text-track-architecture.md`) describe current reality and
get updated at phase 5, not before.

## Problem

- `selectTextTrack` (entry-once, opt-in default pick) and `syncTextTracks` (DOM
  `change` → write) both write `selectedTextTrackId` — `subtitles.md` flags this
  multi-writer slot as "intentionally orthogonal." It's the smell to remove.
- Text selection never runs the rule chain, so it ignores `excludeFailedCdns`
  and `preferActiveCdn`. A failed CDN or CDN priority has no effect on captions.

## Agreed design

**Intent signal** — `userTextTrackSelection: Partial<TextTrack> | 'off' | undefined`

| Value | Meaning | Resolution |
|---|---|---|
| `undefined` | auto — no user preference | `preferredSubtitleLanguage` config → `DEFAULT=YES + AUTOSELECT=YES` → none |
| `Partial<TextTrack>` (language-based) | explicit on | `filterByUserSelection` narrows; `preferActiveCdn` picks surviving-CDN copy; head |
| `'off'` | explicit none | terminal short-circuits to no-selection; sticky through re-eval |

- **Not cleared on source unload** — mirrors `userVideoTrackSelection` /
  `userAudioTrackSelection` (embedder-owned, persistent). Stickiness (sticky
  language + sticky off across sources) falls out for free; no clear-on-unload
  behavior to add. Config-driven opt-out is a later addition.
- DOM bridge writes a **language-based** partial (mirrors the audio sibling), so
  a pick re-resolves per-source. Known limitation: two same-language tracks
  differing by forced/characteristics resolve by language alone; the terminal
  tie-breaks deterministically. Enrich the partial later if it bites.

**Ownership** — `selectedTextTrackId` becomes the single-writer **output** of
`switchTextTrack`, cleared per-source by the helper's existing exit cleanup.

**Text chain** (`setupTrackSwitching` variant):
- constraints: `[excludeFailedCdns]` — no `excludeUnplayableTracks` (`canPlayTrack`
  is MSE-based, wrong probe for text; text playability is SPF-parser support).
- rules: `[filterByUserSelection, preferActiveCdn]`
- `resolveSelection: pickResolvedTextTrack` — the one text-specific terminal that
  understands `'off'` / auto / explicit + opt-in policy. `filterByUserSelection`
  and `preferActiveCdn` stay shared and untouched (the picker, not the filter,
  understands `'off'`).

**Framework touch-point** — `setupTrackSwitching` gains an optional
`resolveSelection(candidates, deps) => string | undefined`, defaulting to the
chain head. Video/audio don't supply it → unchanged. `SelectionKey` /
`UserSelectionKey` each gain one literal.

**Consumer-facing change** — programmatic selection moves from writing
`selectedTextTrackId` to writing `userTextTrackSelection` (via `shareSignals` /
`onSignalsReady`); `selectedTextTrackId` becomes read-only output.

## Open items (iterate during implementation)

- **Echo guard** — once the resolver can override the user (pick `es`, es only on
  a failed CDN → resolved `undefined` → mode-mirror disables → `change` event),
  the DOM bridge must not write that correction back as "user turned off."
  Prototype: track the modes SPF itself sets, write back only genuine user
  deltas; fall back to extending the settling window if not worth the state.
- **Same-language ambiguity** — see DOM-bridge note above.
- **Empty candidate set** — keep current behavior: `if (!tracks.length) return`
  leaves the prior pick (no caption flicker when every text CDN is cooled down;
  recovers on cooldown). `'off'`/auto-declines go through `resolveSelection`
  (non-empty set → undefined), distinct from the empty-set case.

## Phases (TDD per phase, one commit each, check in at each boundary)

1. **No-selection seam in `setupTrackSwitching`.** Add `resolveSelection` config +
   `selectChainHead` default; thread into the effect. Export `setupTrackSwitching`
   for tests (module-only, like `applyRules`). Tests: undefined resolution clears
   the slot; non-default picker is threaded the chain candidates; video/audio
   default path unchanged.
2. **`switchTextTrack` variant + `pickResolvedTextTrack`.** Port `pickTextTrack`
   policy into the terminal; handle off/auto/explicit; add `selectedTextTrackId`
   to `SelectionKey`, `userTextTrackSelection` to `UserSelectionKey`. Tests:
   auto-default, explicit language, off-stays-off across re-eval, failed-CDN
   re-resolution, CDN-priority copy selection.
3. **Refactor `syncTextTracks`.** Change-bridge writes `userTextTrackSelection`
   (language partial / `'off'`) instead of `selectedTextTrackId`; mode-mirror
   still reads `selectedTextTrackId`; echo guard. Tests: DOM pick → intent →
   resolved → mode round-trip without echo; resolver override corrects DOM
   without write-back.
4. **Remove `selectTextTrack` text path + engine rewire.** Compose
   `switchTextTrack` after `deriveCdnPriority` / `setupFailoverMonitor`, before
   `resolveTextTrack`; expose `userTextTrackSelection` via `shareSignals`.
   Full-engine test.
5. **Docs.** Update `subtitles.md` (state slots → single-writer; implementation
   surface) and `text-track-architecture.md` (bidirectional section → intent
   model + echo guard).
