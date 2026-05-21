---
status: draft
date: 2026-05-21
definition: coarse
---

# Video-only mode override

Engine variant that delivers video-only playback *from mixed-manifest sources*
(sources containing both audio and video renditions). The Case-2 Player feature
per [`../features/clusters.md` § Feature classification axes](../features/clusters.md#feature-classification-axes),
parallel to and distinct from [`video-only-composition`](../features/video-only-composition.md)
on the inverse axis: this use case is about **delivery-mode choice** (consumer
wants video-only despite mixed source), where the Case-1 feature is about
**source-shape correctness** (engine handles video-only manifests).
Inverse-axis sibling of [`audio-only-mode-override`](./audio-only-mode-override.md).

Notion epic [NEW-B](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4):
*"Subtract-down composition. Drives background-looping engine ([#873](https://github.com/videojs/v10/issues/873));
placement in this issue set vs under #873: open."* This doc captures the
Case-2 mode-override concern directly;
[`background-looping-video`](./README.md#index) *(forward-ref; not yet
documented)* is the related-but-distinct Mux product scenario that may compose
this use case as part of a broader assembly.

## Status

- **Composition:** not implemented. The use case requires a parallel
  engine-factory + adapter pair, neither of which exists today.
  `createSimpleHlsEngine` composes the full video + audio pipeline; this
  variant would compose a subset.
- **Definition depth:** coarse — variant shape sketched, engine-factory and
  adapter shapes named at the level of "parallel siblings to the existing
  pair," implementation specifics tracked as open questions.
- **Source material:** Notion epic NEW-B (Video-only Composition; Cluster E
  Selection policy layer; Player composition case 2; Eng=M, Validation=M).
- **Mux relevance:** [GitHub #873 (mux-background-video)](https://github.com/videojs/v10/issues/873)
  is product-adjacent — distinct use case (`background-looping-video`) that
  shares constituent features but addresses a different delivery scenario.

## Target delivery context

Consumer scenarios where a source has both audio and video renditions but the
consumer wants video-only delivery:

- **Muted-autoplay social feeds** — autoplay-muted video tiles where audio
  decode + transmission is wasted bandwidth and CPU.
- **GIF-replacement ambient video** — short-loop or hero-area video used as a
  visual element; no audio track ever audible.
- **Mux-billing-driven video-only sessions** — Mux billing context may make
  video-only sessions cheaper (audio bandwidth not delivered); consumers opt
  in to reduce billing.
- **Silent-content authoring tools** — preview / editorial surfaces where
  audio is always muted by the surface design.
- **Captioned-only consumption surfaces** — when paired with [`subtitles`](../features/subtitles.md)
  (Phase 2), enables a "muted video + captions" delivery pattern for
  accessibility-first or quiet-environment contexts.

Common to all: the *source* is mixed-AV; the *delivery* is video-only. The
use case is a customer-facing **mode override**, not a source-shape adaptation.

## Phases of complexity

| Phase | What |
|---|---|
| **1 — Basic functionality** | Parallel engine-factory + adapter pair. The engine factory (`createVideoOnlyHlsEngine` or similar) composes the video-side subset of `createSimpleHlsEngine`'s behavior list, subtracting audio-side behaviors entirely. The adapter (`SimpleVideoOnlyHlsMediaElement` or similar) wraps that engine. Includes empirical verification of Firefox `mozHasAudio` behavior under subtractive-audio composition — the Case-1 [`video-only-composition`](../features/video-only-composition.md) flags this as a verify-empirically concern that's *more pointedly* relevant here (mixed-source content with audio subtractively-composed-out may behave differently than a genuinely audio-less source) |
| **2 — Features/functionality relevant to the use case** | Compose constituent feature behaviors as they land: [`subtitles`](../features/subtitles.md) for muted-video + captions a11y delivery pattern (a canonical video-only consumption shape). [`multi-language-audio`](../features/multi-language-audio.md) is *not* relevant here (audio subtracted), and Phase 2's "audio-abr-equivalent" doesn't apply on the video axis (video-abr is already Phase 1 baseline) |
| **3 — Optimizations** | Alternative default configurations for video-only delivery: possibly muted-by-default playback (browser autoplay policies often allow muted-autoplay), GPU/thermal-aware quality caps when the consumer surface is known low-attention (ambient/background video), simpler `endOfStream` paths (single SourceBuffer to coordinate). Per [`README.md` § Implementation note](./README.md#implementation-note-customizing-behaviors-for-use-cases), the Path-A vs Path-B judgment applies for any behavior whose Phase 3 customization significantly diverges from the default |

## Composition specifics

Phase 1 is subtractive-only; Phases 2 and 3 surface the other mechanisms.

### Behaviors subtracted (Phase 1)

From `createSimpleHlsEngine`'s composition, omit:

- `selectAudioTrack` — no audio rendition selection
- `resolveAudioTrack` — no audio media playlist fetch
- `setupAudioBufferActors` — no audio `SourceBuffer` / actor
- `loadAudioSegments` — no audio segment loading
- Audio-side bandwidth-sampling machinery (when [`audio-abr`](../features/audio-abr.md)
  lands, the audio path's `createTrackedFetch` would not be composed)

### Behaviors added (Phase 1)

**None.** This use case ships as an *independent adapter* paired with its own
engine factory. The variant-decision is encoded in the adapter choice itself —
consumers instantiate `SimpleVideoOnlyHlsMediaElement` to opt in. No runtime
variant-decision behavior is needed.

### Alternative implementations (Phase 3 candidates)

- Possibly a muted-default-aware playback behavior. Phase 3 surfaces this
  candidate; the Path-A vs Path-B judgment per
  [`README.md` § Implementation note](./README.md#implementation-note-customizing-behaviors-for-use-cases)
  defers.

### Alternative default configurations (Phase 3 candidates)

- **Muted-by-default playback** — Phase 1 leaves muted/unmuted to the consumer;
  Phase 3 may set muted as the default given browser autoplay policies. May
  be adapter-layer rather than engine-variant — boundary question.
- **GPU/thermal-aware quality caps** — for low-attention consumer surfaces
  (ambient video, background tabs), cap video quality based on GPU/thermal
  signals. Likely shared with `background-looping-video`'s broader scenario.
- **Buffer-target tuning** — depends on consumer surface. Background/ambient
  video may want shorter buffers (lower priority); foreground muted-autoplay
  may want normal buffers. Probably consumer-policy rather than engine
  default.

## Constituent features

Phase 1 baseline:

- **[`video-only-composition`](../features/video-only-composition.md)**
  *(Case-1 sibling)* — used as-is at the *composition mechanism* level. The
  Case-1 feature's "Video-only engine variant" phase row defines the
  subtractive composition shape; this use case applies the *same* shape but
  driven by adapter choice instead of source-shape detection. Whether the two
  share a single engine factory (with two entry points) or each gets its own
  factory is an open question. Per the Case-1 doc, video-only source-shape
  tolerance is currently unverified — the empirical-verification work for
  source-shape correctness benefits both the Case-1 feature and this use case.
- **[`video-abr`](../features/video-abr.md)** — used as-is. Multi-bitrate
  video selection (the engine's existing ABR algorithm). The variant always
  plays video.
- **[`engine-adapter-integration`](../features/engine-adapter-integration.md)** —
  used with an alternative adapter shape. The variant ships its own
  `SimpleVideoOnlyHlsMediaElement`-style adapter parallel to
  `SimpleHlsMediaElement`. The `shareSignals` mechanism + mixin pattern
  compose unchanged.
- **[`mse-mms-pipeline`](../features/mse-mms-pipeline.md)** — used as-is.
  `MediaSource` + `endOfStream` gate compose unchanged across variants. The
  **Firefox `mozHasAudio` invariant** documented in this feature is more
  pointedly relevant: the variant must produce `mozHasAudio=false` cleanly
  under subtractive-audio composition, and the behavior under mixed-source
  manifests-with-audio-subtracted may differ from genuinely-no-audio sources.
  Phase 1 verification covers this.
- **[`buffer-management`](../features/buffer-management.md)** — used as-is in
  Phase 1; Phase 3 surfaces alternative defaults / candidate Path-B behaviors
  (loop-friendly buffer fetching is `background-looping-video`'s concern,
  not this use case's).

Phase 2 (when relevant):

- **[`subtitles`](../features/subtitles.md)** — already implemented. The
  variant composes this for muted-video + captions a11y delivery. Phase 2
  rather than Phase 1 because not every video-only consumer surface needs
  captions (e.g., ambient/decorative video doesn't), but it's the canonical
  consumption pairing for accessible video-only delivery.

## Customer-policy surface

The variant ships as an **independent adapter** parallel to
`SimpleHlsMediaElement`:

```ts
// Default (mixed AV delivery)
const player = new SimpleHlsMediaElement();
player.src = mixedSourceUrl;

// Video-only mode override
const videoPlayer = new SimpleVideoOnlyHlsMediaElement();
videoPlayer.src = sameMixedSourceUrl;
```

The adapter encodes the mode choice; no runtime config flag or
detect-from-parser logic is involved. Consumers select the adapter that
matches their delivery surface.

Specific consumer-facing properties (autoplay-muted defaults, loop flag,
GPU/thermal caps, etc.) are adapter-layer concerns, not engine-variant
concerns. The engine-variant surface is the composition itself; the adapter
wraps it with the API consumers actually call.

## Variant-decision signal source

**Adapter-upfront.** The adapter is the variant decision — selecting
`SimpleVideoOnlyHlsMediaElement` over `SimpleHlsMediaElement` *is* the variant
choice. No detect-from-parser logic, no runtime config branch.

Same resolution as [`audio-only-mode-override`](./audio-only-mode-override.md)
for the recurring cross-feature *Variant-decision signal source* open
question — Case-2 use cases resolve via adapter choice; Case-1 source-shape
variants may benefit from detect-from-parser independently.

## Likely cross-cutting impact

- **Engine variant factory shape: shared with Case-1 or separate?** Both the
  Case-1 [`video-only-composition`](../features/video-only-composition.md) and
  this Case-2 use case want an engine that subtracts audio-side behaviors.
  Lean: shared factory is simpler, matches the "composition is bounded to
  modes" framing; variant-decision source is orthogonal to the factory. Same
  question and lean as `audio-only-mode-override` on the audio axis.
- **Firefox `mozHasAudio` empirical verification.** The Case-1 video-only-
  composition flags this as unverified for genuinely-no-audio sources; this
  use case adds the question of behavior under subtractive-audio composition
  of mixed-source manifests. Phase 1 verification covers both paths jointly.
  Per [`mse-mms-pipeline`](../features/mse-mms-pipeline.md), `mozHasAudio` is
  the cross-type invariant motivating the current per-type buffer
  coordination — the video-only variant should produce `mozHasAudio=false`
  cleanly.
- **Adapter shape proliferation.** Each use-case composition that gets its
  own adapter multiplies the adapter surface. Shared concern with
  `audio-only-mode-override` and forthcoming use cases.
- **Relationship with `background-looping-video`.** Distinct use case (Mux's
  background-video product scenario); shared constituent features but
  different delivery scenario. Background-looping composes loop + autoplay-
  muted + GPU/thermal-aware caps + likely silent-video delivery; this use
  case is the narrower "deliver video-only" piece. Background-looping-video
  may compose this use case's engine factory as one of its building blocks,
  or share constituents at the feature level — cross-link as peer use cases.
- **Test coverage for mixed-source video-only delivery.** New test coverage
  parallel to `engine.test.ts` "handles audio-only stream" but exercising a
  *mixed-source manifest* fed into the video-only variant. Covers: audio
  tracks present in `presentation.audioTracks` but not composed; video-side
  fully exercised; no audio appendBuffer calls; `mozHasAudio=false` under
  Firefox.

## Open questions

- **Engine variant factory shape** — shared with Case-1 vs separate. Resolves
  jointly with `audio-only-mode-override`'s analogous question.
- **Adapter naming.** `SimpleVideoOnlyHlsMediaElement` vs other. Aligns with
  existing naming in `packages/spf/src/playback/engines/hls/adapter.ts` and
  downstream `packages/core/src/dom/media/`.
- **Subtitle Phase 1 vs Phase 2.** Currently Phase 2 (per the doc-type-spec
  scoping discussion). Open whether muted-video + captions a11y pattern
  should promote to Phase 1 baseline — depends on whether the canonical
  video-only consumer surface is ambient (no captions) or accessible (with
  captions). May resolve by deferring the question to per-consumer adapter
  configuration.
- **Muted-by-default boundary.** Phase 3 alternative-defaults candidate;
  open whether this lives at engine-variant level (engine composes a
  muted-default behavior) or adapter level (adapter sets `muted = true` on
  the underlying media element). Likely adapter.
- **GPU/thermal-aware quality caps boundary.** Likely shared with
  `background-looping-video`; may belong at the use-case level there rather
  than here. Worth scoping in the background-looping-video doc when it
  lands.
- **Mux-billing integration.** Same shape as audio-only-mode-override —
  billing context likely surfaces at adapter / consumer level.
- **Variant-decision source for live + video-only.** Live + video-only
  intersection (silent live feeds, ambient live cameras) — same
  adapter-upfront pattern, or does live add complications? Shared open
  question with `audio-only-mode-override`'s live + audio-only intersection.

## Related features

- **[`video-only-composition`](../features/video-only-composition.md)** —
  Case-1 sibling on the inverse axis. Source-shape correctness (this
  feature) vs delivery-mode choice (the use case). Likely shares
  engine-factory composition.
- **[`video-abr`](../features/video-abr.md)** — constituent baseline.
- **[`engine-adapter-integration`](../features/engine-adapter-integration.md)** —
  constituent; variant adapter parallels `SimpleHlsMediaElement`.
- **[`mse-mms-pipeline`](../features/mse-mms-pipeline.md)** — constituent;
  composes unchanged. Firefox `mozHasAudio` cross-type invariant verification
  is Phase 1 scope.
- **[`buffer-management`](../features/buffer-management.md)** — constituent;
  Phase 3 candidates surface here.
- **[`subtitles`](../features/subtitles.md)** — Phase 2 constituent.
  Muted-video + captions a11y delivery pattern.

## Related use cases

- **[`audio-only-mode-override`](./audio-only-mode-override.md)** —
  inverse-axis sibling. Same shape, audio-side instead of video-side. The
  joint resolution of the "engine variant factory shape" open question
  applies to both.
- **`[background-looping-video]`** *(forward-ref; not yet documented)* —
  peer use case. Mux's background-video product scenario: loop +
  autoplay-muted + GPU/thermal-aware caps + likely silent-video delivery.
  **Distinct from this use case** despite shared Mux consumer context and
  overlapping constituent features. Background-looping-video may compose
  this use case's engine factory as one of its building blocks, or compose
  shared constituents directly — resolution depends on whether
  "use-case-composing-use-case" emerges as a pattern. Cross-link as peer.

## See also

- [`README.md`](./README.md) — use-case-composition doc-type spec
- [`audio-only-mode-override.md`](./audio-only-mode-override.md) — inverse-axis sibling use case
- [`../features/clusters.md` § Composition vs Policy vs middle pattern](../features/clusters.md#composition-vs-policy-vs-middle-pattern) — composition implementation shape
- [`../features/clusters.md` § Feature classification axes](../features/clusters.md#feature-classification-axes) — Notion's Composition cases per mode framing
- [`../conventions/behaviors.md` § Inverse: behaviors that operate uniformly across tracks](../conventions/behaviors.md#inverse-behaviors-that-operate-uniformly-across-tracks) — composition-variant discipline
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4) — Notion epic NEW-B
- [GitHub #873 (mux-background-video)](https://github.com/videojs/v10/issues/873) — peer-use-case source material
- [`mux-background-video` repo](https://github.com/muxinc/mux-background-video) — prior-art reference
- [`packages/spf/docs/hls-engine.md`](../../../../packages/spf/docs/hls-engine.md) — current HLS engine composition walkthrough; the variant subtracts from this baseline
