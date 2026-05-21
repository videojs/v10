---
status: draft
date: 2026-05-20
definition: technical
---

# Non-zero PTS support

Time-mapping primitive for sources where media-segment PTS
(Presentation Timestamps) don't start at zero. Three motivating
source types — re-mastered VOD, deliberate instant clips, and live
streams — all share the same underlying mechanism: detect the first
segment's PTS, apply a negative `timestampOffset` to the SourceBuffer,
and map MSE-side time back to user-visible `currentTime` starting at
zero. The cluster B foundation; consumed by every cluster A feature
([live-stream-support](./live-stream-support.md),
[dvr-event-stream-support](./dvr-event-stream-support.md),
[ll-hls-support](./ll-hls-support.md)) for correct `currentTime` /
`seekable` semantics.

A **Media-src feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
without it, live and instant-clip sources play with wrong
`currentTime` (a live stream's playhead jumps to hours/days into the
session because PTS is large; an instant clip's playhead starts at
the original media's PTS rather than 0).

Combines Notion epic #6 ("Non-zero PTS / Instant Clip Support") scope:
non-zero PTS and instant clips share the same time-mapping primitive,
distinct motivations.

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. No
  PTS-handling code in `packages/spf/src/` (no `timestampOffset`,
  `initPTS`, or `EXT-X-DISCONTINUITY` references). Engine implicitly
  assumes zero-based PTS — works for typical Mux Video VOD sources
  (transcoded with PTS rebased to zero) but breaks for live + clips.
- **Definition depth:** technical — scope and SPF touchpoints
  articulated against MSE `timestampOffset` semantics + HLS spec;
  implementation specifics open. Source material: [SPF Epics Working
  Doc — epic #6 Non-zero PTS / Instant Clip Support](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  (cluster B, Media-src, eng L, validation M).
- **Foundational** for cluster B — first cluster B doc. Consumed by
  every cluster A feature (live, DVR, LL-HLS) for correct `currentTime`
  semantics. Discontinuity-handling (mid-stream PTS jumps via
  `EXT-X-DISCONTINUITY` or encoder restart) is carved out as a sister
  candidate feature.

## Phases of complexity

Content phases by source-type. All three use the same underlying
mechanism (first-segment-PTS detection + `timestampOffset`
application); they differ in motivation, customer-data context, and
composition with other cluster A features.

| Phase | Source type | What | Notes |
|---|---|---|---|
| Non-zero-PTS VOD | Re-mastered or processed VOD where the manifest retains original PTS rather than zero-rebasing the source. Source has stable, non-zero PTS throughout. Often the result of clipping / transcoding pipelines that preserve PTS | Detect first-segment baseMediaDecodeTime from init segment (MP4 `tfdt` box, timescale-aware). Compute `presentationTimeOffset = -baseMediaDecodeTime / timescale`. Apply via `sourceBuffer.timestampOffset = presentationTimeOffset` before any append. User-visible `currentTime` now starts at zero | The baseline non-zero PTS case. Mechanism is one-time setup (offset detected once, applied once, never changes during source lifetime) |
| Instant clips (deliberate offset) | Sources where the consumer / Mux Video creates a clip by serving a manifest starting at a non-zero PTS (the clip's start position in the original media). User-visible `currentTime` should still start at zero | Same mechanism as non-zero-PTS VOD. **Plus:** optionally surface the original PTS to the consumer for telemetry / "watch from minute N of source" use cases. Customer-data hooks: HLS `EXT-X-START` time-offset attribute (if present) or manifest-level clip metadata can hint at the offset | The deliberate-clip case. Engine treats it identically to non-zero-PTS VOD; the difference is that the offset is intentional and the value carries meaning customer-side (e.g., for Mux Data telemetry mapping the clipped-content currentTime back to original-media position) |
| Live streams with non-zero PTS | Live encoder PTS counts from broadcast / encoder start. First segment loaded by the engine has a large PTS (potentially hours/days). Sliding-window updates roll segments off the start as live progresses; the *seekable range* slides forward but the offset itself is stable within an encoder run | Same first-segment-PTS-detection mechanism. **Composes with:** [live-stream-support](./live-stream-support.md)'s `setLiveSeekableRange` — the live window's start/end are offset-corrected to user-visible time. **Composes with:** [dvr-event-stream-support](./dvr-event-stream-support.md)'s growing-window — start = first-segment PTS - offset; end = live edge PTS - offset. **Composes with:** [ll-hls-support](./ll-hls-support.md)'s partial-segment edge tracking — same offset applies | The live-specific case. Encoder restart (new encoder run on the same source URL) is one of the discontinuity scenarios carved out to the sister feature |

## What's in scope vs out of scope

**In scope:**
- All three source-type phases for HLS content with non-zero PTS
- Init-segment PTS extraction (MP4 `tfdt` parsing; HLS spec `EXT-X-PROGRAM-DATE-TIME` correlation when present)
- `SourceBuffer.timestampOffset` application before initial segment
  append
- Engine-side `currentTime` / `seekable` mapping (engine reports
  offset-corrected values throughout)
- `EXT-X-START` HLS spec attribute parsing for clip-start offset hints
- Composition with cluster A features (live, DVR, LL-HLS) — their
  seekable-range writers consume the offset-corrected values

**Out of scope (separate Borderline-flavored candidate features):**
- **`[discontinuity-handling]`** *(new candidate, sibling of this
  feature)* — mid-stream PTS jumps via `EXT-X-DISCONTINUITY` tags,
  encoder restarts on the same source URL, 33-bit PTS rollover
  (~26 hours of 90kHz timestamps). The *initial offset* is stable;
  this feature handles that. The *changes mid-stream* are the sister
  feature's concern. Both consume the same time-mapping primitive
  internally.
- **Cluster B sub-cluster: Borderline content compensation** —
  `[pseudo-ended-detection]`, `[edit-list-compensation]`,
  `[buffer-stall-recovery]`. All build on this feature's primitive
  but address different content-defect concerns.

**Out of scope (different architectural layer):**
- Customer-facing display of original-media position (e.g., "watching
  minute 3 of 60-minute source via 10-minute clip"). Engine surfaces
  the offset; adapter/customer renders the UI.
- Mux Data telemetry mapping of clipped currentTime → original-media
  position. Service-side / adapter-side.
- `EXT-X-PROGRAM-DATE-TIME` wall-clock display (synced to original
  broadcast time). Engine exposes the value; consumer UI renders
  "broadcast wall clock" if needed.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **PTS-detection location: parser vs MSE-side.** Two shapes for
  extracting baseMediaDecodeTime: (a) parse the init segment in the
  engine (MP4 box parsing for `tfdt` + timescale) before passing to
  SourceBuffer; (b) attach a parser to the streaming `fetchStream`
  chunks that emits a PTS-detected event. Option (a) is simpler but
  adds MP4-box-parsing code; option (b) leverages the streaming
  pipeline. Lean: (a) — init segments are small and already buffered
  before the segment-stream begins; a one-shot parser at append time
  is the cleanest insertion point.
- **`timestampOffset` write timing.** MSE requires `timestampOffset`
  to be set on the SourceBuffer **before** appending the segment
  whose PTS the offset corrects. This sequences against
  [mse-mms-pipeline](./mse-mms-pipeline.md)'s segment-append flow:
  setup → setMediaKeys (if DRM) → addSourceBuffer →
  detect-PTS-from-init-segment → set timestampOffset → append init
  segment → append media segments. Adds a stage to the MSE setup
  pipeline.
- **State slot for the offset.** New slot:
  `presentationTimeOffset: { [trackType: 'video' | 'audio']: number }`
  or similar. Per-type (video and audio can have independent PTS
  origins; usually correlated but not guaranteed). Read by:
  `setLiveSeekableRange` writer (live + DVR + LL-HLS), engine-side
  `currentTime` consumers (telemetry, customer hooks), and any
  cluster B sister feature.
- **`currentTime` semantics — engine-side vs DOM-side.** The
  `<video>` element's `currentTime` is already offset-corrected
  (because `timestampOffset` was applied at append time). So
  consumers reading from the DOM get the corrected value naturally.
  Engine-side `state.currentTime` mirrors DOM-side; no separate
  mapping required after the offset is applied to the buffer.
- **`seekable` range semantics.** Browser-reported `seekable` is
  offset-corrected too (because the buffer was filled with
  offset-corrected timestamps). For live + DVR, the engine's explicit
  `setLiveSeekableRange(start, end)` call must pass offset-corrected
  values — engine reads `presentationTimeOffset` and computes
  user-visible range.
- **Live + encoder-restart scenario.** When a live encoder restarts
  on the same source URL, the new PTS series starts at a different
  value than the previous one. Without `EXT-X-DISCONTINUITY` tags,
  this looks identical to a malformed stream; with them, it's a
  proper discontinuity. The sister `[discontinuity-handling]`
  candidate covers this. Boundary: this feature handles "single
  stable PTS origin per source"; discontinuity handles "PTS origin
  changes mid-source."
- **Init-segment PTS vs first-media-segment PTS.** The init segment
  doesn't contain media samples (no `tfdt` per the spec strictly);
  the first media segment carries the `tfdt`. PTS detection happens
  on the **first media segment append**, not on init append. This
  affects the offset-write sequencing: `timestampOffset` must be
  set before the first media segment append, not before the init
  segment append. Verify behavior.

## Open questions

- **PTS-detection implementation: parser depth.** Full MP4 box
  parser inside SPF vs targeted `tfdt`-only extractor vs depend on
  an external `mp4box.js`-style library. Lean: targeted extractor
  (small surface, only what's needed).
- **`EXT-X-PROGRAM-DATE-TIME` consumption.** HLS spec attribute
  giving wall-clock time per segment. Useful for: (a) correlating
  user-visible time with broadcast time; (b) cross-checking
  PTS-detected offset (if `EXT-X-PROGRAM-DATE-TIME` is present,
  verify the offset computation is consistent); (c) exposing to
  consumer telemetry. Open whether to surface this through engine
  state (new slot) or only via parser-output.
- **`EXT-X-START` parsing.** HLS spec attribute giving a desired
  playback-start offset (typically a few seconds before live edge
  for live, or arbitrary for VOD). Should the engine respect this
  by setting initial `currentTime`, or expose to consumer? Lean:
  expose; let consumer decide.
- **Per-type offset (video vs audio).** Theoretically independent;
  usually correlated. Treat as `{ video: number, audio: number }`
  or assume video offset applies to both? Empirical question;
  start with per-type to be safe.
- **Discontinuity boundary semantics.** The discontinuity sister
  feature handles mid-stream offset changes. The boundary between
  this feature (stable offset) and that one (offset changes) is
  drawn at "single PTS origin per source." A stream with one
  `EXT-X-DISCONTINUITY` after segment 100 sits in the sister
  feature's territory.
- **Telemetry / customer-data offset exposure.** Surface
  `presentationTimeOffset` to consumers for telemetry (Mux Data,
  custom analytics)? Lean: yes — read-only via the engine state
  surface or a derived signal.
- **`currentTime` near zero for non-zero-PTS VOD.** After offset
  applied, `currentTime` starts at zero. Some browsers may behave
  unexpectedly when `seekable.start(0)` is exactly 0 (vs floating-
  point slightly above zero). Worth empirical verification on
  Safari, especially.
- **Composition with capability-probing.** When the browser doesn't
  decode the codec, the engine fails before reaching this feature's
  PTS handling. Boundary: capability-probing filters unsupported
  variants upstream; this feature operates on the variants that
  pass. No direct dependency.

## Related features

- **[live-stream-support](./live-stream-support.md)** *(consumer)* —
  consumes this feature's offset for `setLiveSeekableRange` start /
  end and for `currentTime` semantics during live playback. Cluster
  A foundation that this feature is the cluster B foundation
  prerequisite for.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)**
  *(consumer)* — same as live-stream-support but with growing-window
  semantics; the offset still applies, the seekable start is
  offset-corrected from segment 0.
- **[ll-hls-support](./ll-hls-support.md)** *(consumer)* — partial-
  segment edge tracking + live-edge updates all use offset-corrected
  values.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** —
  `SourceBuffer.timestampOffset` is the MSE API consumed; the
  segment-append sequence gains a PTS-detection + offset-write stage.
- **[buffer-management](./buffer-management.md)** — forward-buffer
  planner operates on `currentTime` and segment time ranges; both
  are offset-corrected naturally. Planner code doesn't change.
- **[presentation-modeling](../presentation-modeling.md)** — parser
  may surface PTS-related HLS attributes (`EXT-X-START`,
  `EXT-X-PROGRAM-DATE-TIME`) on the resolved presentation. Parser
  extension for HLS metadata.
- **`[discontinuity-handling]`** *(new candidate, this session)* —
  sister feature carved out of this one's scope. Mid-stream PTS
  jumps via `EXT-X-DISCONTINUITY`, encoder restart, 33-bit PTS
  rollover. Same underlying primitive (re-detect-and-apply offset),
  different motivation (changes mid-source vs stable).
- **Cluster B Borderline content compensation sub-cluster:**
  `[pseudo-ended-detection]`, `[edit-list-compensation]`,
  `[buffer-stall-recovery]` — all build on this feature's time-
  mapping primitive but address different content-defect concerns.
  See [clusters.md § Time normalization](./clusters.md#time-normalization)'s
  sub-cluster note.

## See also

- [clusters.md § Time normalization](./clusters.md#time-normalization)
  — cluster B description; this feature is the foundation
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Media-src feature framing
- [live-stream-support.md](./live-stream-support.md) — primary
  consumer; cluster A foundation
- [mse-mms-pipeline.md](./mse-mms-pipeline.md) —
  `SourceBuffer.timestampOffset` API surface
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #6 (Non-zero PTS / Instant Clip Support)
- [HLS Spec — `EXT-X-START`](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.5.2)
  and [`EXT-X-PROGRAM-DATE-TIME`](https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis#section-4.4.4.6)
  — HLS spec time-related metadata attributes
- [MSE Spec — `SourceBuffer.timestampOffset`](https://w3c.github.io/media-source/#dom-sourcebuffer-timestampoffset)
  — the MSE API for shifting appended segment timestamps
- [ISO BMFF — `tfdt` box (Track Fragment Decode Time)](https://www.iso.org/standard/68960.html)
  — MP4 init/media segment PTS source
