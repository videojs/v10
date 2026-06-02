---
status: draft
date: 2026-06-01
---

# Multi-Audio-Track API

A consumer-facing API for discovering and switching audio tracks in Video.js 10, surfacing what SPF already knows internally through the same feature/predicate/selector pattern used by `streamType` and `textTrack`.

## Problem

SPF already parses audio renditions from HLS multivariant playlists and manages `selectedAudioTrackId` internally. The segment loading, buffer management, and track resolution behaviors are all in place. None of this is surfaced to the outside world in a stable, typed way. Building a language-switcher UI today means reaching directly into `media.engine.state` — an internal SPF primitive with no stability contract.

## Architecture

Audio track exposure uses the same `media-tracks` polyfill layer already in the codebase — no custom properties or events are needed on the adapter. PR [#1609](https://github.com/videojs/v10/pull/1609) establishes the pattern for `HlsJsMedia` and `NativeHlsMedia`.

**Media-tracks layer.** `MediaTracksLayer` (see `packages/core/src/dom/media/media-tracks-layer.ts`) wraps `HTMLMediaElementLayer` with `MediaTracksMixin`, introduced in PR [#1609](https://github.com/videojs/v10/pull/1609). This gives any host that adds the layer a conformant `audioTracks` (and `videoTracks`) property, along with `addAudioTrack()` / `addVideoTrack()` / `addRendition()` helpers and standard `change` events — the same shape the browser provides natively on `mediaElement.audioTracks`.

**Adapter (`SimpleHlsMedia`).** Call `addLayer(this, new MediaTracksLayer())` in the constructor, matching what `NativeHlsMedia` already does. No custom property or event is needed — the layer owns `audioTracks`.

**Extension (`SimpleHlsMediaTracks`).** A `MediaExtension` (following `HlsJsMediaTracks` in `packages/core/src/dom/media/hls-js/media-tracks.ts`) installs onto `SimpleHlsMedia`. It uses SPF's `effect()` to watch `presentation` and `selectedAudioTrackId` signals, calls `removeAudioTracks(media)` + `media.addAudioTrack(kind, name, lang)` when the track list changes, and sets `audioTrack.enabled` to reflect the active selection. When `media.audioTracks` fires `change` (user or programmatic), the extension writes the new selection back to `engine.state.selectedAudioTrackId`.

**Core feature (`audioTrackFeature`).** A new feature in `packages/core/src/dom/store/features/` follows the exact structure of `textTrackFeature`. The predicate (`isMediaAudioTrackCapable`) checks whether the media object exposes `audioTracks` — using the same shape as `isMediaStreamTypeCapable`. Because `MediaTracksLayer` provides the standard `AudioTrackList` (including `addtrack`, `removetrack`, and `change` events), the feature can sync via `audioTracks.onchange` the same way `textTrackFeature` syncs via `textTracks`. The state type (`MediaAudioTrackState`) and capability interface (`MediaAudioTrackCapability`) live next to their text track equivalents.

**Selector.** `selectAudioTrack` is added to the selectors file parallel to `selectTextTrack`. UI components subscribe to track list changes; switching is done by setting `audioTrack.enabled = true` on the desired track.

**Feature presets.** `audioTrackFeature` is added to all four presets — video, audio, live-video, live-audio. Multi-language audio applies to every stream type, including audio-only.

## What This Does Not Change

SPF internals are untouched. The `selectAudioTrack` behavior, `resolveAudioTrack`, `setupAudioBufferActors`, and `loadAudioSegments` all continue working as-is. The adapter reads `engine.state.presentation` and writes `engine.state.selectedAudioTrackId` — both already public signals on the composition.

Other adapters (`HlsJsMedia`, `NativeHlsMedia`) are not in scope here. The predicate-based design lets them opt in independently whenever they implement the same three-part contract.

## Related Work

**multi-language-audio** (`internal/design/spf/features/multi-language-audio.md`) — the SPF-layer feature this API surfaces. The API described here covers its Tier 1 (recognition and exposure) and the start of Tier 2 (programmatic selection). Mid-stream switching correctness remains an SPF concern.

**engine-adapter-integration** (`internal/design/spf/features/engine-adapter-integration.md`) — the `shareSignals` mechanism the adapter reads and writes through.

**text-track-architecture** (`internal/design/spf/text-track-architecture.md`) — the reference implementation whose structure `audioTrackFeature` follows at the feature layer, and whose DOM integration path audio tracks deliberately diverge from at the SPF layer.
