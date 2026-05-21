# Design Decisions

Rationale, background, and open questions for the [Video Ad API RFC](index.md).

## Format Inventory

The seven ad formats this API must support, derived from the IAB CTV Ad Portfolio. Each row captures the properties the API needs to expose for that format.

| Format      | Trigger                                         | Relationship to Content                     | Creative Types                      | Key API Requirements                                                                                          |
| ----------- | ----------------------------------------------- | ------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Linear      | Timeline position (pre/mid/post-roll)           | Replaces content                            | Video                               | Break scheduling, cue points, quartile events, skip control, companion ads, pod position                      |
| Pause Ad    | User pauses content                             | Replaces paused frame (full/partial screen) | Display / Static / Video / Animated | Pause-state detection, creative sizing (1920×1080 or 600×600), refresh/autoplay signals, dismiss reasons      |
| Menu Ad     | User navigates to menu / TV power-on            | Outside video playback entirely             | Display / Static / Video / Animated | UI surface identification, variable sizing, headline vs. tile placement, scroll/navigation lifecycle          |
| Squeezeback | Programmatic (during content, outside ad break) | Content resized, shares screen with ad      | Display / Static / Video / Animated | Layout variant (L-Shape, Frame, Double Box), content resize animation (1–2s), audio signal, min 10s duration  |
| Overlay     | Programmatic (during content, outside ad break) | Overlays content, no resize                 | Display / Static / Video / Animated | Placement (Corner 25%, Lower Third 30%), transparency support, min 10s duration, no default audio             |
| In-Scene    | Composited into video content                   | Embedded within the scene                   | Static Image (jpg/png/gif)          | Multiple aspect ratios (9:16, 4:3, 16:9, Poster, Bulletin), min 3s brand exposure, no interactivity, no audio |
| Screensaver | OS/App inactivity timeout                       | Full screen, replaces idle state            | Display / Static / Video / Animated | Inactivity trigger, 1920×1080, refresh/autoplay signals, dismiss reasons (viewer or device)                   |

These requirements drive every shape decision in [api.md](api.md). Any API alternative had to handle this matrix.

## Design Goals

- Provide a single, generic interface for all ad formats defined in the IAB CTV Ad Portfolio.
- Follow patterns familiar to web developers, drawing direct inspiration from the TextTrack / TextTrackList API on `HTMLMediaElement`.
- Remain ad-server agnostic: work with CSAI, SSAI, SGAI, pod-serving, and future delivery mechanisms.
- Support concurrent ad experiences (e.g., an overlay running while content plays, a companion alongside a linear break).
- Expose sufficient metadata for interactivity (SIMID), companion ads, QR codes, and skip controls.
- Be incrementally adoptable: players that only need linear ads should not be forced to implement the full non-linear surface.

## The TextTrack Analogy

In the TextTrack API, the hierarchy is:

- `TextTrackList` — a collection of tracks, accessible via `videoElement.textTracks`.
- `TextTrack` — a single track representing a category (e.g., English subtitles). Has a `mode` property and exposes `cues` (all cues) and `activeCues` (currently active cues).
- `TextTrackCue` (`VTTCue`) — an individual timed item within a track, with `startTime`, `endTime`, and content. Fires `enter` and `exit` events as the playhead crosses its boundaries.

The proposed ad API maps as follows:

- `AdTrackList` — a collection of ad tracks, accessible via a player extension (e.g., `videoElement.adTracks`).
- `AdTrack` — a single track grouped by `AdFormat` (e.g., the `'linear'` track, the `'overlay'` track). Unlike `TextTrack`, ad tracks are always enabled — there is no visibility `mode` property. If a track exists, it is active. `AdTrack` does expose a `servingMode` property, but this declares how ads are delivered (`'client-side'`, `'ssai'`, or `'sgai'`), not whether the track is visible.
- `AdCue` — a group of one or more related ads within a track. For linear ads, a cue is a pod/break; for non-linear formats, a cue is a presentation opportunity (e.g., a single pause-ad session, a single overlay appearance). The track exposes `cues` (all cue groups) and `activeCues` (groups currently presenting). This parallels `TextTrack.cues` / `TextTrack.activeCues`.
- `Ad` — an individual ad experience within a cue. Analogous to how a `VTTCue` contains a payload, an `AdCue` contains one or more `Ad` instances. Each `Ad` has its own lifecycle state, timing, creative metadata, and fires its own events.

This gives a four-level hierarchy: `AdTrackList → AdTrack → AdCue → Ad`. The number of tracks is bounded by supported formats (at most 7). The number of cues per track is unbounded. Multiple cues on different tracks can be active simultaneously, naturally modeling concurrent experiences like an overlay appearing during content while a companion persists from a previous linear break.

### Side-by-Side Comparison

| TextTrack API              | Proposed Ad API                       | Role                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| TextTrackList              | AdTrackList                           | Top-level collection on the media element. Iterable, emits 'addtrack' / 'removetrack' / 'change'.                                                                                                                                                                                     |
| TextTrack                  | AdTrack                               | A single lane grouped by category. TextTrack groups by kind (subtitles, captions); AdTrack groups by AdFormat (`'linear'`, `'overlay'`, etc.). AdTrack has no visibility mode (tracks are always enabled). It exposes servingMode instead, which declares delivery mechanism, not visibility. |
| TextTrack.cues             | AdTrack.cues                          | Read-only list of all cue groups in the track (scheduled, active, completed).                                                                                                                                                                                                         |
| TextTrack.activeCues       | AdTrack.activeCues                    | Read-only list of cue groups currently presenting. Updated automatically.                                                                                                                                                                                                             |
| VTTCue                     | AdCue                                 | A group of related ads within a track. For `'linear'`: a pod/break. For non-linear: a presentation opportunity. Has its own lifecycle, timing, and events.                                                                                                                            |
| (cue payload)              | Ad                                    | An individual ad within a cue group. Carries creative metadata, per-ad lifecycle state, and fires its own events.                                                                                                                                                                     |
| VTTCue.startTime           | AdCue.startTime (or trigger metadata) | When/how the cue activates. Timeline-based for linear; event-based for non-linear.                                                                                                                                                                                                    |
| VTTCue.endTime             | AdCue.endTime / AdCue.duration        | When the cue deactivates. May be null for indeterminate-duration non-linear cues.                                                                                                                                                                                                     |
| 'enter' / 'exit' on VTTCue | 'activated' / 'deactivated' on AdCue  | Lifecycle events as a cue starts and stops presenting.                                                                                                                                                                                                                                |
| TextTrackCueList           | AdCueList                             | Ordered collection returned by .cues and .activeCues. Index access and getById().                                                                                                                                                                                                     |

## Naming: Why "AdCue"

The intermediate grouping layer between `AdTrack` and `Ad` needs a name that works across all formats. The term "break" was considered but is too tightly associated with linear ad pods. Several alternatives were evaluated:

| Name                              | Rationale                                                                                                                                                                                                                                                       | Status             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| cue / activeCues                  | Direct TextTrack alignment. "Cue" is already a familiar concept to web developers. The IAB guidelines themselves use "cue point" for linear scheduling. For non-linear formats, "cue" naturally extends to mean "a signal that one or more ads should present." | Recommended        |
| slot / activeSlots                | Common in ad-server terminology ("ad slot"). Implies a container that gets filled with creatives. Slightly less alignment with TextTrack API.                                                                                                                   | Strong alternative |
| opportunity / activeOpportunities | Used in programmatic advertising ("ad opportunity"). Semantically clear but verbose for a frequently accessed property.                                                                                                                                         | Considered         |
| segment / activeSegments          | Neutral, but risks confusion with content segments.                                                                                                                                                                                                             | Rejected           |
| break / activeBreaks              | Familiar for linear ads but misleading for non-linear formats. A pause ad or overlay doesn't "break" anything.                                                                                                                                                  | Rejected           |

The recommendation is `AdCue` with properties `cues` and `activeCues` on `AdTrack`. This maximizes TextTrack API familiarity while being semantically appropriate across all ad formats.

## Open Design Questions

### Attachment point

Should `AdTrackList` be a property on `HTMLVideoElement` (e.g., `videoElement.adTracks`) or a standalone manager class that receives a video element reference? The former is more ergonomic but requires monkey-patching or wrapping the element. The latter is more portable.

### Menu ads without a video element

Menu ads exist outside video playback. Should the API support an `AdTrackList` with no associated video element, or should menu ads be considered out of scope for a video-centric API?

### One track per format enforcement

The current design enforces at most one `AdTrack` per `AdFormat`. Should we allow multiple tracks of the same format (e.g., two separate `'overlay'` tracks from different ad servers), or should multiple overlays always share one track?

### Cue lifecycle ownership

Who drives state transitions on `AdCue` instances — the adapter or the player? For `'timeline'`-triggered cues, the player could automatically activate/deactivate cues as the playhead crosses `startTime`/`endTime` (mirroring how the browser drives VTTCue enter/exit). Non-timeline cues would remain under adapter control. Should this split be formalized?

### Event bubbling

Should `Ad` events bubble up to `AdCue`, then to `AdTrack`, then to `AdTrackList`? This would let a player listen for all `impression` events at the list level. The TextTrack API does not bubble cue events. The trade-off is simplicity vs. noise.

### Cue naming confirmation

This document recommends `cue` / `activeCues` for TextTrack alignment. The `slot` alternative is also strong. The team should confirm the preferred name before TypeScript definitions are drafted.

### In-scene tracking granularity

For composited ads, the API reports metadata only — it cannot control rendering. How much tracking responsibility should the API assume vs. delegating to the compositing pipeline?

### Measurement integration

The IAB recommends Open Measurement for viewability. Should the API include hooks for OM SDK integration, or is that the adapter's responsibility?

### SqueezebackMetadata and Ad-level viewports

Both `SqueezebackMetadata.contentViewport` (on the cue) and `Ad.contentViewport` (on each Ad) express the same concept for the common single-layout squeezeback case. Should `SqueezebackMetadata.contentViewport` be deprecated in favor of reading `Ad.contentViewport` directly, or retained as a convenience for cue-level reads?

### Numerically indexable lists

`AdTrackList`, `AdCueList`, and `AdList` all expose `readonly [index: number]` access, mirroring `TextTrackList`/`TextTrackCueList`. In practice, supporting numeric indexing on an `EventTarget` forces implementations into one of two unusual patterns: extend `Array` (and hand-roll the EventTarget surface) or return a `Proxy` from the constructor (which complicates private fields and method binding). JavaScript's single inheritance makes the EventTarget-vs-Array choice mutually exclusive. This pain was documented during the V10 custom renderer integration for `TextTrackList` ([reference](https://github.com/littlespex/avia-js-v10/blob/main/docs/v10-custom-renderer-integration.md#numeric-indexing-requires-a-proxy-or-array-subclass)). Should the ad API drop numeric indexing in favor of an explicit accessor (e.g., `.at(i)`, `.toArray()`, or iterator-only access via `Symbol.iterator`), or accept the TextTrack-style ergonomic parity at the cost of implementation complexity?

## Recommended Next Steps

- **Team review of this RFC:** circulate for feedback, particularly on the cue naming decision and open questions above.
- **Prototype TypeScript definitions:** translate the interfaces in [api.md](api.md) into a standalone `.d.ts` file. This should include the full `AdTrackList → AdTrack → AdCueList → AdCue → AdList → Ad` hierarchy.
- **Adapter feasibility check:** validate that ad adapters (IMA SDK wrapper, SSAI stitcher, SGAI signaling client, pod-serving client) can populate the cue/ad model.
- **Build a reference implementation for linear ads:** implement the `'linear'` `AdTrack` and verify that the cue-per-break model maps cleanly to typical VMAP responses.
- **Extend to one non-linear format:** pick the most impactful non-linear format (likely Overlay or Pause) and build a proof-of-concept adapter to validate the cue lifecycle, trigger model, and event system.
- **Engage with IAB standards work:** as the IAB continues to develop SIMID and VAST for CTV, align the interactivity interfaces with their evolving specifications.
