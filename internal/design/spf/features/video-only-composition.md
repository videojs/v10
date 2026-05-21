---
status: draft
date: 2026-05-20
definition: coarse
---

# Video-only composition

Engine support for HLS sources that contain only video renditions
(no audio tracks declared in the manifest). The Case-1 Media-src
feature per [clusters.md § Feature classification axes — Composition
cases per mode](./clusters.md#composition-vs-policy-vs-middle-pattern):
"Default composition handles a manifest that is genuinely video-only
(no other tracks present). Required to claim general permutation
support." Sister to [audio-only-composition](./audio-only-composition.md)
(parallel sibling on the inverse axis).

A **Media-src feature** per
[clusters.md § Feature classification axes](./clusters.md#media-src-vs-player-vs-borderline):
without it, video-only HLS sources don't play correctly. Common use
case: silent background-looping video (ambient hero backgrounds,
short-form muted-preview content). Mux's
[mux-background-video](https://github.com/muxinc/mux-background-video)
is the canonical prior-art consumer.

## Status

- **Composition:** not explicitly implemented. The HLS engine's
  tolerance for missing audio is less established than for missing
  video. `setupAudioBufferActors` and `loadAudioSegments` may
  no-op-or-fail when `presentation.audioTracks` is empty depending
  on path; not as well-tested as the audio-only case. Worth
  empirical verification.
- **Definition depth:** coarse — scope sketched at the engine-
  variant level. Implementation specifics open.
- **Source material:** Notion epic NEW-A (Basic Video-only, Cluster
  C/E, Media-src composition case 1, S/S sizing).
- **Mux relevance:** mux-background-video tracked under GitHub
  [#873](https://github.com/videojs/v10/issues/873). Cross-link
  for product context (where engine support for video-only sources
  intersects with the background-video product use case).

## Phases of complexity

Three brief phases mirroring [audio-only-composition](./audio-only-composition.md)'s
structure on the inverse axis.

| Phase | What | Notes |
|---|---|---|
| Video-only manifest recognition | Parser surfaces `presentation.audioTracks` as empty when the multivariant playlist contains only video renditions (no `EXT-X-MEDIA:TYPE=AUDIO` and no muxed audio in the `CODECS` attribute). Engine state observably reflects "no audio tracks." | Foundation phase. Status currently unverified — empirical confirmation needed via test fixture |
| Video-only engine variant | Explicit engine composition variant where audio-side behaviors (`setupAudioBufferActors`, `loadAudioSegments`, `selectAudioTrack`) are subtractively-composed-out. Same shape as audio-only-composition's video subtraction on the inverse axis | Composition-variant work. Per the failure-mode catalog: composition-time variant, not a runtime branch. Two shapes mirror audio-only: (a) video-only variant composes a subset; (b) keep uniform composition with audio-side no-ops. Lean: (a) |
| Video-only-optimized buffer / playback | Video-only sources benefit from different default tuning: muted-playback assumption (no audio-decode CPU), background-loop integration with `loop=true`, simpler `endOfStream` (single SourceBuffer to coordinate), no Firefox `mozHasAudio` cross-type quirk consideration | Tier 2-ish: optimization. Worth Mux-specific tuning given background-video use case has known constraints (background-tab playback, low CPU budget) |

## What's in scope vs out of scope

**In scope:**
- All three phases above for HLS video-only-manifest sources
- Engine-variant composition (subtractive composition of audio-side
  behaviors)
- Video-only-specific buffer / playback optimizations
- Test fixture coverage parallel to `engine.test.ts` "handles audio-
  only stream"

**Out of scope (separate concerns — the "use case composition"
doc-type):**
- **Video-only mode override** *(Player feature, "use case
  composition" type — not yet formalized)* — subtract-down
  composition that produces video-only delivery *even from mixed-
  manifest sources*. Notion epic NEW-B; explicitly cross-referenced
  with [mux-background-video #873](https://github.com/videojs/v10/issues/873)
  ("Drives background-looping engine; placement in this issue set
  vs under #873: open"). Falls under the yet-to-be-formalized
  "use case composition" doc-type alongside background-video / PiP
  / shorts-player / audio-podcast concerns.
- **Dynamic video-only switching** *(Case 3, deprioritized per
  Notion)* — config/state-driven dynamic switching between video-
  only and mixed playback. Notion deprioritizes Case 3 generally.

**Out of scope (different architectural layer):**
- Adapter-level video-only UI (background-loop chrome, autoplay-
  muted handling, ambient-mode toggles). Adapter / consumer
  territory.
- mux-background-video's product-level concerns (loop policy,
  autoplay-muted defaults, GPU-thermal-aware quality caps).
  Adapter-layer integration with this feature's engine variant.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Engine composition shape.** Same shape as audio-only-composition;
  see that doc's "Engine composition shape for variants" cross-
  cutting note. Resolution applies symmetrically across both
  features.
- **Firefox `mozHasAudio` quirk.** Documented in
  [mse-mms-pipeline](./mse-mms-pipeline.md): Firefox's
  `mozHasAudio` behavior is the cross-type invariant that motivates
  the current cross-feature audio/video coordination. For video-
  only sources, `mozHasAudio` should be false (no audio); verify
  Firefox handles this correctly — mux-background-video has
  encountered Firefox-specific quirks here that may have informed
  the cross-type invariant.
- **Variant-decision signal source.** Same question as audio-only-
  composition + live-stream-support: adapter-upfront vs detect-
  from-parser. Resolves jointly.
- **Background-video product intersection.** mux-background-video
  ([#873](https://github.com/videojs/v10/issues/873)) is the
  canonical use-case-composition consumer. This feature provides
  the Media-src baseline (engine plays a video-only source); the
  use-case-composition concern (background-video product) is the
  Case-2 sister yet-to-be-formalized. The boundary: this feature
  handles "the source is video-only"; the use-case-composition
  handles "deliver video-only even from mixed sources." Mux's
  current product use case (background-video) intersects with
  both — sometimes the source is genuinely video-only, sometimes
  the consumer wants video-only delivery from a mixed source.
- **Autoplay-muted considerations.** Video-only sources are
  typically muted (no audio to play). Browser autoplay policies
  often allow muted-autoplay; this feature's engine variant could
  surface a "play-muted-by-default" hint, though that's borderline
  adapter-territory.
- **Loop behavior.** Background-video use case typically uses
  `mediaElement.loop = true`. Today's engine has a noted candidate
  for "loop-around buffer fetching" in
  [buffer-management](./buffer-management.md)'s What's not
  implemented. Cross-cluster with this feature on the
  loop-friendly buffer policy question.

## Open questions

- **Empirical verification of video-only tolerance.** Does the
  current engine handle video-only manifests cleanly, or does
  `setupAudioBufferActors` / `loadAudioSegments` fail / no-op
  inconsistently when `audioTracks` is empty? Test fixture work
  needed before scoping implementation.
- **Engine variant factory shape.** Shared question with audio-
  only-composition + live-stream-support + LL-HLS — composition-
  variant pattern across the registry.
- **Variant-decision signal source.** Shared with other variant
  features.
- **Loop integration scope.** Background-video typically loops;
  loop-friendly buffer policy is currently a separate buffer-
  management candidate. Does this feature own the integration or
  cross-feature with buffer-management?
- **Firefox + video-only verification.** `mozHasAudio` is the
  cross-type invariant documented in mse-mms-pipeline; verify
  Firefox handles video-only cleanly.
- **mux-background-video placement.** GitHub #873's placement —
  this feature's Case-1 (video-only sources) vs the Case-2 use-
  case-composition (video-only delivery from any source). Per
  Notion: "Placement in this issue set vs under #873: open."

## Related features

- **[audio-only-composition](./audio-only-composition.md)** —
  parallel sibling on the inverse axis (audio-only manifests).
- **[audio-playback](./audio-playback.md)** — audio-side baseline;
  video-only sources fully subtract this feature's surface.
- **[engine-adapter-integration](./engine-adapter-integration.md)** —
  variant-decision lives here (which engine factory the adapter
  invokes).
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — Firefox
  `mozHasAudio` cross-type invariant; verify video-only handling.
- **[buffer-management](./buffer-management.md)** — loop-around
  buffer fetching (candidate concern) for background-loop integration.
- **[video-abr](./video-abr.md)** — video ABR composes naturally
  with video-only sources.
- **`[live-stream-support]`** *(not implemented)* — live video-
  only (silent live feeds) is a composition intersection.

## See also

- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — "Composition vs Policy vs middle pattern"; this feature is
  Notion's Case-1 (Media-src composition case)
- [audio-only-composition.md](./audio-only-composition.md) —
  parallel sibling doc
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic NEW-A (Basic Video-only); epic NEW-B
  (Video-only Composition) is the Case-2 sister concern under the
  yet-to-be-formalized "use case composition" doc-type
- [GitHub #873 (mux-background-video)](https://github.com/videojs/v10/issues/873)
  — Mux's video-only use case driving the Case-2 use-case-
  composition concern
- [`mux-background-video` repo](https://github.com/muxinc/mux-background-video)
  — prior-art reference for video-only delivery + background-loop
  product concerns
- [conventions/behaviors.md](../conventions/behaviors.md) —
  composition-variant discipline
