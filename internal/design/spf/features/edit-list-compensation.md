---
status: draft
date: 2026-05-20
definition: coarse
---

# Edit-list compensation

Parse MP4 init-segment edit-list (`elst`) boxes, extract the implied
presentation-time offsets, and compensate engine-side for the shift.
Edit lists are an ISO BMFF mechanism for declaring timing adjustments
(skip first N samples, hold first frame, segment-time-to-media-time
mapping); they're often the byproduct of encoder pipelines that
don't zero-rebase content, and browser handling of `elst` varies
substantially. Cluster B Borderline content-compensation feature;
the **canonical "middle pattern" example** per
[clusters.md § Feature classification axes](./clusters.md#composition-vs-policy-vs-middle-pattern):
"`initPTS` detection → offset state → append behavior."

Sister to [pseudo-ended-detection](./pseudo-ended-detection.md) (just
landed) and `[buffer-stall-recovery]` in the Borderline sub-cluster.
Builds on [non-zero-pts-support](./non-zero-pts-support.md)'s offset-
application mechanism — both features face the same `timestampOffset`-
vs-simulated-translation question.

A **Borderline feature** per
[clusters.md § Feature classification axes](./clusters.md#media-src-vs-player-vs-borderline):
"compensates for technically valid but suboptimally-formed-or-
delivered content." Notion epic #11 explicitly notes: "Compensatory;
backend-fix exit condition worth naming" — the proper long-term fix
is encoder-side (don't emit edit lists, or emit them in a uniform
spec-clean way); this feature compensates client-side until then.

## Status

- **Composition:** not implemented. Engine doesn't parse `elst`
  boxes; segment append relies on browser-native handling of edit
  lists. Result varies by browser (Safari tends to honor; Chrome /
  Firefox have known quirks).
- **Definition depth:** coarse — scope from Notion + Borderline
  framing + middle-pattern classification. Mechanism specifics open
  (shares non-zero-pts-support's mechanism choice).
- **Foundation dependency:** [non-zero-pts-support](./non-zero-pts-support.md)
  provides the offset-application mechanism this feature plugs into.
  Either both features choose the same mechanism (timestampOffset OR
  simulated translation) or they coordinate offset composition at the
  application point.

## Phases of complexity

Three phases (parse → apply → multi-entry). The third phase is
deferred to Full depth; canonical Mux/Notion case is single-entry
shifts.

| Phase | Depth | What | Notes |
|---|---|---|---|
| Edit-list parsing | **Naive** | Don't parse. Rely on browser-native edit-list handling (variable per browser). The current state | Status quo; ≈ what most engines do without explicit edit-list awareness |
| | **Full** | Parse `elst` box from MP4 init segments. Extract edit-list entries — each entry has `media_time` (where to start in the source media), `segment_duration` (how long this segment of presentation is), `media_rate` (playback rate, usually 1.0). Shares the targeted MP4 box parser with [non-zero-pts-support](./non-zero-pts-support.md)'s `tfdt` extraction | Init-segment parsing extension. The same small targeted MP4 box extractor handles both `tfdt` (non-zero-pts-support) and `elst` (this feature) |
| Offset application | **Naive** | Rely on browser to interpret edit-list correctly. Some sources play correctly on some browsers; same source plays wrong on others | The variance is the problem this feature solves |
| | **Full** | Engine-side compensation: compute the effective offset from edit-list entries (typically the first entry's `media_time` shift) and apply via the offset-application mechanism. Two open mechanism options (shared with non-zero-pts-support): (a) `SourceBuffer.timestampOffset`, (b) simulated translation via adapter + behavior math. Both face the same A/V sync trade-off documented in non-zero-pts-support | Same mechanism choice as non-zero-pts-support — these two features should converge on the same answer. Composition with non-zero-pts-support's offset is the load-bearing question (additive? multiplicative? at which layer?) |
| Multi-entry edit lists | **Naive** (deferred default) | Handle only single-entry edit lists (just shifts source start time). Multi-entry edit lists ignored or fallback-to-browser | Most real-world Mux content has single-entry or no edit lists. Multi-entry support deferred unless customer demand surfaces |
| | **Full** (deferred) | Handle multi-entry edit lists: multiple consecutive segments with different `media_time` / `segment_duration` / `media_rate` values. Can express loops, freeze-frames, speed changes, gap insertions | Real complexity. Browser support also varies for multi-entry. Defer until concrete customer use case emerges |

## What's in scope vs out of scope

**In scope:**
- Edit-list parsing from init-segment `elst` box (Mp4 only; HLS
  fragmented MP4)
- Single-entry edit-list offset extraction and application
- Composition with non-zero-pts-support's offset (the two compose
  on the SourceBuffer / time-mapping pipeline)
- Browser-variance compensation (engine applies offset whether or
  not the browser would interpret edit-list faithfully)

**Out of scope (separate Borderline sister features):**
- **[pseudo-ended-detection](./pseudo-ended-detection.md)** — just
  landed; sister Borderline. Cross-references this feature in its
  Open questions ("edit-list offsets affect the perceived duration
  boundary").
- **`[buffer-stall-recovery]`** *(candidate, this session)* — sister
  Borderline; different mechanism. Not directly affected by edit-
  list compensation.
- **`[discontinuity-handling]`** *(deferred candidate)* — mid-stream
  PTS jumps. Edit-list changes mid-stream (via discontinuity
  boundaries) are part of that feature's territory, not this one.

**Out of scope (different architectural layer):**
- Customer-facing display of edit-list metadata. Engine compensates
  silently; adapter/customer doesn't need to see the offset.
- Service-side fix (encoder pipeline emits zero-rebased content
  without edit lists). The proper long-term fix; this feature
  compensates client-side until then. Notion explicitly flags this
  as the backend-fix exit condition.
- Edit-list parsing for non-MP4 containers (MPEG-TS, etc.).
  Container-format scope.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Offset composition with non-zero-pts-support.** Both features
  produce offsets that need to apply at the SourceBuffer / time-
  mapping pipeline. Composition shape: (a) additive — total offset
  = nonZeroPtsOffset + editListOffset; (b) sequential application
  — apply non-zero-PTS offset first, then edit-list offset on top;
  (c) edit-list overrides non-zero-PTS — edit-list represents the
  authored intent for time mapping. Choice affects the slot shape
  (`presentationTimeOffset: { fromPts: number, fromElst: number }`
  vs single computed `effectiveOffset: number`). Lean: (a) additive,
  with the slot exposing both components for debugging / telemetry;
  consumer-facing engine state exposes only `effectiveOffset`.
- **Shared mechanism choice with non-zero-pts-support.**
  `SourceBuffer.timestampOffset` vs simulated translation. The two
  features should converge on the same mechanism — split mechanism
  would mean different code paths for different offset sources
  composing into the same SourceBuffer, which is brittle. Open
  question that resolves jointly across both features.
- **Browser-variance gate.** Different browsers honor edit lists
  differently: Safari tends to honor faithfully; Chrome / Firefox
  may interpret the entry-by-entry edit list as samples-to-skip but
  apply differently for the `tfdt` decode-time semantics. Engine
  compensation should run unconditionally (defensive) but the
  *effect* depends on browser. If browser also honors the elst,
  applying engine-side compensation could double-shift. Open: detect
  browser behavior empirically and gate compensation accordingly,
  vs trust empirical testing and ship one strategy.
- **`elst` box parser shape.** Same targeted MP4 box parser as
  `tfdt` in non-zero-pts-support. Parser-pluggability concern from
  [presentation-modeling](../presentation-modeling.md)'s open
  questions intersects: an `elst` parser is HLS-fragmented-MP4-
  specific; DASH/MoQ would need their own format-extensions.
- **Per-track edit lists (video vs audio independent).** Each track
  in an MP4 file has its own `elst` box. Video and audio can have
  independent edit lists. This intersects with the per-type offset
  question from non-zero-pts-support — if both features adopt
  per-type offsets, they compose track-by-track.
- **Mid-source edit-list changes.** Theoretically edit lists could
  vary segment-by-segment, but in practice they're declared once in
  the init segment. If they change mid-stream, that's discontinuity
  territory (carved out as a separate deferred candidate).
- **Backend-fix exit condition.** Notion calls this out explicitly:
  "backend-fix exit condition worth naming." When Mux's encoder
  pipeline emits zero-rebased content without edit lists for the
  affected content shapes, this feature is no longer needed
  client-side. Worth documenting the conditions under which the
  feature can be retired.

## Open questions

- **Offset composition with non-zero-pts-support.** Additive vs
  sequential vs override. Lean: additive with debug exposure.
- **Shared mechanism choice with non-zero-pts-support.** Resolves
  jointly; this feature can't independently choose a mechanism.
- **Browser-variance gate.** Run compensation unconditionally
  (defensive, risk double-shift) vs detect browser behavior and
  gate (safer, more code). Empirical testing needed.
- **Multi-entry support trigger.** When does customer demand
  warrant Full-depth multi-entry support? Notion flags this as
  rare; document the trigger condition (e.g., "first reported
  customer source with loops or freeze-frames").
- **Per-track edit-list semantics.** Video vs audio independent
  treatment. Consistent with per-type offsets from
  non-zero-pts-support.
- **`elst` parser depth.** Single-entry-only parser vs structurally
  complete parser (parses all entries, applies only first). Lean:
  structurally complete (easier to extend later); apply only what's
  in-scope per phase.
- **Backend-fix exit condition.** Document the conditions under
  which this feature can be retired client-side. (Encoder pipeline
  changes; specific content-type clean-up; etc.)
- **Mux Video relevance — is this an active customer concern?**
  Notion classifies as Borderline (compensatory). If Mux's current
  encoding pipeline doesn't produce edit-list-bearing content, this
  may be a defer-until-demand feature. Worth confirming.

## Related features

- **[non-zero-pts-support](./non-zero-pts-support.md)** — cluster B
  foundation; the offset-application mechanism this feature plugs
  into. Mechanism choice (timestampOffset vs simulated translation)
  resolves jointly across both features.
- **[pseudo-ended-detection](./pseudo-ended-detection.md)** — sister
  Borderline; edit-list offsets affect the perceived duration
  boundary that pseudo-ended-detection checks against. Cross-
  reference in its Open questions.
- **[buffer-stall-recovery](./buffer-stall-recovery.md)** — sister
  Borderline; orthogonal mechanism.
- **`[discontinuity-handling]`** *(deferred candidate)* — mid-source
  edit-list changes would be that feature's territory.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — segment append
  consumes the composed offset via the chosen mechanism.
- **[presentation-modeling](../presentation-modeling.md)** —
  parser-pluggability concern; `elst` parsing is HLS-fragmented-
  MP4-specific.

## See also

- [clusters.md § Time normalization](./clusters.md#time-normalization)
  — cluster B description + Borderline content compensation
  sub-cluster framing
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Borderline / content-compensation category; Composition vs
  Policy vs middle pattern (this feature is the canonical middle-
  pattern example)
- [non-zero-pts-support.md](./non-zero-pts-support.md) — cluster B
  foundation; shared offset-application mechanism
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #11 (Edit Lists & Start Time Alignment)
- [ISO BMFF — Edit Box (`elst`)](https://www.iso.org/standard/68960.html)
  — MP4 spec reference for edit-list semantics
- [mp4-inspector / mp4box.js (community references)](https://github.com/gpac/mp4box.js)
  — prior-art for `elst` box parsing
