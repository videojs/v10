---
status: draft
date: 2026-05-20
definition: coarse
---

# Multi-language audio

Recognize multiple audio renditions from a multivariant HLS playlist, expose them with language metadata, apply a default-selection picker, and support user / programmatic switching of the active audio track. Today the engine plays at most one audio track per source — the one chosen by `selectAudioTrack`'s default picker. Adding this feature is the canonical next step for the track-selection / filtering work.

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. Today's [`audio-playback`](./audio-playback.md) feature is the single-rendition baseline; this feature extends it with multi-rendition recognition, programmatic selection, and mid-stream switching. The foundation behaviors (`selectAudioTrack`, `resolveAudioTrack`, `setupAudioBufferActors`, `loadAudioSegments`) all exist and ship as part of `audio-playback`, but assume a single audio playlist throughout the source's lifetime.
- **Definition depth:** coarse — scope and relations identified; implementation approach not yet sketched.

## Phases of complexity

Following the Tier 1 / Tier 2 framing from the broader inventory:

| Phase | What | Notes |
|---|---|---|
| **Tier 1 — Recognition + exposure** | Parser surfaces all audio renditions with `LANGUAGE`, `NAME`, `DEFAULT`, `AUTOSELECT`, `URI` metadata; engine state exposes the candidate list | Pre-req for everything below. Probably free given the subtitles parser pattern — same multivariant-playlist code path |
| **Tier 1 — Default selection** | Three-tier picker: `preferredAudioLanguage` → `DEFAULT=YES + AUTOSELECT=YES` → fallback | Direct parallel to subtitles `selectTextTrack` picker — likely lifts the same shape |
| **Tier 2 — Programmatic selection** | Consumer writes `userAudioTrackSelection` (parallel to `userVideoTrackSelection`) to override default | Requires multi-writer state coordination on `selectedAudioTrackId` (`selectAudioTrack` writes default; programmatic write overrides) |
| **Tier 2 — Mid-stream switching** | When `selectedAudioTrackId` changes mid-playback: flush stale audio range from the existing SourceBuffer (`remove(playhead, end)`), re-resolve the new track's playlist if not already fetched, restart segment loading from current playhead | Same-codec switch (the typical case for language-only renditions) — no SourceBuffer recreation, no `changeType()`. Closest precedent in the codebase: video ABR also keeps the same SourceBuffer and feeds it different-bitrate segments; audio adds the wrinkle that the new segments come from a different media playlist. Codec-change switching (e.g., stereo AAC → 5.1 AC-3 in a different rendition group) is a separate concern handled under `5.1-surround-selection` |
| **Tier 2 — A/V sync during switch** | Hold playback continuity while audio buffer is repopulated; avoid audio gap that exceeds tolerance | Open: do we pause? do we silence-pad? do we accept brief gaps? |
| **Tier 2 — Persistence** | Remember the user's last audio-track choice across sources or sessions | Lower priority; pure policy on top of programmatic API |

## What's in scope vs out of scope

**In scope:**
- All phases above for HLS VoD content
- HLS spec compliance for `EXT-X-MEDIA:TYPE=AUDIO` rendition handling

**Out of scope (separate candidate features):**
- **[audio-abr](./audio-abr.md)** — bandwidth-driven switching within an audio rendition group. Today no audio quality switching exists at all (audio segment loader uses plain `fetchStream`, not `createTrackedFetch`). Audio ABR depends on multi-language audio for the rendition-group machinery but is a distinct feature.
- **5.1-surround-selection** — capability-gated codec selection for audio. Layers on top of multi-language audio's rendition surfacing. Also owns the codec-change switching case (`SourceBuffer.changeType()` or buffer recreation), since cross-codec switches are where the SourceBuffer itself needs to mutate.
- **audio-only-composition** — engine variant for audio-only sources. Different composition concern; this feature is about audio-track *selection*, not whether video is present.

**Out of scope (different architectural layer):**
- **DOM `HTMLMediaElement.audioTracks` exposure** — mirroring `selectedAudioTrackId` into `HTMLMediaElement.audioTracks` (parallel to how `syncTextTracks` mirrors text-track selection into the DOM via `<track>` children) is **not** an SPF concern. Browser-native audio-track UI is uneven (especially Safari), and the API surface is consumer-facing. SPF keeps audio-track selection purely state-driven; an adapter or above-the-engine layer may implement something roughly conforming to this API if needed.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Track registry primitive** — `selectedAudioTrackId` becomes multi-writer (default + programmatic). Today `selectedTextTrackId` is the only multi-writer track-id slot. Two data points may be enough to extract a shared primitive. See `track-registry-primitive` (candidate feature).
- **`resolveAudioTrack` re-resolution** — currently resolves the selected track once per source. Mid-stream switch to a different language means the newly-selected track's media playlist may not yet be fetched — the behavior needs to handle re-resolution when `selectedAudioTrackId` changes mid-presentation.
- **Audio SourceBuffer flush on switch** — the architecturally novel piece. Same-codec language switching does **not** require recreating the SourceBuffer or re-entering `setupAudioBufferActors`'s setup. What's needed is a flush mechanism: `SourceBuffer.remove(playhead, end)` to clear the now-stale audio range, then append from the new rendition. The `SourceBufferActor` already accepts a `remove` message backed by the `flushBuffer` helper (see [`mse-mms-pipeline.md`](./mse-mms-pipeline.md)); what's missing is a behavior that *orchestrates* flush on `selectedAudioTrackId` change. This orchestration is part of this feature's Tier 2 mid-stream-switching phase, not a separately-scoped buffer-flushing feature — primitives in [mse-mms-pipeline.md](./mse-mms-pipeline.md) / [buffer-management.md](./buffer-management.md), orchestration belongs here.
- **`loadAudioSegments` replan on track change** — segment loader currently replans on `currentTime` / `preload` / `loadActivated` changes. Needs to detect `selectedAudioTrackId` change as a replan trigger too. Signal-driven re-eval likely gets most of the way; open question is whether the loader actor's continue/preempt logic handles "different rendition, same buffer" cleanly or whether it treats the new rendition as a fresh source.
- **Manifest parser** — confirm audio renditions surface with the same per-track metadata as subtitles (language, default, autoselect). If they do, Tier 1 is largely a copy of the subtitles selection path; if not, parser work is on the critical path.

## Open questions

- **A/V sync policy during switch** — pause / silence-pad / accept-gap. May be a config knob.
- **What level of track-registry primitive, if any, does adding the second concordant multi-writer slot force?** Today only text uses orthogonal multi-writer (`selectTextTrack` default + `syncTextTracks` user-action). Audio multi-writer (`selectAudioTrack` default + programmatic write) would be the second concordant data point. Options range from a shared picker helper (e.g., a `pickByLanguageDefaultAutoselect` parameterized by track-type) → a multi-writer coordination utility → a unified track model across audio/video/text. Note: 5.1 / HEVC variant selection won't help decide this — those follow video's constraint+filter pattern, not multi-writer — so this is a text+audio decision, not a wait-for-third-use-case decision.

## Related features

- **audio-playback** — the single-rendition baseline this feature extends. Recognition + default selection at source load already exist there; this feature adds the multi-rendition + switching layer on top.
- **subtitles** — direct template for the selection-picker shape; multi-writer state slot pattern.
- **video-abr** — `userVideoTrackSelection` constraint pattern; precedent for consumer-driven track override coexisting with engine-driven selection.
- **mse-mms-pipeline** — owns the audio `SourceBufferActor` and the `remove` / `flushBuffer` primitives that mid-stream language switching builds on; the lifecycle stays put (same-codec, no recreation), and this feature adds the flush orchestration on top.
- **buffer-management** — audio segment loading uses the same gate shape as video and text; mid-stream switching will push on the planner's track-switch handling (no flush today; same-codec dedup is the current strategy).
- **track-registry-primitive** *(coarse, not yet documented)* — multi-language audio is likely the second forcing data point. First is text-track multi-writer; this is audio multi-writer with mid-stream switching as an added complication.
- **[audio-abr](./audio-abr.md)** — built on top of multi-language audio's rendition surfacing.
- **5.1-surround-selection** *(coarse, not yet documented, candidate)* — capability-gated extension.
- **audio-only-composition** *(coarse, not yet documented, candidate)* — engine variant; orthogonal but composition-relevant.
- **capability-probing** *(candidate)* — Tier 2 mid-stream codec switching (e.g., stereo AAC → 5.1 AC-3) depends on `changeType()` capability probing surfaced by that feature.

## See also

- `internal/design/spf/features/subtitles.md` — closest analog for the recognition + selection shape
- `internal/design/spf/features/video-abr.md` — `userVideoTrackSelection` constraint pattern
- [conventions/signals.md](../conventions/signals.md) — multi-writer slot conventions
