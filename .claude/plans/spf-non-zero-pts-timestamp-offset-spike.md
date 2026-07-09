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
**KEEP** = lasting, review it; **TODO** = designed, not built; **REVIEW** = needs
your detailed pass; **DEFERRED** = later/open.

### Landed (committed)
- mp4 box parser + decode-time origin — `cf8aaca45`
- presentation timeline coordinate model doc (+ reactor rearchitecture) — `555f9fdac`, `ae1b0beee`
- spike relocation (boolean/inline approach, since reworked) — `6a20bade9`
- VTT `X-TIMESTAMP-MAP` parse — `7b0d8bbdc`
- messagePipelines step model (loader step pipelines) — `041cecca6`

### Uncommitted — KEEP (reactor + config-pipelines; typecheck/tests/lint/build green, A/V sandbox-verified 0-based)
- `behaviors/dom/establish-start-media-time.ts` — **new**. Two pieces:
  - **Steps** (`relocationMessagePipelines`): a plain config array. `discover`
    (`readInitTimescale`/`readSegmentOrigin`) writes `state.mediaContainerData`;
    `stampStartMediaTime` reads that track's origin back and sets `timestampOffset`.
    Steps read composition `state` from their call-time `deps` — no closures, no
    context. One map serves both track types (steps key by the segment's trackId).
  - **Reactor** (`establishStartMediaTime`): 3 states — `inactive` (clears the slot
    per source) / `monitoring` (derive effect = injected `deriveStartMediaTime` seam
    → writes `Track.startMediaTime`, the consume) / `established` (derive disabled,
    sticky). Owns `mediaContainerData` on `state`; selection **optional/defensive**.
- `primitives/head-peek.ts` — **new** generic eager head-peek (replaces the old
  self-discriminating `origin-discoverer`).
- `media/types/index.ts` — `Track.startMediaTime` + `MediaContainerData`.
- `actors/dom/segment-loader.ts` — `StepDeps` widened with the composition
  `{ state, context, config }` (opaque conduit; loader never reads them).
- `behaviors/dom/setup-buffer-actors.ts` — reads relocation pipelines from **config**
  (`video/audioMessagePipelines`), threads composition deps into the loader. No context slots.
- `engines/hls/engine.ts` — composes the reactor before `setup*BufferActors`;
  bakes `video/audioMessagePipelines = relocationMessagePipelines` + `mediaContainerData`
  slot + `deriveStartMediaTime` config. All comment-marked for easy removal.
- `engines/hls/index.ts` — exports `DeriveStartMediaTime` + `derivePerTrackStartMediaTime`.
- **Deleted:** `engines/hls/relocation.ts`, `primitives/origin-discoverer.ts`.

### REVIEW — your detailed pass
- The reactor + steps end-to-end (KEEP surface above).
- **`StepDeps` typing:** steps get composition `{state,context,config}` typed loose
  (`AnySlotMap`); relocation asserts its slots via `containerSlot(deps)` (one cast,
  since it legitimately knows the composition provides them). OK, or want it tighter?
- **Liveness:** relocation applies only when a *complete* origin (`timescale` +
  `baseMediaDecodeTime`) is discovered; else native (offset 0) — stops TS /
  containerless / mock sources from hanging.
- Load-behavior coordinate assumptions (see below) — still open.

### TODO — outstanding for relocation
- **Tier-agnostic apply** (deferred by staging): Tier-1 `stampStartMediaTime` reads
  the *raw* discovered origin from `mediaContainerData`, not the reduced
  `Track.startMediaTime`. Tier 2's shared-`min` is where stamp reads the reduced
  model value — revisit the stamp/`established` interaction then.
- **Text-cue relocation** — DROPPED with `relocation.ts`; captions on a non-zero-PTS
  source aren't rebased. Reinstate a relocating `resolveTextTrackSegment` reading the
  primary video track's `startMediaTime`.
- **Composition opt-in / tree-shaking** — baked into the standard engine (per decision)
  with comment markers; revisit a tree-shakeable opt-in + measure Tier-0 bundle.

### DEFERRED / open (see the doc's Open questions)
- Tier 2 shared-`min` (a `deriveStartMediaTime` swap) + barrier-liveness bound.
- Audio-only composition wiring (reactor baked into the standard engine only).
- Honest-`startMediaTime`-everywhere convergence + live-anchor dedup.
- Suspected pre-existing: seek-into-evicted-back-buffer.

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
