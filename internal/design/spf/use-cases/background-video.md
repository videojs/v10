---
status: draft
date: 2026-05-22
definition: technical
---

# Background video

Engine variant for silent, autoplay-looping video on ambient/decorative
surfaces (hero backgrounds, GIF-replacement loops, editorial previews).
The Case-2 Player feature per
[`../features/clusters.md` § Feature classification axes](../features/clusters.md#feature-classification-axes);
ground-truth source the Mux [`mux-background-video`](https://github.com/muxinc/mux-background-video)
product adapted to Video.js 10. Phase 1 is the SPF foundation for
`<mux-background-video>` under parent epic
[#873](https://github.com/videojs/v10/issues/873); the composition
demonstrates SPF composability by *removing* behaviors from the standard
playback engine rather than adding new logic.

Distinct from [`video-only-mode-override`](./video-only-mode-override.md):
both subtract audio from mixed-source manifests, but background-
video also commits to single-rendition playback, loop semantics,
autoplay-via-initial-state, and a product-shaped adapter — `mode-override`
is the narrower "deliver video-only despite mixed source" use case.

## Status

Phase 1 implemented ([#1586](https://github.com/videojs/v10/issues/1586)):
`createBackgroundVideoEngine`, `BackgroundVideoMediaElement`,
and the `pickMaxResolutionVideoTrack` primitive ship under
`@videojs/spf/background-video`. Phases 2-3 (decorator composition
of audio and preload) and Phase 4 (Video.js component shell — out of SPF
scope) stay coarser.

## Phases

Adopts the parent-epic [#873](https://github.com/videojs/v10/issues/873)
phase structure — phases map to discrete epic deliverables.

| Phase | What |
|---|---|
| **1 — Composition + adapter** ([#1586](https://github.com/videojs/v10/issues/1586)) | Subtractive composition removing audio, text, ABR, preload-monitoring, and play/seek-monitoring behaviors; adds `selectVideoTrack` with a max-resolution picker; seeds `loadActivated: true`; ships independent adapter parallel to `SimpleHlsMediaElement`. HLS multivariant source; native `mediaElement.loop = true`. |
| **2 — `withAudio()` decoration** | Composes audio-side behaviors back in for surfaces needing audio (user-initiated unmute, audible ambient). Decorator shape TBD. |
| **3 — `withPreload()` + optimizations** | Composes preload-state monitoring back in for lazy/viewport-gated tiles. Co-scoped with loop-around forward-buffer fetching, GPU/thermal-aware quality caps, and a sampling-strip alt-impl of `loadVideoSegments`. |
| **4 — Video.js component** | Full `<mux-background-video>` integration. **Out of SPF scope** — adapter / consumer territory. |

## Composition specifics

Phase 1 uses three mechanisms — subtract, add, and alternative default
configuration. Alternative-implementation buckets surface in Phase 3.

### Subtracted

From [`createSimpleHlsEngine`](../../../../packages/spf/src/playback/engines/hls/engine.ts):

- `syncPreload`, `trackLoadTriggers` — no preload-state monitoring or DOM `play`/`seeking` activation; replaced by `loadActivated: true` initial state.
- `selectAudioTrack`, `resolveAudioTrack`, `setupAudioBufferActors`, `loadAudioSegments` — no audio side.
- `switchTextTrack`, `resolveTextTrack`, `syncTextTracks`, `setupTextTrackActors`, `loadTextTrackSegments` — no text-track machinery.
- `switchVideoQuality` — no ABR; commits to a single rendition for the session.

### Added

`selectVideoTrack` (from [`select-tracks.ts`](../../../../packages/spf/src/playback/behaviors/select-tracks.ts))
with a config-provided `picker`, defaulting to `pickMaxResolutionVideoTrack`.
Per `switchVideoQuality`'s docstring: *"Composing `selectVideoTrack` alone
tree-shakes out the ABR code path."* — exactly the affordance Phase 1 wants.

### Alternative default configurations

- **`initialState.loadActivated: true`** *(Phase 1)* — seeds the composition into the post-preload-gate state from frame 0. Combined with the `syncPreload` / `trackLoadTriggers` subtractions, every downstream behavior that would otherwise gate on `!isBlockingPreload(preload) || loadActivated` sees `loadActivated` truthy from the start.
- **`picker`** *(Phase 1)* — defaults to `pickMaxResolutionVideoTrack`; overridable for mobile/content-aware caps.
- **Back-buffer tuning** *(Phase 3 candidate)* — larger back-buffer for gapless wrap-around (per [`buffer-management`](../features/buffer-management.md)'s `BackBufferConfig.keepSegments`).
- **GPU/thermal-aware quality caps** *(Phase 3 candidate)* — shared concern with `video-only-mode-override`.

### Alternative implementations *(Phase 3 candidates)*

- **Sampling-strip `loadVideoSegments`** — the standard loader samples bandwidth into `state.bandwidthState` to feed ABR. With `switchVideoQuality` subtracted, no consumer reads it; sampling is harmless but wasted work. Per [`README.md` § Implementation note](./README.md#implementation-note-customizing-behaviors-for-use-cases), likely Path B (the sampling assumption is structurally tied to ABR).
- **Loop-around forward-buffer fetching** — pre-fetch the wrap-around for gapless restart. See [`buffer-management`](../features/buffer-management.md) "What's not implemented".

## Customer-policy surface

Independent adapter parallel to `SimpleHlsMediaElement`:

```ts
const bgPlayer = new BackgroundVideoMediaElement({ picker: maxResolutionPicker });
bgPlayer.src = sourceUrl;
bgPlayer.loop = true;        // native HTMLMediaElement.loop
bgPlayer.muted = true;       // browser autoplay policy
bgPlayer.play();
```

Engine config: **`picker`** (TrackPicker, default max-resolution); later
phases add `withAudio()` / `withPreload()` decorator hooks. Native `loop`
/ `muted` live on the underlying media element. Adapter-layer concerns
(autoplay-muted defaults, loop policy refinements, GPU/thermal caps, the
Video.js component shell) live above the SPF engine.

## Variant-decision signal source

**Adapter-upfront.** Selecting `BackgroundVideoMediaElement` *is*
the variant choice — no parser detection, no runtime config branch. Same
resolution as [`video-only-mode-override`](./video-only-mode-override.md)
and [`audio-only-mode-override`](./audio-only-mode-override.md): Case-2
use cases resolve via adapter choice.

## Constituent features

Phase 1 baseline:

- **[`video-only-mode-override`](./video-only-mode-override.md)** — inverse delivery-mode sibling using the same audio-side subtraction, with background video adding further text, ABR, and preload changes.
- **[`engine-adapter-integration`](../features/engine-adapter-integration.md)** — variant adapter parallels `SimpleHlsMediaElement` via the same `SimpleHlsMediaMixin` / `shareSignals` pattern.
- **[`mse-mms-pipeline`](../features/mse-mms-pipeline.md)** — used as-is. Firefox `mozHasAudio=false` verification under subtractive-audio composition is joint Phase 1 scope with `video-only-mode-override`.
- **[`buffer-management`](../features/buffer-management.md)** — as-is in Phase 1; Phase 3 surfaces back-buffer tuning and loop-around forward-buffer fetching (the "loop-around buffer fetching" candidate in that feature's *What's not implemented* directly targets this use case).
- **[`preload-modes`](../features/preload-modes.md)** — alternative initial state (`loadActivated: true`) plus subtraction of `syncPreload` + `trackLoadTriggers`. Semantic contract preserved; the variant just seeds the gate-passable state from composition time.

Subtracted (cross-link discipline):

- **[`video-abr`](../features/video-abr.md)** — single rendition for the session.
- **[`multi-language-audio`](../features/multi-language-audio.md)** — audio fully subtracted.
- **[`subtitles`](../features/subtitles.md)** — text fully subtracted; may resurface if a `withCaptions()`-style extension is scoped.

Phase 2 (decorations TBD): **[`audio-playback`](../features/audio-playback.md)**, **[`audio-abr`](../features/audio-abr.md)**.

## Likely cross-cutting impact

- **Shared engine factory.** This use case and `video-only-mode-override` both want subtractive-audio composition. Share the factory at that level, then layer background-video text, ABR, preload, and initial-state differences.
- **Firefox `mozHasAudio` verification.** Joint scope with the two sibling cases — same mixed-source-with-audio-subtracted permutation.
- **Adapter proliferation.** N+1 adapter parallel to `SimpleHlsMediaElement`; three adapters share the `SimpleHlsMediaMixin` / `shareSignals` pattern — cost is configuration surface, not architecture.
- **`loadActivated: true` initial-state pattern.** Pioneered here. If a second use case wants the same shape, consider a shared `withAutoLoad()`-style helper or document treatment in [`preload-modes`](../features/preload-modes.md).

## Open questions

- **Phase 2/3 decorator pattern shape.** Decorator on the engine factory? Composable-feature abstraction? Engine-config flags re-including subtracted behaviors? Resolves when Phase 2/3 are scoped.
- **Shared engine factory.** Joint with `video-only-mode-override`; this case composes further subtractions.
- **Sampling-strip alt-impl Path A vs B.** Likely Path B per [`README.md` § Implementation note](./README.md#implementation-note-customizing-behaviors-for-use-cases).
- **GPU/thermal-aware quality caps boundary.** Engine-variant (compose a thermal-aware behavior) or adapter (cap the picker candidate set). Likely engine-variant given the product context.

Resolved Phase 1: ~~picker location~~ (`pickMaxResolutionVideoTrack` ships in [`media/primitives/select-tracks.ts`](../../../../packages/spf/src/media/primitives/select-tracks.ts) next to `pickFirstTrackId`); ~~adapter naming~~ (`BackgroundVideoMediaElement`; product-shell naming `<mux-background-video>` lives in the adapter layer).

## See also

- [`video-only-mode-override.md`](./video-only-mode-override.md) — peer use case; shares constituent features and Firefox `mozHasAudio` scope; differs in delivery-scenario specificity (this is the Mux-product-shaped variant with loop, single-rendition, autoplay-via-initial-state).
- [`audio-only-mode-override.md`](./audio-only-mode-override.md) — inverse-axis sibling; shares adapter-upfront pattern and the shared-engine-factory open question.
- [`README.md`](./README.md) — use-case-composition doc-type spec.
- [`../features/clusters.md` § Composition vs Policy vs middle pattern](../features/clusters.md#composition-vs-policy-vs-middle-pattern) · [`../conventions/behaviors.md` § Inverse: behaviors that operate uniformly across tracks](../conventions/behaviors.md#inverse-behaviors-that-operate-uniformly-across-tracks).
- [`../../../../packages/spf/docs/hls-engine.md`](../../../../packages/spf/docs/hls-engine.md) — HLS engine composition baseline the variant subtracts from.
- [`select-tracks.ts`](../../../../packages/spf/src/playback/behaviors/select-tracks.ts) (add target) · [`engine.ts`](../../../../packages/spf/src/playback/engines/hls/engine.ts) (subtraction baseline).
- [GitHub #1586](https://github.com/videojs/v10/issues/1586) (Phase 1) · [#873](https://github.com/videojs/v10/issues/873) (parent epic) · [`mux-background-video`](https://github.com/muxinc/mux-background-video) (prior art) · [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4).
