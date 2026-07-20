# SPF live-HLS re-landing onto the `startMediaTime` / `timestampOffset` model

**Status:** planning · **Branch:** `feat/spf-hls-live-v2` (off `fix/spf-exact-end-seek-stall`)
**Reference (do not modify):** `feat/spf-hls-live` (76 commits, the original live work) + backups `backup/spf-hls-live-*`.

## Goal

Re-land the worthwhile live-HLS work from `feat/spf-hls-live` on top of the current
non-zero-PTS approach, **revised** to use the `startMediaTime` + `timestampOffset`
model (`establish-start-media-time.ts`) instead of live's own native-PTS anchor stack.

## Why not `git rebase --onto`

A straight rebase hits hard conflicts in only 4 files, but that undersells the work.
Live built an entire **parallel timeline-origin stack** across ~20 commits
(`presentation-anchor`, `buffered-anchor`, `align-track-timelines`, the
`anchor-presentation-timeline` behavior, `resolve-buffered-anchor`, PDT cross-track
alignment) to answer the same question the current branch now answers with
`startMediaTime`. Rebasing would force conflict-resolution, commit-by-commit, against
code we are about to **delete and re-derive**. Instead we **re-land by concern** in
dependency order, replaying the orthogonal mechanics and rebuilding the anchor layer.

## The two models (they reconcile in opposite directions)

- **Current (`startMediaTime`/`timestampOffset`):** origin comes from container bytes
  (`tfdt.baseMediaDecodeTime ÷ mdhd.timescale − segmentStartTime`, read at discover-time
  *before* append). `startTime` stays **0-based (presentation)**; the buffer is relocated
  to the model via `sb.timestampOffset = startTime − startMediaTime`. `currentTime`,
  `seekable`, and loader math all live in one 0-based space.
- **Live (original):** origin comes from **buffer ground truth + PDT**; it **rewrites
  every track's `startTime` onto native PTS** and appends segments unmodified. Introduces
  a native-PTS coordinate space that all seekable/edge math must translate through.

The current design doc (`internal/design/spf/presentation-timeline-model.md`) already
names this collision, chose the 0-based direction deliberately (the native branch "paid
for it with coordinate translation everywhere, including the initial-load stall"), and
parked native-`startTime` convergence as a future effort. `establish-start-media-time.ts`
already documents `anchor-presentation-timeline` as its **sibling**. So this re-landing is
the convergence the model was designed to absorb — and it should *delete* live's
native-PTS space, simplifying the seekable/edge math.

## Phase 1 convergence design (the crux)

**Keep the 0-based model. Add the wall-clock edge as pure playlist arithmetic.**

The live anchor needed two things the VOD model didn't: (a) a shared origin across
independently-parsed renditions, and (b) a **wall-clock edge** (`startDate` = PDT at
media-time 0) for the live seekable window and turnover recovery.

- (a) is subsumed by `deriveSharedMinStartMediaTime` (min across selected A/V origins).
  For live's independently-parsed renditions, PDT may need to feed that seam where `tfdt`
  alone can't align them — resolve during implementation.
- (b) does **not** need buffer ground truth. Live already parses `EXT-X-PROGRAM-DATE-TIME`
  into `Segment.startDate`; the wall-clock origin is `segment.startDate − segment.startTime`
  (0-based `startTime`) — a pure function over the parsed playlist. So `startDate` can be
  stamped at establish-time alongside `startMediaTime`, no `bufferedAnchor` required.

**Design: extend the establishment reactor to stamp the coordinate *triple*.**
`establishStartMediaTime` stays the per-source establishment machine reactor (its
`inactive → monitoring → established`, sticky-per-source shape maps 1:1 onto the anchor's
`unanchored → anchored`). It gains a parallel stamp of `startDate` (from PDT) for the live
case, keeping `startTime` 0-based. Whether this is one behavior with two coordinate outputs
or `establishStartMediaTime` + a thin `establishStartDate` sibling is an **open question**
to settle at implementation — the `establish-start-media-time` docstring frames them as one
establishment concept.

**Delete:** `presentation-anchor.ts` (`positionAllTracksToAnchor`), `buffered-anchor.ts`,
`align-track-timelines.ts`, `resolve-buffered-anchor.ts`, and `placeOnAnchor`. Their purpose
survives; their native-PTS impl does not.

## Component verdicts (from timeline-model synthesis)

| Live component | Verdict |
|---|---|
| `anchor-presentation-timeline` behavior | **RE-DERIVE** — fold into `establishStartMediaTime` (documented siblings); reactor shape survives, guts rebuilt onto `startMediaTime`/`startDate` |
| `presentation-anchor` (`positionAllTracksToAnchor`, `placeOnAnchor`) | **RE-DERIVE/DELETE** — rewrites `startTime` to native; replaced by stamping the triple |
| `buffered-anchor`, `resolve-buffered-anchor` | **DELETE** — origin now from `tfdt` at discover-time, not buffer placement |
| `align-track-timelines` | **DELETE** — subsumed by `deriveSharedMinStartMediaTime` (watch for PDT-feeds-seam for independent renditions) |
| PDT/`startDate` capture in `parse-media-playlist.ts`; `Segment.startDate`, `MediaPlaylistMetadata`, `getMediaPlaylistMetadata` | **SURVIVES** — the wall-clock edge; orthogonal to origin-0 placement |
| Reload loop: `Task`/`RecurringRunner` memoize+clone+previous, `delayed-reschedule.ts`, `reload-policy.ts` | **SURVIVES** — replay untouched, zero anchor coupling |
| EVENT/DVR detection (`PLAYLIST-TYPE` parse) | **SURVIVES** — self-contained |
| `resolve-track.ts` changes (track-load gate injection, per-track runner) | **SURVIVES** — replay (not in current changeset, no conflict) |
| `seek-to-live-edge`, `sync-live-seekable-range`, `live-window` (media/ + primitives/) | **REWIRE** — `seekToLiveEdge` gates on `presentationAnchor`; move gate to "establishment done" (`startMediaTime`/`startDate` present). Window math needs a 0-based-coordinate review (should simplify — native-PTS space is gone) |
| live media-element adapter (`engine-audio-only` / live adapter) | **REWIRE** — mostly independent (Infinity duration, seekable wiring); `seekable`/`currentTime` surface inherits the 0-based review |
| `end-of-stream.ts` completeness gate | **MERGE** — AND live's `duration === Infinity` guard with current's `LAST_SEGMENT_REACHED_SLACK` guard (two independent guards, not pick-one) |

## The 4 literal-conflict files

| File | Live | Current | Type |
|---|---|---|---|
| `media/types/index.ts` | `Segment.startDate`, `Track.startDate`, `MediaPlaylistMetadata`, `Ham.metadata` | `Track.startMediaTime`, `MediaContainerData`, `SegmentData` | Mechanical — keep all; `startTime`/`startMediaTime`/`startDate` is the intended triple |
| `playback/behaviors/dom/end-of-stream.ts` | completeness gate | slack gate | Semantic-composable — AND the two guards |
| `engines/hls/engine.ts` | composes anchor + seek-to-live-edge + sync-seekable + reload config | composes establish + recover-end-stall + relocation pipelines | Semantic — heart of the revision; reconcile the two establishment units into one |
| `engines/hls/index.ts` | exports `MediaPlaylistMetadata`/`getMediaPlaylistMetadata` | exports `DeriveStartMediaTime`/derive fns | Mechanical — union of exports |

## Phase plan (each phase independently reviewable + testable)

- **Phase 0 — pure-orthogonal foundation.** `core/tasks` (`Task` memoize/clone/previous +
  tests, `delayed-reschedule`), `reload-policy`, PDT/`startDate` parsing in
  `parse-media-playlist` + `MediaPlaylistMetadata`, the `Track.startDate`/`Segment.startDate`
  type additions merged with the existing `startMediaTime` triple. Additive, low-conflict.
- **Phase 1 — anchor convergence.** Fold `anchor-presentation-timeline` into the
  establishment reactor; stamp `startDate` from PDT; delete the buffered-anchor/align stack.
  Resolve the open questions below.
- **Phase 2 — live mechanics on 0-based space.** `live-window` + `sync-live-seekable-range`
  + `seek-to-live-edge` (gate rewired to establishment); `end-of-stream` guard merge; live
  adapter. Coordinate-review every window/edge computation for 0-based space.
- **Phase 3 — engine composition.** Reconcile `engine.ts`/`index.ts` — one composition that
  wires establishment (with live `startDate`) + relocation pipelines + live behaviors.
- **Phase 4 — sandbox + EVENT/DVR + fixtures + verification.** Live-hls harness, EVENT/DVR
  classification, test fixtures; end-to-end smoke against Mux LL-HLS + ffmpeg local live.

## Phase 0 carry-over to revisit in Phase 1

`parse-media-playlist.ts` was taken wholesale (identical base). It contains the surviving
PDT/`startDate` + `MediaPlaylistMetadata` parsing **and** a local `placeOnAnchor` /
`presetAnchor` native-anchor placement path (driven off the `previous` track arg). That
path is Phase-1 anchor machinery to be **re-derived/deleted** onto the 0-based model; it's
inert in Phase 0 (no reload behavior passes a `previous` with an anchor yet) and the
exported `parseMediaPlaylist(text, previous)` signature is unchanged, so current callers
(`resolve-track.ts`) still compile.

## Open questions (resolve at implementation)

1. One establishment behavior emitting the triple, or `establishStartMediaTime` +
   a sibling `establishStartDate`? (Docstrings lean toward one concept.)
2. Do live's independently-parsed renditions need PDT to feed `deriveStartMediaTime`, or
   does per-rendition `tfdt` suffice for cross-track alignment under 0-based?
3. What exactly does `seekToLiveEdge` gate on post-convergence — `startMediaTime` present,
   `startDate` present, or a derived "live window derivable" predicate?
4. Live-window/seekable math: confirm it simplifies (not just survives) in 0-based space.

## Verification

Per-phase: `pnpm typecheck` → `pnpm -F @videojs/spf test` (relevant projects) → lint →
build. Phases 2–4 additionally: build spf (`pnpm -F @videojs/spf build`) + restart sandbox,
then Playwright smoke against a real Mux LL-HLS source and the ffmpeg local-live source,
measuring per-SourceBuffer native PTS (not the model) for A/V sync. Full `pnpm test` before
any PR.
