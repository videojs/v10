---
status: implemented
date: 2026-09-14
definition: sketched
---

# Chapters

Chapter markers for HLS sources, from Apple's JSON chapters notation referenced by the multivariant playlist
(`#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters",URI="…json"`). The engine records session data while parsing the
multivariant playlist, fetches and parses the chapters document once the presentation has a duration, and projects one
hidden `<track kind="chapters">` per title language onto the media element. The element is the store: no chapters state
signal exists, and consumers read the first chapters track's cues the way video.js's textTrack feature already reads an
authored `<track kind="chapters">` — so the time-slider chapters UI lights up with no player-side change.

This is not a subtitle feature. Chapters are session-level data, not a rendition: nothing is selected, no media
playlist or segments exist, and `selectedTextTrackId` is untouched. What it shares with [subtitles](./subtitles.md) is
the `<track>` mechanism and the text-track DOM surface.

## Status

- **Composition:** `createHlsVideoEngine` and `createHlsAudioEngine` (an `<audio>` element carries text tracks too;
  podcast-style sources ship chapters). Not `createBackgroundVideoEngine`.
- **Definition depth:** sketched — shipped behavior, decisions, and source pointers below.

## Decisions

- **Session data is recorded generically, consumed specifically.** `parseMultivariantPlaylist` stores every
  `#EXT-X-SESSION-DATA` tag as a `SessionDataEntry` (`dataId`, `value` or resolved `uri` with `format`, `language`)
  under `presentation.metadata`, the way media-playlist specifics sit under `MediaPlaylistMetadata`, read back via
  `getSessionData(presentation, dataId)`. Fetching is left to whichever behavior knows a `DATA-ID`. A second consumer is
  a second pure parser plus a sibling behavior — no registry object, no behavior factory, matching the flat
  composition the engines use elsewhere.
- **No `chapters` state signal.** A signal would be a second copy of what the DOM `TextTrack` already holds, with its own
  clear-on-source-change to keep in sync, and nothing but the projector would read it. One DOM behavior fetches, parses,
  and projects; the pure parser is unit-tested on its own.
- **Projection waits for `presentation.duration`.** The document leaves the last chapter open unless it declares a
  `duration`; `VTTCue` rejects a non-finite end, and the time-slider UI drops non-finite cues and renders nothing for a
  non-finite slider max. For on-demand content the duration lands with the first media playlist, which playback needs
  anyway, so gating costs nothing and avoids mutating cues later. A live presentation (`Infinity`) ends the open chapter
  at `Number.MAX_VALUE`; the UI renders no chapters for it regardless.
- **One hidden track per language, order is the selection.** Consumers take the first `kind="chapters"` track, so the
  `preferredSubtitleLanguage` track is appended first, then `und`, then first-seen. All tracks stay on the element for a
  consumer that wants another language. Language matching is exact-tag.
- **Srcless tracks, filled after their load settles.** A `<track>` with no `src` still runs the track processing model
  once its mode leaves `disabled`: the empty URL fails the load, `readyState` becomes `ERROR`, `error` fires. Measured in
  Chromium, WebKit, and Firefox (2026-09-14): Chromium and WebKit drop any cue added *before* that point; all three keep
  cues added after it. A `data:text/vtt` `src` would avoid the dance but WebKit refuses one whenever the media element
  has `crossorigin` set — and `<mux-video crossorigin>` is the primary consumer. So the track is set `hidden` to settle,
  filled while `disabled`, then set `hidden` again; that last mode change queues the `TextTrackList` `change` that
  observers re-read cues on (a srcless `<track>` never fires `load`). The subtitle tracks go through the same sequence
  implicitly — their cues arrive after a segment fetch, long after the settle.
- **Own ownership tag.** Chapters tracks carry `data-src-chapters-track`, not the subtitle tracks' `data-src-track`, so
  each cleanup removes only its own. A host-page `<track kind="chapters">` precedes the engine's in `textTracks` (tree
  order: the custom element clones slotted children first), so a page that supplies its own chapters keeps them; no
  opt-out config was added.
- **Exactly one document, quiet failures.** The first `com.apple.hls.chapters` entry with a URI is read; Apple carries
  every language inside the document, so a playlist repeating the `DATA-ID` per `LANGUAGE` is not an expected shape. An
  entry carrying `VALUE` instead of `URI` is skipped. A document that won't load or won't parse is warned about
  (ungated, like the package's other reporting paths) and projects nothing.

## What's not implemented

Extension boundaries, each a candidate slice on this doc or its own:

- **Images.** `Chapter.images` is parsed (URLs resolved against the document) but not projected — no thumbnail or
  chapter-art consumer yet.
- **Metadata.** `Chapter.metadata` is passed through untouched; nothing reads it.
- **Other `DATA-ID`s.** Recorded on the presentation, no consumer. Reading one is `getSessionData(presentation, id)`.
- **Several chapters entries.** Only the first with a URI is read; merging per-`LANGUAGE` documents would need a
  cue-dedupe policy nothing calls for yet.
- **hls.js-backed flavors.** `<mux-video>` / `<hls-video>` over hls.js get `sessionData` from `MANIFEST_PARSED`; the
  pure parser and the DOM track helpers are exported so that path can reuse them.
- **Live / EVENT chapters.** The open chapter ends at `Number.MAX_VALUE` and the UI shows nothing for a non-finite
  duration. A growing timeline would need re-projection as the window grows.
- **Language fallback.** Exact BCP-47 match only; no region/base-language collapsing.

## Implementation surface

**Composition:** `packages/spf/src/playback/engines/hls/engine.ts` (under the text-track group),
`packages/spf/src/playback/engines/hls/engine-audio-only.ts`.

| Piece | File | Responsibility |
|---|---|---|
| `loadChapters` | `packages/spf/src/playback/behaviors/dom/load-chapters.ts` | Reactor gated on media element + resolved presentation with duration + a chapters entry with a URI; fetches, parses, projects; aborts and removes the tracks on exit |
| `parseMultivariantPlaylist` | `packages/spf/src/media/hls/parse-multivariant.ts` | Records `#EXT-X-SESSION-DATA` as `SessionDataEntry[]` under `presentation.metadata` |
| `getSessionData` / `getMultivariantPlaylistMetadata` | `packages/spf/src/media/types/index.ts` | Typed reads of the recorded entries |
| `parseHlsJsonChapters` | `packages/spf/src/media/hls/parse-json-chapters.ts` | Apple JSON (typed as its schema, `HlsJsonChapters`) → `Chapter[]`, document order, `duration` or next start as end, images resolved |
| `addChaptersTracksToMedia` / `removeAllChaptersTracksFromMedia` | `packages/spf/src/media/dom/text/chapters-tracks.ts` | Per-language hidden tracks, ordering, settle-then-fill, ownership tag |

**State:** reads `presentation` (metadata + `duration`); writes none. **Context:** reads `mediaElement`.

## Config surface

```ts
{
  preferredSubtitleLanguage?: string; // shared with subtitles: which language's chapters track leads
}
```

## Verification

- `packages/spf/src/media/hls/tests/parse-multivariant.test.ts` — `EXT-X-SESSION-DATA` recording, URI resolution,
  `FORMAT` default, repeated `DATA-ID` per `LANGUAGE`, spec-invalid tags skipped.
- `packages/spf/src/media/types/tests/metadata.test.ts` — the accessors.
- `packages/spf/src/media/hls/tests/parse-json-chapters.test.ts` — document order, end derivation, images, metadata,
  entries without titles.
- `packages/spf/src/media/dom/text/tests/chapters-tracks.test.ts` — element shape, ordering, settle-then-fill,
  `change` after fill, `MAX_VALUE` fallback, ownership isolation from subtitle tracks.
- `packages/spf/src/playback/behaviors/dom/tests/load-chapters.test.ts` — gating (media element, entry, duration),
  projection, first-entry selection, quiet failure, abort on source change, cleanup on unload and destroy.
- `packages/spf/src/playback/engines/hls/tests/engine.test.ts`, `engine-audio-only.test.ts` — end to end from a
  manifest carrying the tag, including that the track's mode changes never register as subtitle intent.
- **Sandbox:** `HLS - Apple JSON chapters (Mux staging, TS)` in the `*-mux-video-spf` presets. The only chapters-bearing
  asset today is MPEG-TS, so the engine projects the track (verified in Chrome: two cues, the second ending at the
  resolved 23.86 s duration, mirrored into the store's `chaptersCues`) and then refuses the renditions; the slider
  partition needs a CMAF staging asset with chapters.

## Related features

- **[subtitles](./subtitles.md)** — shares the `<track>` mechanism and the text-track DOM surface; distinct
  ownership tag, no participation in text selection. Its `syncTextTracks` `change` bridge only reads showing
  caption/subtitle tracks, which is what makes the chapters track's mode changes inert to it.
- **hls-multivariant-parsing** *(not yet documented)* — session-data recording is one slice of multivariant parsing.

## See also

- [presentation-modeling.md](../presentation-modeling.md) — the format-neutral `Presentation` shape and its `metadata`
  bag that session data lands in
- [text-track-architecture.md](../text-track-architecture.md) — the text-track Actor/Reactor deep-dive the subtitle
  tracks come from
- [conventions/behaviors.md](../conventions/behaviors.md) — the flat-composition and cleanup conventions this follows
- [packages/spf/docs/hls-engine.md](../../../../packages/spf/docs/hls-engine.md) — engine composition walkthrough
