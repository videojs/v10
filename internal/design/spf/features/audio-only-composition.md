---
status: draft
date: 2026-05-20
definition: coarse
---

# Audio-only composition

Engine support for HLS sources that contain only audio renditions
(no video tracks declared in the manifest). The Case-1 Media-src
feature per [clusters.md § Feature classification axes — Composition
cases per mode](./clusters.md#composition-vs-policy-vs-middle-pattern):
"Default composition handles a manifest that is genuinely audio-only
(no other tracks present). Required to claim general permutation
support." Sister to [video-only-composition](./video-only-composition.md)
(parallel sibling on the inverse axis).

A **Media-src feature** per
[clusters.md § Feature classification axes](./clusters.md#media-src-vs-player-vs-borderline):
without it, audio-only HLS sources don't play correctly. (Today the
engine *tolerates* audio-only sources per the `engine.test.ts`
"handles audio-only stream" test, but isn't *optimized* for them —
work goes here.)

## Status

- **Composition:** partially supported. The HLS engine
  (`createSimpleHlsEngine`) tolerates audio-only sources today; the
  test suite includes `engine.test.ts` → "handles audio-only stream
  (no video tracks)" exercising basic playback. Tolerance derives
  from `setupVideoBufferActors` and `loadVideoSegments` no-op-ing
  when `presentation.videoTracks` is empty (rather than asserting).
- **Definition depth:** coarse — scope sketched at the engine-
  variant level. Implementation specifics (engine-variant composition
  shape, audio-only-optimized buffer targets, etc.) tracked as open
  questions.
- **Source material:** Notion epic #4a (Basic Audio-only, Cluster
  C/E, Media-src composition case 1, S/S sizing).

## Phases of complexity

Three brief phases covering the Case-1 scope: recognition, engine
variant, and edge cases.

| Phase | What | Notes |
|---|---|---|
| Audio-only manifest recognition | Parser surfaces `presentation.videoTracks` as empty when the multivariant playlist contains only `EXT-X-MEDIA:TYPE=AUDIO` renditions (no video). Engine state observably reflects "no video tracks." Tolerated today; the parser already produces empty `videoTracks` for these sources | Already works today per the engine test. Foundation for the rest of this feature's scope |
| Audio-only engine variant | Explicit engine composition variant where video-side behaviors (`setupVideoBufferActors`, `loadVideoSegments`, `switchVideoQuality`, `selectVideoTrack`) are subtractively-composed-out rather than running as no-ops. Saves the no-op overhead and makes the "no video" state explicit in the composition. The current implicit tolerance becomes explicit | Composition-variant work. Per the failure-mode catalog: live vs VoD is a composition-time distinction, and the same principle extends here — audio-only vs A+V is composition-time. Two shapes: (a) audio-only variant composes a subset of behaviors (cleanest); (b) keep uniform composition with video-side no-ops (current state). Lean: (a) — explicit composition matches the SPF discipline |
| Audio-only-optimized buffer / playback | Audio-only sources may benefit from different default tuning: shorter forward-buffer targets (audio has lower bandwidth; less ahead-buffering needed), no display-related work (no `requestAnimationFrame`, no PiP, no thermal pressure from decode), simpler `endOfStream` (single SourceBuffer to coordinate) | Tier 2-ish: optimization beyond minimum viability. Defer until usage signals from podcast / audio-only customers actually exist |

## What's in scope vs out of scope

**In scope:**
- All three phases above for HLS audio-only-manifest sources
- Engine-variant composition shape (subtractive composition of
  video-side behaviors)
- Audio-only-specific buffer / playback optimizations
- Confirming + extending the existing audio-only test coverage in
  `engine.test.ts`

**Out of scope (separate concerns — the "use case composition"
doc-type):**
- **Audio-only mode override** *(Player feature, "use case
  composition" type — not yet formalized)* — subtract-down
  composition that produces audio-only delivery *even from mixed-
  manifest sources* (sources with both audio and video). This is
  the Case-2 Player feature per Notion's "Composition cases per
  mode" framing. Different concern: this feature handles audio-
  only-as-source-shape; the override case is audio-only-as-
  delivery-choice. Falls under the yet-to-be-formalized "use case
  composition" doc-type (parallel concepts include background-video
  playback, audio-podcast mode, etc.).
- **Dynamic audio-only switching** *(Case 3, deprioritized per
  Notion)* — same engine, config/state-driven dynamic switching
  between Case 1 and Case 2. Notion epic #4c: "May not build."

**Out of scope (different architectural layer):**
- Adapter-level audio-only UI (cover art rendering, audio-podcast
  player chrome, etc.). Adapter / consumer territory.
- Audio-only customer-facing modes ("Listen on the go" toggles).
  Adapter-level.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Engine composition shape for variants.** Composition-variant
  pattern from the failure-mode catalog: live vs VoD is the
  precedent. Audio-only-vs-A+V should follow the same shape —
  variant-specific composition rather than runtime no-ops. The
  current implicit-tolerance state is a transitional shape; this
  feature makes it explicit.
- **Behavior composition subtraction.** Today's `createSimpleHlsEngine`
  composes a fixed list. Subtracting video-side behaviors for the
  audio-only variant means a different composition list — closer to
  `createAudioOnlyHlsEngine` (or similar) at the engine-factory
  level. Cross-cluster with [engine-adapter-integration](./engine-adapter-integration.md)
  on how engine variants are selected.
- **Variant-decision signal source.** Same question as
  [live-stream-support](./live-stream-support.md)'s variant-decision
  open question: adapter-upfront opt-in vs detect-from-parser
  (engine sees `presentation.videoTracks === []` and routes to
  audio-only composition). Detect-and-route is more adaptive;
  adapter-upfront is simpler. Cross-feature with how live + DVR +
  LL-HLS variants get composed.
- **Audio-only `endOfStream` gate.** Today's `endOfStream` gate in
  [mse-mms-pipeline](./mse-mms-pipeline.md) coordinates across
  video and audio buffers (`isLastSegmentAppended` per type +
  `mediaSource.readyState`). For audio-only, the gate naturally
  simplifies (single buffer to coordinate); per the catalog's
  composition-variant entry, the existing `endOfStream` behavior
  should compose unchanged — it reads `mediaSource.sourceBuffers`
  uniformly rather than per-type. Verify this empirically when the
  feature lands.
- **Audio-only ABR semantics.** Audio renditions can be multi-
  bitrate (multiple AAC bitrate variants). When [audio-abr](./audio-abr.md)
  lands, audio-only composition + audio-abr is a natural pairing.
  The audio-only variant composes audio-abr in place of (or in
  addition to) `selectAudioTrack`.
- **DOM exposure semantics.** `<video>` element with no video
  source still produces a visible (empty) element. Adapter may
  want to display cover-art or a podcast-style UI; engine doesn't
  intervene in DOM appearance.

## Open questions

- **Engine variant factory shape.** `createAudioOnlyHlsEngine` as a
  separate factory vs `createSimpleHlsEngine` with an audio-only
  config flag vs detect-and-route from the existing factory. The
  pattern question is shared across all composition variants
  (live, DVR, LL-HLS, DRM-required, audio-only, video-only).
- **Variant-decision signal source.** Adapter-upfront vs detect-
  from-parser. Same cross-feature question as live-stream-support.
- **Audio-only buffer-target tuning.** Default `forwardBuffer.
  bufferDuration` (30s today) — appropriate for audio-only or
  tune down? Empirical.
- **Coordination with audio-abr (when it lands).** Composition of
  audio-only variant + audio-abr.
- **Live + audio-only intersection.** Live audio-only streams
  (radio-stream-like) are a real shape. Composition of live engine
  + audio-only variant: how do they compose?

## Related features

- **[video-only-composition](./video-only-composition.md)** —
  parallel sibling on the inverse axis (video-only manifests).
- **[audio-playback](./audio-playback.md)** — baseline audio
  handling; this feature is the engine-variant optimization for
  audio-only sources. The "Audio-only composition optimizations"
  bullet in audio-playback's What's not implemented points here.
- **[engine-adapter-integration](./engine-adapter-integration.md)** —
  variant-decision lives here (which engine factory the adapter
  invokes).
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — `endOfStream`
  gate is variant-agnostic per the conventions; audio-only should
  compose it unchanged.
- **[buffer-management](./buffer-management.md)** — buffer-target
  tuning for audio-only.
- **`[audio-abr]`** *(documented; pending implementation)* —
  natural pairing for audio-only + multi-bitrate audio.
- **`[live-stream-support]`** *(not implemented)* — live + audio-
  only (radio streams) is a composition intersection.

## See also

- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — "Composition vs Policy vs middle pattern"; this feature is
  Notion's Case-1 (Media-src composition case)
- [audio-playback.md](./audio-playback.md) — baseline audio
  handling
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #4a (Basic Audio-only); epic #4b (Audio-
  only Mode Override) is the Case-2 sister concern under the
  yet-to-be-formalized "use case composition" doc-type
- [conventions/behaviors.md](../conventions/behaviors.md) —
  composition-variant discipline (live vs VoD pattern extends to
  audio-only vs A+V)
- [`engine.test.ts` → "handles audio-only stream"](https://github.com/videojs/v10/blob/main/packages/spf/src/playback/engines/hls/tests/engine.test.ts)
  — existing basic-coverage test for this feature's status quo
