---
status: decided
date: 2026-04-21
---

# Live Presets

Dedicated `live-video` and `live-audio` presets for **live-only** playback, alongside the existing `video` and `audio` presets for on-demand-only playback.

## Decision

Ship live playback as **separate, live-only presets** — `live-video` and `live-audio`. Each pairs a live-capable feature set with a skin that renders live UI unconditionally. We do **not**:

- Add live-capable state or UI to the existing `video` / `audio` presets.
- Branch the live skins on `streamType` to cover VOD inside the same preset.

Two presets, two jobs: base presets play VOD, live presets play live. A preset is a commitment to one mode, not a runtime toggle between both. If a live preset ever needs to cover VOD sources too, we can layer that in later — but we're not paying the complexity up front before we've felt the friction.

## Context

Live playback needs visibly different UI from VOD:

- The duration display and standard scrubbing affordances disappear or change
- A live indicator / "jump to live edge" button takes their place
- The time slider, if shown at all, represents a DVR window, not `[0, duration]`
- Live-only affordances are likely to grow (latency badge, "behind live" state, chat slot, etc.)

`streamTypeFeature` exposes `streamType: 'on-demand' | 'live' | 'unknown'` and could drive this at runtime inside one shared skin. We're choosing not to.

Authors almost always know at embed time whether their product plays live or VOD — an event page, a channel page, a DVR UI. "Live-aware" and "VOD-only" are two meaningfully different products, and the vast majority of `video` / `audio` integrations are VOD-only.

This doc records two decisions, with separate rationales below:

1. **Split** — live and VOD ship as separate presets.
2. **Live-only** — the live preset's skin renders live UI unconditionally, with no in-skin VOD fallback.

## Shape

### Feature arrays

Base presets stay as today. Live presets start close in capability and will diverge further as live-only needs emerge. `playbackRateFeature` is dropped — speed controls aren't meaningful for live playback, where the user is always pinned to (or chasing) the live edge.

```ts
// packages/core/src/dom/store/features/presets.ts
export const videoFeatures: VideoFeatures = [
  playbackFeature,
  playbackRateFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  fullscreenFeature,
  pipFeature,
  remotePlaybackFeature,
  controlsFeature,
  textTrackFeature,
  errorFeature,
];

export const liveVideoFeatures: VideoFeatures = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  fullscreenFeature,
  pipFeature,
  remotePlaybackFeature,
  controlsFeature,
  textTrackFeature,
  errorFeature,
];

export const audioFeatures: AudioFeatures = [
  playbackFeature,
  playbackRateFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  errorFeature,
];

export const liveAudioFeatures: AudioFeatures = [
  playbackFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  errorFeature,
];
```

`streamTypeFeature` is intentionally **not** included. The live skin assumes live, so it doesn't need runtime detection. When a live-only affordance actually needs stream-type state (e.g., surface an error if a VOD source is loaded, or drive a "behind live" badge derived from seekable + streamType), it's an additive, non-breaking change to append it to `liveVideoFeatures` / `liveAudioFeatures`.

No live-specific time feature either. `timeFeature` already resolves `duration` to `seekable.end(last)` when the native duration is `Infinity`, which is all the live skin needs for now. If `currentTime` or other time values need live-specific handling later, that's also additive.

Beyond `playbackRateFeature`, the live feature arrays start as near-copies of their VOD counterparts. That's a conservative starting point, not a commitment that live needs every remaining feature. Further bundle wins for live-only are expected to come primarily from the skin (smaller DOM, fewer subscribers — see below). Trimming additional features from the live arrays is a follow-up once the skins land and we can measure.

### Preset packages

```ts
// packages/react/src/presets/live-video/index.ts
export { liveVideoFeatures } from '@videojs/core/dom';
export { LiveVideo, type LiveVideoProps } from '@/media/live-video';
export * from './skin';
export * from './skin.tailwind';
export * from './minimal-skin';
export * from './minimal-skin.tailwind';
```

```ts
// packages/html/src/presets/live-video.ts
export { liveVideoFeatures } from '@videojs/core/dom';
export { LiveVideoSkinElement } from '../define/live-video/skin';
export { LiveVideoSkinTailwindElement } from '../define/live-video/skin.tailwind';
export { MinimalLiveVideoSkinElement } from '../define/live-video/minimal-skin';
export { MinimalLiveVideoSkinTailwindElement } from '../define/live-video/minimal-skin.tailwind';
```

`live-audio` mirrors this.

### Live skin is live-only

The live skin renders live controls unconditionally — a live indicator, a "jump to live edge" button, and (where applicable) a DVR-window slider derived from `seekable`. It does not read `streamType`, and it does not attempt to recover to a VOD layout when the source turns out to be on-demand:

```tsx
// packages/react/src/presets/live-video/skin.tsx
<div className="media-time-controls">
  <LiveEdgeButton />
  <LiveIndicator />
</div>
```

Pointing a `live-video` preset at a VOD source produces the live skin on top of a VOD stream — working playback, but with live affordances that don't match the content. That's an intentional degradation, not a supported configuration — the mirror of pointing `video` at a live source.

### Base skin is VOD-only

`VideoSkin` / `AudioSkin` never read `streamType` (and can't — the slice isn't in the store). They unconditionally render the on-demand time region. Pointing a `video` preset at a live source produces working playback with a duration of `Infinity` (or `seekable.end(last)` once `timeFeature` resolves it) and the standard scrubber on the seekable window, with no live-edge affordance. That's an intentional degradation, not a supported configuration — authors who expect live sources use a live preset.

## Alternatives Considered

- **Live skin branches on `streamType` to cover VOD too.** Ship `liveVideoFeatures = [...videoFeatures, streamTypeFeature]` and render live vs. on-demand time controls inside the live skin based on detection, with a neutral placeholder while `streamType === 'unknown'`. Supports runtime source switches between live and VOD within one preset.
- **Branch the existing `video` / `audio` skins on `streamType`.** One preset per medium, one skin that covers both modes by reading `streamType`. Pattern already used for `volumeAvailability === 'unsupported'` (see `VolumePopover` in `packages/react/src/presets/video/skin.tsx:60`).
- **Single preset, runtime-selected skin.** Keep one `video` / `audio` preset but have it mount a different skin tree based on `streamType`. Hides the split from the author but retains the unknown-state and dead-code problems.

## Rationale: Split live from VOD

The dominant case is VOD — the vast majority of `video` / `audio` integrations never play live. Every byte the VOD preset carries for a capability it doesn't use is a byte the dominant case pays for something it doesn't get.

A shared `video` preset covering both modes forces every VOD player to ship:

- The `streamType` state slice and the events, subscribers, and predicate helpers that maintain it.
- The live UI tree — live indicator, jump-to-live-edge button, DVR slider — rendered conditionally but present in the bundle.
- The branching logic itself (detection, unknown-state handling, transitions).

A separate `live-video` preset keeps that cost with the apps that actually use live. The VOD store has no `streamType` slice; `VideoSkin` has no live branches; nothing in the default import path references live code. The bundle-size report already separates `/video/skin` from a future `/live-video/skin` entry — the split is visible and measurable.

Secondary wins:

- **Explicit opt-in matches author intent.** Picking `live-video` is a one-word signal that live is the supported path — clearer than "use `video` and set some prop" and more discoverable than "`video` happens to work if the source is live."
- **Smaller type surface in the common store.** `VideoPlayerStore` / `AudioPlayerStore` keep their current state shape. Adding `streamType` to the base ripples into every consumer of those types.
- **Targetable visual regression tests.** Each skin snapshots independently; the VOD snapshot stays stable without a `streamType` harness.

## Rationale: Live preset renders live UI only

Given we're shipping a dedicated live preset, it could still support VOD internally — branch the live skin on `streamType` and fall back to VOD controls when the source isn't live. We're not doing that either.

1. **Smaller live bundle.** Live-only (especially non-DVR) unlocks a meaningfully smaller UI: no time slider, no thumbnail previews, no seek buttons, no remaining-time display. A dual-mode live skin has to ship all of those for the VOD branch, plus the branching. Live-only gets to be genuinely smaller, not just differently shaped.

2. **No unknown-state flash.** A dual-mode live skin starts every load in `streamType === 'unknown'` and resolves to `live` (or `on-demand`) after manifest detection. Either we render a neutral placeholder during that window — a third UI state to design and test — or we pick a default and flip visibly once detection completes. A live-only skin has one shape from first paint.

3. **Fork-template clarity.** Skins are reference implementations authors copy and mutate. A live-only skin gives live-app authors a starting point with only live concepts in the tree — no conditional helpers, no `unknown` placeholder, no dead VOD branches to delete. VOD authors forking `VideoSkin` get the same treatment from the other side.

4. **Headroom for divergence.** Live UI tends to accumulate bespoke affordances — latency indicator, "behind live" badge, DVR-aware scrubber interactions, live chat/reactions slot. Each lands naturally inside `LiveVideoSkin` without leaking concepts into the dual-mode branching.

5. **Easy to add, hard to remove.** If we later find authors commonly need one preset that handles live → VOD replay or cross-mode source swaps, we can add `streamTypeFeature` and branch the skin — additive. Shipping a dual-mode skin and later deciding the unknown-state handling and dead code aren't worth it is a breaking change for anyone on the VOD path.

### What we give up

- **Runtime mode switching.** Neither preset adapts if its source's stream type changes. A live preset pointed at a VOD replay shows live UI over a VOD stream; a VOD preset pointed at a live source shows VOD UI over a live stream. Authors needing both modes in one player either wait for a future iteration or compose their own.
- **A story for live replay / DVR archive flows.** Some products want a single embed that starts live and keeps playing after the stream ends, or that plays back a recorded segment inside the same UI as the live stream. Deferred until a concrete product need surfaces.

### Trade-offs

| Gain                                               | Cost                                                   |
| -------------------------------------------------- | ------------------------------------------------------ |
| VOD-only apps ship no stream-type state or live UI | Source-type switches at runtime aren't covered         |
| Live-only apps ship a smaller live-only UI         | Live replay / post-stream VOD flows aren't served yet  |
| First paint has a single, correct UI shape         | Two more React skins + four HTML skin elements to ship |
| Easy to layer dual-mode support on later if needed | Shared skin idioms must be kept in sync across trees   |
| Room to add live-only affordances without churn    | Authors must know their mode at preset-selection time  |

## Consequences

- In `@videojs/core/dom`:
  - Add `liveVideoFeatures` and `liveAudioFeatures` exports in `packages/core/src/dom/store/features/presets.ts`. Initially they match `videoFeatures` / `audioFeatures` minus `playbackRateFeature`, and without `streamTypeFeature`.
  - `streamTypeFeature` stays a standalone export for custom compositions; it's not wired into any preset feature array.
  - No change to `VideoFeatures` / `AudioFeatures` or the derived store types.
- In `@videojs/react`:
  - Add `packages/react/src/presets/live-video/` with `skin.tsx`, `skin.tailwind.tsx`, `minimal-skin.tsx`, `minimal-skin.tailwind.tsx`.
  - Add `packages/react/src/presets/live-audio/` mirroring the above.
  - Live skins render live controls unconditionally; they do not import `selectStreamType` and do not branch on stream type.
- In `@videojs/html`:
  - Add `packages/html/src/presets/live-video.ts` and `packages/html/src/presets/live-audio.ts`, plus the corresponding `define/live-video/*` and `define/live-audio/*` custom element wrappers.
- Site API reference pages for the new presets; update the presets overview to list live variants and clarify that the base presets are VOD-only and the live presets are live-only.
- `selectStreamType` remains a core export; its existing contract (return `undefined` when the feature isn't configured) covers both presets naturally — neither preset configures `streamTypeFeature` today, so callers get `undefined`.

## Open Questions

1. **When to add `streamTypeFeature` to the live feature arrays.** What signal tells us we're paying for live-only's minimalism — authors writing the same "is this VOD?" guard themselves, Mux-specific mis-configurations we want to surface as an error, or something else? Worth revisiting after the first few live integrations.
2. **Further trimming the live feature array.** `playbackRateFeature` is dropped on day one. The clearest next candidate is splitting `textTrackFeature` — it bundles captions (needed for live) with chapters and thumbnail cues (VOD-only). A `captionsFeature` / `chaptersFeature` / `thumbnailsFeature` split lets live take captions only and drop the cue iteration and `<track>` DOM-walking that exists to populate the others. Decide once the first live skins are in-tree and we can measure actual subscribers.
3. **Live replay / post-stream transitions.** Some live flows end with a VOD archive of the stream. Whether that's served by a future dual-mode live preset, by swapping presets at transition time, or by a third preset entirely is explicitly deferred.

## Prior Art

- **Media Chrome** — No distinct live layout preset; authors compose `<media-live-button>` alongside or instead of `<media-time-display>` / `<media-time-range>` in their own control bar. Effectively forces every integrator to solve this composition problem themselves.
- **Vidstack** — Ships a `LiveIndicator` / `LiveButton` primitive and expects the author-provided layout to swap them in for the time display. Similar to Media Chrome — no separate live layout preset.
- **Video.js v8** — Adds a `vjs-live` body class and hides `.vjs-remaining-time` / `.vjs-duration` via CSS when the stream is live; shows `<LiveDisplay>` instead. Single skin, CSS-driven branching — one preset serving both modes.
- **Plyr** — Hides the progress/time controls and shows a "Live" badge when duration is not finite. Single skin, JS-driven branching.

Our choice is the least common in the ecosystem but aligns with the fork-template philosophy of this project: presets are full reference implementations authors copy and mutate, and the split reflects a real product distinction (VOD-only vs. live-only) rather than a runtime-only toggle. We're also biased toward starting narrower than the alternatives — a live skin that covers live only is an easy thing to extend if demand proves us wrong, and a hard thing to retract once shipped.
