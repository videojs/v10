---
status: draft
date: 2026-07-23
---

# Live Presentation Timeline Coordinate Model

The **live** extension of the coordinate model in
[presentation-timeline-model.md](./presentation-timeline-model.md). That doc fixed
the three-timeline model (media / presentation / wall-clock) and shipped it for
**VOD**, explicitly parking the live convergence in its
[Open questions](./presentation-timeline-model.md#open-questions). This doc is that
convergence: how the `startTime` / `startMediaTime` / `startDate` triple behaves for
a **sliding live window**, and what that means for re-landing the live work onto the
`startMediaTime` / `timestampOffset` model (Phase 1 of
[`.claude/plans/spf-hls-live-relanding.md`](../../../.claude/plans/spf-hls-live-relanding.md)).

**Status: draft — still being figured out.** The sections under
[What's settled](#whats-settled) are the working contract we've agreed on; the
[Open questions](#open-questions) are not yet resolved. This exists so the reasoning
survives a branch switch, not because it's final.

---

## The core principle: a frozen anchor, live availability

The triple is a **frozen origin**; the segment list is the **live availability truth**.
Both are derived from segments, but in two different modes:

- The **anchor** is derived from segments **once** and then frozen for the source's
  life (more precisely: per continuity range — see
  [What's settled](#the-anchor-is-frozen-per-continuity-range-not-forever)).
  `startTime = 0`, `startMediaTime` (decode value at the origin), `startDate`
  (wall clock at the origin). Establish-once, sticky-per-source — the same shape the
  original live `anchor-presentation-timeline` reactor had (`unanchored → anchored`,
  short-circuit once published).
- **Availability** — the sliding DVR/live window — is a **live read** over the current
  `segments` array on every reload, never stored on the anchor:
  `windowStart = segments[0].startTime`, `windowEnd = last.startTime + last.duration`.

This is what makes "the numbers shouldn't update over time for live" true and precise:
the *origin* never moves; only per-segment `startTime` values extend forward as the
window slides and old ones roll off. It is consistent with the relocation side already
in the codebase — `timestampOffset = −startMediaTime` targets a **fixed presentation-0**,
never a sliding `startTime`.

---

## What's settled

### One instant, three reference frames (recap)

There is a single physical instant — **presentation-0**, the origin of the presentation
timeline — and the three "start" quantities are that one instant expressed in three
frames. (This is the [Three timelines, one instant](./presentation-timeline-model.md#three-timelines-one-instant)
table; repeated here with the live emphasis.)

| Frame | Track-level field (origin projected into this frame) | Unit |
|---|---|---|
| **Presentation** (`currentTime` / `seekable`) | `startTime` — the origin in its own frame, so **≡ 0** | s from presentation-0 |
| **Media / decode** (`tfdt.baseMediaDecodeTime ÷ mdhd.timescale`) | `startMediaTime` — decode-clock value **at presentation-0** | s on decode clock |
| **Wall clock** (PDT) | `startDate` — epoch-seconds value **at presentation-0** | epoch s |

Both foreign-frame projections are the *same operation* — a segment's value in that
frame minus its presentation position:

```text
startMediaTime = (segment bmdt ÷ timescale) − segment.startTime    # the segmentStartTime term
startDate      =  segment.startDate          − segment.startTime
```

Both invariant along the linear timeline, so any measured (resp. PDT-bearing) segment
gives the same answer.

### Per-segment vs per-track: the reused keys mean different things

`startTime` and `startDate` exist on **both** `Segment` and `Track`:

| Field | Meaning |
|---|---|
| `Segment.startTime` | that segment's position **on** the presentation timeline (0-based) |
| `Segment.startDate` | that segment's **own** absolute wall clock (PDT of its first sample) |
| `Track.startDate` | wall clock at the track **origin** = `Segment.startDate − Segment.startTime` |

`Segment.startDate` and `Track.startDate` differ by `−startTime` — same key name, two
different numbers. `Segment.startDate` is the per-segment source of truth; the track
value is the one anchor derived from it.

### `startDate` is the comparable frame for live

For VOD, the frame that makes video's and audio's origins comparable is a shared
**decode-clock** origin — both come off one encode, so `bmdt/ts` values live in a
common frame and their difference is *real* A/V skew.

For live with independently-parsed renditions that assumption dies: each rendition's
`tfdt.baseMediaDecodeTime` is on its own encoder timeline with no shared zero, so
`bmdt/ts` is **not** comparable across renditions. The only shared frame is wall clock.
So for live, **`startDate` (PDT) is the comparable clock.**

### The live frame plugs into the *existing* `startMediaTime` formula

No separate live coordinate path is needed. The origin formula is
`ownOrigin = bmdt/timescale − segmentStartTime`, where `segmentStartTime` is
`segment.startTime` — a *presentation* position. So if PDT alignment runs **first** —
each rendition's `segment.startTime := segment.startDate − Presentation.startDate(anchor)` —
then `segmentStartTime` is already on the shared wall-clock-derived frame, and
`ownOrigin` becomes exactly *"native PTS at the PDT-aligned presentation-0."* The
existing reducer then runs unchanged.

**This is why the PDT-first ordering is load-bearing** — not just for the wall-clock
edge, but because it's the substitution that makes `startMediaTime` a
`startDate`-referenced quantity for live. `startDate` supplies the *frame*;
`startMediaTime` still does the per-type native→presentation *relocation* on top of it
(needed regardless — a live-edge `bmdt` is large and must be relocated to 0-based).

Because establishment is sticky-once, the order is also a correctness constraint: if
`startMediaTime` latches against a pre-alignment local-from-0 `startTime`, the
`timestampOffset` is wrong by exactly the alignment shift.

### `startMediaTime` is shared across track types — under a stated assumption

The default reducer (`deriveSharedMinStartMediaTime`) computes `min` across the selected
A/V origins and stamps that one value onto **every** type. Whether that shared value is
*correct* is coupled to whether the renditions share a decode-clock origin:

- **Shared decode origin** (VOD; coordinated single-packager live): the per-type
  own-origin difference **is** genuine skew (bipbop's 44 ms audio-lead). `min` preserves
  it while keeping every DTS ≥ 0. → **shared-min** (the default).
- **Independent decode origins** (uncoordinated live): the own-origin difference is a
  *spurious* clock offset, not skew. `min` mispositions one type by exactly that offset;
  **per-type** (each relocates by its own origin) lands each type exactly on its PDT
  position. → **`derivePerTypeStartMediaTime`**.

Nothing in the bytes distinguishes these cases, so the derive seam is a **policy /
documented assumption, not a runtime detection.** For the target (Mux single-packager
LL-HLS) the assumption is **shared decode timeline**: PDT/`startDate` does cross-rendition
window alignment + the wall-clock edge, and shared-min preserves genuine A/V skew.

Two honest limits: PDT is segment-granular and coarse, so it cannot manufacture
sub-frame A/V sync absent a shared encoder timeline (consistent with Chrome pacing the
audio clock from decoded sample counts); and ingesting uncoordinated-encoder live would
require flipping the seam to per-type.

### Track-level for now

`stampTracks` already denormalizes the shared value onto every track, so "keep it
per-track" means we keep writing the same value onto each track rather than introducing
a `Presentation`-level field. The presentation-level hoist of `startDate` stays a future
cleanup, not a Phase 1 prerequisite. (Since the default is a single shared scalar, a
future presentation-level anchor would not need a per-type `startMediaTime` map — one
scalar covers it, the per-type variant being the non-default exception.)

### Presentation-0 sits at the join point, not the true stream origin

Where presentation-0 lands is a free choice once the anchor is frozen. We pin 0 at the
first-loaded window's origin (the join point) rather than extrapolating back to
media-sequence 0. Availability then slides relative to a fixed 0; DVR fall-off is just
`currentTime < segments[0].startTime`. This avoids trusting `targetDuration`-based
extrapolation across the unseen past.

### The anchor is frozen per continuity range, not forever

"Frozen" means per source / per continuity range. A source change re-establishes
(sticky-per-source). A mid-stream `EXT-X-DISCONTINUITY` where the decode clock jumps is
**not** an anchor re-establishment — it's a per-append `timestampOffset` change on the
segments after it, handled at the segment/loader level. The anchor is the origin of the
reference (first) continuity range. Out of scope for Phase 1, but it bounds the
"`startMediaTime` fixed forever" claim.

---

## Definitional collisions to fix

These only bite once `Track.startTime ≠ 0` — i.e. exactly the live case. Resolving them
is part of Phase 1, before touching the establishment reactor.

1. **Relocation-offset formula.** `Track.startMediaTime`'s docstring
   (`media/types/index.ts`) says the offset is `startTime − startMediaTime`, but
   `relocation-pipelines.ts` applies `timestampOffset = −startMediaTime`. These agree
   only when `startTime = 0`. **The code is correct** — relocation targets
   presentation-0; `Track.startTime` plays no part. Fix the docstring to `−startMediaTime`
   / "at presentation-0."

2. **`Track.startTime` "always 0" vs. the live parser.** The type comment says *"Track
   startTime is always 0,"* and the triple is documented as "the value at `startTime`
   (the origin)." But `parse-media-playlist.ts` returns `startTime: placed.startTime`,
   which for live carry-forward is the *current window's first-segment position* —
   nonzero and growing. **Resolution (settled):** `Track.startTime ≡ 0` (the origin); the
   sliding window edge is `segments[0].startTime`, derived, never the anchor. The parser
   writing a nonzero track `startTime` is the bug to fix.

3. **`Track.startDate` stale old-model prose.** Its docstring still says *"provisional
   from the manifest… later refined from the buffer (`buffered`/`tfdt`)… the offset a
   cross-track aligner removes."* In the 0-based model `startDate` is pure playlist
   arithmetic (no buffer refinement), and the "cross-track aligner" it names
   (`align-track-timelines`) is deleted in Phase 1. Rewrite.

4. **`startMediaTime === undefined` overloads two states** — "not yet established"
   (during `monitoring`) vs. "established but effectively zero, left native" (near-zero
   VOD). `established()` keys off presence, so worth a definitional note; VOD-side, minor.

---

## What Phase 1 produces (contract summary)

- Anchor triple frozen per source (per continuity range), **track-level** for now:
  `startTime ≡ 0`, `startMediaTime` (shared, decode frame), `startDate` (wall-clock frame).
  Segments remain the live availability truth.
- **Live:** `startDate` is the comparable frame. PDT-align `segment.startTime` **first**,
  so the existing `ownOrigin` / shared-min reducer produces a `startDate`-referenced
  `startMediaTime` with no new coordinate path.
- Derive seam (shared-min vs per-type) = **documented assumption** (shared decode timeline
  for Mux), not a runtime detection.
- Fold the live anchor into the `establishStartMediaTime` establishment reactor (same
  sticky-per-source shape); delete the buffer-sourced anchor stack (`buffered-anchor`,
  `resolve-buffered-anchor`, `align-track-timelines`, buffer-sourced
  `positionAllTracksToAnchor`). `placeOnAnchor` is a **rewire** candidate — it already
  shifts by a PDT delta (0-based-correct); the delete target is its *anchor source*
  (buffer → PDT), pending a sign-trace against a real mid-join window.

---

## Open questions

Not yet resolved — the "more to discuss" this doc is a checkpoint for.

1. **One establishment behavior vs. `establishStartMediaTime` + a sibling
   `establishStartDate`.** The sticky-once ordering constraint (PDT origin must settle
   before `startMediaTime` latches) argues for one concept with an internal order, or a
   split with an explicit gate (`startMediaTime`'s `monitoring` blocked until the
   `startDate` origin is present). Leaning one-unit; unconfirmed.
2. **Independent-rendition alignment mechanics.** Exactly how PDT feeds the shared origin
   when video and audio playlists are parsed independently — which segment's PDT, how the
   shared `Presentation.startDate` is chosen (min? first selected?), and how it's stamped
   onto shells so the parser's `placeOnAnchor` aligns each rendition on first resolve.
3. **What `seekToLiveEdge` gates on post-convergence** — `startMediaTime` present,
   `startDate` present, or a derived "live window derivable" predicate.
4. **`placeOnAnchor` keep-vs-delete** — confirm the shift signs against a captured
   mid-join Mux LL-HLS window before committing to rewire (keep) or delete.
5. **How tracks *should* work** more broadly (the user-flagged larger question) — the
   per-track vs presentation-level anchor split is deferred (track-level for now), but the
   final shape is open.
6. **Where the sliding-window edge lives** if not `Track.startTime` — derived from
   `segments[0].startTime` at read time, or a distinct stored field? (Leaning derived.)

---

## See also

- [presentation-timeline-model.md](./presentation-timeline-model.md) — the VOD model
  this extends; its Open questions park exactly this convergence.
- [`.claude/plans/spf-hls-live-relanding.md`](../../../.claude/plans/spf-hls-live-relanding.md)
  — the re-landing plan; this doc is its Phase 1 conceptual contract.
- [../../decisions/mse-timestamp-offset.md](../../decisions/mse-timestamp-offset.md) —
  native-PTS default; relocation for 0-based cases.
- `internal/decisions/live-presentation-anchor.md`,
  `internal/decisions/live-timeline-anchoring.md` — the original buffer-sourced live
  anchor this replaces. **On the reference branch `feat/spf-hls-live`, not yet re-landed
  here.**
- `internal/design/spf/live-presentation-modeling.md` — the live data model (sliding
  window, media-sequence carry-forward). **On `feat/spf-hls-live`, not yet re-landed
  here** (the carried-over `presentation-timeline-model.md` also links it).
- `packages/spf/src/playback/behaviors/establish-start-media-time.ts`,
  `packages/spf/src/media/hls/parse-media-playlist.ts` — the code the contract lands in.
