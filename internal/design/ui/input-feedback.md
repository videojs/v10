---
status: draft
date: 2026-04-24
---

# Input Feedback Components

## Context

Standalone components for showing brief visual + accessible feedback when users trigger actions via gestures or hotkeys. The API is built from focused observer primitives: `StatusIndicator`, `StatusAnnouncer`, `VolumeIndicator`, and `SeekIndicator`.

YouTube reference: center `role="status"` element with `aria-label="Pause"`, volume island, side seek overlays.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Gesture/Hotkey Coordinators (subscribe API)    │
└──┬──────────────┬──────────────┬──────────────┬─┘
   │              │              │              │
 ┌─▼────────┐ ┌──▼────┐ ┌────────▼───┐ ┌────────▼───┐
 │  Status  │ │Status │ │   Volume   │ │    Seek    │
 │ Indicator│ │Announ.│ │  Indicator │ │  Indicator │
 │  visual  │ │ ARIA  │ │   visual   │ │   visual   │
 └──────────┘ └───────┘ └────────────┘ └────────────┘
  ALL actions  ALL      volume/mute     seek only
               actions  only
```

Each indicator subscribes independently to the gesture/hotkey coordinators, filters for its relevant actions, derives display state via the shared [`status.ts`](#derivation) module, and runs its own per-element transition + auto-close timer. Visual indicators also share a small per-container visibility coordinator so only one visual surface is open at a time. `StatusAnnouncer` remains independent because it is not a visual surface.

## Labels

StatusIndicator and StatusAnnouncer share a **single `label` string**. The indicator renders it visually; the announcer reads it for screen readers.

Volume is the only action with a dynamic component. `label` is `"Volume"` (or `"Muted"` when muted) and `value` is always a percentage (e.g. `"0%"`, `"50%"`). The indicator renders only `value` (the icon supplies the rest); the announcer reads `label + " " + value`, or just `"Muted"`.

| Action | Status | Label | Value |
|---|---|---|---|
| `togglePaused` (→ paused) | `pause` | `"Paused"` | — |
| `togglePaused` (→ playing) | `play` | `"Playing"` | — |
| `volumeStep` / `toggleMuted` (muted) | `volume-off` | `"Muted"` | `"0%"` |
| `volumeStep` (low) | `volume-low` | `"Volume"` | `"30%"` |
| `volumeStep` (high) | `volume-high` | `"Volume"` | `"80%"` |
| `toggleSubtitles` (on) | `captions-on` | `"Captions on"` | — |
| `toggleSubtitles` (off) | `captions-off` | `"Captions off"` | — |
| `toggleFullscreen` (→ entered) | `fullscreen` | `"Fullscreen"` | — |
| `toggleFullscreen` (→ exited) | `exit-fullscreen` | `"Exit fullscreen"` | — |
| `togglePictureInPicture` (→ entered) | `pip` | `"Picture in picture"` | — |
| `togglePictureInPicture` (→ exited) | `exit-pip` | `"Exit picture in picture"` | — |
| `seekStep` / `seekToPercent` | — | — | — |

**Volume announcement.** Indicator renders `value` only (e.g. `"50%"`). Announcer reads `muted ? "Muted" : "Volume " + value`.

**Seek does not announce.** SeekIndicator is visual-only; current time updates are surfaced through normal media state, not the announcer.

## Lifecycle

Each indicator owns its own `createTransition()` (see [`packages/core/src/dom/ui/transition.ts`](../../../packages/core/src/dom/ui/transition.ts)) and an auto-close timer.

On a relevant action: open the transition, (re-)arm the timer; on timer fire, close the transition. Retriggers re-arm.

Visual indicators coordinate visibility through a per-player-container `IndicatorVisibilityCoordinator`. When `StatusIndicator`, `VolumeIndicator`, or `SeekIndicator` accepts an action, it asks the coordinator to close any other registered visual indicator before showing itself. Closing another indicator uses that indicator's normal transition lifecycle, so the previous payload remains available during `data-ending-style`. React visual indicators return `null` after exit completes; HTML visual indicators keep the authored custom element as the stable host and set `hidden` after exit completes.

This prevents overlapping visual surfaces, for example a volume island and seek bubble being visible at the same time. The coordinator does not include `StatusAnnouncer`, because announcements should still be emitted for every supported action regardless of which visual indicator is currently shown.

The auto-close delay is exposed as a `closeDelay` prop (number, ms; default `INDICATOR_CLOSE_DELAY = 800`) — matches Tooltip/Popover's prop-driven timing convention.

Replay on retrigger is a CSS concern: CSS transitions re-interpolate naturally; for keyframe-based entries, toggle `display: none` and use `@starting-style`.

## Action Source

Both `GestureCoordinator` and `HotkeyCoordinator` expose a `subscribe(callback)` method. The callback fires for every activated binding/key with a strongly-typed event:

```ts
type InputAction = GestureActionName | HotkeyActionName;

interface InputActionEvent {
  action: InputAction;
  source: 'gesture' | 'hotkey';
  event: PointerEvent | KeyboardEvent;
}

interface InputCoordinator {
  subscribe(callback: (event: InputActionEvent) => void): () => void;
}
```

`subscribe()` is an additional broadcast channel — bindings still dispatch their own `onActivate` as before.

**Order.** Subscriber callbacks run **before** `onActivate` (hotkeys) or the wrapped gesture `binding.onActivate`. Input-feedback derivation therefore reads the player **`MediaSnapshot` before the action is applied**. Toggle-style rows in [`status.ts`](../../../packages/core/src/core/ui/input-feedback/status.ts) express the **next** UI state from that pre-action snapshot (e.g. `paused → !paused`). Volume stepping prediction mirrors [`volumeFeature.setVolume`](../../../packages/core/src/dom/store/features/volume.ts): mute clears when the clamped volume after the step is greater than zero.

**Isolation.** Each subscriber invocation is wrapped in `try/catch` so one throwing observer cannot prevent media handlers from running.

Each indicator subscribes to both coordinators on connect, filters by `action`, and unsubscribes on disconnect:

- StatusIndicator / StatusAnnouncer: all actions in the labels table
- VolumeIndicator: `volumeStep`, `toggleMuted`
- SeekIndicator: `seekStep`, `seekToPercent`

Preset skins use multiple filtered `StatusIndicator` instances to keep each visual surface focused:

- Top status island: `toggleSubtitles`, `toggleFullscreen`, `togglePictureInPicture`
- Center status bubble: `togglePaused`

Fullscreen and picture-in-picture feedback intentionally use the top status island instead of the center bubble so enter/exit actions feel like mode/status changes alongside captions, while play/pause remains the only centered status confirmation.

## Derivation

A pure module — [`status.ts`](../../../packages/core/src/core/ui/input-feedback/status.ts) — is the single source of truth for label/value/status rows used by StatusIndicator, StatusAnnouncer, and shared volume math.

Exports relevant to input feedback:

```ts
export function deriveStatus(
  event: InputActionEvent,
  snapshot: MediaSnapshot,
  labels?: InputIndicatorLabels
): StatusDetails | null;

export function deriveAnnouncerLabel(
  event: InputActionEvent,
  snapshot: MediaSnapshot,
  labels?: InputIndicatorLabels
): string | null;

/** Predicted mute/volume after `toggleMuted` / `volumeStep`; aligns with `volumeFeature.setVolume`. */
export function predictVolumeActionOutcome(
  event: InputActionEvent,
  snapshot: MediaSnapshot
): VolumeActionPrediction;

/** Shared by deriveStatus (volume branches) and VolumeIndicatorCore — optional cached prediction avoids duplicate work. */
export function deriveVolumeStatus(
  event: InputActionEvent,
  snapshot: MediaSnapshot,
  labels?: InputIndicatorLabels,
  cachedPrediction?: VolumeActionPrediction
): StatusDetails;
```

Seek overlays use `getSeekDirection`, `formatCurrentTime`, etc. Boundary shake (volume floor/ceiling) uses the same prediction as `deriveVolumeStatus` but min/max flags live on `VolumeIndicatorCore`, not in this module.

## 1. StatusIndicator

**Purely visual action confirmer.** No ARIA — StatusAnnouncer handles screen readers.

### Responsibilities

- Visual flash: icon + optional label for all actions
- No ARIA role — purely presentational

### State

```ts
type IndicatorStatus =
  | 'pause'
  | 'play'
  | 'volume-off'
  | 'volume-low'
  | 'volume-high'
  | 'captions-on'
  | 'captions-off'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'pip'
  | 'exit-pip';

interface StatusIndicatorState {
  open: boolean;
  status: IndicatorStatus | null;
  label: string | null;   // static text, e.g. "Paused", "Captions on", "Fullscreen"
  value: string | null;   // dynamic value only, e.g. "50%" for volume
}
```

### Data Attributes

```
data-open             — visible
data-status           — "pause", "play", "volume-high", etc.
data-starting-style   — entry transition
data-ending-style     — exit transition
```

### Compound: Root + Value

```html
<media-status-indicator>
  <svg class="media-icon--play">...</svg>
  <svg class="media-icon--pause">...</svg>
  ...
  <media-status-indicator-value></media-status-indicator-value>
</media-status-indicator>
```

```tsx
import { StatusIndicator } from '@videojs/react';

<StatusIndicator.Root>
  <PlayIcon />
  <PauseIcon />
  {/* ... */}
  <StatusIndicator.Value />
</StatusIndicator.Root>
```

### Props

- `closeDelay?: number` — auto-close delay in ms. Default `800`.

### Triggering

- Responds to ALL actions
- Maps action + media snapshot → `IndicatorStatus` + label

## 2. StatusAnnouncer

**Purely ARIA — visually hidden screen reader announcements.**

### Responsibilities

- `role="status"` for implicit polite live-region semantics
- Sets `aria-label` to current announcement text
- Always mounted, with no transitions, animations, or skin classes
- No visual output and no text content
- Announces ALL actions for screen readers

### State

```ts
interface StatusAnnouncerState {
  label: string | null;  // shared with StatusIndicator; for volume, composed as "Volume <value>" or "Muted"
}
```

### HTML

```html
<media-status-announcer></media-status-announcer>
```

```tsx
import { StatusAnnouncer } from '@videojs/react';

<StatusAnnouncer />
```

- `role="status"` (implicit `aria-live="polite"`)
- `aria-label` set/cleared to announce
- Presets render the announcer outside the visual feedback overlay
- No text content — announcements use `aria-label` only

### Props

- `closeDelay?: number` — auto-close delay in ms. Default `800`.

### Triggering

- Responds to ALL actions
- Maps action + media snapshot → `aria-label` string

## 3. VolumeIndicator

**Readonly volume display — rich visual feedback for volume actions.**

### Responsibilities

- Progress fill via CSS variable (`--media-volume-fill`)
- Icon switching (off/low/high) via data attributes
- Percentage text
- Boundary data attrs (`data-min`/`data-max`) for shake animation at floor/ceiling
- No ARIA role (StatusAnnouncer handles screen readers)

### How it differs from VolumeSlider

| | VolumeSlider | VolumeIndicator |
|---|---|---|
| Interactive | Yes (drag, click, keyboard) | No (`pointer-events: none`) |
| Trigger | User focuses/interacts | Gesture/hotkey fires |
| Lifetime | Persistent in controls | Brief flash, auto-dismiss |
| ARIA role | `slider` | None |
| Thumb | Yes | No |

### State

```ts
interface VolumeIndicatorState {
  open: boolean;
  level: 'off' | 'low' | 'high' | null;
  label: string | null;      // dynamic value only, e.g. "0%", "50%"
  min: boolean;              // at volume floor
  max: boolean;              // at volume ceiling
}
```

### Data Attributes

```
data-open             — visible
data-level            — "off", "low", "high"
data-min              — at volume floor (shake animation)
data-max              — at volume ceiling (shake animation)
data-starting-style   — entry transition
data-ending-style     — exit transition
```

CSS variable: `--media-volume-fill` for gradient fill percentage.

### Compound: Root + Value

```html
<media-volume-indicator>
  <media-volume-indicator-fill>
    <svg class="media-icon--volume-high">...</svg>
    <svg class="media-icon--volume-low">...</svg>
    <svg class="media-icon--volume-off">...</svg>
    <media-volume-indicator-value></media-volume-indicator-value>
  </media-volume-indicator-fill>
</media-volume-indicator>
```

```tsx
import { VolumeIndicator } from '@videojs/react';

<VolumeIndicator.Root>
  <VolumeIndicator.Fill>
    <VolumeHighIcon />
    <VolumeLowIcon />
    <VolumeOffIcon />
    <VolumeIndicator.Value />
  </VolumeIndicator.Fill>
</VolumeIndicator.Root>
```

### Props

- `closeDelay?: number` — auto-close delay in ms. Default `800`.

### Triggering

- Filters for `volumeStep`, `toggleMuted` only

## 4. SeekIndicator

**Accumulating directional seek feedback.**

### Responsibilities

- Rapid-tap accumulation (count + total seek seconds)
- Forward/backward direction with slide-in animations
- Seek clamping (total can't exceed seekable range)
- No ARIA role (StatusAnnouncer handles screen readers)

### State

```ts
interface SeekIndicatorState {
  open: boolean;
  direction: 'forward' | 'backward' | null;
  count: number;
  seekTotal: number;
  label: string | null;  // "30s"
}
```

Accumulator (`count`, `seekTotal`) is local to SeekIndicator. Reset on close.

### Data Attributes

```
data-open             — visible
data-direction        — "forward", "backward"
data-starting-style   — entry transition
data-ending-style     — exit transition
```

### Compound: Root + Value

```html
<media-seek-indicator>
  <svg class="media-icon--seek">...</svg>
  <media-seek-indicator-value></media-seek-indicator-value>
</media-seek-indicator>
```

```tsx
import { SeekIndicator } from '@videojs/react';

<SeekIndicator.Root>
  <SeekIcon />
  <SeekIndicator.Value />
</SeekIndicator.Root>
```

### Props

- `closeDelay?: number` — auto-close delay in ms. Default `800`.

### Triggering

- Filters for `seekStep`, `seekToPercent` only
