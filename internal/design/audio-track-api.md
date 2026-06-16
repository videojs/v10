---
status: draft
date: 2026-06-01
updated: 2026-06-16
---

# Multi-Audio-Track API

A consumer-facing API for discovering and switching audio tracks in Video.js 10, surfacing what SPF already knows internally through the same feature/predicate/selector pattern used by `streamType` and `textTrack`.

## Problem

SPF already parses audio renditions from HLS multivariant playlists and manages `selectedAudioTrackId` internally. The segment loading, buffer management, and track resolution behaviors are all in place. None of this is surfaced to the outside world in a stable, typed way. Building a language-switcher UI today means reaching directly into `media.engine.state` — an internal SPF primitive with no stability contract.

## What Is Already Done

- **#1605** — SPF internal switching: `selectedAudioTrackId`, language-aware default selection, mid-stream switches.
- **#1664** — `MediaTracksMixin` (the `audioTracks` DOM infrastructure) + `HlsJsMediaMediaTracksMixin` wired to `HlsMedia` (hls.js path). Types and capability interfaces in `packages/core/src/core/media/types.ts`.

`SimpleHlsMedia` (the SPF path) is not wired. No store feature or selector exists yet.

## Remaining Work

Three things are still missing:

### 1. Wire `SimpleHlsMedia` (the SPF adapter)

`SimpleHlsMedia` (`packages/core/src/dom/media/simple-hls/index.ts`) is currently:

```ts
export class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}
```

It needs `MediaTracksMixin` applied and a `SimpleHlsMediaTracks` extension that bridges SPF signals to the track lists.

**The extension** watches two SPF signals via `effect()`:

- `presentation` — when a new manifest loads, clear and re-add `AudioTrack` objects from `engine.state.audioTracks`
- `selectedAudioTrackId` — set `audioTrack.enabled = true` on the matching track

In the other direction: when `media.audioTracks` fires `change`, write the selected track's id back to `engine.state.selectedAudioTrackId`.

The template to follow is `HlsJsMediaMediaTracksMixin` in `packages/core/src/dom/media/hls/media-tracks.ts` — same structure, different engine event API (SPF `effect()` instead of hls.js events).

### 2. Add `audioTrackFeature` to the store

A new feature in `packages/core/src/dom/store/features/audio-track.ts` following the exact structure of `textTrackFeature` (`text-track.ts`). It:

- Defines `MediaAudioTrackState` — the list of available audio tracks and which is currently enabled
- Uses the predicate `isMediaAudioTrackCapable` (checks `'audioTracks' in media`) — same shape as `isMediaStreamTypeCapable`
- Syncs `media.audioTracks` into store state via `addtrack`, `removetrack`, and `change` listeners
- Re-syncs on `loadstart` (new source clears tracks)

**`selectAudioTrack`** is added to `packages/core/src/dom/store/selectors.ts` parallel to `selectTextTrack`.

### 3. Register `audioTrackFeature` in all four presets

`audioTrackFeature` is added to `videoFeatures`, `audioFeatures`, `liveVideoFeatures`, and `liveAudioFeatures` in `packages/core/src/dom/store/features/presets.ts`. Multi-language audio applies to every stream type including audio-only streams.

## Architecture

The full stack, bottom to top:

```text
┌──────────────────────────────────────────────────┐
│  selectAudioTrack (selectors.ts)                 │  ← UI reads from here
├──────────────────────────────────────────────────┤
│  audioTrackFeature (store/features/)             │  ← syncs DOM audioTracks → store
├──────────────────────────────────────────────────┤
│  SimpleHlsMediaTracks extension                  │  ← bridges SPF signals ↔ DOM tracks
├──────────────────────────────────────────────────┤
│  MediaTracksMixin on SimpleHlsMedia              │  ← gives adapter audioTracks property
└──────────────────────────────────────────────────┘
         ▲ SPF engine (unchanged — #1605 landed switching)
```

`HlsMedia` (hls.js path) already has Layers 1 and 2 via #1664. `SimpleHlsMedia` (SPF path) needs the same.

## What This Does Not Change

SPF internals are untouched. The `selectAudioTrack` behavior, `resolveAudioTrack`, `setupAudioBufferActors`, and `loadAudioSegments` all continue working as-is. The extension reads `engine.state.presentation` and writes `engine.state.selectedAudioTrackId` — both already public signals on the composition.

`HlsMedia` and `NativeHlsMedia` are not in scope. The predicate-based design lets them opt in independently — `HlsMedia` is already in via #1664.

## Files to Create / Modify

| File | Change |
| --- | --- |
| `packages/core/src/dom/media/simple-hls/audio-tracks.ts` | New — `SimpleHlsMediaTracks` extension (Layer 2) |
| `packages/core/src/dom/media/simple-hls/index.ts` | Apply `MediaTracksMixin`, wire extension |
| `packages/core/src/dom/store/features/audio-track.ts` | New — `audioTrackFeature` + `MediaAudioTrackState` (Layer 3) |
| `packages/core/src/dom/store/selectors.ts` | Add `selectAudioTrack` (Layer 4) |
| `packages/core/src/dom/store/features/presets.ts` | Register `audioTrackFeature` in all four presets |

## Related Work

**multi-language-audio** (`internal/design/spf/features/multi-language-audio.md`) — the SPF-layer feature this API surfaces. The API described here covers its Tier 1 (recognition and exposure) and the start of Tier 2 (programmatic selection). Mid-stream switching correctness remains an SPF concern.

**engine-adapter-integration** (`internal/design/spf/features/engine-adapter-integration.md`) — the `shareSignals` mechanism the adapter reads and writes through.

**text-track-architecture** (`internal/design/spf/text-track-architecture.md`) — the reference implementation whose structure `audioTrackFeature` follows at the feature/store layer.

**PR #1664** — landed `MediaTracksMixin` infrastructure and `HlsJsMediaMediaTracksMixin`. The canonical reference for the mixin pattern this design extends to `SimpleHlsMedia`.
