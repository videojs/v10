---
status: decided
date: 2026-06-24
---

# Single presentation-level live timeline anchor

## Decision

Hold **one** rolling presentation-level anchor — a `(media-time ↔ PDT)`
correspondence — and apply it to **every** selected track, rather than pinning
each track to its own buffer.

The anchor is **learned from whichever selected audio/video track first has
SourceBuffer ground truth**: the buffer pin (`resolveBufferedAnchor`) reports a
buffered segment's actual native-PTS start `M₀`, paired with that segment's PDT
`P₀`. From that one pair, any track's segment is placed by its own PDT:

```
segment.startTime = M₀ + (segment.programDateTime − P₀)
```

Established **once** per source (pin-once — it surfaces drift rather than
masking it; the parser's PDT carry-forward maintains the timeline across
reloads). Before any A/V track has buffer ground truth, the manifest estimate
(the existing bootstrap) supplies an *estimated* anchor of the same shape, which
the buffer pin later upgrades.

This anchor covers **text tracks too** — they have no SourceBuffer to pin, so
the shared anchor is the *only* way to place them. WebVTT cues are assumed
already time-aligned (the analog of assuming encoded A/V samples are aligned);
what we align is the text track's **segment** timeline, by PDT, exactly as for
A/V. (That cues are sparse/overlapping — a cue may begin or end outside its
segment's nominal bounds — is a text *loader/eviction* concern, not an
anchoring one.)

Scope: this fixes the **single rolling anchor vs. per-segment measured times**
question deferred by [live-timeline-anchoring](./live-timeline-anchoring.md),
and realizes the *manifest → buffer* half of that decision's Boundary as a
single shared anchor.

## Context

[live-timeline-anchoring](./live-timeline-anchoring.md) settled the anchor
*source* — PDT, the universal wall clock shared across renditions — but left
open how that anchor drives a shared presentation timeline. Today's
`anchor-live-tracks` pins each selected A/V track to its own buffer
independently, and doesn't anchor text at all.

Two facts make a single shared anchor sufficient — and per-track pinning
redundant:

1. **MSE plays all SourceBuffers on one element timeline.** There is a single
   `currentTime`; audio and video are coerced onto one native-PTS coordinate.
2. **Native-PTS default** ([mse-timestamp-offset](./mse-timestamp-offset.md)) —
   no `timestampOffset`, so every track shares the encoder's PTS clock.

Under (1) + (2) there is no inter-track skew, so one track's `(media-time ↔
PDT)` pair describes all tracks; further pins would only restate it. And text —
which has no buffer to pin — can be placed *only* by a shared anchor.

**Assumption committed:** no inter-track PTS skew. This is the existing
live-model assumption (native-PTS default); per-track skew correction remains
deferred to
[non-zero-pts-support](../design/spf/features/non-zero-pts-support.md). If skew
ever needs handling it layers a per-track offset on top of the shared anchor —
it does not require returning to per-track pinning.

## Alternatives Considered

- **Per-track buffer pins (today's `anchor-live-tracks`).** Pin each selected
  A/V track to its own buffered segment. Rejected: under the no-skew assumption
  the pins necessarily *agree*, so the extra pins are redundant restatement;
  and the approach structurally **cannot anchor text**, which has no
  SourceBuffer — keeping it would force a separate, divergent text path for the
  same concern.

- **Per-track PDT estimate only (no buffer truth).** Place every track from the
  manifest estimate (`sequence × avgDuration` + PDT) and never pin. Rejected:
  drops the authoritative correction — the estimate is duration-variance-prone
  (it produced an observed ~27 s drift at window turnover), and the buffer pin
  is what makes the timeline exact. The estimate is the right *bootstrap*, not
  the final answer.

## Rationale

PDT is already the cross-track anchor source; this decision commits to **one**
anchor instead of N. The win is uniformity: audio, video, and text all position
by the same `(media-time ↔ PDT)` rule, so the behavior has one code path, text
stops being a special case, and "first track to buffer wins" makes the anchor
available as early as possible. Pinning once (not per reload) keeps the
drift-surfacing property: if a track's PDT disagrees with the established
anchor, it shows up as a visible desync rather than being silently re-corrected
every reload.

This promotes open question **[4] sync anchor** in
[live-presentation-modeling](../design/spf/live-presentation-modeling.md) from
"per-segment / per-track" to "presentation-level," as that doc anticipated.

## Verification

Implemented. `anchor-live-tracks` is a two-state reactor (`unanchored →
anchored`): `unanchored` positions every selected track from the manifest
estimate; entering `anchored` establishes the shared anchor once from the first
selected A/V track with buffer ground truth, then positions all selected tracks
(incl. text) onto it. The old per-track pin primitives
(`anchorTrackToBufferedSegment` / `anchorTrackToSequenceOrigin`) are removed.

Unit-covered (`anchor-live-tracks.test.ts`): one A/V pin placing audio + text by
PDT; first-track-wins (video preferred); pre-pin estimate → buffer-pin upgrade;
pin-once (no re-pin across reloads); inert when no PDT / no resolved track. Live
end-to-end (a real stream with subtitles) is not yet smoke-tested.

## See also

- [live-timeline-anchoring](./live-timeline-anchoring.md) — the anchor *source*
  (PDT); this decision resolves its deferred "single rolling anchor vs.
  per-segment measured times" question.
- [mse-timestamp-offset](./mse-timestamp-offset.md) — native-PTS default; the
  manifest → buffer offset half this anchor realizes.
- [non-zero-pts-support](../design/spf/features/non-zero-pts-support.md) — where
  per-track skew correction lands if the no-skew assumption ever breaks.
- [live-presentation-modeling](../design/spf/live-presentation-modeling.md) —
  open question [4], promoted to presentation-level here.
- [live-stream-support](../design/spf/features/live-stream-support.md) — the
  `anchor-live-tracks` behavior that implements this.
