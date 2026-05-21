---
status: draft
date: 2026-05-21
definition: coarse
---

# Audio-only mode override

Engine variant that delivers audio-only playback *from mixed-manifest sources*
(sources containing both audio and video renditions). The Case-2 Player feature
per [`../features/clusters.md` § Feature classification axes](../features/clusters.md#feature-classification-axes),
parallel to and distinct from [`audio-only-composition`](../features/audio-only-composition.md)
on the inverse axis: this use case is about **delivery-mode choice** (consumer
wants audio-only despite mixed source), where the Case-1 feature is about
**source-shape correctness** (engine handles audio-only manifests).

Notion epic [#4b](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4):
*"Subtract-down composition; chosen at Adapter level."*

## Status

- **Composition:** not implemented. The use case requires a parallel
  engine-factory + adapter pair, neither of which exists today.
  `createSimpleHlsEngine` composes the full video + audio pipeline; this
  variant would compose a subset.
- **Definition depth:** coarse — variant shape sketched, engine-factory and
  adapter shapes named at the level of "parallel siblings to the existing
  pair," implementation specifics tracked as open questions.
- **Source material:** Notion epic #4b (Audio-only Mode Override; Cluster E
  Selection policy layer; Player composition case 2; Eng=M, Validation=S).

## Target delivery context

Consumer scenarios where a source has both audio and video renditions but the
consumer wants audio-only delivery:

- **"Listen on the go" toggles** — user opts into audio-only delivery to save
  data or because they're not viewing the screen (background playback, screen
  off, headphones-only).
- **Audio-podcast modes** — content is podcast-flavored even when the source
  manifest is a standard mixed-AV HLS asset (no audio-only-source variant
  published).
- **Mux-billing-driven audio-only sessions** — Mux billing context may make
  audio-only sessions cheaper; consumers opt into audio-only to reduce billing.
- **Adapter-layer audio-only player chrome** — consumer surface presents an
  audio-only UI (cover art, podcast controls), engine variant matches the
  surface.

Common to all: the *source* is mixed-AV; the *delivery* is audio-only. The use
case is a customer-facing **mode override**, not a source-shape adaptation.

## Phases of complexity

| Phase | What |
|---|---|
| **1 — Basic functionality** | Parallel engine-factory + adapter pair. The engine factory (`createAudioOnlyHlsEngine` or similar) composes the audio-side subset of `createSimpleHlsEngine`'s behavior list, subtracting video-side behaviors entirely. The adapter (`SimpleAudioOnlyHlsMediaElement` or similar) wraps that engine with the same `shareSignals`-based pattern as `SimpleHlsMediaElement`. Minimum viable variant for mixed-manifest audio-only delivery |
| **2 — Features/functionality relevant to the use case** | Compose constituent feature behaviors as they land: [`audio-abr`](../features/audio-abr.md) when implemented (multi-bitrate audio support in the variant), [`multi-language-audio`](../features/multi-language-audio.md) when implemented (language selection within the variant). Both are additive — the variant gains capability as the constituent features get built |
| **3 — Optimizations** | Alternative default configurations for the audio-only delivery context: shorter forward-buffer targets (audio is lower-bandwidth; less ahead-buffering needed), possibly different `preload` defaults. The Path-A (update existing behavior's defaults) vs Path-B (audio-only-specific buffer-management behavior) judgment call applies — see [`README.md` § Implementation note](./README.md#implementation-note-customizing-behaviors-for-use-cases) |

## Composition specifics

Phase 1 is subtractive-only; Phases 2 and 3 surface the other mechanisms.

### Behaviors subtracted (Phase 1)

From `createSimpleHlsEngine`'s composition, omit:

- `selectVideoTrack` — no video rendition selection
- `resolveVideoTrack` — no video media playlist fetch
- `switchVideoQuality` — no video ABR switching
- `setupVideoBufferActors` — no video `SourceBuffer` / actor
- `loadVideoSegments` — no video segment loading
- Video-side bandwidth-sampling machinery (if separable from `bandwidthState`
  infrastructure shared with audio-abr)

### Behaviors added (Phase 1)

**None.** This use case ships as an *independent adapter* paired with its own
engine factory. The variant-decision is encoded in the adapter choice itself —
consumers instantiate `SimpleAudioOnlyHlsMediaElement` to opt in. No runtime
variant-decision behavior is needed.

### Alternative implementations (Phase 3 candidates)

- Possibly an audio-only-tuned `buffer-management` behavior with different
  defaults (Path-B). Phase 3 surfaces this candidate; the Path-A vs Path-B
  judgment per [`README.md` § Implementation note](./README.md#implementation-note-customizing-behaviors-for-use-cases)
  defers.

### Alternative default configurations (Phase 3 candidates)

- `forwardBuffer.bufferDuration` — shorter for audio-only (e.g., 10s instead of
  30s) since audio is lower-bandwidth and there's no display-paced render to
  ahead-buffer for.
- `preload` default — potentially more eager for audio-only (the cost of
  speculative fetching is lower).

## Constituent features

Phase 1 baseline:

- **[`audio-only-composition`](../features/audio-only-composition.md)**
  *(Case-1 sibling)* — used as-is at the *composition mechanism* level. The
  Case-1 feature's "Audio-only engine variant" phase row defines the subtractive
  composition shape; this use case applies the *same* shape but driven by
  adapter choice instead of source-shape detection. Whether the two share a
  single engine factory (with two entry points) or each gets its own factory
  is an open question.
- **[`audio-playback`](../features/audio-playback.md)** — used as-is. Provides
  rendition selection, media playlist resolution, segment loading; the variant
  inherits all of it.
- **[`engine-adapter-integration`](../features/engine-adapter-integration.md)** —
  used with an alternative adapter shape. The variant ships its own
  `SimpleAudioOnlyHlsMediaElement`-style adapter parallel to
  `SimpleHlsMediaElement`. The `shareSignals` mechanism + mixin pattern compose
  unchanged; the consumer-facing API differs.
- **[`mse-mms-pipeline`](../features/mse-mms-pipeline.md)** — used as-is.
  `MediaSource` + `endOfStream` gate compose unchanged across variants (per the
  uniform-across-tracks discipline — `endOfStream` reads
  `mediaSource.sourceBuffers` aggregately).
- **[`buffer-management`](../features/buffer-management.md)** — used as-is in
  Phase 1; Phase 3 surfaces alternative defaults.

Phase 2 (when these features land):

- **[`audio-abr`](../features/audio-abr.md)** — when implemented, composed in
  for multi-bitrate audio. Used as-is.
- **[`multi-language-audio`](../features/multi-language-audio.md)** — when
  implemented, composed in for mixed sources with multi-language audio. Used
  as-is.

## Customer-policy surface

The variant ships as an **independent adapter** parallel to
`SimpleHlsMediaElement`:

```ts
// Default (mixed AV delivery)
const player = new SimpleHlsMediaElement();
player.src = mixedSourceUrl;

// Audio-only mode override
const audioPlayer = new SimpleAudioOnlyHlsMediaElement();
audioPlayer.src = sameMixedSourceUrl;
```

The adapter encodes the mode choice; no runtime config flag or
detect-from-parser logic is involved. Consumers select the adapter that matches
their delivery surface.

Specific consumer-facing properties (loop flag, autoplay-muted defaults, etc.)
are adapter-layer concerns, not engine-variant concerns. The engine-variant
surface is the composition itself; the adapter wraps it with the API consumers
actually call.

## Variant-decision signal source

**Adapter-upfront.** The adapter is the variant decision — selecting
`SimpleAudioOnlyHlsMediaElement` over `SimpleHlsMediaElement` *is* the variant
choice. No detect-from-parser logic, no runtime config branch.

This resolves the recurring cross-feature "Variant-decision signal source" open
question (raised in [`audio-only-composition`](../features/audio-only-composition.md),
[`video-only-composition`](../features/video-only-composition.md), and
[`live-stream-support`](../features/live-stream-support.md)) **for this use case
specifically** — the answer doesn't necessarily extend to the Case-1 source-shape
variants, which may still benefit from detect-from-parser. The two paths
(adapter-upfront for Case-2, detect-from-parser candidate for Case-1) can
coexist.

## Likely cross-cutting impact

- **Engine variant factory shape: shared with Case-1 or separate?** Both the
  Case-1 `audio-only-composition` and this Case-2 use case want an engine that
  subtracts video-side behaviors.
  - **Shared factory** — single `createAudioOnlyHlsEngine`, called with
    different variant-decision sources (source-shape detection vs adapter
    choice). Code reuse maximized; the factory doesn't care why it's being
    invoked.
  - **Separate factories** — keeps Case-1 and Case-2 cleanly distinct even
    when their behavior lists overlap heavily.

  Lean: shared factory is simpler and matches the "composition is bounded to
  modes" framing. Variant-decision source is orthogonal to the factory itself.
- **Adapter shape proliferation.** Each use-case composition that gets its own
  adapter multiplies the adapter surface. As more use cases land
  (background-looping-video, video-only-mode-override, audio-podcast mode,
  etc.), the inventory of `SimpleXHlsMediaElement` classes grows. Worth flagging
  as a registry-level concern; may surface a future "use-case adapter factory"
  pattern.
- **Test coverage for mixed-source audio-only delivery.** New test coverage
  parallel to `engine.test.ts` "handles audio-only stream" but exercising a
  *mixed-source manifest* fed into the audio-only variant. Covers: video tracks
  present in `presentation.videoTracks` but not composed; audio-side fully
  exercised; no video appendBuffer calls.

## Open questions

- **Engine variant factory shape** — shared with Case-1 vs separate. Resolution
  depends on Case-1's implementation choices when `audio-only-composition`
  matures from current implicit tolerance to explicit variant.
- **Adapter naming.** `SimpleAudioOnlyHlsMediaElement` vs
  `SimpleHlsAudioOnlyMediaElement` vs other. Aligns with existing naming in
  `packages/spf/src/playback/engines/hls/adapter.ts` and downstream
  `packages/core/src/dom/media/`.
- **Subtitle / text-track handling.** Mixed-source manifests typically have
  subtitles; should the audio-only variant compose `selectTextTrack` /
  `loadTextTrackSegments` / sync? Lean: subtitles are out-of-band-of-audio (no
  display); consumer adapter decides whether to expose. Worth confirming.
- **Buffer-target tuning baseline.** Phase 3 alternative defaults — empirical
  question of whether the default 30s forward-buffer is appropriate for
  audio-only or wants tuning. Defer until Phase 1 lands and usage signals
  appear.
- **Mux-billing integration.** If audio-only sessions are billed differently,
  where does the billing context surface? Adapter-layer (consumer reports
  session type) vs engine-layer (engine exposes "this is audio-only mode"
  signal). Likely adapter-layer.
- **Variant-decision source for live + audio-only.** Live + audio-only
  intersection (radio-stream-like delivery from mixed source) — same
  adapter-upfront pattern, or does live add complications?

## Related features

- **[`audio-only-composition`](../features/audio-only-composition.md)** —
  Case-1 sibling on the inverse axis. Source-shape correctness (this feature)
  vs delivery-mode choice (the use case). Likely shares engine-factory
  composition; differs in variant-decision source.
- **[`audio-playback`](../features/audio-playback.md)** — constituent baseline.
- **[`engine-adapter-integration`](../features/engine-adapter-integration.md)** —
  constituent; variant adapter parallels `SimpleHlsMediaElement`.
- **[`mse-mms-pipeline`](../features/mse-mms-pipeline.md)** — constituent;
  composes unchanged.
- **[`buffer-management`](../features/buffer-management.md)** — constituent;
  Phase 3 alternative defaults candidate.
- **[`audio-abr`](../features/audio-abr.md)** *(documented; pending
  implementation)* — Phase 2 constituent.
- **[`multi-language-audio`](../features/multi-language-audio.md)** *(coarse;
  not yet implemented)* — Phase 2 constituent.

## Related use cases

- **[`video-only-mode-override`](./video-only-mode-override.md)** *(coarse)* —
  inverse-axis sibling. Same shape, video-side instead of audio-side: subtract
  audio behaviors from mixed source to deliver video-only. Distinct from
  `[background-looping-video]` despite shared `video-only-composition`
  constituent.

## See also

- [`README.md`](./README.md) — use-case-composition doc-type spec
- [`../features/clusters.md` § Composition vs Policy vs middle pattern](../features/clusters.md#composition-vs-policy-vs-middle-pattern) — composition implementation shape
- [`../features/clusters.md` § Feature classification axes](../features/clusters.md#feature-classification-axes) — Notion's Composition cases per mode framing
- [`../conventions/behaviors.md` § Inverse: behaviors that operate uniformly across tracks](../conventions/behaviors.md#inverse-behaviors-that-operate-uniformly-across-tracks) — composition-variant discipline; the `updateMediaSourceDuration` worked example
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4) — Notion epic #4b
- [`packages/spf/docs/hls-engine.md`](../../../../packages/spf/docs/hls-engine.md) — current HLS engine composition walkthrough; the variant subtracts from this baseline
