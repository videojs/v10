---
status: implemented
date: 2026-05-20
definition: sketched
---

# Subtitles

User-facing subtitle / caption playback for HLS sources. The engine recognizes subtitle renditions from a multivariant playlist, exposes them via DOM `TextTrack` slots, applies default-selection logic, supports user- and programmatic-driven switching, and fetches + parses WebVTT segments on demand.

This doc captures the **capability surface**: what works, what doesn't, which behaviors / actors / state slots implement it, and how it relates to other features. For the architectural patterns (Actor/Reactor state machines, friction points, open questions), see [text-track-architecture.md](../text-track-architecture.md).

## Status

- **Composition:** `createSimpleHlsEngine` (HLS VoD)
- **Definition depth:** sketched — capability surface and implementation footprint documented; architectural deep-dive lives in [text-track-architecture.md](../text-track-architecture.md)

## Phases of complexity

What's implemented today, organized from base case to richer support. Each row is a slice that could in principle stand alone; in practice they share the same five behaviors and two actors.

| Phase | What | Notes |
|---|---|---|
| Base WebVTT captions | Single subtitle track, segmented WebVTT, browser-native parsing | `resolveVttSegment` uses an offscreen `<video><track>`; VTTCue settings (position, line, align, size) pass through; voice spans, regions, ruby pass through opaquely |
| Multi-language tracks | Any number of subtitle renditions surfaced from a multivariant playlist | `LANGUAGE`, `NAME`, `DEFAULT`, `AUTOSELECT`, `FORCED`, `URI` parsed from `#EXT-X-MEDIA:TYPE=SUBTITLES` |
| Default selection | Three-tier picker: `preferredSubtitleLanguage` → `DEFAULT=YES + AUTOSELECT=YES` → none | Forced-only tracks excluded by default (Apple-spec compliance); opt-in via `includeForcedTracks` |
| User selection (DOM-driven) | Browser captions UI / host-page button → DOM `mode='showing'` → state | `change` listener on `mediaElement.textTracks`; Chromium settling-window guard prevents auto-pick false positives |
| Programmatic selection | Consumer writes `state.selectedTextTrackId` via `onSignalsReady` callback | `syncTextTracks` mirrors the write into DOM `mode` |
| Cue deduplication | Per-track cue cache in `TextTracksActor`; segment reloads don't double-add | Dedup by exact `(startTime, endTime, text)` match |
| Preload-aware segment loading | FSM gates fetches: `'preconditions-unmet' → 'dormant' → 'metadata-only' → 'full-range'` driven by `preload` + `loadActivated` | `metadata-only` is a no-op for text (no init-segment concept) |
| Source-reset cleanup | `'clear'` message to `TextTracksActor` evicts cue + segment cache; `<track>` elements removed | Symmetric with manifest unload |

## What's not implemented

Extension boundaries — each could become its own feature doc or a phase extension on this one:

- **Styled WebVTT cues** — VTTCue properties pass through unmodified, but no SPF-side styling logic. Styling is consumer-side via CSS `::cue`. Could be its own feature if SPF needs to inject styles for theme-aware captions.
- **Multi-track concurrent selection** — single `selectedTextTrackId`. HLS-compliant, but not aligned with HTML `TextTrack.mode = 'showing'` semantics where multiple tracks can in principle show simultaneously.
- **Back-buffer cue eviction** — cues live for the presentation lifetime once added (small-footprint assumption). May need revisit for long-form content with dense caption tracks.
- **Segment-fetch error recovery** — current behavior: log to console, continue to next segment. No retry, no fallback, no error surfaced to state.
- **`TextTracksActor` cue handling for disabled/missing tracks** — documented uncertainty in source. Silent gate if `textTrack` not found on `mediaElement`. Open design question — see [text-track-architecture.md § Cue deduplication](../text-track-architecture.md#cue-deduplication-open-design-question-in-texttracksactor).
- **Embedded caption tracks (CEA-608/708)** — out of scope; subtitle tracks must be separate playlist renditions.

## Implementation surface

**Composition:** `packages/spf/src/playback/engines/hls/engine.ts` — HLS VoD engine.

**Behaviors:**

| Behavior | File | Responsibility |
|---|---|---|
| `selectTextTrack` | `packages/spf/src/playback/behaviors/select-tracks.ts` | Default selection via config-driven picker (three-tier logic) |
| `resolveTextTrack` | `packages/spf/src/playback/behaviors/resolve-track.ts` | Fetches media playlist for selected text track |
| `syncTextTracks` | `packages/spf/src/playback/behaviors/dom/sync-text-tracks.ts` | DOM `<track>` lifecycle + bidirectional state ↔ DOM sync |
| `setupTextTrackActors` | `packages/spf/src/playback/behaviors/dom/setup-text-track-actors.ts` | Creates `TextTracksActor` + `TextTrackSegmentLoaderActor`; element-bound lifecycle |
| `loadTextTrackSegments` | `packages/spf/src/playback/behaviors/dom/load-segments.ts` | Dispatches `'load'` messages to segment-loader actor |

**Actors:**

| Actor | File | Role |
|---|---|---|
| `TextTracksActor` | `packages/spf/src/playback/actors/dom/text-tracks.ts` | Per-track cue cache, dedup, `TextTrack.addCue()` |
| `TextTrackSegmentLoaderActor` | `packages/spf/src/playback/actors/text-track-segment-loader.ts` | VTT segment fetch + parse, serial scheduling, continue/preempt |

**State slots:**

- `selectedTextTrackId` — **multi-writer.** `selectTextTrack` writes on default-on-load / clear-on-unload; `syncTextTracks` writes from DOM user action. The two writers are intentionally orthogonal and don't conflict.
- `presentation`, `preload`, `loadActivated`, `currentTime` — read-only consumers.

**Manifest parsing:** `parseMultivariantPlaylist` (`packages/spf/src/media/hls/parse-multivariant.ts`) extracts subtitle renditions; each becomes a `PartiallyResolvedTextTrack` carrying language, default, autoselect, forced metadata.

**Cue resolver:** `resolveVttSegment` (`packages/spf/src/media/dom/text/resolve-vtt-segment.ts`) — browser-native VTT parser via offscreen `<video><track>`. Pluggable via `config.resolveTextTrackSegment`.

## Config surface

```ts
{
  preferredSubtitleLanguage?: string;   // BCP-47 language tag for default selection
  includeForcedTracks?: boolean;        // default false — exclude forced-only tracks from auto-selection
  enableDefaultTrack?: boolean;         // default true — honor DEFAULT=YES + AUTOSELECT=YES
  resolveTextTrackSegment?: (url: string) => Promise<Cue[]>;  // override VTT parser
}
```

## Verification

- **Unit test:** `packages/spf/src/playback/behaviors/dom/tests/sync-text-tracks.test.ts` — covers DOM `<track>` slot allocation for multi-language manifests (creates a presentation with `en` + `es` tracks; verifies `srclang` on each `<track>`). Does **not** cover default-selection logic, segment loading, or cue dedup — those live in adjacent test files for the respective behaviors / actors.
- **Sandbox:** no dedicated multi-language captions demo today. `apps/sandbox/src/spf-segment-loading/` is video/audio-only.

## Related features

References to other features in the registry. Bracketed entries are candidate features that don't yet have their own doc — they're tracked here so the registry surfaces them when work begins.

- **preload-modes** — `loadTextTrackSegments` reads the same `(preload, loadActivated)` gate state as the audio/video segment loaders; the load-mode FSM rows are direct consumers of the preload-modes contract.
- **buffer-management** — text tracks share the per-type segment-loading dispatcher pattern with video/audio (the `'preconditions-unmet' → 'dormant' → 'metadata-only' → 'full-range'` FSM is the same shape). Text uses `TextTrackSegmentLoaderActor` rather than the v/a `SegmentLoaderActor`, but the dispatcher contract is unified.
- **hls-multivariant-parsing** *(not yet documented)* — subtitle rendition extraction is one slice of manifest parsing.
- **track-registry-primitive** *(coarse, not yet documented)* — `selectedTextTrackId` is currently the only multi-writer track-id slot. A generalized track-registry primitive likely emerges when multi-language audio is added.
- **styled-webvtt-cues** *(coarse, not yet documented)* — candidate extension for SPF-side cue styling.
- **text-track-error-recovery** *(coarse, not yet documented)* — candidate extension for retry / fallback / state-surfacing on segment fetch errors.

## See also

- [text-track-architecture.md](../text-track-architecture.md) — architectural deep-dive (Actor/Reactor patterns, state machines, friction, open questions)
- [presentation-modeling.md](../presentation-modeling.md) — architectural deep-dive on the format-neutral data shape and parser interface that surfaces subtitle renditions (the `parsePresentation` contract this feature's recognition phase relies on)
- [conventions/behaviors.md](../conventions/behaviors.md) — when to define a behavior; behavior shape
- [conventions/actors.md](../conventions/actors.md) — actor shapes and conventions
- [packages/spf/docs/hls-engine.md](../../../../packages/spf/docs/hls-engine.md) — full HLS engine composition walkthrough
