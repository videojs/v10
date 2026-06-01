---
status: draft
date: 2026-06-01
---

# Multi-Audio-Track API

A consumer-facing API for discovering and switching audio tracks in Video.js 10, surfacing what SPF already knows internally through the same feature/predicate/selector pattern used by `streamType` and `textTrack`.

## Problem

SPF already parses audio renditions from HLS multivariant playlists and manages `selectedAudioTrackId` internally. The segment loading, buffer management, and track resolution behaviors are all in place. None of this is surfaced to the outside world in a stable, typed way. Building a language-switcher UI today means reaching directly into `media.engine.state` — an internal SPF primitive with no stability contract.

## Why the Text Track Pattern Doesn't Transfer Directly

The `textTrack` feature reads from the native browser `textTracks` API on the media element. This works because SPF's `syncTextTracks` behavior creates real `<track>` DOM elements, which the browser automatically registers in `mediaElement.textTracks`. When SPF adds a track, the browser fires a native `addtrack` event that the core feature listens to.

Audio tracks work differently. SPF manages audio rendition switching entirely at the MSE byte-stream level — it selects which HLS rendition's segments feed the audio `SourceBuffer`. There is no `<track>`-element equivalent for audio. The native `mediaElement.audioTracks` list remains empty even during multi-language HLS playback. Reading from it yields nothing.

The Mux media-tracks polyfill extends `HTMLMediaElement` with a conformant `audioTracks` property, but unlike text tracks where the browser populates the list from `<track>` elements SPF creates, audio tracks would require actively pushing SPF's internal state into the polyfill on every change. That is a synchronization layer with a new external dependency and no reduction in complexity. It is a separate, independent decision from surfacing the API.

The right pattern for audio tracks is therefore: the adapter exposes a custom property and event, the core feature reads from that, the store surfaces it through a selector. This is the same approach used by `streamType`, which also has no native DOM equivalent.

## Proposed Architecture

**Adapter (`SimpleHlsMedia`, in core).** `SimpleHlsMedia` is the boundary where SPF internals meet the rest of the stack. It gains an `audioTracks` read-only property (returning a list of track objects with `id`, `label`, `language`, `kind`, and `enabled`), a `selectAudioTrack(id)` method, and fires an `audiotrackschange` event whenever the track list or active selection changes.

Internally it uses SPF's `effect()` to watch `presentation` and `selectedAudioTrackId` signals and dispatch the event when either changes. The effect is created fresh on each `src` assignment and torn down on `destroy()`, matching the engine lifecycle.

The track shape maps SPF's `AudioTrack` fields to a clean public surface: `name` becomes `label`, `language` carries over, and `enabled` is derived by comparing each track's `id` to `selectedAudioTrackId`. SPF's `AudioTrack` has no `kind` field — the property defaults to `'main'`, appropriate for HLS audio renditions today.

**Core feature (`audioTrackFeature`).** A new feature in `packages/core/src/dom/store/features/` follows the exact structure of `textTrackFeature`. A predicate (`isMediaAudioTrackCapable`) checks whether the media object exposes `audioTracks` and `selectAudioTrack`, using the same shape as `isMediaStreamTypeCapable`. If capable, the feature syncs on `audiotrackschange` and stores the result. The state type (`MediaAudioTrackState`) and capability interface (`MediaAudioTrackCapability`) live next to their text track equivalents in `core/media/state.ts` and `core/media/types.ts`.

**Selector.** `selectAudioTrack` is added to the selectors file parallel to `selectTextTrack`. UI components subscribe to track list changes and invoke switching through this selector.

**Feature presets.** `audioTrackFeature` is added to all four presets — video, audio, live-video, live-audio. Multi-language audio applies to every stream type, including audio-only.

## What This Does Not Change

SPF internals are untouched. The `selectAudioTrack` behavior, `resolveAudioTrack`, `setupAudioBufferActors`, and `loadAudioSegments` all continue working as-is. The adapter reads `engine.state.presentation` and writes `engine.state.selectedAudioTrackId` — both already public signals on the composition.

Other adapters (`HlsJsMedia`, `NativeHlsMedia`) are not in scope here. The predicate-based design lets them opt in independently whenever they implement the same three-part contract.

## Related Work

**multi-language-audio** (`internal/design/spf/features/multi-language-audio.md`) — the SPF-layer feature this API surfaces. The API described here covers its Tier 1 (recognition and exposure) and the start of Tier 2 (programmatic selection). Mid-stream switching correctness remains an SPF concern.

**engine-adapter-integration** (`internal/design/spf/features/engine-adapter-integration.md`) — the `shareSignals` mechanism the adapter reads and writes through.

**text-track-architecture** (`internal/design/spf/text-track-architecture.md`) — the reference implementation whose structure `audioTrackFeature` follows at the feature layer, and whose DOM integration path audio tracks deliberately diverge from at the SPF layer.
