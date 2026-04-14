---
status: implemented
date: 2025-02-05
---

# Controls Design

User activity tracking and controls visibility management for Video.js 10.

## Problem

Video players need to:

1. **Track user activity** — pointer movement, keyboard input, touch gestures
2. **Auto-hide controls** — fade out after inactivity while playing
3. **Keep controls visible** — when paused or interacting
4. **Expose visibility state** — for cursor hiding, overlays

## Solution

Split into **feature** (state management) and **component** (UI):

| Concern | Location | Responsibility |
|---------|----------|----------------|
| Activity tracking | `controlsFeature` | Pointer/keyboard events, idle timer (internal) |
| Visibility computation | `controlsFeature` | `controlsVisible = userActive \|\| paused` |
| Auto-hide timing | `controlsFeature` | Idle timer, configurable delay |
| Layout | `<media-controls-group>` | Visual grouping of controls |

### State

```ts
interface ControlsSlice {
  /** Raw activity state — true if user recently interacted */
  userActive: boolean;

  /** Computed visibility: userActive || paused */
  controlsVisible: boolean;
}
```

Activity is tracked on the **player container**, not the controls element — activity anywhere in the player should reset the idle timer. Focus inside controls resets the timer but does not prevent auto-hide; focus is treated like any other activity signal.

## Accessibility

### Controls Group Role

**Decision:** Add `role="group"` only when `aria-label` or `aria-labelledby` is provided. An unlabeled `role="group"` provides no value to screen reader users and may be confusing.

### Controls Container Role

No role on `<media-controls>` container. Individual controls (buttons, sliders) are the accessible elements. The controls container is a layout wrapper, not a landmark.

**Note:** Media Chrome adds `role="region"` with `aria-label="video player"` to their **player container** (`<media-controller>`), not the control bar. This is a player container concern.

## Descoped for Alpha

Features reviewed but intentionally deferred:

| Feature | Use case | Why deferred |
|---------|----------|-------------|
| Lock API (`requestControlsLock`) | Menus/popovers holding controls visible | Neither MC nor Vidstack expose public lock API |
| `reportUserActivity()` | External controls, testing | Activity is auto-tracked; neither MC nor Vidstack expose this |
| `showControls()` / `hideControls()` | Imperative show/hide | Activity tracking sufficient for most cases |
| `userInputType` in state | Expose `'mouse' \| 'touch' \| 'pen' \| 'keyboard'` | Used internally; keep as implementation detail |
| CSS variables (`--media-controls-height`) | Captions positioning above controls | Add when captions component needs them |
| `hideOnMouseLeave` | Immediately hide on mouse leave | Not essential for v1 |
| Visibility change event | Analytics, syncing external UI | Store subscriptions sufficient |
| Toolbar keyboard navigation | `role="toolbar"` with roving tabindex | Significant implementation; defer to post-alpha |

## References

- [Media Chrome `media-container.ts`](https://github.com/muxinc/media-chrome) — Activity tracking implementation
- [Vidstack Controls](https://www.vidstack.io/docs/player/components/display/controls) — Similar component API
- [WAI-ARIA Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) — Keyboard navigation (future)
