---
status: draft
date: 2026-05-20
---

# Presentation Modeling

The format-neutral data shape, lifecycle, and parser interface that SPF
engines use to model streaming presentations. Today the HLS engine is
the only consumer; the contract is intentionally protocol-agnostic so
DASH, MoQ, and short-form-specific engines can plug into the same
modeling layer with their own parsers.

This document is an **architectural deep-dive** in the same shape as
[text-track-architecture.md](./text-track-architecture.md) — it's the
canonical reference for the `Presentation` type, the `parsePresentation`
contract, the per-track resolution pattern, and what new format support
would entail. Feature docs in `features/` reference this doc rather than
duplicate its contents.

**Audience:**
- **Engine contributors** writing new behaviors that consume
  `state.presentation` — for the data shape and type guards
- **Format-extension contributors** (DASH / MoQ / short-form) — for the
  parser interface and what's pluggable vs. hardcoded
- **Debuggers** working through presentation-related issues — for the
  lifecycle picture

For the user-observable engine behaviors built on this layer, see the
relevant feature docs (`source-replacement`, `audio-playback`,
`subtitles`, `video-abr`, `mse-mms-pipeline`, `buffer-management`).

**Subsumed candidates:** This doc covers the architectural concerns
that the candidates `hls-multivariant-parsing`, `media-playlist-
resolution`, and `hls-vod-presentation-modeling` previously named —
each tracked the HLS-specific parsing + lifecycle work this doc
captures format-neutrally. They are not separately-scoped features;
implementation work on those areas extends the parser-interface
section here. The candidate list (`project_spf_feature_candidates.md`
in agent memory) annotates them as tabled / subsumed.

---

## Architecture Overview

```
   { url }                                 Presentation
   (unresolved)                            (resolved + enriched)
       │                                          ▲
       │                                          │
       ▼                                          │
  ┌─────────────────────────────────────────────────┐
  │   resolvePresentation                            │  parses multivariant manifest
  │   gates on preload + loadActivated               │  via config.parsePresentation
  │   4-state FSM: preconditions-unmet → idle →      │  (HLS today; pluggable for
  │                resolving → resolved              │  other formats)
  └─────────────────────────────────────────────────┘
       │
       ▼  presentation = { id, selectionSets, ... } (resolved, tracks partially-resolved)
  ┌────────────────────────────────────────────────────┐
  │   resolveVideoTrack / resolveAudioTrack /          │  fetches per-track media
  │   resolveTextTrack                                  │  playlist via direct import
  │   2-state FSM; ConcurrentRunner per-track          │  of HLS parseMediaPlaylist
  │   (multiple tracks resolve in parallel)            │  ← not pluggable today
  └────────────────────────────────────────────────────┘
       │
       ▼  tracks gain segments + initialization (resolved)
  ┌────────────────────────────────────────────────┐
  │   calculatePresentationDuration                 │  via config.resolveDuration
  │   variant-agnostic; resolver decides            │  (VoD: track durations;
  │   "when is duration derivable"                  │   Live: Infinity)
  └────────────────────────────────────────────────┘
       │
       ▼  presentation.duration (final)
   consumers: mse-mms-pipeline, buffer-management,
              audio-playback, subtitles, video-abr, ...
```

The `state.presentation` slot is a **pipeline-pattern multi-writer**:
multiple behaviors patch different fields onto the same value over
time. See [features/source-replacement.md](./features/source-replacement.md)
for the full multi-writer characterization and the resolved/unresolved
cleanup cascade every consumer rides.

---

## The CMAF-HAM data model

The data shape is based on **CMAF-HAM** (Common Media Application
Format — Hypothetical Application Model). The framing is explicit in
the code:

> Protocol-agnostic representation of streaming media content.
> See https://github.com/AcademySoftwareFoundation/common-media-library

All types live in `packages/spf/src/media/types/index.ts`.

### Base types

| Type | Adds | Role |
|---|---|---|
| `Ham` | `id: string` | All HAM objects carry a string id |
| `AddressableObject` | `url: string`, optional `byteRange` | URL + optional byte range; range requests are out of scope today but the shape is reserved |
| `TimeSpan` | `startTime: number`, `duration: number` | Timed range; tracks have `startTime: 0` (multi-period support is future) |
| `FrameRate` | `frameRateNumerator`, optional `frameRateDenominator` | Rational fps (30 vs 29.97) |
| `MediaElementLike` | `preload: string` | Platform-agnostic media element minimum surface; `HTMLMediaElement` satisfies |

### Track hierarchy

```
Track = Ham & AddressableObject & TimeSpan & {
  type: TrackType;            // 'video' | 'audio' | 'text'
  codecs?: string[];          // Optional per HLS spec
  mimeType: string;
  language?: string;
  bandwidth: number;
  initialization?: AddressableObject;  // Init segment (CMAF)
  segments: Segment[];        // Loaded once media playlist resolves
}

VideoTrack = Track & {
  type: 'video';
  initialization: required;   // Always present once resolved
  codecs: required;
  width?: number; height?: number;
  frameRate?: FrameRate;
  audioGroupId?: string;
}

AudioTrack = Track & {
  type: 'audio';
  groupId: string;
  name: string;
  sampleRate: number;
  channels: number;
  default?: boolean;
  autoselect?: boolean;
}

TextTrack = Track & {
  type: 'text';
  groupId: string;
  label: string;
  kind: 'subtitles' | 'captions';
  default?: boolean;
  autoselect?: boolean;
  forced?: boolean;
}
```

### Partial resolution

After multivariant parsing, tracks are *partially resolved* — metadata
populated, but no `segments` / `initialization` until the per-track
media playlist is fetched. Expressed as a generic:

```ts
type PartiallyResolved<T extends Track> = Omit<T, 'segments' | 'initialization' | keyof TimeSpan> & {
  segments?: never;
  duration?: never;
  startTime?: never;
  initialization?: never;
};
```

Type aliases: `PartiallyResolvedVideoTrack`, `PartiallyResolvedAudioTrack`,
`PartiallyResolvedTextTrack`, and the union `PartiallyResolvedTrack`.

### Sets

```
SwitchingSet  = Ham & { type, tracks: (Partial | Resolved)[] }  — group of tracks switchable seamlessly
SelectionSet  = Ham & { type, switchingSets: SwitchingSet[] }   — top-level grouping by type
```

Each set is **discriminated by track type** — `VideoSwitchingSet`,
`AudioSwitchingSet`, `TextSwitchingSet`, and the same pattern for
selection sets.

### Presentation

```
Presentation = Ham & AddressableObject & Partial<TimeSpan> & {
  selectionSets: SelectionSet[];
}

MaybeResolvedPresentation = AddressableObject & Partial<Omit<Presentation, keyof AddressableObject>>
```

`MaybeResolvedPresentation` is the **in-state shape**: `url` is always
present (the adapter or external code writes it as the seed); `id`,
`selectionSets`, and `duration` populate as the pipeline progresses.

### Segment

```
Segment = Ham & AddressableObject & TimeSpan
```

Plus the constant `SEGMENT_TIME_EPSILON = 0.0001` — floating-point
tolerance for matching segments by `startTime`. Used by both the
source-buffer dedup and the segment-loader quality-aware filter; single
source of truth.

### Type guards

```ts
isResolvedTrack(track)               // narrows to ResolvedTrack
isResolvedPresentation(presentation) // narrows to Presentation
                                     // requires both id AND selectionSets present
hasPresentationDuration(presentation) // narrows to include required duration
```

`isResolvedPresentation` is the **load-bearing predicate** for the
cleanup cascade — every setup behavior in the engine gates on it. See
[features/source-replacement.md](./features/source-replacement.md) for
the cleanup contract this predicate anchors.

### Intermediate parser output

```ts
interface MediaPlaylistInfo {
  version: number;
  targetDuration: number;
  playlistType: 'VOD' | 'EVENT' | undefined;
  initSegment: AddressableObject | null;
  segments: Segment[];
  duration: number;
  endList: boolean;
}
```

Internal representation used by the media-playlist parser before being
assembled into the full Track structure. Not part of the public API,
but format implementations may need analogous intermediate types.

---

## The presentation lifecycle

Brief — the full multi-writer pipeline and cleanup cascade live in
[features/source-replacement.md](./features/source-replacement.md).

The slot transitions through four phases:

| Phase | Slot value | Driver |
|---|---|---|
| Unresolved | `{ url }` (no id, no selectionSets) | Adapter / external write |
| Resolving | `{ url }` still (in-flight fetch) | `resolvePresentation`'s `'resolving'` entry |
| Resolved | `{ id, url, selectionSets, ... }` — tracks partially-resolved | `resolvePresentation` writes via `state.presentation.set(parsed)` |
| Enriched | Same shape, with segments + duration patched | `resolveXTrack` family + `calculatePresentationDuration` patch via `update(state.presentation, ...)` |

**Source change** (URL replacement) routes the slot back through
unresolved, which routes the FSM back through `'resolving'`. All
downstream behaviors gating on `isResolvedPresentation` exit their
positive state and tear down via reactor state-exit.

---

## The parser interface

Three pluggability layers exist; only two are actually pluggable today.

### `config.parsePresentation` — multivariant parser (pluggable)

```ts
type ParsePresentation = (
  text: string,
  presentation: MaybeResolvedPresentation
) => Presentation;
```

Format-neutral entry point. The composing engine wires in its format's
parser at composition setup. HLS engine wires
`parseMultivariantPlaylist` from `media/hls/`.

The contract:
- **Input:** raw manifest body text + the in-state presentation
  (`url` always set; consumers may carry through context)
- **Output:** a fully resolved `Presentation` with `id` and
  `selectionSets`. Tracks within the selection sets are
  partially-resolved (no `segments` / `initialization` yet)
- **Errors:** the resolver throws on parse failure; `resolvePresentation`'s
  entry catches and logs via `console.error` (with a TODO to route to a
  state-error slot — see Open questions)

### `parseMediaPlaylist` — per-track playlist parser (**not pluggable today**)

This is the **load-bearing coupling** for future format support.
`packages/spf/src/playback/behaviors/resolve-track.ts` imports
`parseMediaPlaylist` directly:

```ts
import { parseMediaPlaylist } from '../../media/hls/parse-media-playlist';
```

There's no `config.parseMediaPlaylist` config hook today. Adding DASH /
MoQ / short-form support requires either:
1. Adding a `config.parseMediaPlaylist` hook to mirror
   `config.parsePresentation`, or
2. Introducing format-specific `resolveXTrack` behavior variants
   (e.g., `resolveDashVideoTrack`) composed instead of the HLS ones.

Choice (1) is simpler structurally; choice (2) is more flexible if
per-track resolution differs substantially across formats. The doc
flags this; the call goes to whoever lands the second format.

### `config.resolveDuration` — duration resolver (pluggable)

```ts
type PresentationDurationResolver = (
  state: PresentationDurationState
) => number | undefined;
```

Variant-agnostic. The resolver decides "when is duration derivable" for
the current variant — `calculatePresentationDuration` stays
format-/composition-agnostic.

- **VoD wiring:** HLS engine wires `getResolvedSelectedTrackDuration` —
  "first resolved selected track's duration, video preferred, audio
  fallback." Audio-only falls out naturally.
- **Live wiring:** future live engines would return
  `Number.POSITIVE_INFINITY` once the presentation is established as
  live. MSE-spec value for `mediaSource.duration` under live;
  `updateMediaSourceDuration` propagates it through.

---

## Per-track resolution

`packages/spf/src/playback/behaviors/resolve-track.ts` exports three
behaviors — `resolveVideoTrack`, `resolveAudioTrack`, `resolveTextTrack` —
that share a `setupTrackResolution<K>` helper. Each variant supplies its
own `findTrackToResolve` resolver via per-type config.

### FSM shape

```
presentation-unresolved ⟷ presentation-resolved
```

Two states. Entry into `'presentation-resolved'` returns
`() => runner.abortAll()` for state-exit cleanup — source-change
cancellation expressed structurally through the state machine.

### Concurrent execution

Uses **`ConcurrentRunner`**, not `SerialRunner`. Tracks resolve in
parallel; the variants are independent. (There's a `@todo` in the code
about pulling the runner choice into a per-use-case factory.)

### The effect body

```ts
effects: [
  () => {
    const presentation = peek(state.presentation);
    const trackId = state[selectedKey].get();
    if (!presentation || !trackId) return;

    const track = findTrackToResolve(presentation, trackId);
    if (!track || isResolvedTrack(track)) return;

    runner.schedule(
      new Task(
        async (signal) => {
          const response = await fetchResolvable(track, { signal });
          const text = await getResponseText(response);
          const mediaTrack = parseMediaPlaylist(text, track);
          update(state.presentation, (current) =>
            isResolvedPresentation(current)
              ? updateTrackInPresentation(current, mediaTrack)
              : current
          );
        },
        { id: track.id }
      )
    );
  },
],
```

Worth noting:
- `peek(state.presentation)` (untracked) — internal updates (segments
  added by sibling tasks) don't re-fire the effect. The reactor's
  state transitions handle the source-change cascade; intra-resolved
  changes aren't load-bearing for re-firing.
- `state[selectedKey].get()` (tracked) — selection changes do re-fire
  the effect; new selection → schedule new fetch.
- `Task { id: track.id }` — task dedup keyed on track id. Same-track
  selection re-fires don't double-schedule.
- The commit-time `isResolvedPresentation(current)` check in the
  `update()` callback covers the **pathological resolved→resolved-
  without-unresolved transition** — e.g., a direct overwrite of
  `state.presentation` from one resolved value to another. State-exit
  on `resolving → unresolved` fires `runner.abortAll()` before the URL
  change settles, and per the Fetch spec the signal abort cancels
  in-flight body reads. So by commit time, the resolution we're
  writing matches the live presentation.

### Pipeline-pattern writeback

`update(state.presentation, ...)` patches the resolved track into the
current presentation. The other writers on the slot are:
- Adapter / external (initial unresolved `{ url }` seed)
- `resolvePresentation` (resolved Presentation with id + selectionSets)
- `calculatePresentationDuration` (patches duration)

Each writer reads current and writes new with their field added — they
never overwrite a field someone else owns. See
[features/source-replacement.md](./features/source-replacement.md) for
the full characterization.

---

## Duration resolution

`packages/spf/src/playback/behaviors/calculate-presentation-duration.ts`

### Behavior shape

Pure `effect()` — not a reactor. Re-runs whenever the resolver's
declared inputs change. Today the resolver reads
`(presentation, selectedVideoTrackId, selectedAudioTrackId)`.

### Resolver contract

```ts
type PresentationDurationResolver =
  (state: PresentationDurationState) => number | undefined;
```

The behavior calls the resolver and writes whatever it returns *as long
as it's a positive number, including `Infinity`*. `undefined`, `NaN`,
and `<= 0` are skipped — the resolver may return `undefined` while
duration is still indeterminate; subsequent tracked-slot changes re-run
the effect until the resolver commits a value.

### Fires-at-most-once-per-presentation

The effect early-returns if `presentation.duration !== undefined` — an
already-set duration is never overwritten. The next reset arrives
structurally when a new (unresolved) presentation replaces the current
one.

### VoD default

The HLS engine wires `getResolvedSelectedTrackDuration` from
`media/utils/track-selection.ts`:
- Pick the first resolved selected track (video preferred, audio fallback)
- Return its `duration`
- Audio-only falls out naturally (no video selected → audio is first
  resolved)

### Why a resolver hook instead of variant-specific behaviors

`calculatePresentationDuration` itself doesn't know about VoD vs Live;
the resolver does. Live engines compose the same behavior with a
different `config.resolveDuration` that returns `Infinity` once the
presentation is established as live. This avoids forking the behavior
on variant axis.

---

## What new format support would entail

Concrete TODO list for an engine contributor adding DASH / MoQ /
short-form:

1. **Write a `parsePresentation` implementation** for the new format.
   Output a `Presentation` with `selectionSets` containing
   partially-resolved tracks. Reuse the CMAF-HAM types — the data model
   is format-neutral; the parser maps format-specific concepts onto it.

2. **Address the `parseMediaPlaylist` coupling.** Pick one:
   - Add a `config.parseMediaPlaylist` hook to mirror
     `config.parsePresentation`. Simplest; minimal change to the
     resolution path.
   - Introduce format-specific resolve-track behavior variants. More
     flexible if per-track resolution differs substantially (e.g.,
     DASH segment indexes via sidx vs HLS media playlists).

3. **Decide on `resolveDuration` wiring.** Most VoD-like formats can
   reuse `getResolvedSelectedTrackDuration` — it only depends on
   resolved tracks having `duration` set, which is format-neutral.

4. **Compose an engine variant** — e.g., `createSimpleDashEngine` —
   that wires the new parsers into `createComposition`. Reuse the
   existing behavior set; swap only the parser configs.

The bracketed candidates in `clusters.md` Presentation modeling cluster
(`[hls-multivariant-parsing]`, `[media-playlist-resolution]`,
`[hls-vod-presentation-modeling]`) are placeholders that, in practice,
collapse into "presentation-modeling (architecture) + per-format parser
implementations." When the second format lands, drop the brackets and
file format-specific architectural docs as siblings to this one
(`dash-manifest-parsing.md`, etc.).

---

## Open questions

- **`parseMediaPlaylist` pluggability — when does this become urgent?**
  Today's direct import is a clear coupling. Two distinct forcing
  functions: (a) the first format-extension PR will surface the cost
  for non-HLS formats, and (b) HLS-only extensions like
  [features/ll-hls-support.md](./features/ll-hls-support.md) grow the
  parsed-track output schema (server-control flags, parts, preload
  hints, skip metadata) — even staying HLS-only, the parser-output
  shape doesn't stay frozen. Worth keeping the option open in design
  discussions.
- **The `PartiallyResolved<T>` pattern — fully format-neutral?** The
  shape is defined generically (`Omit<T, 'segments' | 'initialization'
  | keyof TimeSpan>`), but the *semantic* (multivariant playlist
  surfaces metadata; media playlist surfaces segments) is HLS-shaped.
  Whether DASH's manifest-only-no-mediaplaylist or MoQ's streaming
  model fits this two-phase resolution naturally is an open question
  for the second format.
- **`resolve-track.ts` `@todo`s.** The runner choice (Concurrent vs
  Serial vs replace-previous) is currently hardcoded; per-use-case
  factory mentioned as future work. Same for the task-creation path
  (`createResolveTrackTask` mentioned). When per-track resolution
  needs richer policies (retry, backoff, multi-CDN failover), these
  hook points become load-bearing.
- **Error surface.** `resolvePresentation` and `resolveXTrack` both
  log to `console.error` on fetch / parse failure. A state-error slot
  doesn't exist yet; consumers can't observe "this source failed to
  load." Cross-references the same open question in
  [features/source-replacement.md](./features/source-replacement.md).
- **Multi-period support.** `Track.startTime` is documented as
  "always 0 (for future multi-period support)." When multi-period
  arrives, the Presentation shape needs an axis for period grouping
  and the lifecycle changes (period transitions inside a single
  source).

---

## See also

- [features/source-replacement.md](./features/source-replacement.md) —
  the multi-writer `state.presentation` pipeline + the
  `isResolvedPresentation` cleanup contract every consumer rides.
  Required reading for the lifecycle picture.
- [features/capability-probing.md](./features/capability-probing.md) —
  post-parse consumer of the data shape this doc defines. Filters
  `presentation.selectionSets` to drop browser-unsupported renditions
  before selection runs. Parser stays format-neutral.
- [features/clusters.md § Presentation modeling](./features/clusters.md#presentation-modeling)
  — the cluster description for this layer
- [features/audio-playback.md](./features/audio-playback.md),
  [features/subtitles.md](./features/subtitles.md),
  [features/video-abr.md](./features/video-abr.md) —
  per-type consumers of resolved tracks; ground their feature surface
  in attributes this layer surfaces
- [features/mse-mms-pipeline.md](./features/mse-mms-pipeline.md),
  [features/buffer-management.md](./features/buffer-management.md) —
  setup behaviors and segment loaders that consume the resolved
  presentation
- [text-track-architecture.md](./text-track-architecture.md) — peer
  architectural doc (text-track-specific deep-dive)
- [conventions/signals.md](./conventions/signals.md) — pipeline-pattern
  multi-writer slot convention (`state.presentation` is the canonical
  worked example)
- [conventions/config.md](./conventions/config.md) — when a tunable
  becomes config vs hardcoded (the `parseMediaPlaylist` coupling is a
  case study for the opposite direction: hardcoded, but should be
  config)
- `packages/spf/src/media/types/index.ts` — canonical type definitions
- [common-media-library upstream](https://github.com/AcademySoftwareFoundation/common-media-library)
  — the CMAF-HAM model this layer is based on
