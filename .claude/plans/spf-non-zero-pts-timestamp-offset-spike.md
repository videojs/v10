# Spike: non-zero-PTS via `timestampOffset` (relocate to 0-based)

Exploratory. An alternative to the native-PTS approach spiked on
`feat/spf-non-zero-pts`. Both paths stay live; this branch explores the other one.

## Base

Branched off `7b0d8bbdc` (`feat(spf): parse VTT X-TIMESTAMP-MAP`) — the
mechanism-independent text foundation, needed either way. Deliberately *without*
the native-PTS spike that sits on `feat/spf-non-zero-pts` (commits `7c0c89aeb`,
`8be855fe9`): adapter B-translate, `seekable-window` / `track-seekable-window` /
`seek-to-window-start`, `anchor-presentation-timeline` buffered-pts, parser
`startTimeOffset`/`placeByOffset`, and the observed-native SourceBuffer actor.
Those are all specific to "model native + translate at the adapter" and would
carry conflicting assumptions here.

## The two paths

- **Native-PTS (other branch):** buffer holds native PTS; model re-origined onto
  it; adapter translates the player-facing timeline to 0-based; engine models its
  own `seekableWindow`.
- **This branch — `timestampOffset` relocation:** set
  `SourceBuffer.timestampOffset ≈ −origin` so native PTS 60 lands at 0. Buffer,
  model, and `currentTime` are all 0-based → native `seekable [0,dur]` and
  `duration = content` work without engine-side modeling. Relocate at region
  boundaries (after `abort()` + a keyframe), never per-segment — see
  `internal/decisions/mse-timestamp-offset.md` §3.

## Status & backlog (living — keep current so commits never bury outstanding work)

The design of record is `internal/design/spf/presentation-timeline-model.md`
(reactor architecture). This tracks *implementation* state against it. Tags:
**KEEP** = lasting, review it; **TRANSITIONAL** = in the current diff but slated
for rebuild by the reactor work, so don't over-review; **TODO** = designed, not
built; **REVIEW** = needs your detailed pass; **DEFERRED** = later/open.

### Landed (committed)
- mp4 box parser + decode-time origin — `cf8aaca45`
- presentation timeline coordinate model doc — `555f9fdac`
- spike relocation (boolean/inline approach, since reworked) — `6a20bade9`
- VTT `X-TIMESTAMP-MAP` parse — `7b0d8bbdc`

### Uncommitted — KEEP (messagePipelines step model; typecheck/tests/lint/build green, sandbox-verified)
- `actors/dom/segment-loader.ts` — `Frame`/`LoadStep`/`StepDeps`/`MessagePipelines`,
  `fetchStep`/`dispatchStep` (deps as 3rd arg), `DEFAULT_MESSAGE_PIPELINES`,
  `makeLoadTask` step-runner + inFlight try/finally wrapper.
- `actors/dom/source-buffer.ts` — dropped `CreateAppendMeta`; idempotent
  `timestampOffset` guard retained.
- `behaviors/dom/setup-buffer-actors.ts`, `engines/hls/engine.ts`,
  `engines/hls/index.ts` — `video/audioMessagePipelines` wiring.
- `behaviors/dom/setup-text-track-actors.ts` + its test — relocation-awareness
  removed (resolver injected).

### Uncommitted — TRANSITIONAL (rebuilt by the reactor work; low review priority)
- `engines/hls/relocation.ts` — current `createRelocation` config bundle + bare
  per-track offset signals. → becomes the `establishStartMediaTime` reactor owning
  `mediaContainerData` on `state`, publishing pipelines via context.
- `primitives/origin-discoverer.ts` — self-discriminating single discoverer. →
  splits into two steps (`mdhd` timescale / `tfdt` baseMediaDecodeTime) writing
  `mediaContainerData[trackId]`.
- config→context pipeline wiring (engine/setup) — moves to context-published under
  wiring (A).

### TODO — designed, not built (spec = the timeline doc)
- `establishStartMediaTime` reactor (per-source lifecycle, per-type gating).
- `mediaContainerData` slot on `state` (single dict signal, sync-RMW invariant).
- `deriveStartMediaTime` pure seam (Tier-1 per-track default).
- `Track.startMediaTime` consume + abortable `awaitDefined` apply holdback.
- (A) context-published pipelines; `setup*BufferActors` read from context.

### REVIEW — your detailed pass
- Segment-loader step model end-to-end (the KEEP surface above).
- `Frame` typing calls: `data?: AsyncIterable<Uint8Array>` (kept narrow, *not*
  `AppendData`), `meta?: AppendSegmentMessage['meta']`, the `data!` in `toMessage`.
- Load-behavior coordinate assumptions (see "Load behavior + implicit assumptions"
  below) — still open, applies to relocation.
- Whether TRANSITIONAL files get fully rebuilt vs partially salvaged.

### DEFERRED / open (see the doc's Open questions)
- Tier 2 shared-`min` (a `deriveStartMediaTime` swap) + barrier-liveness bound.
- Holding first segment across the wait; text-only sources.
- Honest-`startMediaTime`-everywhere convergence + live-anchor dedup.
- Suspected pre-existing: text-cue alignment, seek-into-evicted-back-buffer.

## Problems the other branch surfaced — keep in view (likely changed, not gone)

1. **Initial-load stall** (anchor-shift / origin-seek / flush mis-coordination) —
   probably *sidestepped*: 0-based buffer + model + currentTime from the start
   means no post-shift coordinate mismatch. Confirm it doesn't reappear elsewhere.
2. **Seekable `[0,origin)` void + `duration = origin+content`** — both simplified
   away by relocation. No adapter-modeled window, no duration correction.
3. **AV/text coupling** — the one to get right. Relocating AV to 0-based (mechanism
   A) means text cues need the X-TIMESTAMP-MAP delta applied to match
   (`cue_final = cue_LOCAL + MPEGTS/90000 − origin`). The parser in the base feeds
   this; wire it so text rebase tracks the AV offset.
4. **Negative-DTS on Chromium** — the headline `timestampOffset` risk. `−origin`
   could push the earliest B-frame DTS below 0 at the very start (hard append
   failure on Chromium, not Firefox). Probe this first. Also: audio
   sample-continuity across any discontinuity (decision doc §6).

## Load behavior + implicit assumptions (flagged) — applies to BOTH paths

The segment loader / `load-segments` behavior and the actor planning carry implicit
coordinate assumptions (e.g. planning/flush relative to raw `currentTime`, the
`getSegmentsToLoad`/`calculateForwardFlushPoint` window keyed off `currentTime` vs
`track.segments`). On the native-PTS branch this produced the planning-floor half
of the stall (still open there). Either direction may need to rework these
assumptions — don't assume the loader is coordinate-neutral. Audit it explicitly
as the spike progresses.

## TODO

Superseded by the "Status & backlog" section above. Of the original spike probes:
- [x] Sandbox harness — `apps/sandbox/src/spf-non-zero-pts/` exists and drives the
      real provider (Mux instant clip verified 0-based).
- [x] Negative-DTS on Chromium — no append failure observed under relocation.
- [x] Text-cue rebase (X-TIMESTAMP-MAP delta) wired to the AV offset.
- [ ] Audit the load behavior's coordinate assumptions — still open (REVIEW backlog).

## Pointers

- Other approach + full problem write-ups: branch `feat/spf-non-zero-pts`
  (`8be855fe9`, `7c0c89aeb`).
- Decision: `internal/decisions/mse-timestamp-offset.md` (§3 relocation mechanism;
  §5 negative-DTS guard; §6 audio sample-continuity; Update(2026-06-26) steered
  *away* from relocation for finite VOD — this spike revisits that).
