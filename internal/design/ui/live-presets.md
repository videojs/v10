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

`streamTypeFeature` exposes `streamType: 'on-demand' | 'live' | 'unknown'` in the player store. Live playback needs visibly different UI from VOD:

- The duration display and standard scrubbing affordances disappear or change
- A live indicator / "jump to live edge" button takes their place
- The time slider, if shown at all, represents a DVR window, not `[0, duration]`
- Live-only affordances are likely to grow (latency badge, "behind live" state, chat slot, etc.)

Not every app needs this. Most VOD-only integrations don't want to pay for live UI code. And apps that do play live content almost always know that at embed time — an event page, a channel page, a DVR UI. "Live-aware" and "VOD-only" are two meaningfully different products, and authors pick one at integration time.

This doc records both the split (live vs. VOD as separate presets) and the narrower commitment inside the live presets (live-only, no in-skin VOD fallback).

## Shape

### Feature arrays

Base presets stay as today. Live presets start identical in capability and will diverge as live-only needs emerge:

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

export const liveVideoFeatures: VideoFeatures = videoFeatures;

export const audioFeatures: AudioFeatures = [
  playbackFeature,
  playbackRateFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  errorFeature,
];

export const liveAudioFeatures: AudioFeatures = audioFeatures;
```

`streamTypeFeature` is intentionally **not** included yet. The live skin assumes live, so it doesn't need runtime detection. When a live-only affordance actually needs stream-type state (e.g., surface an error if a VOD source is loaded, or drive a "behind live" badge derived from seekable + streamType), it's an additive, non-breaking change to append it to `liveVideoFeatures` / `liveAudioFeatures`.

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

## Rationale

Live-only presets win on four axes:

1. **VOD players don't pay for live.** The dominant case is on-demand. Keeping `streamTypeFeature` and the live UI tree out of `videoFeatures` / `audioFeatures` means the VOD store has no `streamType` slice, the VOD skin has no live-branch code, and bundles for VOD-only apps omit both. A shared-skin approach forces every player to carry the stream-type event plumbing and the live-UI tree, even when the source is known to be VOD.

2. **Explicit opt-in matches author intent.** Authors typically know at embed time whether their product plays live or VOD content. Picking `live-video` is a one-word signal that live is the supported path — clearer than "use `video` and set some prop" and more discoverable than "`video` happens to work if the source is live." It localises the "what kind of player is this?" question to preset choice, not to skin internals or runtime state.

3. **No unknown-state flash.** If the live skin branched on `streamType`, every load would start in `unknown` and resolve to `live` (or `on-demand`) after manifest detection. Either we render a neutral placeholder during that window — introducing a third UI state to design and test — or we pick a default and flip visibly once detection completes. A live-only skin has one shape from first paint.

4. **Fork-template clarity.** Skins are designed to be copied and modified. A live-dedicated, live-only skin gives live-app authors a starting point with only live concepts in the tree — no conditional helpers to grow, no `unknown` placeholder to design around, no dead VOD branches to delete. A VOD-app author forking `VideoSkin` gets the same treatment from the other side.

5. **Headroom for divergence.** Live UI tends to accumulate bespoke affordances — latency indicator, "behind live" badge, DVR-aware scrubber interactions, live chat/reactions slot, low-latency toggle. Each of those lands naturally inside `LiveVideoSkin` without leaking concepts into `VideoSkin` or swelling the shared store's state shape.

6. **Easy to add, hard to remove.** If we ship live-only now and later find authors commonly need one preset that gracefully handles `live` → VOD replay or source swaps across modes, we can add `streamTypeFeature` to the live feature array and branch the skin — an additive change. Going the other way (shipping a dual-mode live skin, then deciding the unknown-state handling and dead code aren't worth it) is a visible breaking change for anyone who was relying on the VOD path.

Secondary wins:

- **Targetable visual regression tests.** `apps/e2e/tests/visual/video-skin.spec.ts` already snapshots per skin; live gets its own snapshot, and the VOD snapshot stays stable without a `streamType` harness.
- **Smaller type surface in the common store.** `VideoPlayerStore` / `AudioPlayerStore` keep the same state shape they have today. Adding `streamType` to the base (or to the live preset before we need it) would ripple into every consumer of those types.

### What we give up

- **Runtime mode switching.** Neither preset adapts if its source's stream type changes. A live preset pointed at a VOD replay shows live UI over a VOD stream; a VOD preset pointed at a live source shows VOD UI over a live stream. Authors that need to handle both modes in one player either wait for a future iteration of the live preset or compose their own.
- **A story for "live replay / DVR archive" flows.** Some products want a single embed that starts live and keeps playing after the stream ends, or that plays back a recorded segment inside the same UI as the live stream. That's explicitly deferred; we'll revisit when a concrete product need surfaces.

### Trade-offs

| Gain                                                 | Cost                                                     |
| ---------------------------------------------------- | -------------------------------------------------------- |
| VOD-only apps ship no stream-type state or live UI   | Source-type switches at runtime aren't covered           |
| Live-only apps ship no VOD branch or unknown state   | Live replay / post-stream VOD flows aren't served yet    |
| First paint has a single, correct UI shape           | Two more React skins + four HTML skin elements to ship   |
| Easy to layer dual-mode support on later if needed   | Shared skin idioms must be kept in sync across trees     |
| Room to add live-only affordances without churn      | Authors must know their mode at preset-selection time    |

## Consequences

- In `@videojs/core/dom`:
  - Add `liveVideoFeatures` and `liveAudioFeatures` exports in `packages/core/src/dom/store/features/presets.ts`. Initially they alias `videoFeatures` / `audioFeatures` respectively — no `streamTypeFeature` yet.
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
2. **Live replay / post-stream transitions.** Some live flows end with a VOD archive of the stream. Whether that's served by a future dual-mode live preset, by swapping presets at transition time, or by a third preset entirely is explicitly deferred.

## Prior Art

- **Media Chrome** — No distinct live layout preset; authors compose `<media-live-button>` alongside or instead of `<media-time-display>` / `<media-time-range>` in their own control bar. Effectively forces every integrator to solve this composition problem themselves.
- **Vidstack** — Ships a `LiveIndicator` / `LiveButton` primitive and expects the author-provided layout to swap them in for the time display. Similar to Media Chrome — no separate live layout preset.
- **Video.js v8** — Adds a `vjs-live` body class and hides `.vjs-remaining-time` / `.vjs-duration` via CSS when the stream is live; shows `<LiveDisplay>` instead. Single skin, CSS-driven branching — one preset serving both modes.
- **Plyr** — Hides the progress/time controls and shows a "Live" badge when duration is not finite. Single skin, JS-driven branching.

Our choice is the least common in the ecosystem but aligns with the fork-template philosophy of this project: presets are full reference implementations authors copy and mutate, and the split reflects a real product distinction (VOD-only vs. live-only) rather than a runtime-only toggle. We're also biased toward starting narrower than the alternatives — a live skin that covers live only is an easy thing to extend if demand proves us wrong, and a hard thing to retract once shipped.
