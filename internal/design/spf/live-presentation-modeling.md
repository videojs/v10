---
status: draft
date: 2026-06-12
---

# Live Presentation Modeling

The data-model extension for streaming presentations that **change over
time** — live, and the related DVR / event-stream variants. Companion
to [presentation-modeling.md](./presentation-modeling.md), which models
a presentation as a *one-shot parse* (the VOD assumption baked into the
engine today); this doc adds the categories the model needs once a media
playlist is re-fetched repeatedly and its content slides forward.

It defines **what** the model captures for live and **how** that's
shaped — protocol-agnostically, capturing change over time, without
conflating categories that change at different rates. It is a model /
"why" doc, not an implementation plan: the parser refactor and the
reload-loop behavior that *consume* this model are
[live-stream-support](./features/live-stream-support.md) +
`.claude/plans/` territory.

**Scope.** The foundation is **sliding-window live** (segments roll off
the front; standard HLS live). Explicitly downstream, called out where
they touch the model but not designed here:
[dvr-event-stream-support](./features/dvr-event-stream-support.md)
(growing window),
[ll-hls-support](./features/ll-hls-support.md) (partial segments / delta
playlists), `EXT-X-DISCONTINUITY` handling, and the A/V-sync-via-
`timestampOffset` decision ([non-zero-pts-support](./features/non-zero-pts-support.md)).

**Audience:**
- **Engine contributors** building the reload loop / parser refactor —
  for the categories and where each lives.
- **Format-extension contributors** — the live concepts here are
  protocol-neutral (DASH `@type=dynamic` etc. map onto the same homes).
- **Debuggers** working live timeline / sync issues.

---

## Problem

The model in [presentation-modeling.md](./presentation-modeling.md)
assumes **one-shot resolution**: `resolvePresentation` parses the
manifest once, each track's media playlist is fetched once, and
`Track.segments` is a permanent list. For live that's wrong on every
axis:

- The media playlist is **re-fetched** on a cadence; segments **append**
  at the live edge and **roll off** the front.
- Duration is **open-ended** until the stream ends.
- Separate audio / video media playlists must stay **time-aligned**
  across their independent reloads.

And the current types drop everything live needs. `parseMediaPlaylist`
recognizes but discards `EXT-X-TARGETDURATION`, `EXT-X-PLAYLIST-TYPE`,
and `EXT-X-ENDLIST` (see `packages/spf/src/media/hls/parse-media-playlist.ts`),
never reads `EXT-X-MEDIA-SEQUENCE` or `EXT-X-PROGRAM-DATE-TIME`, and the
`MediaPlaylistInfo` type that *names* the playlist-level fields is
**orphaned** — nothing produces it (the parser merges straight into a
`Track`). Two snapshot-local artifacts actively break on the first
reload: `segment.id` is `segment-${index}` (position within *this*
parse) and `startTime` accumulates from `0` each parse — so after
roll-off, the same media segment gets a new id and a new start time.

So before any reload behavior exists, we have to decide *what* to model
and *how* — and the central discipline is **not conflating categories**:
"when should this playlist be re-fetched" is not the same kind of thing
as "what segments does this playlist contain at time *t*."

---

## The category decomposition

The move: data that today is lumped onto `Track` or dropped actually
falls into distinct categories that **change at different rates** and
**serve different consumers**. Separating them *is* the design.

| Cat | Concept | Protocol-neutral home | Changes… |
|---|---|---|---|
| **[1] Content snapshot** | the windowed segment list at time *t* | per-track | every reload (append + roll-off) |
| **[2a] Stream nature** | `streamType: live \| on-demand` | `Presentation` | never (stable for the source) |
| **[2b] Completeness** | will it keep changing? → duration finite vs `Infinity` | presentation duration | once (terminal transition) |
| **[3] Refetch policy** | suggested reload cadence | *separate from [1]* | ~stable |
| **[4] Sync anchor** | wall-clock anchor for a shared timeline | per-segment → presentation-level | per discontinuity region |
| **[5] Derived surface** | live edge, seekable window, DVR window | computed, not stored | continuously |

The change-rate column is itself the argument for the split: the segment
list churns every reload, the nature is fixed, the policy is ~constant,
the anchor moves only at discontinuities. Entangling them — as today's
`Track` does, and as CMAF-HAM's internal `Manifest` does (see
[Prior art](#prior-art)) — drags the stable facts around with the
churning snapshot.

### [1] Content snapshot — a windowed, mergeable segment list

A resolved track's content is a **snapshot at time *t***, not a
permanent list. Each reload yields a new snapshot that must be
**merged** into the retained one. Three identifiers do three distinct
jobs and compose:

- **media-sequence — the merge arithmetic (primary).** `EXT-X-MEDIA-
  SEQUENCE` is the sequence number of the first segment; it is monotonic
  and immutable per segment (advances as the window slides). So the
  merge is pure arithmetic:
  `offset = next.firstMediaSequence − prev.firstMediaSequence` is how
  many rolled off the front, `prev[offset]` aligns with `next[0]`, and
  anything past prev's tail is new. No scanning for the overlap — and it
  distinguishes the edges informatively: `offset ≥ prev.length` means a
  full window turnover (everything new), which it *knows* rather than
  inferring from "zero matches."
- **URL + byteRange — the equality check / fallback.** Per the HLS spec,
  a server may only append to the end and remove from the front; a
  segment's URI is stable while it remains in the playlist. So
  `prev[offset].url === next[0].url` (with byteRange — byterange streams
  share a URL) **validates** the arithmetic alignment, and is the
  fallback when a non-conformant server resets sequence numbers. Our
  `Segment` already carries both `url` and `byteRange`.
- **`segment.id` — the stable model handle.** Kept as a modeled field,
  separate from the cross-snapshot identity question.

**`startTime` stability.** media-sequence gives identity, ordering, and
new-vs-old exactly — but *not* absolute `startTime` across a full
turnover, because rolled-off durations are gone and per-segment
durations vary (counting segments ≠ counting time). The common path is
covered: the spec's removal rule (a live playlist must retain ≥ 3×
target duration) **guarantees consecutive reloads overlap**, so we carry
`startTime` forward from the matched overlap and accumulate `EXTINF` for
the new tail — exact. Only the no-overlap recovery case (long
background / stall) needs the [4] PDT anchor, or accepts an estimate.

**Naive → optimized.** Naive: re-parse + offset-splice every reload.
Optimizations later: skip the merge when `mediaSequence` is unchanged
(this is literally the spec's "wait one-half target duration" backoff),
then avoid re-allocating the carried-over portion. Delta playlists
(`EXT-X-SKIP`) stay deferred with LL-HLS.

**Known limitation: URL recycling.** A server that recycles segment
filenames (a ring buffer faking live by looping fixed files) violates
URL uniqueness across the stream lifetime. media-sequence is immune;
URL-only identity is not. We accept this as a known limitation because
it is **self-consistently out of scope**: a conformant recycling stream
inherently repeats encoded timestamps and so requires `EXT-X-
DISCONTINUITY` at the loop point — which we've deferred anyway. Real
live (Mux, or ffmpeg with monotonic timestamps + unique URLs) is
unaffected.

### [2a] Stream nature — `streamType`

A new `streamType: 'live' | 'on-demand'` on `Presentation`: the
semantic, consumer-facing nature of the source, stable for its life.
**Derived from `EXT-X-PLAYLIST-TYPE` alone** — `VOD → on-demand`;
everything else (`EVENT`, or the tag absent) `→ live`. Crucially, this
axis is **orthogonal to completeness ([2b])**: `EXT-X-ENDLIST` never feeds
it. That's the payoff — a *live stream that has ended* (finite duration,
no refetch) stays distinguishable from an *on-demand asset* (also finite,
no refetch) by `streamType`, instead of collapsing into "they look the
same." (Note this is the axis DASH models only implicitly — DASH's
`@type=dynamic/static` is really [2b], not [2a].)

### [2b] Completeness — expressed as duration finiteness

Whether the presentation will keep changing — and therefore whether
refetch is needed and when `endOfStream` becomes reachable — is
**expressed as duration finiteness**, not a separate flag: ongoing live
→ `duration = Infinity`; complete (`EXT-X-ENDLIST` observed) → finite.
This reuses the existing pluggable `config.resolveDuration` hook (see
[mse-mms-pipeline](./features/mse-mms-pipeline.md)) — no new model field.
The equivalence holds for **both** sliding-window *and* event/growing
streams (both are `Infinity` while live → finite on termination); the
sliding-vs-event difference lives entirely in [5] (`seekableStart`), not
here.

### [3] Refetch policy — separate from content

`EXT-X-TARGETDURATION` drives the suggested reload cadence (reload ≈ 1×
target; ½× on an unchanged playlist). This is the category the
decomposition most insists on isolating: it is a **delivery / scheduling**
concern, *not* part of the time-*t* content snapshot, even though HLS
happens to deliver both in the same playlist text.

**Realized** (`feat/spf-hls-live`) as a pure §6.3.4 cadence function
`mediaPlaylistReloadDelay(current, previous)` (`media/hls/reload-policy.ts`) — full
target on a changed window, ½× on an unchanged one, `null` once complete — consumed
by `delayedReschedule` + a `RecurringRunner` (`core/tasks/`) that owns the loop but
knows nothing about time. Fetch scheduling landed **per-track**: each `resolveXTrack`
owns its runner (see the [placement open question](#open-questions)). A failed reload
is **not** retried by the policy — the rejection propagates and ends that track's
recurrence; transient-fetch resilience (retry/backoff) is a fetch-layer concern
deferred to [network-resilience](./features/network-resilience.md), kept out of the
cadence. "Changed" is detected from the full-segment window (`mediaSequence` + segment
count); a parts-only LL-HLS update is invisible to it, which
[ll-hls-support](./features/ll-hls-support.md) must extend.

### [4] Sync anchor — `PROGRAM-DATE-TIME`

`EXT-X-PROGRAM-DATE-TIME` is captured per-segment in the snapshot. It is
the **wall-clock anchor common across separate renditions** — the spec's
designated mechanism for keeping demuxed audio and video aligned. The
model's job here is to *capture* PDT; the presentation-level anchor
derivation and *how it drives per-track `timestampOffset`* is the
deferred A/V-sync decision (see [Open questions](#open-questions) and
[non-zero-pts-support](./features/non-zero-pts-support.md)). PDT alone
suffices as a sync anchor under the no-mid-stream-discontinuity
assumption this foundation makes; `EXT-X-DISCONTINUITY(-SEQUENCE)` is
deferred (it is not live-exclusive — ad-stitched VOD has it too — and is
exactly *when* `timestampOffset` must be recomputed).

### [5] Derived surface — computed, never stored

The consumer-facing live vocabulary —
[media-ui-extensions](#prior-art) `streamType`, `liveEdgeStart`,
`seekable` (with `end()` constrained to the seekable live edge),
`targetLiveWindow`, and `duration = Infinity` — is **entirely
derivable** from [1]–[4] (e.g. `liveEdgeStart ≈ seekable.end() − 3×
targetDuration`). The model's job is to capture [1]–[4] cleanly enough to
*produce* these, not to store them. This matches
[live-stream-support](./features/live-stream-support.md)'s "live edge is
a derived signal, not a state slot." The one place sliding vs event
diverges is the `seekableStart` derivation (sliding advances; event/DVR
pinned at the first retained segment).

---

## Type-shape implications

What this means for `packages/spf/src/media/types/index.ts` and the
parser — at the "what / why" level; the parser refactor and merge
behavior are the implementation efforts that consume this.

- **`Segment`** — keep `id`; add optional `programDateTime` ([4]). Identity
  via `url` + `byteRange` already present.
- **Per-snapshot media-playlist representation** — the live fields
  (`mediaSequence`, `targetDuration`) belong to *the playlist at time t*,
  which is what the orphaned `MediaPlaylistInfo` was reaching for. The
  parser refactor's central question is whether to **resurrect
  `MediaPlaylistInfo` as the real parser output** (a faithful per-fetch
  representation, assembled/merged into `Track` separately) or keep
  merging into `Track` and hang the fields there. The snapshot/merge
  model argues for a faithful per-fetch representation. This is the seam
  where this doc meets the parser refactor.
- **`Presentation`** — add `streamType` ([2a]). Completeness ([2b]) rides the
  existing `duration` field. Refetch policy ([3]) realized per-track — each
  `resolveXTrack` owns a `RecurringRunner` driven by an engine-injected reschedule.

---

## Prior art

- **HLS spec (RFC 8216bis).** The invariants this model leans on:
  media-sequence monotonic + immutable per segment; `EXTINF` immutable
  per segment; the ≥ 3×-target-duration retention rule (which guarantees
  reload overlap); reload cadence (≈ 1× target, ½× unchanged); PDT as the
  per-segment cross-rendition wall-clock anchor; `PLAYLIST-TYPE` /
  `ENDLIST` as the two orthogonal nature/completeness signals.
- **CMAF-HAM** (`common-media-library`) — *cautionary.* Its mappers model
  the content snapshot only and **drop** media-sequence (hardcodes 0),
  endlist, playlist-type, and PDT. Where it gestures at policy (the
  internal, unexported `Manifest` with `type: dynamic` /
  `minimumUpdatePeriod` / `timeShiftBufferDepth`) it **lumps refetch
  policy onto the same container as content** — the exact [1]/[3] conflation
  we're avoiding. It confirms the homes we need but offers no clean one
  to copy.
- **media-ui-extensions** — the [5] consumer vocabulary: `streamType`
  (`live` / `on-demand`), `liveEdgeStart`, constrained `seekable`,
  `targetLiveWindow` (`0` / finite / `Infinity` — non-DVR / sliding-DVR /
  full-DVR), `duration = Infinity` for live.

---

## Key decisions

Documented because they were debated; alternatives weighed.

### Segment identity: media-sequence arithmetic, URL+byteRange as check

**Decision:** Merge snapshots by media-sequence arithmetic; use
URL+byteRange to validate the alignment and as the fallback when
sequence numbers can't be trusted; keep `segment.id` as a separate model
handle.

**Alternatives:**
- *URL+byteRange only* — works for the steady-state overlap and needs no
  sequence field, but requires *scanning* to find the overlap and can't
  distinguish a full turnover from corruption (both look like "zero
  matches").
- *Minimize fields (drop media-sequence)* — optimizes field count at the
  cost of update-logic complexity.

**Rationale:** Optimizing update-logic simplicity beats minimizing
fields. Retaining media-sequence makes the merge pure arithmetic and
handles the turnover edge *more* informatively, with URL+byteRange a
cheap correctness guard layered on top.

### `streamType` orthogonal to completeness

**Decision:** Derive `streamType` from `PLAYLIST-TYPE` alone; express
completeness as duration finiteness; never let `ENDLIST` touch
`streamType`.

**Alternatives:**
- *Fold "ended live looks like VOD" into on-demand* — i.e. let
  endlist-at-first-fetch mean on-demand. Rejected: it leaks [2b] into [2a],
  the very conflation we're avoiding, and erases the live-vs-was-live
  distinction.

**Rationale:** Keeps the two axes independent and the live-ended state
expressible. Accepted cost: an untagged true-VOD (no `PLAYLIST-TYPE:VOD`)
is labeled `live` — behaviorally invisible (refetch gates on
duration/endlist, not `streamType`), only the label differs. Matters
more for VJS-as-general-player than for well-tagged sources; `unknown`
stays available as a hedge if a real consumer is bitten.

### Discontinuities, LL-HLS, and the `timestampOffset` strategy are out of scope

**Decision:** The foundation assumes continuous timestamps and no
mid-stream discontinuities; PDT is captured but its consumption into
`timestampOffset` is deferred.

**Rationale:** Discontinuity handling is not live-exclusive and is its
own concern; LL-HLS is a separate XL feature; and the A/V-sync question
(how PDT drives per-track `timestampOffset`) is the genuinely hard
downstream decision that this model should *enable* rather than
prematurely fix.

---

## Open questions

- **[3] Refetch-policy placement — DECIDED (fetch scheduling per-track).** In
  HLS each media playlist (= each `Track`) carries its own
  `TARGETDURATION`; in DASH, `minimumUpdatePeriod` is MPD-level
  (presentation). Per-track bakes an HLS assumption; presentation-level
  fights HLS's per-playlist reality. Landed (`feat/spf-hls-live`) as the
  anticipated split: **fetch scheduling is per-track** — each `resolveXTrack`
  owns a `RecurringRunner` paced by its own `TARGETDURATION` — while
  cross-track **timeline reconciliation** stays separate (the parser carries
  the timeline forward per fetch; `anchorLiveTracks` aligns renditions by PDT).
  So fetch scheduling is independent without the timeline reconciliation being
  forced independent, as this question anticipated.
- **[4] How captured PDT feeds the A/V-sync anchor — DECIDED (anchor source).**
  Resolved in [live-timeline-anchoring](../../decisions/live-timeline-anchoring.md):
  align demuxed audio/video by equal PDT (same real instant), not by
  sequence number or per-track zeroing. The parser now surfaces
  `Segment.programDateTime`. Still open downstream: how that anchor drives a
  shared presentation timeline (the cross-track adjuster / per-track
  `presentationTimeOffset`), and the separate manifest→buffer offset
  ([mse-timestamp-offset](../../decisions/mse-timestamp-offset.md)). Couples
  back to discontinuity handling when that lands.
- **Parser output shape — resurrect `MediaPlaylistInfo` or hang fields on
  `Track`?** The snapshot/merge model wants a faithful per-fetch
  representation; today's parser merges into `Track`. This is the parser
  refactor's load-bearing call.
- **Turnover `startTime` recovery — DECIDED.** When no overlap exists (long
  background/stall), recover absolute `startTime` from PDT rather than the
  lossy `targetDuration × offset` estimate — see
  [live-timeline-anchoring](../../decisions/live-timeline-anchoring.md).
  (The `placeOnPreviousTimeline` no-overlap branch still uses the estimate;
  swapping it to PDT is the follow-up.)
- **`streamType` first-fetch ambiguity.** Accept untagged-VOD → `live`,
  or introduce `unknown`?
- **DVR / event windowing.** `dvr-event-stream-support` reintroduces a
  "growing but not complete" notion (finite-but-increasing duration)
  that duration-finiteness alone can't express, plus the variant-specific
  `seekableStart` producer. Out of scope here; flagged so the foundation
  doesn't assume sliding-window everywhere.

---

## See also

- [presentation-modeling.md](./presentation-modeling.md) — companion;
  the static/VOD snapshot, the `Presentation` types, and the parser
  interface this doc extends. Required reading.
- [features/live-stream-support.md](./features/live-stream-support.md) —
  the engine behaviors (reload loop, sliding window, termination) built
  on this model; the implementation target.
- [features/dvr-event-stream-support.md](./features/dvr-event-stream-support.md),
  [features/ll-hls-support.md](./features/ll-hls-support.md) — downstream
  variants that extend [1]/[5] and the reload loop.
- [features/mse-mms-pipeline.md](./features/mse-mms-pipeline.md) —
  `config.resolveDuration → Infinity` is the [2b] surface; `endOfStream`
  becomes reachable once completeness commits.
- [features/non-zero-pts-support.md](./features/non-zero-pts-support.md) —
  the [4] `timestampOffset` / A/V-sync concern.
- [features/clusters.md § Manifest reload loop](./features/clusters.md#manifest-reload-loop)
  — the cluster this work anchors.
- `packages/spf/src/media/types/index.ts`,
  `packages/spf/src/media/hls/parse-media-playlist.ts` — the types and
  parser the refactor touches.
- [RFC 8216bis](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis),
  [common-media-library](https://github.com/AcademySoftwareFoundation/common-media-library)
  (CMAF-HAM), media-ui-extensions proposals `0010-stream-type`,
  `0007-live-edge`, `0000-target-live-window`.
</content>
</invoke>
