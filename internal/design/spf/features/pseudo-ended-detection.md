---
status: draft
date: 2026-05-20
definition: coarse
---

# Pseudo-ended detection

Heuristically detect "pseudo-ended" state — playback stalls near the
duration boundary on sources with mismatched manifest-duration vs
actual segment-data length — and trigger termination cleanly so
`ended` fires correctly rather than letting playback hang
indefinitely. Canonically a Safari quirk on slightly-malformed VOD
content (the manifest declares duration N seconds; the last segment
ends at duration N - 0.05; the playhead approaches N, never reaches
it, doesn't fire `ended`). Cluster B Borderline content-compensation
feature; sister to [edit-list-compensation](#) and
[buffer-stall-recovery](#) in the Borderline sub-cluster.

A **Borderline feature** per
[clusters.md § Feature classification axes](./clusters.md#media-src-vs-player-vs-borderline):
"accounts for technically valid but suboptimally-formed-or-delivered
content (content compensation). The source plays; the work makes it
play better in specific quirky cases." Notion epic #10 explicitly
classifies it as Borderline.

## Status

- **Composition:** not implemented. Engine relies on browser's
  native `ended` event firing; on Safari with mismatched-duration
  sources, this never fires and playback hangs at the end.
- **Definition depth:** coarse — scope from Notion + Borderline
  framing; SPF touchpoints sketched. Implementation details
  (threshold values, action choice between
  `MediaSource.endOfStream()` vs `mediaSource.duration` adjustment)
  tracked as open questions.
- **Composition scope:** VOD-engine-variant only. Live engine
  variants don't carry this behavior — live sources have `Infinity`
  duration and never approach a boundary. Same composition-variant
  pattern as `setLiveSeekableRange` (live-only) — pseudo-ended-
  detection is VOD-only, composed into the relevant variant rather
  than runtime-checked inside a uniform behavior.

## Phases of complexity

Two phases (detection + action), each with Naive (don't compensate)
vs Full (apply the heuristic) depth per the Notion classification.

| Phase | Depth | What | Notes |
|---|---|---|---|
| Pseudo-ended state detection | **Naive** | Don't detect. Engine relies on the browser's native `ended` event; sources with the duration mismatch quirk stall indefinitely on Safari. The current state | Status quo; ≈ what `hls.js` does for this case |
| | **Full** | Heuristic monitor: playhead approaching `presentation.duration` (within a small epsilon) + non-progressing for a threshold duration + no buffer beyond the current playhead → flag pseudo-ended state. Write a `pseudoEndedDetected: boolean` state slot (or derived signal) | The compensation mechanism. Behavior reads `currentTime`, `presentation.duration`, `SourceBuffer.buffered`; writes the state slot. Threshold tuning is the load-bearing implementation work — too sensitive triggers false positives on real network stalls, too lax leaves Safari users hanging |
| Pseudo-ended action | **Naive** | Pass through; browser stalls indefinitely. The current state | Status quo |
| | **Full** | When detection fires, trigger clean termination. Two action mechanisms (choice open): (a) call `mediaSource.endOfStream()` — explicit signal to MSE that no more data is coming, triggers `ended` event; (b) write `mediaSource.duration` to match the buffered end + a small margin so the browser naturally fires `ended` when playhead reaches the adjusted duration | (a) is more direct but interacts with [mse-mms-pipeline](./mse-mms-pipeline.md)'s `endOfStream` gate (which today fires on `isLastSegmentAppended` + `currentTime >= lastSegStart`; pseudo-ended is a different trigger path). (b) avoids the `endOfStream` gate interaction but mutates `duration` (which other behaviors read — care with multi-writer characterization) |

## What's in scope vs out of scope

**In scope:**
- Both phases for finite-duration HLS sources where the duration
  mismatch quirk surfaces (canonically Safari)
- Pseudo-ended state slot (or derived signal) + detection behavior
- Pseudo-ended action behavior — either `MediaSource.endOfStream()`
  call or `mediaSource.duration` adjustment (choice open)
- Threshold-tuning config surface (e.g., `pseudoEndedDetection: {
  epsilonSeconds, stallThresholdMs }`)
- Composition into VOD engine variants (live variants don't carry
  this behavior)

**Out of scope (separate Borderline sister features):**
- **`[edit-list-compensation]`** *(candidate, this session)* — init-
  segment edit-list offset detection. Different mechanism (middle
  pattern: parse-and-offset).
- **`[buffer-stall-recovery]`** *(candidate, this session)* — mid-
  stream stall detection and recovery (not at duration boundary).
  Both this feature and buffer-stall-recovery detect "playback not
  progressing"; the discriminator is "is the playhead near the
  duration boundary?" Pseudo-ended owns the near-boundary case;
  buffer-stall-recovery owns the mid-stream case.

**Out of scope (different architectural layer):**
- Customer-facing "playback ended unexpectedly" UI / notifications.
  Engine surfaces `ended` via standard DOM events; consumer renders
  UI from there.
- Service-side fix to the original-content duration mismatch. The
  proper long-term fix is encoder/manifest correctness; this
  feature compensates client-side until then.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Action-mechanism choice.** `MediaSource.endOfStream()` (option a)
  vs `mediaSource.duration` adjustment (option b). Trade-offs:
  (a) more direct but interacts with mse-mms-pipeline's existing
  `endOfStream` gate (which fires on `isLastSegmentAppended` +
  `currentTime >= lastSegStart`); the gate today doesn't account
  for "buffer falls slightly short of duration boundary." Adding a
  pseudo-ended trigger path means two `endOfStream()` callers with
  different conditions. (b) mutates `mediaSource.duration`, which
  is written by multiple behaviors (from non-zero-pts-support and
  `updateMediaSourceDuration`); becomes a multi-writer slot. Lean:
  empirical — pick whichever Safari handles cleanly.
- **Distinction from `[buffer-stall-recovery]`.** Both monitors
  detect "playback not progressing." Coordination needed so they
  don't fight (e.g., buffer-stall-recovery triggers a seek-nudge
  to recover, but the stall is actually pseudo-ended and the seek
  takes the playhead past the buffered end). Discriminator:
  pseudo-ended fires only when playhead is within epsilon of
  `presentation.duration`; buffer-stall-recovery fires elsewhere.
  Composition order: pseudo-ended runs first; on negative result,
  buffer-stall-recovery considers the stall.
- **Composition-variant placement.** Pseudo-ended detection
  composes into VOD engine variants only — live variants don't
  carry this behavior (live has `Infinity` duration, no boundary
  to approach). Per the failure-mode catalog's composition-variant
  entry: behavior is variant-specific, not a runtime branch in a
  uniform behavior. Cross-cuts with how live-stream-support
  composes — both are variant-specific.
- **Threshold tuning surface.** Epsilon (how close to duration
  counts as "near end"; e.g., 0.5s, 1s, 0.1s?) and stall threshold
  (how long of no-progress counts as stalled; e.g., 250ms, 500ms,
  1s?). Empirical tuning; defaults should ship; consumers may
  override per source.
- **False-positive avoidance.** Some sources legitimately have
  slow-loading last segments (e.g., live → VOD transition where
  the segment is being finalized server-side). Distinguish from
  pseudo-ended: if the buffer is still growing toward duration,
  it's not pseudo-ended yet. Detection logic gates on "buffer
  not growing" too.
- **Browser-specificity.** Canonically Safari. Other browsers
  (Chrome, Firefox) may handle duration-mismatch differently — some
  fire `ended` despite the gap. Whether the detection logic runs
  unconditionally or is Safari-gated is open. Lean: run
  unconditionally (a defensive feature should fire if conditions
  match, regardless of browser).

## Open questions

- **Action-mechanism choice — `endOfStream()` vs
  `mediaSource.duration` adjustment.** Per cross-cutting note.
  Empirical determination on Safari.
- **Detection thresholds.** Epsilon to duration boundary + stall
  duration. Default values + customer override config.
- **Coordination with buffer-stall-recovery.** Composition order +
  shared state-slot vs separate. Pseudo-ended-first lean.
- **Live + VOD transition.** Some sources transition from live
  (Infinity duration) to VOD (finite duration) when the broadcast
  ends. Composition shape: does the pseudo-ended behavior compose
  in at transition time (when duration becomes finite), or is it
  always-uncomposed for sources that started live? Lean: not
  composed (live engine variant doesn't carry it, and transition
  to VOD is structurally a source replacement). Confirm when
  live-stream-support termination scenarios mature.
- **Browser detection gate.** Run unconditionally vs Safari-only?
  Lean: unconditional (defensive).
- **Composition with `[edit-list-compensation]`.** Edit-list offsets
  affect the perceived duration boundary. If the edit list offsets
  the source's content end relative to duration, pseudo-ended
  detection's "approaching duration" check needs to be offset-
  aware. Cross-feature with sister candidate.
- **`presentation.duration` is `NaN` or `undefined`.** Some sources
  load before duration is known. Detection should not fire in that
  state. Defensive check.

## Related features

- **[non-zero-pts-support](./non-zero-pts-support.md)** — cluster B
  foundation. Pseudo-ended-detection's "approaching duration"
  semantics need to use offset-corrected `currentTime` and
  duration (both naturally offset-corrected through the chosen
  PTS-offset mechanism, but worth confirming).
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — `endOfStream()`
  is the MSE API used by one action option; the existing
  `endOfStream` gate behavior is the other caller. Coordination
  between the two callers is a cross-cutting concern.
- **[edit-list-compensation](./edit-list-compensation.md)** —
  sister Borderline feature; edit-list offsets affect the
  perceived duration boundary.
- **[buffer-stall-recovery](./buffer-stall-recovery.md)** — sister
  Borderline feature; both detect "playback not progressing."
  Coordination needed via composition order + near-boundary
  discriminator.
- **[live-stream-support](./live-stream-support.md)** — out of
  scope (live has Infinity duration); this feature composes into
  VOD variants only.
- **[buffer-management](./buffer-management.md)** — reads buffered
  ranges for the detection heuristic.

## See also

- [clusters.md § Time normalization](./clusters.md#time-normalization)
  — cluster B description + Borderline content compensation
  sub-cluster framing
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Borderline / content-compensation category; Naive vs Full
  depth framing
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #10 (Pseudo-Ended Detection)
- [non-zero-pts-support.md](./non-zero-pts-support.md) — cluster B
  foundation
- [mse-mms-pipeline.md](./mse-mms-pipeline.md) — `endOfStream()`
  API + existing gate behavior
- [MSE Spec — `MediaSource.endOfStream()`](https://w3c.github.io/media-source/#dom-mediasource-endofstream)
  — one of the candidate action mechanisms
