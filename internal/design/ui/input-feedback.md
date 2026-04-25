---
status: draft
date: 2026-04-24
---

# Input Feedback Components

## Context

Four new standalone components for showing brief visual + accessible feedback when users trigger actions via gestures or hotkeys. Replaces the monolithic `InputFeedback` overlay with focused, composable primitives.

YouTube reference: center `role="status"` element with `aria-label="Pause"`, volume island, side seek overlays.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Gesture/Hotkey Coordinators                     │
└──────────────────┬──────────────────────────────-┘
                   │
         ┌─────────▼──────────┐
         │ AnimationCoordinator│
         │  (shared lifecycle) │
         └──┬───────┬────┬──┬─┘
            │       │    │  │
  ┌─────────▼┐ ┌────▼──┐ │ ┌▼──────────┐
  │  Status  │ │Status │ │ │   Seek    │
  │ Indicator│ │Announ.│ │ │ Indicator │
  │  visual  │ │ ARIA  │ │ │  visual   │
  └──────────┘ └───────┘ │ └───────────┘
   ALL actions  ALL       │  seek only
                actions   │
              ┌───────────▼┐
              │   Volume   │
              │  Indicator │
              │   visual   │
              └────────────┘
               volume/mute only
```

A shared **AnimationCoordinator** manages the lifecycle (open/dismiss timing, generation counter) across all components. Individual components subscribe and filter for their relevant actions.

---

## Shared: AnimationCoordinator

Manages "triggered → briefly visible → auto-dismiss" for all indicators.

```ts
interface AnimationCoordinatorState {
  open: boolean;       // any indicator visible
  generation: number;  // bumps on every trigger, restarts CSS animations
}
```

```ts
class AnimationCoordinator {
  readonly state: WritableState<AnimationCoordinatorState>;
  dismissDelay: number;  // default 800ms
  show(): void;          // open=true, generation++, restart timer
  hide(): void;          // open=false, clear timer
  destroy(): void;
}
```

Each indicator component receives the coordinator and filters for its relevant actions. The coordinator ensures synchronized show/dismiss timing across all active indicators for a given gesture.

---

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
  label: string | null;   // "Paused", "50%", "Captions on"
  value: string | null;   // optional secondary value
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

### Triggering

- Responds to ALL actions
- Maps action + media snapshot → `IndicatorStatus` + label

---

## 2. StatusAnnouncer

**Purely ARIA — visually hidden screen reader announcements.**

### Responsibilities

- `role="status"`, `aria-live="polite"`, `aria-atomic="true"`
- Sets `aria-label` to current announcement text
- Visually hidden — no visual output, no text content
- Announces ALL actions for screen readers

### State

```ts
interface StatusAnnouncerState {
  label: string | null;  // "Paused", "Volume 50%", "Captions on"
}
```

### HTML

```html
<media-status-announcer></media-status-announcer>
```

- `role="status"` (implicit `aria-live="polite"`)
- `aria-label` set/cleared to announce
- Hidden with `display: contents` — no visual box, no layout impact
- No text content, no DOM manipulation tricks — just `aria-label`

### Triggering

- Responds to ALL actions
- Maps action + media snapshot → `aria-label` string

---

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
  volumeLevel: 'off' | 'low' | 'high' | null;
  label: string | null;      // "50%", "Muted"
  min: boolean;              // at volume floor
  max: boolean;              // at volume ceiling
}
```

### Data Attributes

```
data-open             — visible
data-volume-level     — "off", "low", "high"
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

### Triggering

- Filters for `volumeStep`, `toggleMuted` only

---

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

### Triggering

- Filters for `seekStep`, `seekToPercent` only
