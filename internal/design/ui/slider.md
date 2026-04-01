---
status: implemented
date: 2026-02-09
---

# Slider

Compound, headless slider components for media controls — seek, volume, and future use cases.

## Problem

Media players need sliders for two core interactions:

1. **Time seek** — scrub through video, see buffered range, preview time at pointer
2. **Volume** — adjust volume level, often vertical

Both share mechanics (drag, keyboard, pointer tracking) but differ in what they control and what they display. A time slider needs buffered progress, formatted time values, and thumbnail previews. A volume slider just needs a fill bar.

Requirements:

- Compound and composable — users assemble parts, omit what they don't need
- Headless — no baked-in styles, CSS custom properties for positioning
- Accessible — `role="slider"`, full keyboard support, `aria-valuetext`
- Treeshakeable — domain sliders (time, volume) import only what they use
- Cross-platform — same core logic drives React components and HTML custom elements

## Anatomy

### React

```tsx
import { TimeSlider } from '@videojs/react';

<TimeSlider.Root>
  <TimeSlider.Track>
    <TimeSlider.Buffer />
    <TimeSlider.Fill />
  </TimeSlider.Track>
  <TimeSlider.Thumb />
  <TimeSlider.Preview>
    <TimeSlider.Value type="pointer" />
  </TimeSlider.Preview>
</TimeSlider.Root>
```

```tsx
import { VolumeSlider } from '@videojs/react';

<VolumeSlider.Root>
  <VolumeSlider.Track>
    <VolumeSlider.Fill />
  </VolumeSlider.Track>
  <VolumeSlider.Thumb />
</VolumeSlider.Root>
```

### HTML

```html
<media-time-slider>
  <media-slider-track>
    <media-slider-buffer></media-slider-buffer>
    <media-slider-fill></media-slider-fill>
  </media-slider-track>
  <media-slider-thumb></media-slider-thumb>
  <media-slider-preview>
    <media-slider-value type="pointer"></media-slider-value>
  </media-slider-preview>
</media-time-slider>
```

```html
<media-volume-slider orientation="vertical">
  <media-slider-track>
    <media-slider-fill></media-slider-fill>
  </media-slider-track>
  <media-slider-thumb></media-slider-thumb>
</media-volume-slider>
```

## CSS Custom Properties

Sliders expose continuous values as CSS custom properties on the root element. Users style parts using these — no inline styles are applied.

| Property | Example | Description |
| -------- | ------- | ----------- |
| `--media-slider-fill` | `45.000%` | Current value as percentage of range |
| `--media-slider-pointer` | `62.500%` | Pointer position as percentage of track |
| `--media-slider-buffer` | `78.000%` | Buffered range as percentage (set by domain roots that have a buffer concept) |

## Data Attributes

State is exposed through data attributes for CSS targeting. Applied to the root element **and all children** (Track, Fill, Buffer, Thumb, Preview, Value).

| Attribute | Values | When |
| --------- | ------ | ---- |
| `data-dragging` | present/absent | User is dragging the slider |
| `data-pointing` | present/absent | Pointer is over the slider |
| `data-interactive` | present/absent | Hovering, focused, or dragging |
| `data-orientation` | `horizontal` / `vertical` | Always present |
| `data-disabled` | present/absent | Slider is disabled |

Time slider adds:

| Attribute | Values | When |
| --------- | ------ | ---- |
| `data-seeking` | present/absent | Media is seeking |

## Keyboard

Keyboard events are handled by the **Thumb** element (the focusable `role="slider"` element). Defaults match YouTube's seek behavior. All step values are customizable via `step` and `largeStep` props on Root. `Shift+Arrow` is an ergonomic shortcut for `Page Up/Down` — same step size.

| Key | Time Slider | Volume Slider |
| --- | ----------- | ------------- |
| `ArrowRight` / `ArrowUp` | Seek forward 5 seconds | Increase volume 5% |
| `ArrowLeft` / `ArrowDown` | Seek backward 5 seconds | Decrease volume 5% |
| `Shift + Arrow` | Seek forward/backward 10 seconds | Increase/decrease volume 10% |
| `PageUp` / `PageDown` | Seek forward/backward 10 seconds | Increase/decrease volume 10% |
| `Home` / `End` | Seek to beginning / end | Set to minimum / maximum |
| `0`–`9` | Jump to 0%–90% of duration | Jump to 0%–90% of range |

## Accessibility

The **Thumb** element carries `role="slider"` and is the keyboard focus target. Root handles pointer events (click-to-seek on track area). This follows the [WAI-ARIA Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and the [Media Seek Slider Example](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/).

### Thumb Is Always Present

Users who want a "thumbless" visual slider hide it with CSS — the element remains focusable and announced by screen readers. Without Thumb, there's no element to receive focus or announce the slider to assistive technology.

### No Hidden `<input type="range">`

Media player sliders are never form fields. Time seek and volume control don't participate in form submission. `role="slider"` with proper ARIA attributes is the correct semantic. If a generic `Slider.Root` form use case emerges later, hidden input support can be added without touching domain sliders.

### Thumb Alignment: Center and Edge Modes

`thumbAlignment` prop on Root: `'center'` (default) or `'edge'`.

- **Center** — Thumb center aligns with track edge at min/max. Half the thumb visually overflows at 0%/100%. Standard media player visual.
- **Edge** — Thumb stays fully within the track. Uses `ResizeObserver` on Thumb to measure size and compute adjusted `--media-slider-fill`.

### Domain ARIA Labels

Domain cores set `aria-label` and `aria-valuetext`. The `label` prop allows customization and localization.

**Time slider `aria-valuetext`** uses human-readable phrases from `formatTimeAsPhrase()`. On init/focus: `"{currentTime} of {duration}"`. During changes: `"{currentTime}"` only — omitting duration reduces screen reader verbosity per [APG seek slider guidance](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/#accessibilityfeatures).

**Volume slider `aria-valuetext`** when muted: `"{volume} percent, muted"`. `aria-valuenow` reflects the actual underlying volume (not 0), so users know what they'll hear when unmuting.

### `aria-live="off"` on Slider Value

`Slider.Value` renders `<output>` with `aria-live="off"`. During drag, values change continuously — `aria-live="polite"` would queue dozens of announcements per second. Thumb already provides `aria-valuenow`/`aria-valuetext` on the focusable element.

## Prior Art

### Media Chrome

MC wraps a native `<input type="range">` — browser handles fill/thumb positioning internally. CSS vars are **theming inputs** (`--media-range-track-height`), not position outputs. Fundamentally different from our compound approach where CSS vars are **position outputs**. MC propagates full media state as attributes on every component.

### Vidstack

**Adopted:** Shift+Arrow / numeric keys, IntersectionObserver visibility optimization, CSS containment (`contain: layout style`), controls auto-hide pause during drag, `autocomplete="off"`, seek request throttling (100ms default).

**Worth considering (future):** `pauseWhileDragging` (belongs at store level as `playback.hold()` primitive), chapters (slider concern in both MC and Vidstack), swipe gesture on video provider for touch seek.

## Future Parts

- `Thumbnail` — standalone component for rendering preview images from VTT sprite sheets. Usable inside `Slider.Preview` or independently.
- `ChapterTitle` — chapter name display inside `Slider.Preview`.
- `Slider.Markers` — tick marks on the track (chapter markers, ad breaks).

## Open Questions

### Vertical Volume Slider Default Orientation

Should `VolumeSlider.Root` default to `orientation="horizontal"` or `"vertical"`? Current: `"horizontal"` (matching base slider default). Many modern players use horizontal, though vertical is traditional.
