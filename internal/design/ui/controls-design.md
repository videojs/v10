---
status: draft
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

## Quick Start

### Feature

```ts
const player = createPlayer({
  features: [controlsFeature],
});

// Read state
player.controlsVisible; // true
player.userActive;      // auto-tracked
```

### HTML

```ts
import '@videojs/html/ui/media-controls'
```

Simple (no groups):

```html
<media-controls>
  <media-play-button></media-play-button>
  <media-time-slider></media-time-slider>
  <media-mute-button></media-mute-button>
  <media-fullscreen-button></media-fullscreen-button>
</media-controls>
```

With groups (time slider top, buttons bottom):

```html
<media-controls>
  <media-controls-group>
    <media-time-slider></media-time-slider>
  </media-controls-group>
  
  <media-controls-group>
    <media-play-button></media-play-button>
    <media-mute-button></media-mute-button>
    <media-fullscreen-button></media-fullscreen-button>
  </media-controls-group>
</media-controls>
```

### React

```tsx
import { Controls } from '@videojs/react';
```

Simple (no groups):

```tsx
<Controls.Root>
  <PlayButton />
  <TimeSlider />
  <MuteButton />
  <FullscreenButton />
</Controls.Root>
```

With groups (time slider top, buttons bottom):

```tsx
<Controls.Root>
  <Controls.Group>
    <TimeSlider />
  </Controls.Group>
  
  <Controls.Group>
    <PlayButton />
    <MuteButton />
    <FullscreenButton />
  </Controls.Group>
</Controls.Root>
```

## Feature API

### State

```ts
interface ControlsSlice {
  /** Raw activity state — true if user recently interacted */
  userActive: boolean;
  
  /** Computed visibility: userActive || paused */
  controlsVisible: boolean;
}
```

Activity tracking and input type detection are handled internally by the feature.

## Component API

### `<media-controls>`

Container for player controls. Manages visibility based on feature state.

#### Data Attributes

| Attribute | Description |
|-----------|-------------|
| `[data-visible]` | Present when controls should be visible |

### `<media-controls-group>`

Visual grouping container. No special behavior — pure layout.

```html
<media-controls-group>
  <media-play-button></media-play-button>
  <media-seek-button seconds="-10"></media-seek-button>
  <media-seek-button seconds="10"></media-seek-button>
</media-controls-group>
```

## Behavior

### Activity Detection

Feature listens on the container element automatically:

| Event | Behavior |
|-------|----------|
| `pointermove` | Set active, schedule idle |
| `pointerdown` | Record timestamp (for tap detection) |
| `pointerup` | Touch: toggle visibility. Mouse: schedule idle. |
| `keyup` | Set active, schedule idle |
| `focusin` | Set active, schedule idle |
| `mouseleave` | Immediately set inactive |

### Touch Tap-to-Toggle

On touch devices, tap toggles controls visibility:

```
pointerdown → record timestamp
pointerup   → if touch && < 250ms since down:
                if controlsVisible: hide
                else: show + schedule idle
              else (drag): no toggle
```

### Visibility Computation

```ts
controlsVisible = userActive || paused
```

Where:
- `userActive` — True if interaction within idle timeout
- `paused` — From playback feature state

## Styles

Shipped CSS for common behaviors (user can override):

```css
/* Pointer events — clicks pass through controls to video */
media-controls {
  pointer-events: none;
}

media-controls-group {
  pointer-events: auto;
}

/* Controls visibility transition */
media-controls {
  transition: opacity 0.25s;
}

media-controls:not([data-visible]) {
  opacity: 0;
}
```

**Pointer events note:** Without `pointer-events: none` on controls, the overlay blocks clicks to the video. Media Chrome handles this via `::slotted()` in shadow DOM:

```css
::slotted(:not([slot=media]):not([slot=poster])) {
  pointer-events: auto;
}
```

## Accessibility

### Controls Group Role

**Decision:** Add `role="group"` only when `aria-label` or `aria-labelledby` is provided.

```html
<!-- No role (pure visual grouping) -->
<media-controls-group>
  <media-play-button></media-play-button>
</media-controls-group>

<!-- role="group" added automatically when labeled -->
<media-controls-group aria-label="Playback controls">
  <media-play-button></media-play-button>
</media-controls-group>
```

**Implementation:**

```ts
connectedCallback() {
  if (this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')) {
    this.setAttribute('role', 'group');
  }
}
```

**Alternatives:**
- Always add `role="group"` — unlabeled groups announced as "group" (confusing)

**Rationale:** An unlabeled `role="group"` provides no value to screen reader users and may be confusing. Conditional role based on label presence follows ARIA best practices.

### Controls Container Role

**Decision:** No role on `<media-controls>` container.

**Rationale:** Individual controls (buttons, sliders) are the accessible elements. The controls container is a layout wrapper, not a landmark.

**Note:** Media Chrome adds `role="region"` with `aria-label="video player"` to their **player container** (`<media-controller>`), not the control bar. This is a player container concern — the player element (`<video-player>`) should handle landmark semantics, not `<media-controls>`.

## Decisions

### Activity on Container, Not Controls

**Decision:** Track activity events on the player container, not the controls element.

**Alternatives:**
- Track on controls — simpler, but misses activity when user moves mouse over video
- Track on document — too broad, picks up unrelated interactions

**Rationale:** Container owns the full player area. Activity anywhere in the player should reset idle timer. Matches Media Chrome's approach.

### Focus Resets Timer, Doesn't Prevent Hide

**Decision:** Focus inside controls resets the idle timer but does not prevent auto-hide.

**Alternatives:**
- Focus prevents auto-hide — more accessible, but controls never hide while focused
- Configurable via attribute — more complexity

**Rationale:** Focus is treated like any other activity signal. Keeps behavior simple and predictable.

### Media Type Detection (Auto-detect)

**Decision:** Auto-detect media type from the media element.

```ts
const mediaType = target.media?.tagName === 'AUDIO' ? 'audio' 
  : target.media?.videoTracks?.length === 0 ? 'audio' 
  : 'video';
```

**Rationale:** Keep it simple. Detection from the element handles most cases. Audio-only media disables auto-hide by default.

### Pointer Events via CSS

**Decision:** Handle `pointer-events` passthrough in shipped CSS, not baked into components.

**Alternatives:**
- Bake into components — always works, but awkward for audio-only or custom layouts without groups

**Rationale:** CSS is more flexible for different layouts (with/without groups, audio-only). Default CSS targets groups, buttons, and inputs. Users can customize. Media Chrome uses a similar CSS approach with `::slotted()`.

### Cursor Hiding via CSS

**Decision:** Ship cursor hiding in default CSS, not baked into component.

**Alternatives:**
- Bake into component — always works, but harder to customize

**Rationale:** Cursor hiding is visual styling that users may want to customize or disable. CSS is more flexible and follows the cascade.

## Descoped for Alpha

Features reviewed but intentionally deferred:

### Lock API (`requestControlsLock`)

**What:** Sentinel-based API (Wake Lock pattern) for holding controls visible.

**Use case:** Menus, popovers, and other UI that need controls to stay visible while open.

**Why descoped:** Neither Media Chrome nor Vidstack expose a public lock API. They handle this internally. Can add if menu/popover use cases require it.

### `reportUserActivity()` Method

**What:** Public method to programmatically signal user activity.

**Use case:** External controls outside the container, testing, programmatic activity.

**Why descoped:** Activity is auto-tracked on container. Neither MC nor Vidstack expose this publicly. Add if external signaling needed.

### `showControls()` / `hideControls()` Methods

**What:** Imperative methods to show or hide controls.

**Why descoped:** Neither MC nor Vidstack expose these publicly. Activity tracking is sufficient for most use cases.

### `userInputType` in Public State

**What:** Expose last input type (`'mouse' | 'touch' | 'pen' | 'keyboard'`) in state.

**Why descoped:** Used internally for touch vs mouse behavior (tap-to-toggle), but neither MC nor Vidstack expose this publicly. Keep as internal implementation detail.

### CSS Variables (`--media-controls-height`, `--media-controls-width`)

**What:** CSS custom properties for controls dimensions.

**Use case:** Captions positioning above controls.

**Why descoped:** Add when captions component needs them. Neither MC nor Vidstack expose these.

### `hideOnMouseLeave` Attribute

**What:** Immediately hide controls when mouse leaves container.

**Why descoped:** Vidstack has this, but it's not essential for v1. Can add later.

### Visibility Change Event/Callback

**What:** `controlsvisibilitychange` event or `onChange` callback.

**Use case:** Analytics, syncing external UI.

**Why descoped:** Store subscriptions are sufficient for internal use. Can add DOM events later for external integrations.

### `data-input-type` on Container

**What:** Data attribute reflecting last input type.

**Why descoped:** Internal implementation detail. Not needed for CSS targeting in v1.

### Toolbar Keyboard Navigation

**What:** `role="toolbar"` with roving tabindex and arrow key navigation between controls.

**Use case:** Reduce tab stops — one Tab to enter controls, arrow keys to navigate between buttons.

**Why descoped:** Requires significant keyboard handling implementation. Groups work as visual containers for v1. Can upgrade to toolbar semantics later. See [WAI-ARIA Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

## References

- [Media Chrome `media-container.ts`](https://github.com/muxinc/media-chrome) — Activity tracking implementation
- [Vidstack Controls](https://www.vidstack.io/docs/player/components/display/controls) — Similar component API
- [WAI-ARIA group role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/group_role) — Group semantics
- [WAI-ARIA Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) — Keyboard navigation (future)
- [Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock) — Sentinel pattern (descoped but documented)
