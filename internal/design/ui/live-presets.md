---
status: decided
date: 2026-04-21
---

# Live Presets

Dedicated `live-video` and `live-audio` presets for live-capable playback, alongside the existing `video` and `audio` presets for on-demand-only playback.

## Decision

Ship live playback as **separate presets** — `live-video` and `live-audio` — each pairing a live-capable feature set with a skin that adapts to both live and on-demand sources. We do **not** add live-capable state or UI to the existing `video` / `audio` presets.

Two things diverge from the base presets:

1. **Feature arrays include `streamTypeFeature`.** `liveVideoFeatures` / `liveAudioFeatures` are supersets of `videoFeatures` / `audioFeatures` with the stream-type slice appended. Base presets omit it entirely.
2. **Skins branch on `streamType`.** Live skins handle both live and on-demand sources within a single component, switching the time region when `streamType === 'live'`. Base skins assume on-demand and never read `streamType`.

Runtime source switching between live and VOD is a supported flow of the live presets.

## Context

`streamTypeFeature` exposes `streamType: 'on-demand' | 'live' | 'unknown'` in the player store. Live playback needs visibly different UI from VOD:

- The duration display and standard scrubbing affordances disappear or change
- A live indicator / "jump to live edge" button takes their place
- The time slider, if shown at all, represents a DVR window, not `[0, duration]`
- Live-only affordances are likely to grow (latency badge, "behind live" state, chat slot, etc.)

Not every app needs this. Most VOD-only integrations don't want to pay for stream-type state or live UI code. And because the live skin needs to handle both modes anyway — a live-capable player may be pointed at a VOD replay, or a source may switch between the two — "live-aware" and "VOD-only" are two meaningfully different products. This doc records the split.

## Shape

### Feature arrays

Base presets stay as today. Live presets are supersets with `streamTypeFeature` appended:

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

export const liveVideoFeatures: LiveVideoFeatures = [...videoFeatures, streamTypeFeature];

export const audioFeatures: AudioFeatures = [
  playbackFeature,
  playbackRateFeature,
  volumeFeature,
  timeFeature,
  sourceFeature,
  bufferFeature,
  errorFeature,
];

export const liveAudioFeatures: LiveAudioFeatures = [...audioFeatures, streamTypeFeature];
```

Types diverge to match. `LiveVideoFeatures` / `LiveAudioFeatures` extend their base arrays with the stream-type slice:

```ts
export type LiveVideoFeatures = [...VideoFeatures, PlayerFeature<MediaStreamTypeState>];
export type LiveAudioFeatures = [...AudioFeatures, PlayerFeature<MediaStreamTypeState>];
```

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

### Live skin adapts to both modes

A live skin is a VOD skin plus a conditional time region:

```tsx
const streamType = usePlayer(selectStreamType);

// ...

{streamType === 'live' ? (
  <LiveEdgeControls />
) : (
  <OnDemandTimeControls />
)}
```

While `streamType === 'unknown'` the skin shows a neutral placeholder (no duration, no live badge) until detection resolves. This avoids the VOD → live snap that would happen if we optimistically rendered one mode and flipped after manifest load.

### Base skin is VOD-only

`VideoSkin` / `AudioSkin` never read `streamType` (and can't — the slice isn't in the store). They unconditionally render the on-demand time region. Pointing a `video` preset at a live source produces working playback with a duration of `Infinity` (or `seekable.end(last)` once `timeFeature` resolves it) and the standard scrubber on the seekable window, with no live-edge affordance. That's an intentional degradation, not a supported configuration — authors who expect live sources use a live preset.

## Alternatives Considered

- **Branch the existing `video` / `audio` skins on `streamType`** — Add `streamTypeFeature` to the base feature arrays and swap `.media-time-controls` inside the single skin when `streamType === 'live'`. Pattern already used for `volumeAvailability === 'unsupported'` (see `VolumePopover` in `packages/react/src/presets/video/skin.tsx:60`).

## Rationale

Live-as-separate-preset wins on four axes:

1. **VOD players don't pay for live.** The dominant case is on-demand. Keeping `streamTypeFeature` out of `videoFeatures` / `audioFeatures` means the VOD store has no `streamType` slice, the VOD skin has no live-branch code, and bundles for VOD-only apps omit both. A branching approach forces every player to carry the stream-type event plumbing and the live-UI tree, even when the source is known to be VOD.

2. **Explicit opt-in matches author intent.** Authors typically know at embed time whether their product plays live content (event pages, channel pages, DVR UIs). Picking `live-video` is a one-word signal that live is a supported path — clearer than "use `video` and set some prop" and more discoverable than "`video` happens to work if the source is live." It also localises the "does this handle live?" question to preset choice, not to skin internals.

3. **Fork-template clarity.** Skins are designed to be copied and modified. A live-dedicated skin gives live-app authors a starting point that already wires up `streamType`, live-edge controls, and the VOD fallback — no conditional helpers to grow, no dead branches to delete. A VOD-app author forking `VideoSkin` gets a tree with zero live concepts to strip out.

4. **Headroom for divergence.** Live UI tends to accumulate bespoke affordances — latency indicator, "behind live" badge, DVR-aware scrubber interactions, live chat/reactions slot, low-latency toggle. Each of those lands naturally inside `LiveVideoSkin` without leaking concepts into `VideoSkin` or swelling the shared store's state shape.

Secondary wins:

- **Targetable visual regression tests.** `apps/e2e/tests/visual/video-skin.spec.ts` already snapshots per skin; live gets its own snapshot, and the VOD snapshot stays stable without a `streamType` harness.
- **Smaller type surface in the common store.** `VideoPlayerStore` / `AudioPlayerStore` keep the same state shape they have today. Adding `streamType` to the base would ripple into every consumer of those types.

### What we give up vs. branching

- **The live skin still has to handle `unknown → live` internally.** The flicker problem doesn't disappear just because live is a separate preset; it just moves inside the live skin, which we address with a neutral placeholder during `unknown`.
- **Runtime mode switching is live-only.** A base-preset player can't flip into live UI if its source changes. Authors who need that pick a live preset up front.
- **Live skins are a superset to maintain.** Most of the file is the same JSX; only the time region branches.

### Trade-offs

| Gain                                                 | Cost                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| VOD-only apps ship no stream-type state or live UI   | Live skins carry both branches and a neutral `unknown` state  |
| Live capability is an explicit, single author choice | Two more React skins + four HTML skin elements to maintain    |
| Base store shape stays minimal and stable            | Shared skin idioms must be kept in sync across trees          |
| Room to add live-only affordances without churn      | Base presets can't recover if a source unexpectedly goes live |

## Consequences

- In `@videojs/core/dom`:
  - Add `liveVideoFeatures` and `liveAudioFeatures` exports in `packages/core/src/dom/store/features/presets.ts`, each derived from the base array plus `streamTypeFeature`.
  - Update the type aliases in `packages/core/src/dom/media/types.ts` so `LiveVideoFeatures` / `LiveAudioFeatures` reflect the appended slice.
  - Remove `streamTypeFeature` from any base-array usages (it stays a standalone export for custom compositions).
- In `@videojs/react`:
  - Add `packages/react/src/presets/live-video/` with `skin.tsx`, `skin.tailwind.tsx`, `minimal-skin.tsx`, `minimal-skin.tailwind.tsx`.
  - Add `packages/react/src/presets/live-audio/` mirroring the above.
  - Each live skin reads `selectStreamType` and branches the time region between live-edge and on-demand controls; `unknown` renders a neutral placeholder.
- In `@videojs/html`:
  - Add `packages/html/src/presets/live-video.ts` and `packages/html/src/presets/live-audio.ts`, plus the corresponding `define/live-video/*` and `define/live-audio/*` custom element wrappers.
- Site API reference pages for the new presets; update the presets overview to list live variants and clarify that the base presets are VOD-only.
- `selectStreamType` remains a core export; its existing contract (return `undefined` when the feature isn't configured) covers the base-preset case naturally — base-preset consumers that call it get `undefined` and render as VOD.

## Open Questions

1. **Neutral `unknown` rendering.** Exact shape of the placeholder during `streamType === 'unknown'` — whether it matches the live layout's footprint, the VOD layout's footprint, or a minimal third shape that avoids any layout shift when it resolves.

## Prior Art

- **Media Chrome** — No distinct live layout preset; authors compose `<media-live-button>` alongside or instead of `<media-time-display>` / `<media-time-range>` in their own control bar. Effectively forces every integrator to solve this composition problem themselves.
- **Vidstack** — Ships a `LiveIndicator` / `LiveButton` primitive and expects the author-provided layout to swap them in for the time display. Similar to Media Chrome — no separate live layout preset.
- **Video.js v8** — Adds a `vjs-live` body class and hides `.vjs-remaining-time` / `.vjs-duration` via CSS when the stream is live; shows `<LiveDisplay>` instead. Single skin, CSS-driven branching — one preset serving both modes.
- **Plyr** — Hides the progress/time controls and shows a "Live" badge when duration is not finite. Single skin, JS-driven branching.

Our choice is the least common in the ecosystem but aligns with the fork-template philosophy of this project: presets are full reference implementations authors copy and mutate, and the split reflects a real product distinction (VOD-only vs. live-capable) rather than a runtime-only toggle.
