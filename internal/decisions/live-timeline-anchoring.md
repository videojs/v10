---
status: decided
date: 2026-06-15
---

# Live timeline anchoring via PROGRAM-DATE-TIME

## Decision

Anchor the live timeline on `EXT-X-PROGRAM-DATE-TIME` (PDT), not on media
sequence number. PDT gives each segment an absolute wall-clock time (epoch
seconds) used for two things:

1. **Cross-track alignment** — demuxed audio and video are aligned by equal
   PDT (same real instant), not by equal sequence number or per-track relative
   `startTime`.
2. **Turnover recovery** — on a full live-window slide with no overlap, the
   absolute `startTime` is recovered from PDT rather than estimated from
   `targetDuration × offset`.

Scope of this decision: the **anchor source** is PDT. The parser *surfaces*
`Segment.programDateTime` (landed; see Verification). How that anchor drives a
shared presentation timeline — the cross-track adjuster / per-track
`presentationTimeOffset` derivation, and whether the model holds a single
rolling anchor vs. per-segment measured times — is downstream and not fixed
here.

This resolves open questions **[4] sync anchor** and **turnover `startTime`
recovery** in
[live-presentation-modeling](../design/spf/live-presentation-modeling.md).

## Context

For demuxed live HLS, each track is parsed independently and its segment
`startTime`s accumulate from 0, so the same real instant lands at different
per-track `startTime`s (measured: a demuxed Mux CMAF stream put `segment-82` at
`startTime` 2 in video but 0 in audio — a 2 s A/V skew). Sequence number
identifies and orders segments but does not place them in time. The model needs
a shared, absolute anchor that survives variable durations and window turnover.

## Alternatives Considered

- **Sequence × duration.** Reconstruct a segment's time as
  `(seq − seq₀) × duration`. Rejected — it assumes uniform duration, which
  fails three ways: (a) audio and video segment durations differ (AAC frames
  are 1024 samples → a "2 s" audio segment is 2.005 s / 2.048 s, never the
  video's exact duration), so the tracks drift apart; (b) manifests round
  `EXTINF` (both Mux streams advertised integer durations over non-integer
  media), compounding error; (c) once a segment rolls out of the window its
  actual `EXTINF` is gone, so absolute time can't be reconstructed by summing.
  PDT gives each in-window segment its own absolute time, immune to all three.

- **CMAF-HAM `presentationTimeOffset`.** Borrow the model shape from
  common-media-library. Rejected as a *source* — HAM declares the field but
  never populates it for HLS, its HLS mapper accumulates each track from 0
  (same skew as ours), and it drops PDT entirely. We adopt the *name*
  `presentationTimeOffset` for the per-track offset, not HAM's DASH-centric
  (and unimplemented) derivation.

## Rationale

PDT is the mechanism RFC 8216 itself describes for correlating positions across
renditions (§4.3.2.6 associates a segment's first sample with absolute time).
It is optional in RFC 8216 but **required by Apple's HLS Authoring
Specification**, so it is reliably present on conformant content — Mux emits it
on every segment of both the TS and CMAF/LL-HLS profiles we captured. It is the
only anchor that is duration-variance-robust, survives window turnover, and is
already shared across tracks.

**Boundary.** PDT aligns the *manifest* timelines across tracks. It does not by
itself align the *buffer* (native-PTS) coordinate — that rides on CMAF's
common encoded presentation timeline plus the per-track offset learned from
`buffered`/`tfdt` (see [mse-timestamp-offset](./mse-timestamp-offset.md)). Two
distinct steps: PDT → shared manifest timeline (alignment); manifest → buffer
(the learned offset). PDT does the first only.

## Verification

`Segment.programDateTime` (epoch seconds) and PDT capture landed in the parser
(`parse-media-playlist.ts`), covered by `parse-media-playlist.test.ts`:
synthetic cases (capture, EXTINF forward-interpolation, re-anchor on an
explicit tag, variable-duration interpolation, absent-PDT → undefined) and real
Mux fixtures — the demuxed CMAF case asserts video/audio `segment-82` share PDT
while per-track `startTime` disagrees (2 vs 0). PDT-anchored placement and the
cross-track adjuster are not yet implemented.

## See also

- [mse-timestamp-offset](./mse-timestamp-offset.md) — the buffer-layer half;
  the manifest→buffer offset this decision's anchor feeds into.
- [live-presentation-modeling](../design/spf/live-presentation-modeling.md) —
  open questions [4] and turnover recovery, resolved here.
- [non-zero-pts-support](../design/spf/features/non-zero-pts-support.md) —
  consumes the offset-corrected timeline.
