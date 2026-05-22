---
status: partial
date: 2026-05-22
definition: sketched
---

# Multi-language audio

Recognize multiple audio renditions from a multivariant HLS playlist, expose them with language metadata, apply a default-selection picker, and support user / programmatic switching of the active audio track — including mid-stream switching with audio-buffer flush at the next-segment boundary.

## Status

- **Composition:** Tier 1 (recognition + default selection) and most of Tier 2 (programmatic selection via `userAudioTrackSelection` + mid-stream switching) implemented in `createSimpleHlsEngine` and `createHlsAudioOnlyEngine`. A/V sync policy on mid-stream switch is "switch at next-segment boundary" (starting point, area for improvement). Persistence (Tier 2 phase 6) deferred.
- **Definition depth:** sketched — implementation surface populated for Tier 1 and Tier 2; specific phases (A/V sync policy refinement, persistence) remain coarse pending follow-up.

## Phases of complexity

| Phase | What | Status |
|---|---|---|
| **Tier 1 — Recognition + exposure** | Parser surfaces all audio renditions with `LANGUAGE`, `NAME`, `DEFAULT`, `AUTOSELECT`, `CHANNELS`, `URI`, `CODECS` metadata; engine state exposes the candidate list via `presentation.selectionSets`. | **Implemented** (free — owned architecturally by `parseMultivariantPlaylist` and surfaced via `audio-playback`) |
| **Tier 1 — Default selection** | Three-tier picker: `preferredAudioLanguage` → `DEFAULT=YES` → first track. | **Implemented** — `pickAudioTrack` wired as default in `selectAudioTrack`'s `AUDIO_TRACK_SELECTION_CONFIG`. `preferredAudioLanguage` config field active (was inert before this feature) |
| **Tier 2 — Programmatic selection** | Consumer writes `userAudioTrackSelection` (`Partial<AudioTrack>`) to narrow the candidate set; `selectAudioTrack` reads the filter, re-fires on changes, short-circuits picker when filter narrows to single track, falls back to unfiltered candidates when filter excludes all. | **Implemented** — sibling of `userVideoTrackSelection`; constraint+filter shape matches video precedent |
| **Tier 2 — Mid-stream switching** | When `selectedAudioTrackId` changes mid-playback (and the audio buffer's `initTrackId` differs from new selection), audio buffer flushes from next-segment-boundary at/after playhead via `SourceBufferActor.remove`. Loader replan happens naturally via `loadAudioSegments` reactivity to `selectedAudioTrackId`. | **Implemented** — same-codec only. Cross-codec switching (e.g., AAC → AC-3) handled by 5.1-surround-selection's `changeType()` path (DWIM — flush orchestration designed extensible) |
| **Tier 2 — A/V sync during switch** | Switch at next-segment-boundary: current segment plays through; new rendition starts at boundary. | **Implemented (starting point)** — area for improvement: smoother sync via pause / silence-pad alternatives, configurable strategy. See Open questions |
| **Tier 2 — Persistence** | Remember user's last audio-track choice across sources or sessions. | **Deferred** — policy on top of API, not core to feature mechanism. Future work |

## What's in scope vs out of scope

**In scope (implemented):**
- All Tier 1 and Tier 2 phases above except persistence
- HLS spec compliance for `EXT-X-MEDIA:TYPE=AUDIO` rendition handling
- VoD content

**Out of scope (separate candidate features):**
- **[audio-abr](./audio-abr.md)** *(documented; not implemented)* — bandwidth-driven switching within an audio rendition group. The slot writer `switchAudioQuality` will replace `selectAudioTrack` when audio-abr ships, mirroring video's `selectVideoTrack` / `switchVideoQuality` precedent. `userAudioTrackSelection` filter shape is shared between this feature and audio-abr (single slot serves both bitrate-pinning and language-pinning, per audio-abr's open question pending resolution).
- **[5.1-surround-selection](./5.1-surround-selection.md)** *(coarse, not yet documented)* — capability-gated codec selection for audio. Layers on top of multi-language-audio's rendition surfacing. Owns codec-change switching (cross-codec `changeType()` or buffer recreation).
- **[audio-only-mode-override](../use-cases/audio-only-mode-override.md)** *(use case; Phase 2 partial — this feature composes in as Phase 2 constituent)* — engine variant for audio-only delivery. Different composition concern.

**Out of scope (different architectural layer):**
- **DOM `HTMLMediaElement.audioTracks` exposure** — mirroring `selectedAudioTrackId` into `HTMLMediaElement.audioTracks` is not an SPF concern. Adapter / above-the-engine layer may implement.
- **Persistence** — deferred. See *Phases of complexity*.

## Likely cross-cutting impact

Resolved during implementation:

- **Track registry primitive** — no extraction. The audio multi-writer pattern (Tier 2 programmatic) uses **constraint+filter** (single slot writer, `userAudioTrackSelection` is consumer intent), not multi-writer. `selectedAudioTrackId` stays single-writer. Premature to extract a shared abstraction at 2 data points (text + audio); text uses multi-writer-with-intent (different shape).
- **`resolveAudioTrack` re-resolution** — no extension needed. `setupTrackResolution`'s `'presentation-resolved'` state effect reads `selectedAudioTrackId` reactively; mid-stream switch fires the effect, scheduling a fetch task for the new track. Source-identity state-exit cleanup cancels stale tasks via `runner.abortAll`.
- **Audio SourceBuffer flush** — implemented in `setupAudioBufferActors`'s setup function as a separate `effect()` alongside the base reactor. Reads `bufferActor.snapshot.context.initTrackId` (via `computed` for fine-grained subscription on track-id only) and dispatches `{ type: 'remove', start: nextBoundary, end: Number.MAX_VALUE }` on mismatch.
- **`loadAudioSegments` replan** — no change needed. Already reactive to `selectedAudioTrackId` via segment loader actor's internal effect.
- **Manifest parser** — already surfaces all needed per-track metadata (verified via existing `audio-playback` Phase 1).

## Open questions

- **A/V sync policy refinement.** Next-segment-boundary flush is the starting point. Improvements to evaluate when usage signals arrive:
  - Configurable strategy knob (`audioSwitchSyncPolicy: 'next-boundary' | 'pause' | 'accept-gap'`)
  - Pause playback during switch for smoother UX at boundary
  - Silence-pad for sub-segment gap mitigation
  - Codec-change branching when 5.1-surround-selection lands
- **Persistence model.** When implemented: localStorage / cookie / consumer-supplied storage? Across-source preservation rules? Likely adapter-layer, not engine.
- **`userAudioTrackSelection` slot sharing with `switchAudioQuality`.** When audio-abr lands, does the slot serve both language-pinning and bitrate-pinning (video's pattern) or do they split? Resolution deferred to audio-abr implementation.

## Resolved during this phase's implementation

- **A/V sync policy** — chose **next-segment-boundary** as starting point (smoother than playhead-forward flush; cheaper than pause / silence-pad).
- **Programmatic write path** — chose **constraint+filter via `userAudioTrackSelection`** over direct multi-writer write to `selectedAudioTrackId`. Aligns with video's `userVideoTrackSelection` precedent; preserves audio-abr's path to introducing `switchAudioQuality` as the slot owner.
- **Mid-stream flush placement** — chose **inline `effect()` inside `setupAudioBufferActors`** (alongside the shared `setupBufferActors` reactor) over a separate behavior. Couples flush with actor lifecycle without polluting the shared video/audio helper.
- **Track-registry primitive extraction** — chose **defer**. Two data points (text + audio) with different multi-writer shapes don't justify extraction yet.

## Implementation surface

**Composition:** `packages/spf/src/playback/engines/hls/engine.ts` (default) + `packages/spf/src/playback/engines/hls/engine-audio-only.ts` (variant).

**Behaviors (modified):**

| Behavior | File | Responsibility |
|---|---|---|
| `selectAudioTrack` | `packages/spf/src/playback/behaviors/select-tracks.ts` | Manages `selectedAudioTrackId` — picks default on `presentation-resolved` entry (3-tier `pickAudioTrack`); reads `userAudioTrackSelection` filter; narrows candidate set; re-fires on filter changes; short-circuits picker when filter narrows to single track; clears slot on src unload. Uses sibling helper `setupAudioTrackSelection` (filter-reactive; mirrors `setupQualitySwitching`'s pattern minus ABR) |
| `setupAudioBufferActors` | `packages/spf/src/playback/behaviors/dom/setup-buffer-actors.ts` | Existing setup of audio `SourceBufferActor` + `SegmentLoaderActor`, PLUS new mid-stream flush `effect()` that detects track-id mismatch (`initTrackId` vs `selectedAudioTrackId`) and dispatches `remove(nextBoundary, MAX)` to flush stale ahead-buffer at next segment boundary |

**State slots:**

- `selectedAudioTrackId` — single-writer (`selectAudioTrack`). Constraint+filter pattern keeps writer count at 1; intent flows through `userAudioTrackSelection`.
- `userAudioTrackSelection` — new slot in `SimpleHlsEngineState` + `SimpleHlsAudioOnlyEngineState`. `Partial<AudioTrack>` shape. Single-writer (external consumer via `shareSignals`). Read by `selectAudioTrack`.
- `currentTime` — added to `BufferActorsState`. Read by `setupAudioBufferActors`'s flush effect to find next-segment-boundary at/after playhead.

**Helpers:**

| Helper | File | Status |
|---|---|---|
| `setupAudioTrackSelection` | `packages/spf/src/playback/behaviors/select-tracks.ts` | New filter-reactive helper for audio. Mirrors `setupQualitySwitching`'s filter-narrowing pattern minus the bandwidth/ABR layer. State-exit clear via canonical entry-returns-cleanup form |
| `pickAudioTrack` | `packages/spf/src/media/primitives/select-tracks.ts` | **Now wired** as `selectAudioTrack`'s default picker (was inert; required custom-picker override before this feature) |

**Composition wiring:** No new behaviors added to either engine factory — the modified `selectAudioTrack` and `setupAudioBufferActors` compose unchanged. State types extended in both `engine.ts` and `engine-audio-only.ts` to expose `userAudioTrackSelection`.

## Verification

**Unit tests** (`packages/spf/src/playback/behaviors/tests/select-tracks.test.ts` — `selectAudioTrack` describe block):

- `picks track matching preferredAudioLanguage when supplied` — Tier 1 default selection via language preference
- `falls back to DEFAULT=YES track when preferredAudioLanguage does not match` — Tier 1 second-tier fallback
- `falls back to first track when no language preference and no DEFAULT track` — Tier 1 final fallback
- `narrows candidates by userAudioTrackSelection filter (language)` — Tier 2 programmatic write via filter
- `re-picks on userAudioTrackSelection change mid-presentation` — Tier 2 reactive re-pick on filter change
- `filter narrowing to a single track short-circuits the picker` — Tier 2 short-circuit semantics
- `empty filter result falls back to unfiltered candidate set` — graceful no-match fallback

**Unit tests** (`packages/spf/src/playback/behaviors/dom/tests/setup-buffer-actors.test.ts`):

- `flushes audio buffer at next-segment-boundary on mid-stream track switch` — Tier 2 mid-stream flush: dispatches `{ type: 'remove', start: 6, end > 60 }` to audio bufferActor when `initTrackId` ≠ `selectedAudioTrackId`
- `does not flush on initial buffer setup (initTrackId undefined)` — guard for initial entry (no init yet)
- `does not flush when initTrackId matches selected track (steady state)` — guard for steady-state segment-append churn

**Unit tests** (`packages/spf/src/playback/engines/hls/tests/engine-audio-only.test.ts`):

- `exposes userAudioTrackSelection slot for multi-language-audio Tier 2 writes` — variant engine state exposes the filter slot

**Out of scope / deferred:**

- End-to-end mid-stream-switch verification (browser-level rendition switching) deferred to manual sandbox / E2E pass once a multi-language test source is available.
- Persistence — not implemented; no test coverage.
- A/V sync policy alternatives (pause / silence-pad) — not implemented.

## Related features

- **[audio-playback](./audio-playback.md)** — single-rendition baseline this feature extends. The "Language-aware default selection" gap there is now resolved.
- **[subtitles](./subtitles.md)** — direct template for the selection-picker shape; multi-writer state slot pattern. Subtitles uses orthogonal multi-writer (`selectTextTrack` + DOM `change`); audio uses constraint+filter — different shapes.
- **[video-abr](./video-abr.md)** — `userVideoTrackSelection` constraint+filter precedent. Same shape as audio's new `userAudioTrackSelection` slot.
- **[audio-abr](./audio-abr.md)** *(documented; pending implementation)* — destination-architecture sibling. When implemented, `switchAudioQuality` will replace `selectAudioTrack` as the `selectedAudioTrackId` writer; `userAudioTrackSelection` filter shape carries over.
- **[5.1-surround-selection](./5.1-surround-selection.md)** *(coarse, not yet documented, candidate)* — codec-change extension. Tier 2 mid-stream flush is designed extensible to codec-change routing.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — owns the audio `SourceBufferActor` and the `remove` / `flushBuffer` primitives that mid-stream flush builds on.
- **[buffer-management](./buffer-management.md)** — audio segment loading already replans on `selectedAudioTrackId` change via natural reactivity; no extension needed.
- **[audio-only-mode-override](../use-cases/audio-only-mode-override.md)** *(use case; Phase 2 partial)* — this feature composes in for multi-language audio selection within the audio-only variant.

## Use cases that compose this feature

- **[`audio-only-mode-override`](../use-cases/audio-only-mode-override.md)** *(Phase 2 partial — landed with this feature)* — variant engine `createHlsAudioOnlyEngine` exposes `userAudioTrackSelection` and composes the filter-reactive `selectAudioTrack` + flush-aware `setupAudioBufferActors` unchanged from the default engine.

## See also

- [subtitles.md](./subtitles.md) — closest selection-shape analog
- [video-abr.md](./video-abr.md) — `userVideoTrackSelection` constraint+filter precedent
- [audio-abr.md](./audio-abr.md) — destination-architecture sibling for `selectedAudioTrackId`
- [conventions/signals.md](../conventions/signals.md) — multi-writer slot conventions
- [conventions/behaviors.md](../conventions/behaviors.md) — per-type specialization
- [packages/spf/src/playback/behaviors/select-tracks.ts](../../../../packages/spf/src/playback/behaviors/select-tracks.ts) — selectAudioTrack + setupAudioTrackSelection helper
- [packages/spf/src/playback/behaviors/dom/setup-buffer-actors.ts](../../../../packages/spf/src/playback/behaviors/dom/setup-buffer-actors.ts) — mid-stream flush effect
