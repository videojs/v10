---
status: implemented
date: 2026-05-20
definition: sketched
---

# Audio playback

Today's single-rendition audio playback in the HLS engine. The engine
parses audio renditions from the multivariant playlist, picks one via
the default picker at source load, fetches its media playlist, sets up
an audio `SourceBuffer`, and loads segments. The selected rendition is
locked for the lifetime of the source — mid-stream switching belongs to
[`multi-language-audio`](./multi-language-audio.md) (coarse, not yet
implemented).

Symmetric with `video-abr` (video) and `subtitles` (text) in the
per-track-type capability set. Most of the implementation surface is
*owned architecturally* by other features (`mse-mms-pipeline`,
`buffer-management`, `source-replacement`); this doc captures what's
audio-specific.

## Status

- **Composition:** `createSimpleHlsEngine` (HLS VoD)
- **Definition depth:** sketched — capability surface documented;
  language-aware selection exists in `media/primitives/` but isn't
  wired (see *What's not implemented*)

## Phases of complexity

Capability slices around today's audio playback contract.

| Phase | What | Notes |
|---|---|---|
| Audio rendition recognition | `parseMultivariantPlaylist` surfaces audio renditions from `#EXT-X-MEDIA:TYPE=AUDIO` lines with `language`, `name`, `default`, `autoselect`, `channels`, `codecs`, `uri` | Engine consumes at most one today; parsing handles multiple — the foundation `multi-language-audio` builds on |
| Default audio rendition selection | `selectAudioTrack` runs the default picker once on `'presentation-resolved'` entry. Default picker today is `pickFirstTrackId` (first track in the audio selection set) — language-unaware | Config-overridable via `SelectAudioTrackConfig.picker`. The language-aware `pickAudioTrack` exists in `media/primitives/` but isn't wired — see *What's not implemented* |
| Audio media playlist resolution | `resolveAudioTrack` (sibling of resolveVideoTrack / resolveTextTrack, shared `setupTrackResolution` helper) fetches the selected rendition's media playlist on entry; aborts on source un-resolve via state-bound `AbortController` | Same shape as video / text resolution |
| Audio SourceBuffer + actor setup | `setupAudioBufferActors` creates the audio `SourceBuffer` + `SourceBufferActor` + `SegmentLoaderActor`. Uses plain `fetchStream` (no bandwidth sampling — there's no audio ABR yet) | Owned architecturally by `mse-mms-pipeline`; the Firefox `mozHasAudio` cross-type invariant lives in that feature's documentation |
| Audio segment loading | `loadAudioSegments` dispatches the per-type 4-state segment-load FSM (`'preconditions-unmet' / 'dormant' / 'metadata-only' / 'full-range'`) consuming `(preload, loadActivated)`. Same gate behavior as video | Owned architecturally by `buffer-management` |
| Source-change clearance | On source un-resolve, `selectedAudioTrackId` clears, audio actors tear down, in-flight playlist fetch aborts. New source's audio rendition picked fresh on the next resolve | Owned architecturally by `source-replacement` |

## What's not implemented

- **Language-aware default selection** — `pickAudioTrack` (in
  `packages/spf/src/media/primitives/select-tracks.ts`) implements the
  three-tier picker (`preferredAudioLanguage` → `DEFAULT=YES` →
  first-track) and is structurally ready to use, but isn't wired as
  the default in `selectAudioTrack`. The `preferredAudioLanguage`
  field on `SimpleHlsEngineConfig` is therefore inert with the default
  picker — consumers must override via `SelectAudioTrackConfig.picker`
  to make it take effect. Wiring `pickAudioTrack` as the default is a
  one-line change.
- **Mid-stream audio rendition switching** — covered by
  [`multi-language-audio`](./multi-language-audio.md) (coarse). No
  programmatic write to `selectedAudioTrackId`, no audio buffer flush
  on switch.
- **Audio ABR** — covered by `[audio-abr]` candidate.
  `setupAudioBufferActors` uses plain `fetchStream`; the
  bandwidth-sampling `createTrackedFetch` isn't wired into the audio
  fetch path. The sampling primitive exists (used by video); audio
  needs a parallel `switchAudioQuality` behavior to consume it.
- **Channels-aware selection (5.1 / surround)** — covered by
  `[5.1-surround-selection]` candidate. Audio tracks carry a
  `channels` field surfaced by the parser, but it's not used for
  selection or capability filtering.
- **Audio-only composition optimizations** — the engine tolerates
  audio-only sources today (basic coverage via `engine.test.ts`
  "handles audio-only stream"), but there's no engine variant
  optimized for audio-only contexts (e.g., shorter buffer targets,
  no video-related work). Owned by `[audio-only-composition]`
  candidate when work begins.
- **A/V sync handling** — delegated entirely to the browser's MSE
  pipeline. The engine doesn't intervene on audio/video sync.

## Implementation surface

**Composition:** `packages/spf/src/playback/engines/hls/engine.ts` —
audio behaviors composed alongside video and text:

```ts
// Track selection (reads config for initial preferences).
selectAudioTrack,
selectTextTrack,

// Resolve selected tracks (fetch media playlists)
resolveVideoTrack,
resolveAudioTrack,
resolveTextTrack,

// ...

// MSE setup
// ...
setupAudioBufferActors,

// Segment loading
// ...
loadAudioSegments,
```

**Behaviors:**

| Behavior | File | Responsibility |
|---|---|---|
| `selectAudioTrack` | `packages/spf/src/playback/behaviors/select-tracks.ts` | Default audio rendition selection on source load |
| `resolveAudioTrack` | `packages/spf/src/playback/behaviors/resolve-track.ts` | Fetches the selected audio media playlist |
| `setupAudioBufferActors` | `packages/spf/src/playback/behaviors/dom/setup-buffer-actors.ts` | Audio SourceBuffer + actor setup. **Owned architecturally by `mse-mms-pipeline`** |
| `loadAudioSegments` | `packages/spf/src/playback/behaviors/dom/load-segments.ts` | Audio segment loading dispatcher. **Owned architecturally by `buffer-management`** |

**Helpers:**

| Helper | File | Status |
|---|---|---|
| `pickFirstTrackId(presentation, 'audio')` | `packages/spf/src/media/primitives/select-tracks.ts` | **Default picker today** |
| `pickAudioTrack(presentation, config)` | `packages/spf/src/media/primitives/select-tracks.ts` | Language-aware (`preferredAudioLanguage` → `DEFAULT=YES` → first-track). Available but not wired |

**State slots:**

- `selectedAudioTrackId` — single-writer today (`selectAudioTrack`).
  Becomes multi-writer when `multi-language-audio` adds the
  programmatic selection path.
- Reads `presentation` (audio renditions surface in
  `presentation.selectionSets`)

**Manifest parsing:** `parseMultivariantPlaylist`
(`packages/spf/src/media/hls/parse-multivariant.ts`) extracts audio
renditions from `#EXT-X-MEDIA:TYPE=AUDIO` lines.

## Config surface

```ts
{
  preferredAudioLanguage?: string;   // Exposed but inert with the
                                      // default picker; see What's
                                      // not implemented
}
```

Plus the behavior-level override:

```ts
// SelectAudioTrackConfig (consumed via composition config)
{
  picker?: TrackPicker<SelectAudioTrackConfig>;  // Override default
                                                  // pickFirstTrackId
}
```

Consumers wanting language-aware selection today must override
`picker` — e.g., to use `pickAudioTrack` from
`@videojs/spf` primitives.

## Verification

- **Unit tests:**
  - `packages/spf/src/playback/engines/hls/tests/engine.test.ts` →
    "orchestrates complete pipeline" — asserts `selectedAudioTrackId`
    defined, audio track resolved, audio buffer actor present
  - `packages/spf/src/playback/engines/hls/tests/engine.test.ts` →
    "handles audio-only stream" — basic audio-only coverage
  - `packages/spf/src/playback/behaviors/dom/tests/setup-buffer-actors.test.ts`
    — per-type audio setup
  - **Coverage gap:** no dedicated `select-tracks.test.ts` coverage
    specifically asserting audio picker behavior (the default
    `pickFirstTrackId` path is exercised through the orchestration
    tests; the `pickAudioTrack` primitive has its own unit tests in
    `media/primitives/tests/`)
- **Sandbox:**
  - `apps/sandbox/src/spf-segment-loading/` — exercises audio
    playback as part of HLS playback

## Open questions

- **Wire `pickAudioTrack` as the default?** `preferredAudioLanguage`
  being exposed but inert is confusing. Was deferral to
  `multi-language-audio` deliberate, or is this a missed wiring? A
  one-line change in `selectAudioTrack`'s wiring would make the
  config field do what its name suggests.
- **Audio-only composition guarantees.** The engine *tolerates*
  audio-only sources today, but is it *designed* for them? Becomes
  more pressing as the `[audio-only-composition]` candidate matures.
- **Channels exposure vs use.** The parser surfaces `channels` on
  audio tracks but no selection logic consumes it. Stays inert until
  `[5.1-surround-selection]` wires it.

## Related features

- **multi-language-audio** *(coarse)* — the future extension covering
  multi-rendition surfacing, programmatic selection, and mid-stream
  switching. Today's `audio-playback` is the baseline it builds on.
- **subtitles** — parallel structure (default picker + per-type
  segment loading; same `setupTrackResolution` helper). Text-track
  selection is user opt-in by default; audio's default selection
  always picks something (or nothing if no audio renditions).
- **video-abr** — video equivalent. Video has ABR overlay; audio
  doesn't (yet — `[audio-abr]` candidate).
- **mse-mms-pipeline** — owns audio SourceBuffer setup
  (`setupAudioBufferActors`). The Firefox `mozHasAudio` cross-type
  invariant lives in that feature's documentation.
- **buffer-management** — owns audio segment loading
  (`loadAudioSegments`). Same 4-state FSM as video / text.
- **source-replacement** — audio actors and `selectedAudioTrackId`
  tear down via the resolved/unresolved cascade.
- **preload-modes** — gates audio loading via the same FSM that
  gates video and text.
- **audio-abr** *(not yet documented, candidate)* — bandwidth
  sampling + quality switching for audio.
- **5.1-surround-selection** *(not yet documented, candidate)* —
  channels-aware codec-change selection.
- **audio-only-composition** *(not yet documented, candidate)* —
  engine variant optimized for audio-only sources.

## See also

- [presentation-modeling.md](../presentation-modeling.md) —
  architectural deep-dive on the format-neutral data shape and parser
  interface that surfaces audio renditions (the `parsePresentation`
  contract this feature's recognition phase relies on)
- [multi-language-audio.md](./multi-language-audio.md) — future
  extension on top of this feature
- [clusters.md § Track & variant registry](./clusters.md#track--variant-registry)
- [conventions/behaviors.md](../conventions/behaviors.md) — per-type
  specialization pattern (`setupTrackResolution`)
- [packages/spf/docs/hls-engine.md](../../../../packages/spf/docs/hls-engine.md)
  — engine composition walkthrough (Stage 2: track selection; Stage 3:
  track resolution)
