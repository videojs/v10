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

- [ ] Stand up a sandbox harness (the other branch's `apps/sandbox/src/spf-non-zero-pts/`
      isn't here) to drive the real provider on the Mux instant clip + Apple bipbop.
- [ ] Probe negative-DTS on Chromium with `timestampOffset = −origin`.
- [ ] Wire text-cue rebase (X-TIMESTAMP-MAP delta) to match the AV offset.
- [ ] Audit the load behavior's coordinate assumptions.

## Pointers

- Other approach + full problem write-ups: branch `feat/spf-non-zero-pts`
  (`8be855fe9`, `7c0c89aeb`).
- Decision: `internal/decisions/mse-timestamp-offset.md` (§3 relocation mechanism;
  §5 negative-DTS guard; §6 audio sample-continuity; Update(2026-06-26) steered
  *away* from relocation for finite VOD — this spike revisits that).
