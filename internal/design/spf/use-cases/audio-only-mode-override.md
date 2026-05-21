---
status: partial
date: 2026-05-21
definition: sketched
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

- **Composition:** Phase 1 implemented. `createAudioOnlyHlsEngine` and
  `SimpleAudioOnlyHlsMediaElement` ship in `packages/spf/src/playback/engines/hls/`
  and re-export from `@videojs/spf/hls`. The adapter handles both truly
  audio-only HLS sources and mixed-AV sources (video / subtitle renditions
  ignored at composition time). Phases 2 (audio-abr, multi-language-audio)
  and 3 (alternative buffer-target defaults) are not yet implemented.
- **Definition depth:** sketched — Phase 1 implementation surface populated;
  Phases 2 and 3 remain coarse pending their constituent features.
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
| **1 — Basic functionality** *(implemented)* | Parallel engine-factory + adapter pair. `createAudioOnlyHlsEngine` composes the audio-side subset of `createSimpleHlsEngine`'s behavior list, subtracting video-side and text-track behaviors entirely (Phase 1 ships without subtitle support). `SimpleAudioOnlyHlsMediaElement` wraps the engine with the same `shareSignals`-based pattern as `SimpleHlsMediaElement`. See *Implementation surface* below |
| **2 — Features/functionality relevant to the use case** | Compose constituent feature behaviors as they land: [`audio-abr`](../features/audio-abr.md) when implemented (multi-bitrate audio support in the variant), [`multi-language-audio`](../features/multi-language-audio.md) when implemented (language selection within the variant). Both are additive — the variant gains capability as the constituent features get built |
| **3 — Optimizations** | Alternative default configurations for the audio-only delivery context: shorter forward-buffer targets (audio is lower-bandwidth; less ahead-buffering needed), possibly different `preload` defaults. The Path-A (update existing behavior's defaults) vs Path-B (audio-only-specific buffer-management behavior) judgment call applies — see [`README.md` § Implementation note](./README.md#implementation-note-customizing-behaviors-for-use-cases) |

## Composition specifics

Phase 1 is subtractive-only; Phases 2 and 3 surface the other mechanisms.

### Behaviors subtracted (Phase 1)

From `createSimpleHlsEngine`'s composition, omit:

**Video-side:**
- `resolveVideoTrack` — no video media playlist fetch
- `switchVideoQuality` — no video ABR switching (also subsumes the
  default-pick that owns `selectedVideoTrackId`; see `engine.ts:240-243`)
- `setupVideoBufferActors` — no video `SourceBuffer` / actor
- `loadVideoSegments` — no video segment loading

**Text-track-side** *(Phase 1 ships without subtitle support; future phase
may add back):*
- `selectTextTrack` — no subtitle rendition selection
- `resolveTextTrack` — no subtitle media playlist fetch
- `syncTextTracks` — no `TextTrack` slot sync
- `setupTextTrackActors` — no text-track actors
- `loadTextTrackSegments` — no subtitle segment loading

**`initialState` seed dropped:** the parent engine seeds `bandwidthState` to
let `switchVideoQuality` fire on its initial subscribe. With
`switchVideoQuality` subtracted and no Phase 1 audio behavior subscribing to
bandwidth, the seed becomes unnecessary and is omitted. Returns when
`audio-abr` (Phase 2) lands.

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

- **Buffer-target tuning baseline.** Phase 3 alternative defaults — empirical
  question of whether the default 30s forward-buffer is appropriate for
  audio-only or wants tuning. Defer until usage signals appear from Phase 1.
- **Mux-billing integration.** If audio-only sessions are billed differently,
  where does the billing context surface? Adapter-layer (consumer reports
  session type) vs engine-layer (engine exposes "this is audio-only mode"
  signal). Likely adapter-layer.
- **Variant-decision source for live + audio-only.** Live + audio-only
  intersection (radio-stream-like delivery from mixed source) — same
  adapter-upfront pattern, or does live add complications?
- **Subtitle support for Phase 2+.** Phase 1 ships without subtitles. Some
  audio-only consumer scenarios (podcast transcripts, accessibility) want
  subtitles back; a future phase can add the text-track behaviors as an
  additive composition. Whether subtitles compose unchanged from the default
  engine or need a tuning pass is open.

## Resolved during Phase 1 implementation

These questions were open in the original `coarse` draft and resolved by the
Phase 1 implementation pass (kept for traceability):

- **Engine variant factory shape** — *shared.* Single `createAudioOnlyHlsEngine`
  serves both the Case-2 adapter-upfront variant (this use case) and the
  Case-1 source-shape variant ([`audio-only-composition`](../features/audio-only-composition.md))
  once the latter's detect-from-parser routing lands. Variant-decision source
  is orthogonal to the factory.
- **Adapter naming** — `SimpleAudioOnlyHlsMediaElement` (with
  `SimpleAudioOnlyHlsMediaMixin` for mixin consumers and
  `simpleAudioOnlyHlsMediaDefaultProps` for default values), matching the
  `Simple{Variant}HlsMediaElement` naming pattern.
- **Subtitle / text-track handling for Phase 1** — *subtracted entirely.*
  Phase 1 ships without subtitles to keep the initial surface lean; future
  phases may add back additively (see *Open questions*).

## Implementation surface

Phase 1 landed in `packages/spf/src/playback/engines/hls/`, parallel to the
existing default engine + adapter pair.

**Engine factory:**

| Export | File | Purpose |
|---|---|---|
| `createAudioOnlyHlsEngine` | `engine-audio-only.ts` | Subtractive composition variant; omits all video + text-track behaviors |
| `SimpleAudioOnlyHlsEngineState` | `engine-audio-only.ts` | Trimmed state — no `selectedVideoTrackId` / `selectedTextTrackId` / `userVideoTrackSelection` / `bandwidthState` |
| `SimpleAudioOnlyHlsEngineContext` | `engine-audio-only.ts` | Trimmed context — no video buffer / video segment loader / text-track actor slots |
| `SimpleAudioOnlyHlsEngineConfig` | `engine-audio-only.ts` | Trimmed config — no video-quality, bandwidth, or text-track fields |
| `SimpleAudioOnlyHlsEngineSignals` | `engine-audio-only.ts` | `onSignalsReady` callback type |

**Adapter:**

| Export | File | Purpose |
|---|---|---|
| `SimpleAudioOnlyHlsMediaElement` | `adapter-audio-only.ts` | Standalone adapter, no base class |
| `SimpleAudioOnlyHlsMediaMixin` | `adapter-audio-only.ts` | Mixin for adapters with a custom base |
| `SimpleAudioOnlyHlsMediaProps` / `…AP I` | `adapter-audio-only.ts` | Adapter API surface — same WHATWG src/preload/play contract as `SimpleHlsMediaElement` |
| `simpleAudioOnlyHlsMediaDefaultProps` | `adapter-audio-only.ts` | Default-prop constants |

**Public re-exports:** `@videojs/spf/hls` — all of the above ship via
`packages/spf/src/playback/engines/hls/index.ts`.

**Composed behaviors (Phase 1):** `syncPreload`, `trackLoadTriggers`,
`resolvePresentation`, `selectAudioTrack`, `resolveAudioTrack`,
`calculatePresentationDuration`, `setupMediaSource`,
`updateMediaSourceDuration`, `setupAudioBufferActors`, `trackCurrentTime`,
`loadAudioSegments`, `endOfStream`, `shareSignals`.

`endOfStream` composes unchanged from the default engine — it iterates
buffer actors via `[videoBufferActor, audioBufferActor].filter(Boolean)`
and reads `mediaSource.sourceBuffers` aggregately, so the audio-only
configuration drives end-of-stream correctly with no per-type changes.

## Verification

**Unit tests** (`packages/spf/src/playback/engines/hls/tests/`):

- `engine-audio-only.test.ts`:
  - `"creates engine with state, context, and destroy"` — basic API surface
  - `"does not seed bandwidthState (no ABR behavior subscribed at init)"` —
    asserts the dropped seed
  - `"plays truly audio-only HLS source (parity with default-engine tolerance)"`
    — asserts `selectedAudioTrackId`, `audioBufferActor`, and an open
    `MediaSource` against an audio-only manifest. Parity baseline with
    `engine.test.ts` → "handles audio-only stream (no video tracks)"
  - `"plays mixed HLS source as audio-only (video tracks ignored)"` —
    **the Case-2 acceptance criterion.** Asserts the variant ignores video
    stream-inf entries: no `selectedVideoTrackId`, no `videoBufferActor`,
    no fetch of the video media playlist
  - `"plays mixed HLS source with subtitles ignored"` — asserts no
    text-track machinery is set up against a manifest that contains a
    `TYPE=SUBTITLES` rendition
  - `"cleans up on destroy"` — `engine.destroy()` does not throw

- `adapter-audio-only.test.ts` — 28 tests covering the WHATWG
  `src`/`preload`/`play()`/`attach`/`detach`/`destroy` contract on
  `SimpleAudioOnlyHlsMediaElement`. Mirrors `adapter.test.ts` semantically
  (the variant differs in composition, not in adapter contract).

**Out of scope for Phase 1 (deferred):**

- Sandbox demo — Phase 1 has no dedicated sandbox entry yet. A worthwhile
  follow-up: a `apps/sandbox/src/spf-audio-only/` page exercising
  `SimpleAudioOnlyHlsMediaElement` against a real mixed-AV HLS source.
- E2E tests — engine-level integration suffices for Phase 1; E2E reliability
  coverage tracked separately.

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
- [`packages/spf/src/playback/engines/hls/engine-audio-only.ts`](../../../../packages/spf/src/playback/engines/hls/engine-audio-only.ts) — Phase 1 engine factory
- [`packages/spf/src/playback/engines/hls/adapter-audio-only.ts`](../../../../packages/spf/src/playback/engines/hls/adapter-audio-only.ts) — Phase 1 adapter
- [`packages/spf/src/playback/engines/hls/tests/engine-audio-only.test.ts`](../../../../packages/spf/src/playback/engines/hls/tests/engine-audio-only.test.ts) — Phase 1 engine integration tests
- [`packages/spf/src/playback/engines/hls/tests/adapter-audio-only.test.ts`](../../../../packages/spf/src/playback/engines/hls/tests/adapter-audio-only.test.ts) — Phase 1 adapter tests
