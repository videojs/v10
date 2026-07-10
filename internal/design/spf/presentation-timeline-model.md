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

Whatever `startMediaTime` a track is given (own in Tier 1, shared `min` in
Tier 2), the relocation applies the same way — `presentation = native +
timestampOffset`, `timestampOffset = startTime − startMediaTime` — only the
*application* differs:

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

**Shared-`min` across A/V (Tier 2).** When A/V is skewed, the shared
`startMediaTime` is `min` across the audio and video tracks' native origins
(Tier 1 gives each track its own). `min` (not video-primary, not per-track-own):
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

## Architecture: discover → derive → apply, established by a reactor

A per-source reactor, **`establishStartMediaTime`**, owns the coordinate
establishment; the byte-level work rides **steps** in a plain config
`messagePipelines` array (`relocationMessagePipelines`) woven into the segment
loader's pipelines. The loader ships a Tier-0 `fetch → dispatch` pipeline and stays
oblivious to relocation; the steps read composition `state` from their call-time
`deps` (no closures, no context), so the reactor and the pipeline steps are
decoupled — **the reactor never touches pipelines**. Enabling relocation = composing
the reactor + supplying the steps as config (+ optionally a `deriveStartMediaTime`
seam); a Tier-0 composition does neither.

**The `establishStartMediaTime` reactor** has three states, driven by a `monitor`:
`inactive` (no resolved presentation — clears the transient `mediaContainerData`
slot on entry, so each source starts fresh) → `monitoring` (runs the **derive
effect**) → `established` (the selected A/V tracks carry `startMediaTime`; disables
the derive — establish-once, sticky per source, like the live anchor). Selection
signals are **optional/defensive**, so the one reactor composes across video-only /
audio-only / both. Per-source freshness is structural (the `inactive` transition
clears the slot), not a hand-rolled reset.

- **Discover** (per-type steps). Head-peek steps read the init (`mdhd` timescale)
  and the first media segment (`tfdt` baseMediaDecodeTime, plus that segment's
  0-based `startTime`) and write them into `mediaContainerData`, a
  `Signal<Record<TrackType, { timescale?; baseMediaDecodeTime?; segmentStartTime? }>>`
  **keyed by track type** (`'video'`/`'audio'`) — one init+media pair per type
  suffices, and ABR rungs of a type share the entry. It's a **two-source** read
  across two appends, but the slot *is* the shared state (init writes `timescale`,
  the first media segment writes `baseMediaDecodeTime`+`segmentStartTime`), so the
  steps are independent — no shared closure, no self-discrimination. Writes are
  **synchronous** RMW of disjoint keys (the sync-merge invariant keeps this clear
  of the #1746 hazard). Runs on the *fetched* stream, so transport stays pure
  `fetchBytes`. `segmentStartTime` is recorded because the origin is
  `baseMediaDecodeTime/timescale − segmentStartTime` — the first *loaded* segment
  isn't necessarily the 0th (non-zero initial `currentTime`, live/DVR).
- **Derive** (reactor effect). Watches `mediaContainerData` (+ selection for
  Tier 2) and, via the injected **`deriveStartMediaTime`** seam, writes the settled
  per-type `startMediaTime` onto the `Track`s (each type's value stamped on every
  track of that type). The seam is **pure** —
  `(mediaContainerData, ctx) => Record<TrackType, number | undefined>` — `undefined`
  means "not ready yet"; the effect is the sole writer of the field. It's the
  **only tier knob**: Tier 1 gives each type its own
  (`baseMediaDecodeTime/timescale − segmentStartTime`); Tier 2 writes the `min`
  across the selected A/V origins to every type. No Presentation-level field is
  needed — Tier 2 just denormalizes the min across the per-type entries.
- **Apply** (per-track step). A stamp step relocates via `timestampOffset =
  startTime − startMediaTime`, which the SourceBufferActor applies to
  `SourceBuffer.timestampOffset`. **Tier 1** reads the type's *own* discovered
  origin (`bmdt/ts − segmentStartTime`) straight from `mediaContainerData` —
  populated by the discover step earlier in the same pipeline, so it's synchronous,
  independent of the derive/model, and robust to `established` + late tracks. When no complete origin
  is found (TS / containerless / 0-PTS) it leaves the append native (offset 0).
  Reading the *reduced* `Track.startMediaTime` instead — tier-agnostic apply, needed
  for Tier 2's shared `min` — is a deferred follow-up (it's where an abortable
  `awaitDefined` holdback on the model value comes back). Text-cue relocation is
  currently dropped; both are tracked in the spike plan's backlog.

### Consume: `startMediaTime` lives on the model

The settled `startMediaTime` lands per-track on the **CMAF-HAM `Track`**, a peer
of `startTime` (presentation) and `startDate` (wall-clock). It's a coordinate base
value that *defines the timeline relationships*, so it belongs on the model, not a
parallel slot; `timestampOffset` stays derived (`startTime − startMediaTime`),
never stored.

The **churn** — partial per-track reads across appends — stays in the transient
`mediaContainerData` slot and never touches `presentation`. Only the *settled*
value reaches the model, written by the derive effect as **sole writer** of the
field. That write does share `presentation`'s existing multi-writer situation
(#1746, addressed at the presentation-ownership level); we accept that rather than
distort the model to dodge it. This is also where relocation and the live anchor
**converge** — both are "an establishment unit writing coordinate base values onto
tracks" (the anchor writes `startTime`/`startDate`, relocation writes
`startMediaTime`) — the flagged eventual dedup.

### Branch-free always-present actors

The pieces present in *every* composition carry **no relocation vocabulary at
all** — not even a no-op'd seam. Relocation lives entirely in the reactor and its
injected steps; the Tier-0 pipeline is literally `[fetch, dispatch]`:

- **SegmentLoaderActor**: owns only the invariant skeleton (`fetchStep`,
  `dispatchStep`, in-flight bookkeeping, between-step abort checks) and a
  `messagePipelines` factory that defaults to `fetch → dispatch`. It does not
  fetch-whole, parse, wait, or know what a `timestampOffset` is.
- **SourceBufferActor**: sets `sb.timestampOffset` only when the append meta
  carries one, idempotent-guarded (`meta.timestampOffset != null &&
  sb.timestampOffset !== meta.timestampOffset`) so re-stamping the constant offset
  on later appends is a no-op. Absent = untouched. Apply-only.

All tier variation collapses to **the reactor and its injected steps + derive
seam**; the loader and buffer actors are shared, and Tier 0 imports no relocation
code.

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

### Relocation is a per-source reactor; `startMediaTime` on the model via a pure derive seam

**Decision:** relocation is the `establishStartMediaTime` reactor (per-source
lifecycle), not a config bundle of loose signals. Discovery and apply are loader
pipeline steps; **derive** is the reactor's effect, driven by a **pure injected
`deriveStartMediaTime` seam** that maps `mediaContainerData` → per-track
`startMediaTime`. The churn lives in the transient `mediaContainerData` slot; the
settled value lands on `Track` (the effect is its sole writer).

**Alternatives:** *a behavior with a hand-rolled reset effect* (the reactor's
entry/exit gives per-source reset + teardown for free, structurally); *the reduce
as a `computed`* (can't write the model — and putting `startMediaTime` on the
model is the point, per the consume decision); *keeping the transient state
module-local rather than on `state`* (it's coordinate state the model consumes, so
it belongs on `state`, defined through the reactor).

**Rationale:** the reactor matches the per-source lifecycle relocation actually
has (and that `setupBufferActors` already models), makes stale-write races
structural rather than guarded, and isolates the one tier difference into a pure,
testable seam.

### Shared-`min` origin (the Tier-2 `deriveStartMediaTime`)

**Decision:** the coordination axis is entirely the `deriveStartMediaTime` seam.
Tier 1 writes each track its own origin; Tier 2 writes the `min` across the
selected A/V origins onto **every** track. `startMediaTime` stays per-track on
`Track` in both tiers — Tier 2 denormalizes the min across the per-track slots, so
no Presentation-level field is required and **apply is unchanged** across tiers.

**Alternatives:** *per-track-own for skewed A/V* (flattens real A/V skew, lossy);
*video-primary* (the field norm — VHS/hls.js — but they sidestep negative-DTS via
transmux/offset math we don't have); *a Presentation-level shared value* (not
needed — the seam denormalizing onto tracks keeps the read path uniform).

**Rationale:** `min` is the only choice that keeps every DTS ≥ 0 *and* preserves
real inter-track skew; expressing it as a swap of the derive seam means Tier 2 is
one function change with no movement in discover, apply, or wiring.

### Offset derived, not stored; two parsers split for tree-shaking

`timestampOffset` is a `computed` from the model triple, never a stored field.
The presumptive vs track-id parsers are separate exports (not one
optional-selector function) so a caption-free platform tree-shakes the
track-selection machinery (~37% smaller, verified). Application rides optional
per-op append metadata so the always-present actors stay branch-free.

### Offset applied via append meta, not a dedicated message (revisitable)

**Decision:** the offset is carried on each media segment's append meta
(`meta.timestampOffset`) and applied by the SourceBufferActor's
`appendSegmentTask` (idempotent-guarded). A relocating composition's `stampOffset`
pipeline step writes it onto the meta before `dispatch` (absent in Tier 0, whose
pipeline has no such step; the step may be async — see
["One offset, applied polymorphically"](#one-offset-applied-polymorphically)).
Setting the offset is **not** its own SourceBuffer message today.

**Alternative:** a dedicated `set-timestamp-offset` SourceBuffer message the
loader schedules as its own task — cleaner separation of buffer configuration
from append payload, and the natural shape once each actor's *messages* are
decoupled from the concrete *Tasks* they translate into (segment-loader
`planTasks`/`makeLoadTask`/`scheduleAll`; SourceBufferActor `messageTaskFactories`).

**Rationale:** the offset is constant per source, so meta-carried + idempotent
apply costs nothing and needs no new protocol. And meta-per-segment *generalizes*:
HLS discontinuities and DASH multi-period re-base `timestampOffset` per period, and
carrying it on each append gets correct in-order application for free via the
`SerialRunner` — a standalone message would have to be interleaved into the append
stream to match. "Set once" is the special case we happen to be in.

**Left open:** promoting offset-setting to its own message remains a valid future
move; the mid-stream offset-*change* case (discontinuities / multi-period) is the
likely forcing function, though even then meta-per-segment may still win. Nothing
in the current seam precludes the switch — this is a deliberate "not yet," not a
closed door.

---

## Open questions

- ~~**Generalize the live establishment behavior.**~~ *Resolved (mechanism).* VOD
  relocation is a **sibling** of `anchor-presentation-timeline`, not literally it:
  a per-source establishment unit (`establishStartMediaTime` reactor) writing a
  coordinate base value onto tracks, with the tier logic in a pure derive seam
  rather than a `computed`. The two share the "establish-once, apply-to-all"
  *shape* (and both write per-track base values → the #1746 multi-writer surface).
  Whether they should be **one unit** — the anchor writing `startDate`/`startTime`
  and relocation writing `startMediaTime` folded into a single establisher — is
  the remaining, larger dedup, still future. See
  [../../decisions/live-presentation-anchor.md](../../decisions/live-presentation-anchor.md).
- **Barrier liveness.** For Tier 2, `deriveStartMediaTime` returns `undefined`
  until the selected A/V origins are all present, and the apply-side
  `awaitDefined` holds each first append until then — so audio erroring, disabled,
  or absent must not block forever. The holdback needs a bound (timeout /
  audio-disabled short-circuit inside the seam's "when"); both VHS and hls.js
  special-case this.
- **Holding the first segment across the wait.** The first media segment is held
  (buffered) while the offset resolves, then appended; steady-state streaming is
  untouched. The first-chunk peek is validated to contain the `moof` with a
  ~60–600× margin (first chunk ≥128KB, `moof` ≈0.2–2KB), so no streaming
  box-peeker is needed — but the hold's interaction with preempt/replan needs
  care.
- ~~**`startMediaTime` storage granularity.**~~ *Resolved.* Per-track on `Track`
  (the self-describing triple), in both tiers — Tier 2 denormalizes the shared
  `min` across the per-track slots rather than introducing a presentation-level
  field. Promotion to a `Presentation`-level base value is a possible future move
  if a real de-dup need appears, but Tier 2 does not force it.
- **Text-only sources.** No A/V `tfdt` to establish from — but the
  `X-TIMESTAMP-MAP` `MPEGTS` *is* a media-timeline reference, so text could
  self-establish. Deferrable special path.
- ~~**Discovery doesn't belong in the fetch abstraction.**~~ *Resolved.* Discover
  is now a head-peek discover step run on the *fetched* byte stream inside the
  loader, not a fetch decorator — transport stays pure `fetchBytes`, and parsing
  mp4 boxes / writing the raw values into `mediaContainerData` sits where it
  belongs (a content concern). It keeps the per-track, byte-first, no-double-fetch
  properties.
- **Convergence to honest `startMediaTime` everywhere** (the "A" option above),
  which would let live and VOD share one `startTime` semantic. Its own effort.

---

## See also

- [presentation-modeling.md](./presentation-modeling.md),
  [live-presentation-modeling.md](./live-presentation-modeling.md) — the data
  model this extends; #1746 (the concurrently-RMW'd `presentation` hazard) is why
  the churn stays in the transient `mediaContainerData` slot.
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
