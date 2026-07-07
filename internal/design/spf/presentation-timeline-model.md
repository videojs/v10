---
status: draft
date: 2026-07-07
---

# Presentation Timeline Coordinate Model

The coordinate model that lets an SPF engine translate between the three
timelines a streaming presentation lives on — **media**, **presentation**, and
**wall-clock** — and the architecture for **non-zero-PTS `timestampOffset`
relocation** built on it.

This is a design-in-progress for the `timestampOffset`-relocation approach to
non-zero-PTS (spike branch `spike/spf-non-zero-pts-timestamp-offset`). It is the
"how it's modeled and where it lives" companion to the mechanism decision in
[../../decisions/mse-timestamp-offset.md](../../decisions/mse-timestamp-offset.md)
and the feature framing in
[features/non-zero-pts-support.md](./features/non-zero-pts-support.md).

---

## Problem

Zero-PTS VOD let one number do everything. The encoded media, the player's
`currentTime`, and the model's `Track.startTime` were all 0-based and identical,
so the loader could compare `currentTime` to `segment.startTime` directly and the
buffer's native PTS matched what the player displayed.

Non-zero-PTS breaks that identity. A Mux instant clip (`asset_start_time=60`)
encodes its first frame at native PTS ≈ 60s; Apple's bipbop asset starts at 10s.
Now the buffer's native timeline (60→…) and the player's desired 0-based timeline
diverge. Live added a **third** timeline — wall-clock, via
`EXT-X-PROGRAM-DATE-TIME` — and, in doing so, made `Track.startTime` mean
*different things in different engines*: the live anchor rewrites `startTime` onto
native PTS, while VOD keeps it 0-normalized. The same field straddles two
timelines. That ambiguity is the coordinate confusion at the root of the
"non-zero-PTS is hard" problem.

We want (a) one coherent model of the three timelines, and (b) an architecture
that adds relocation to the engine **without touching the simple case** — no
complexity and no bundle cost for the zero-PTS VOD composition that got us this
far.

---

## Three timelines, one instant

A timeline is fixed by knowing one instant's coordinate in it. Pick the
**presentation's origin instant** and record its value in each timeline:

| Field | Timeline | Source |
|---|---|---|
| `startMediaTime` | **media** (encoded/decode) | `tfdt.baseMediaDecodeTime ÷ mdhd.timescale` |
| `startTime` | **presentation** (`currentTime`) | 0 for 0-based product semantics (existing field) |
| `startDate` | **wall-clock** | `EXT-X-PROGRAM-DATE-TIME` (existing field, live) |

All three advance 1:1 in seconds, so **every translation is pure subtraction** —
no scaling (timescale is already folded into `startMediaTime`):

```text
timestampOffset = startTime − startMediaTime          # presentation − media
wallClock(t)    = startDate + (t − startTime)          # time-of-day at presentation time t
```

`startMediaTime` is the one genuinely new field. The relocation offset is
**derived from the triple, not stored** — storing both would be two
representations that drift (see [conventions/signals.md](./conventions/signals.md)).

This model **unifies live anchoring and VOD relocation**: the live anchor is the
`(media ↔ wall-clock)` edge; VOD relocation is the `(media ↔ presentation)` edge.
They are two edges of one triangle, which is why the machinery converges (see
[Open questions](#open-questions)).

### Why `startTime` stays the presentation reference

`startTime` remaining 0-based (not native media) is *why the relocation approach
is simpler downstream than native-PTS*: with the buffer relocated to 0 via
`timestampOffset`, `currentTime`, `seekable`, and the loader's
`currentTime`-vs-`segment.startTime` window math all stay in one 0-based
coordinate. `startMediaTime` (native) is consumed **only** to compute the offset
at the buffer boundary — the loader never sees it. (The native-PTS branch made
`startTime` native and paid for it with coordinate translation everywhere,
including the initial-load stall.)

The cost: because all tracks relocate by the shared *min*, a skewed non-primary
track's 0-based `startTime` sits ~skew below its true buffer presentation time
(Apple: ~44ms for video). Sub-frame, only affects coarse load-window planning —
vastly better than native-PTS's full-origin (60s) mismatch.

---

## One offset, applied polymorphically

The relocation is a single presentation-level value that every track applies as
`presentation = native + timestampOffset` — the application differs, the value
does not:

```text
buffer sample: presentation = sampleNativePTS + timestampOffset   # MSE sets sb.timestampOffset
text cue:      cueFinal     = cueNative       + timestampOffset   # we compute it
               cueNative = LOCAL + MPEGTS/90000 (X-TIMESTAMP-MAP) | absoluteCueTime (no map)
```

Text has no `SourceBuffer`, so it *effectively* has a `timestampOffset` applied
as cue arithmetic. This is the live single-anchor rule
([../../decisions/live-presentation-anchor.md](../../decisions/live-presentation-anchor.md))
in VOD form: **established from the A/V tracks, applied to all tracks including
text.**

**Shared-min across A/V.** The shared `startMediaTime` is `min` across the audio
and video tracks' native origins. `min` (not video-primary, not per-track-own):
- keeps every track's earliest **DTS ≥ 0** (relocating by anything larger drives
  the lower track negative → Chromium append failure);
- **preserves real A/V skew** (Apple's 44ms audio-lead is retained; relocating
  each track to its own 0 would flatten it).

---

## Capability axes (not a tier ladder)

The "tiers" are really **three orthogonal opt-in axes** — a composition enables
what its platform needs:

| Axis | Off / simple | On / complex | Driven by |
|---|---|---|---|
| **Relocation** | no `startMediaTime`, offset 0 | read + apply | is the source non-zero-PTS? |
| **Parser** | presumptive (first box) | track-id-matched | container packaging (muxed `clcp`/extra track?) |
| **Coordination** | single origin | `min`-reduce across A/V | is A/V actually skewed? |

They cross freely — muxed-captions-but-aligned (track-id + single), or
separate-file-A/V-but-skewed (presumptive + `min`). The parser axis is already
built as two tree-shakeable exports (`media/mp4/timestamp-origin.ts`,
committed `cf8aaca45`): `readFirstMediaTimescale`/`readFirstBaseMediaDecodeTime`
(presumptive) vs `findMediaTrack`/`readBaseMediaDecodeTime` (track-id).

---

## Architecture: discover → reduce → apply → consume

The concern decomposes by **locality**, which is what lets the simple case stay
untouched and the pieces share code:

- **Discover** (per-track). An injected fetch-decorator/hook peeks the first
  chunk of the init (`mdhd` timescale, `tkhd` track_id, `hdlr` handler) and the
  first media segment (`tfdt` baseMediaDecodeTime), computing that track's
  `startMediaTime`. It is a **two-source** read across two fetches at two times —
  the init timescale must be retained (a transient signal) until the first media
  segment arrives. Writes per-track **transient signals**, not the Presentation.
- **Reduce** (cross-track). Establish the shared `startMediaTime` (`min`) **once**
  per source (sticky), from the first A/V ground truth. Late tracks (ABR rung,
  late audio/captions) record their own `startMediaTime` but apply the
  *established* offset — no re-reduce. This is the live "establish-once,
  apply-to-all" shape.
- **Apply** (per-track). `SourceBuffer.timestampOffset` is set from **optional
  per-op append metadata**; text cues are shifted by the same value. The *wait*
  (for the offset to resolve) lives in the loader, kept **abortable** for
  source-reset/preempt — so the SourceBufferActor stays apply-only.
- **Consume**. The settled `startMediaTime` lands on the **CMAF-HAM model**
  (`Track`); `timestampOffset` is a `computed` derived from `startTime −
  startMediaTime`. The churn (partial per-track reads, waiting, reduce) lives in
  transient signals and **never** read-modify-writes `state.presentation` — that
  slot is already a lost-update hazard (see `live-presentation-modeling.md`
  §"Model ↔ anchor ↔ resolve-track coupling", #1746).

### Branch-free always-present actors

Because the offset is **constant per source once established**, the pieces that
are present in *every* composition carry no tier conditionals:

- **SourceBufferActor**: `sb.timestampOffset = meta.timestampOffset ?? 0` before
  the append — unconditional, batch-safe (per-op), a no-op in the simple case
  (`?? 0` on an already-0 buffer). No parsing, no waiting, no `appliedFlag`.
  (hls.js wraps this in a tolerance guard against redundant sets on some UAs — a
  cheap safety we can adopt if needed.)
- **SegmentLoaderActor**: always `await`s the offset signal before the first
  append and always includes the (constant) offset in the append meta — instant
  and `0`/absent in the simple case.

All tier variation collapses to **"is the discovery hook injected, and what is
the reduce config."** Everything downstream is shared.

---

## Key decisions

Documented because they were debated.

### `startTime` stays the presentation reference; add `startMediaTime` (media)

**Decision:** `startTime` remains 0-based (presentation); add `startMediaTime`
(native media origin) as the new field. `startDate` stays wall-clock.

**Alternatives:**
- *Make `startTime` honest (native media).* Clean three-field correspondence, but
  ripples through the parser (stop 0-normalizing), the loader (translate every
  `currentTime`-vs-`startTime` comparison), and live's `startDate` math — i.e. it
  *is* the #1746 model cleanup.

**Rationale:** Relocation keeps everything downstream 0-based, so presentation is
the *correct* timeline for `startTime` here; the native origin is needed only to
derive the offset. Keeps the loader coordinate-consistent and the simple case
untouched. The honest-`startTime`-everywhere convergence (which would also
reconcile live's native `startTime`) is a separate, named future effort.

### Shared-`min` origin

**Decision:** relocate all tracks by `min` of the per-track native origins.

**Alternatives:** *per-track-own* (flattens real A/V skew, lossy); *video-primary*
(the field norm — VHS/hls.js — but they sidestep negative-DTS via transmux/offset
math we don't have).

**Rationale:** `min` is the only choice that keeps every DTS ≥ 0 *and* preserves
real inter-track skew for native-PTS relocation.

### Offset derived, not stored; two parsers split for tree-shaking

`timestampOffset` is a `computed` from the model triple, never a stored field.
The presumptive vs track-id parsers are separate exports (not one
optional-selector function) so a caption-free platform tree-shakes the
track-selection machinery (~37% smaller, verified). Application rides optional
per-op append metadata so the always-present actors stay branch-free.

---

## Open questions

- **Generalize the live establishment behavior.** "Reduce" is establish-once +
  sticky + apply-to-all-including-text — which is exactly
  `anchor-presentation-timeline`. Is VOD relocation *literally* that behavior with
  a different reducer and a `presentation`-edge added, or a sibling sharing a
  primitive? This decides whether "reduce" is a `computed` or the stateful
  establishment behavior, and is the current hinge. See
  [../../decisions/live-presentation-anchor.md](../../decisions/live-presentation-anchor.md).
- **Barrier liveness.** In the `min` case, each track's first append waits on the
  other's origin — audio erroring, disabled, or absent must not block forever
  (timeout / audio-disabled short-circuit; both VHS and hls.js special-case this).
- **Holding the first segment across the wait.** The first media segment is held
  (buffered) while the offset resolves, then appended; steady-state streaming is
  untouched. The first-chunk peek is validated to contain the `moof` with a
  ~60–600× margin (first chunk ≥128KB, `moof` ≈0.2–2KB), so no streaming
  box-peeker is needed — but the hold's interaction with preempt/replan needs
  care.
- **`startMediaTime` storage granularity.** Store per-track on `Track` (the
  self-describing triple, leaning yes) vs. only the presentation-level reduced
  value. Operationally the apply needs only the reduced value.
- **Text-only sources.** No A/V `tfdt` to establish from — but the
  `X-TIMESTAMP-MAP` `MPEGTS` *is* a media-timeline reference, so text could
  self-establish. Deferrable special path.
- **Convergence to honest `startMediaTime` everywhere** (the "A" option above),
  which would let live and VOD share one `startTime` semantic. Its own effort.

---

## See also

- [presentation-modeling.md](./presentation-modeling.md),
  [live-presentation-modeling.md](./live-presentation-modeling.md) — the data
  model this extends; #1746 (the concurrently-RMW'd `presentation` hazard) is why
  the churn stays in transient signals.
- [../../decisions/mse-timestamp-offset.md](../../decisions/mse-timestamp-offset.md)
  — the mechanism decision (native-PTS default; relocation for the 0-based cases).
- [../../decisions/live-presentation-anchor.md](../../decisions/live-presentation-anchor.md),
  [../../decisions/live-timeline-anchoring.md](../../decisions/live-timeline-anchoring.md)
  — the live anchor this generalizes.
- [features/non-zero-pts-support.md](./features/non-zero-pts-support.md) — the
  feature framing.
- `packages/spf/src/media/mp4/` — the committed box parser (presumptive +
  track-selected).
- `.claude/plans/spf-non-zero-pts-timestamp-offset-spike.md` — the spike's
  running notes; OSS prior-art survey (buffer-whole is universal;
  establish-then-gate cross-track) captured in agent memory.
