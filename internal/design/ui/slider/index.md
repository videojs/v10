---
status: draft
date: 2026-02-09
---

# Slider

Compound, headless slider components for media controls — seek, volume, and future use cases.

## Contents

| Document                           | Purpose                                          |
| ---------------------------------- | ------------------------------------------------ |
| [index.md](index.md)              | Overview, anatomy, quick start                   |
| [architecture.md](architecture.md) | Core classes, DOM interaction, file structure     |
| [parts.md](parts.md)              | All compound parts — props, state, data attributes |
| [decisions.md](decisions.md)       | Design decisions and rationale                   |

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

Generic parts are also available via `import { Slider }` for building custom slider types.

### HTML

```ts
import '@videojs/html/ui/time-slider';
import '@videojs/html/ui/volume-slider';
import '@videojs/html/ui/slider-preview'; // opt-in, separate from basic parts
```

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

## Layers

Three layers, each independently useful:

| Layer | Package | Purpose |
| ----- | ------- | ------- |
| Core | `@videojs/core` | State computation, ARIA attrs, raw percentages. Accepts split `(interaction, media)` inputs. No DOM. |
| DOM | `@videojs/core/dom` | Pointer/keyboard interaction (`createSlider`), interaction state (`createState`), CSS var formatting (`getSliderCSSVars`). |
| UI | `@videojs/react`, `@videojs/html` | Compound components and custom elements. HTML elements dispatch custom DOM events. |

See [architecture.md](architecture.md) for internals.

## CSS Custom Properties

Sliders expose continuous values as CSS custom properties on the root element. Users style parts using these — no inline styles are applied.

| Property | Example | Description |
| -------- | ------- | ----------- |
| `--media-slider-fill` | `45.000%` | Current value as percentage of range |
| `--media-slider-pointer` | `62.500%` | Pointer position as percentage of track |
| `--media-slider-buffer` | `78.000%` | Buffered range as percentage (set by domain roots that have a buffer concept) |

```css
/* Fill bar width follows the value */
media-slider-fill {
  width: var(--media-slider-fill, 0%);
}

/* Thumb position tracks the value */
media-slider-thumb {
  left: var(--media-slider-fill, 0%);
}

/* Preview follows the pointer */
media-slider-preview {
  left: var(--media-slider-pointer, 0%);
}

/* Buffered range */
media-slider-buffer {
  width: var(--media-slider-buffer, 0%);
}
```

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

```css
/* Show preview only when interactive (element-level selector — attrs inherited) */
media-slider-preview:not([data-interactive]) {
  display: none;
}

/* Disabled state */
media-time-slider[data-disabled] {
  opacity: 0.5;
  pointer-events: none;
}

/* Enlarge thumb while dragging (element-level — no ancestor selector needed) */
media-slider-thumb[data-dragging] {
  transform: scale(1.2);
}
```

## Keyboard

Keyboard events are handled by the **Thumb** element (the focusable `role="slider"` element). Defaults match YouTube's seek behavior. All step values are customizable via props.

| Key | Time Slider | Volume Slider |
| --- | ----------- | ------------- |
| `ArrowRight` / `ArrowUp` | Seek forward 5 seconds | Increase volume 5% |
| `ArrowLeft` / `ArrowDown` | Seek backward 5 seconds | Decrease volume 5% |
| `Shift + Arrow` | Seek forward/backward 10 seconds | Increase/decrease volume 10% |
| `PageUp` | Seek forward 10 seconds | Increase volume 10% |
| `PageDown` | Seek backward 10 seconds | Decrease volume 10% |
| `Home` | Seek to beginning | Set to minimum |
| `End` | Seek to end | Set to maximum |
| `0`–`9` | Jump to 0%–90% of duration | Jump to 0%–90% of range |

Default step values:
- Time slider: `step = 1` (second), `largeStep = 10` (seconds)
- Volume slider: `step = 1` (%), `largeStep = 10` (%)

Customizable via `step` and `largeStep` props on the Root.

## Accessibility

The **Thumb** element carries the slider ARIA role and is the keyboard focus target. Root handles pointer events (click-to-seek on track area). This follows the [WAI-ARIA Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and the [Media Seek Slider Example](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/).

Thumb is **always present** in the DOM for accessibility. Users who want a "thumbless" slider hide it visually with CSS — the element remains focusable and announced by screen readers.

```html
<media-time-slider>
  <!-- Root: pointer events, CSS vars, data attrs -->
  <media-slider-track>...</media-slider-track>
  <media-slider-thumb
       role="slider"
       tabindex="0"
       aria-label="Seek"
       aria-valuemin="0"
       aria-valuemax="600"
       aria-valuenow="150"
       aria-valuetext="2 minutes, 30 seconds of 10 minutes"
       aria-orientation="horizontal">
  </media-slider-thumb>
</media-time-slider>
```

Volume slider:

```html
<media-volume-slider orientation="vertical">
  <media-slider-track>...</media-slider-track>
  <media-slider-thumb
       role="slider"
       tabindex="0"
       aria-label="Volume"
       aria-valuemin="0"
       aria-valuemax="100"
       aria-valuenow="75"
       aria-valuetext="75 percent"
       aria-orientation="vertical">
  </media-slider-thumb>
</media-volume-slider>
```

`aria-valuetext` includes the maximum value on initialization and when the thumb receives focus, but not on every value change — avoids screen reader verbosity (per [APG seek slider guidance](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/#accessibilityfeatures)).

## Related Docs

- [architecture.md](architecture.md) — Core classes, file structure, data flow
- [parts.md](parts.md) — Full API for every compound part
- [decisions.md](decisions.md) — Design rationale
- [Time Display design](../time-display.md) — Related compound component
