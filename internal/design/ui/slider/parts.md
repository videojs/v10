# Parts

Full API for every compound part across generic, time, and volume sliders.

## Generic Slider Parts

These parts are shared across all slider types. In React, they're accessed via `Slider.*`. In HTML, they're `<media-slider-*>` elements.

---

### Root

Container element. Owns slider state, handles pointer events (click-to-seek on track area, drag), provides context to children (CSS custom properties, data attributes, value formatting, ARIA attrs for Thumb, keyboard step values).

Not used directly — use `TimeSlider.Root` or `VolumeSlider.Root` instead. Exposed for building custom slider types.

#### React

```tsx
import { Slider } from '@videojs/react';

<Slider.Root
  value={50}
  onValueChange={(value) => {}}
  onValueCommit={(value) => {}}
>
  {/* children */}
</Slider.Root>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `value` | `number` | — | Controlled value. |
| `defaultValue` | `number` | `0` | Initial value (uncontrolled). |
| `min` | `number` | `0` | Minimum value. |
| `max` | `number` | `100` | Maximum value. |
| `step` | `number` | `1` | Step increment for arrow keys. Also controls value snap granularity for generic slider. Domain sliders handle snap precision internally. |
| `largeStep` | `number` | `10` | Step increment for Shift+Arrow and Page Up/Down. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction. |
| `disabled` | `boolean` | `false` | Disables all interaction. |
| `thumbAlignment` | `'center' \| 'edge'` | `'center'` | How the thumb aligns at min/max. `center`: thumb center at track edge (may overflow). `edge`: thumb stays within track bounds (uses `ResizeObserver`). See [architecture.md](architecture.md#thumb-alignment). |
| `render` | `RenderProp<SliderState>` | — | Custom render element. |

#### Callbacks

| Callback | Signature | Description |
| -------- | --------- | ----------- |
| `onValueChange` | `(value: number) => void` | Fired on every value change (pointer drag, keyboard step). Updates visual state. |
| `onValueCommit` | `(value: number) => void` | Fired when user completes a gesture (pointer up, each keyboard step). Commits the value. |
| `onDragStart` | `() => void` | Fired when intentional drag begins (after drag threshold). |
| `onDragEnd` | `() => void` | Fired when drag ends. |

For keyboard input, both `onValueChange` and `onValueCommit` fire on each step — each keypress is a complete gesture.

Root has **no** ARIA role or attributes — those live on Thumb. See [Thumb](#thumb).

#### State

| Property | Type | Description |
| -------- | ---- | ----------- |
| `value` | `number` | Current value. |
| `fillPercent` | `number` | Value as percentage (0-100). |
| `pointerPercent` | `number` | Pointer position as percentage (0-100). |
| `dragging` | `boolean` | User is dragging. |
| `pointing` | `boolean` | Pointer is over the slider. |
| `interactive` | `boolean` | Hovering, focused, or dragging. |
| `orientation` | `'horizontal' \| 'vertical'` | Layout direction. |
| `disabled` | `boolean` | Slider is disabled. |
| `thumbAlignment` | `'center' \| 'edge'` | Thumb alignment mode. |

#### Data Attributes

Defined in `SliderDataAttrs` (`slider-data-attrs.ts`). Set on Root **and inherited by all children** (Track, Fill, Buffer, Thumb, Preview, Value).

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-dragging` | present/absent | User is dragging. |
| `data-pointing` | present/absent | Pointer is over the slider. |
| `data-interactive` | present/absent | Hovering, focused, or dragging. |
| `data-orientation` | `horizontal` / `vertical` | Layout direction. |
| `data-disabled` | present/absent | Slider is disabled. |

This enables element-level CSS selectors like `media-slider-thumb[data-dragging]` and direct Tailwind attrs like `data-[dragging]:scale-120`, without requiring ancestor selectors. See [decisions.md](decisions.md#children-inherit-all-data-attributes).

#### CSS Custom Properties (output)

Defined in `SliderCSSVars` (`slider-css-vars.ts`):

| Property | Description |
| -------- | ----------- |
| `--media-slider-fill` | Current value as percentage of range. |
| `--media-slider-pointer` | Pointer position as percentage of track. |
| `--media-slider-buffer` | Buffered range as percentage. Set by domain roots that have a buffer concept (e.g., TimeSlider). |

#### Events (HTML)

Generic `<media-slider>` dispatches custom DOM events. All events bubble.

| Event | Detail | Fires when |
| ----- | ------ | ---------- |
| `value-change` | `{ value: number }` | Every value change (drag, keyboard). |
| `value-commit` | `{ value: number }` | Gesture complete (pointerup, keyboard step). |
| `drag-start` | — | Intentional drag begins (after threshold). |
| `drag-end` | — | Drag ends. |

See [architecture.md — Event Interfaces](architecture.md#event-interfaces-html) for TypeScript types.

#### Renders

React: `<div>` with CSS custom properties set via `style` and pointer event handlers.
HTML: `<media-slider>` custom element. Dispatches custom DOM events for callbacks.

---

### Track

Visual track element. Purely structural — a container for Fill and Buffer.

#### React

```tsx
<Slider.Track>
  <Slider.Fill />
</Slider.Track>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<SliderState>` | — | Custom render element. |

#### Data Attributes

Inherits all [data attributes from Root](#data-attributes).

#### Renders

React: `<div>`.
HTML: `<media-slider-track>`.

---

### Fill

Filled portion of the track. Represents the current value.

#### React

```tsx
<Slider.Fill />
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<SliderState>` | — | Custom render element. |

#### Data Attributes

Inherits all [data attributes from Root](#data-attributes).

#### Styling

```css
.slider-fill {
  width: var(--media-slider-fill, 0%);
  height: 100%;
  background: white;
}
```

#### Renders

React: `<div>`.
HTML: `<media-slider-fill>`.

---

### Buffer

Buffered/loaded range indicator. Sits inside Track alongside Fill. Only visually meaningful when the Root provides `--media-slider-buffer` (e.g., `TimeSlider.Root` sets it from buffered time ranges). If the Root doesn't set the var, Buffer renders at 0%.

#### React

```tsx
<Slider.Buffer />
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<SliderState>` | — | Custom render element. |

#### Data Attributes

Inherits all [data attributes from Root](#data-attributes).

#### Styling

```css
.slider-buffer {
  width: var(--media-slider-buffer, 0%);
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
}
```

#### Renders

React: `<div>`.
HTML: `<media-slider-buffer>`.

---

### Thumb

Focusable slider handle. Carries `role="slider"`, `tabindex="0"`, all ARIA attributes, and keyboard event handling. Per the [WAI-ARIA Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and the [Media Seek Slider Example](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/), the thumb is the element that represents the slider to assistive technology.

**Always present in the DOM.** Users who want a "thumbless" visual slider hide it with CSS — the element remains focusable and announced by screen readers.

#### React

```tsx
<Slider.Thumb />
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<SliderState>` | — | Custom render element. |

#### ARIA (automatic)

Set by `SliderCore.getAttrs()`. Domain cores extend via `override getAttrs()` with `aria-label` and `aria-valuetext`.

| Attribute | Source |
| --------- | ------ |
| `role` | `"slider"` |
| `tabIndex` | `0` |
| `aria-valuemin` | From Root's `min` prop. |
| `aria-valuemax` | From Root's `max` prop. |
| `aria-valuenow` | Current value. |
| `aria-orientation` | From Root's `orientation` prop. |
| `aria-disabled` | Present when disabled. |
| `aria-label` | Set by domain root (e.g., `"Seek"`, `"Volume"`). |
| `aria-valuetext` | Set by domain root (e.g., `"2 minutes, 30 seconds of 10 minutes"`). |

#### Keyboard

Handled via `createSlider().thumbProps.onKeyDown`. Step values come from Root's `step` and `largeStep` props via context.

| Key | Action |
| --- | ------ |
| `ArrowRight` / `ArrowUp` | Increase by `step` |
| `ArrowLeft` / `ArrowDown` | Decrease by `step` |
| `Shift + Arrow` | Increase/decrease by `largeStep` |
| `PageUp` | Increase by `largeStep` |
| `PageDown` | Decrease by `largeStep` |
| `Home` | Set to minimum |
| `End` | Set to maximum |
| `0`–`9` | Jump to 0%–90% of range |

Each keypress fires both `onValueChange` and `onValueCommit`. Keyboard input always commits immediately — no "keyboard drag" concept.

#### Data Attributes

Inherits all [data attributes from Root](#data-attributes).

#### Styling

```css
.slider-thumb {
  position: absolute;
  left: var(--media-slider-fill, 0%);
  transform: translateX(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
}

/* Visually hidden but still focusable and announced */
.slider-thumb-hidden {
  position: absolute;
  left: var(--media-slider-fill, 0%);
  width: 0;
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
```

#### Renders

React: `<div>` with `role="slider"`, `tabIndex={0}`, `autocomplete="off"`, ARIA attributes, and `onKeyDown`.
HTML: `<media-slider-thumb>` with `role="slider"`, `tabindex="0"`, `autocomplete="off"`, ARIA attributes, and keyboard handler.

---

### Preview

Positioning container for preview content (time values, thumbnails, chapter titles). Tracks the pointer location. Typically shown only when `interactive` is true.

Preview is a **dumb positioning container** — it doesn't render thumbnails or fetch data. Thumbnail rendering is a separate standalone component (future work) that can be used inside Preview or independently elsewhere (poster area, video gallery, etc.). See [decisions.md](decisions.md#preview-as-positioning-container-thumbnail-is-separate).

#### React

```tsx
<Slider.Preview>
  <Slider.Value type="pointer" />
</Slider.Preview>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<SliderState>` | — | Custom render element. |

Children are rendered as-is.

#### Data Attributes

Inherits all [data attributes from Root](#data-attributes).

#### Styling

```css
.slider-preview {
  position: absolute;
  bottom: 100%;
  left: var(--media-slider-pointer, 0%);
  transform: translateX(-50%);
  pointer-events: none;
}
```

Visibility is the user's responsibility:

```css
media-slider-preview[data-interactive] {
  display: block;
}
media-slider-preview {
  display: none;
}
```

#### Renders

React: `<div>`.
HTML: `<media-slider-preview>`.

---

### Value

Displays a formatted slider value. Renders an `<output>` element.

The default formatter is `String()`. Domain roots provide a context-specific formatter — `TimeSlider.Root` provides time formatting (`1:30`), `VolumeSlider.Root` provides percentage formatting (`75%`). Users can override via the `format` prop.

#### React

```tsx
<Slider.Value type="current" />
<Slider.Value type="pointer" />
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `type` | `'current' \| 'pointer'` | `'current'` | Which value to display. |
| `format` | `(value: number) => string` | Context default or `String` | Custom value formatter. |
| `render` | `RenderProp<SliderValueState>` | — | Custom render element. |

#### Data Attributes

Inherits all [data attributes from Root](#data-attributes).

#### State (`SliderValueState`)

| Property | Type | Description |
| -------- | ---- | ----------- |
| `type` | `'current' \| 'pointer'` | Which value is displayed. |
| `value` | `number` | The numeric value. |
| `text` | `string` | Formatted display text. |

#### Accessibility

The `<output>` element renders with `aria-live="off"` by default. This prevents screen readers from announcing every value change during drag (which would produce constant announcements during scrubbing). The Thumb element already provides `aria-valuenow` and `aria-valuetext` for assistive technology. Users can override to `aria-live="polite"` if needed. See [decisions.md](decisions.md#aria-liveoff-on-value).

#### Renders

React: `<output>` with `aria-live="off"`.
HTML: `<media-slider-value>` with `type` attribute and `aria-live="off"`.

---

## Domain Slider Roots

Domain sliders only customize Root. All other parts (Track, Fill, Buffer, Thumb, Preview, Value) are generic `Slider.*` parts re-exported under the domain namespace. The Root connects to the media store, provides context that aligns children (CSS custom properties, data attributes, value formatting), and sets domain-specific ARIA.

---

### TimeSlider.Root

Connects to the media store via `selectTime`, `selectBuffer`, and `selectPlayback`. Provides time formatting context to `Slider.Value` children. Sets `--media-slider-buffer` from buffered ranges.

#### React

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

#### HTML

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

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `label` | `string` | `'Seek'` | Accessible label for the slider. Sets `aria-label` on Thumb. |
| `step` | `number` | `1` | Arrow key step in seconds. Drag uses raw precision (no step snapping) for smooth scrubbing. |
| `largeStep` | `number` | `10` | Shift+Arrow / Page Up/Down step in seconds. |
| `seekThrottle` | `number` | `100` | Trailing-edge throttle (ms) for seek requests during drag. `0` disables throttling. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `thumbAlignment` | `'center' \| 'edge'` | `'center'` | How the thumb aligns at min/max. See [Slider.Root `thumbAlignment`](#props). |
| `render` | `RenderProp<TimeSliderState>` | — | Custom render element. |

`orientation` is not exposed — time sliders are always horizontal. `min` and `max` are managed internally (`min=0`, `max=duration`).

| Callback | Signature | Description |
| -------- | --------- | ----------- |
| `onDragStart` | `() => void` | Fired when intentional drag begins. |
| `onDragEnd` | `() => void` | Fired when drag ends. |

No `value` / `onValueChange` — the root manages value internally from the store.

#### State (extends SliderState)

| Property | Type | Description |
| -------- | ---- | ----------- |
| `currentTime` | `number` | Playback position in seconds. |
| `duration` | `number` | Total duration in seconds. |
| `seeking` | `boolean` | Media is seeking. |
| `bufferPercent` | `number` | Buffered end as percentage. |

#### Data Attributes (extends Slider)

Defined in `TimeSliderDataAttrs` (`time-slider-data-attrs.ts`), extends `SliderDataAttrs`:

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-seeking` | present/absent | Media is seeking. |

Inherited by all children (including `data-seeking`).

#### Context Provided to Children

- **CSS vars:** Sets `--media-slider-buffer` from buffered ranges (in addition to base `--media-slider-fill` and `--media-slider-pointer`).
- **Value formatting:** Provides time formatter (`formatTime`) to `Slider.Value` children — `type="current"` shows formatted current time (`1:30`), `type="pointer"` shows formatted pointer time.
- **Data attributes:** All slider data attributes + `data-seeking` are propagated to children.
- **ARIA for Thumb:** Provides domain-specific ARIA attrs to `Slider.Thumb` via context.
- **Keyboard step values:** `step` defaults to `1` (second), `largeStep` defaults to `10` (seconds).

#### ARIA (on Thumb)

These attributes are provided by Root to the Thumb element via context:

| Attribute | Value |
| --------- | ----- |
| `aria-label` | From `label` prop (default `"Seek"`). |
| `aria-valuemin` | `0` |
| `aria-valuemax` | Duration in seconds. |
| `aria-valuenow` | Current time in seconds. |
| `aria-valuetext` | `"2 minutes, 30 seconds of 10 minutes"` (on init/focus) or `"2 minutes, 30 seconds"` (during changes). See [decisions.md](decisions.md#time-slider-aria-valuetext-format). |

#### Behavior

- While idle: `value` = `currentTime`. Fill tracks playback.
- While dragging: `value` = drag position. Seeks during drag, throttled by `seekThrottle`. Final seek on drag end.
- On keyboard commit: calls `time.seek(seconds)` immediately.
- Controls auto-hide: `onDragStart`/`onDragEnd` callbacks enable the controls feature to pause auto-hide during scrub.

#### Events (HTML)

`<media-time-slider>` dispatches drag events only. All events bubble.

| Event | Detail | Fires when |
| ----- | ------ | ---------- |
| `drag-start` | — | Intentional drag begins. |
| `drag-end` | — | Drag ends. |

No `value-change` or `value-commit` events — value is managed from the store.

#### Renders

React: Renders `Slider.Root` with pre-configured props and time formatting context.
HTML: `<media-time-slider>` custom element.

---

### VolumeSlider.Root

Connects to the media store via `selectVolume`. Provides percentage formatting context to `Slider.Value` children.

#### React

```tsx
import { VolumeSlider } from '@videojs/react';

<VolumeSlider.Root>
  <VolumeSlider.Track>
    <VolumeSlider.Fill />
  </VolumeSlider.Track>
  <VolumeSlider.Thumb />
</VolumeSlider.Root>
```

#### HTML

```html
<media-volume-slider orientation="vertical">
  <media-slider-track>
    <media-slider-fill></media-slider-fill>
  </media-slider-track>
  <media-slider-thumb></media-slider-thumb>
</media-volume-slider>
```

#### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `label` | `string` | `'Volume'` | Accessible label for the slider. Sets `aria-label` on Thumb. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Layout direction. |
| `step` | `number` | `1` | Arrow key step as percentage (0-100). |
| `largeStep` | `number` | `10` | Shift+Arrow / Page Up/Down step as percentage. |
| `disabled` | `boolean` | `false` | Disables interaction. |
| `thumbAlignment` | `'center' \| 'edge'` | `'center'` | How the thumb aligns at min/max. See [Slider.Root `thumbAlignment`](#props). |
| `render` | `RenderProp<VolumeSliderState>` | — | Custom render element. |

`min` and `max` are managed internally (`min=0`, `max=100`).

| Callback | Signature | Description |
| -------- | --------- | ----------- |
| `onDragStart` | `() => void` | Fired when intentional drag begins. |
| `onDragEnd` | `() => void` | Fired when drag ends. |

No `value` / `onValueChange` — managed from store.

#### State (extends SliderState)

| Property | Type | Description |
| -------- | ---- | ----------- |
| `volume` | `number` | Volume level 0-1. |
| `muted` | `boolean` | Whether muted. |

#### Context Provided to Children

- **Value formatting:** Provides percentage formatter to `Slider.Value` children — displays `75%`.
- **Data attributes:** All slider data attributes are propagated to children.
- **ARIA for Thumb:** Provides domain-specific ARIA attrs to `Slider.Thumb` via context.
- **Keyboard step values:** `step` defaults to `1` (%), `largeStep` defaults to `10` (%).

#### ARIA (on Thumb)

These attributes are provided by Root to the Thumb element via context:

| Attribute | Value |
| --------- | ----- |
| `aria-label` | From `label` prop (default `"Volume"`). |
| `aria-valuemin` | `0` |
| `aria-valuemax` | `100` |
| `aria-valuenow` | Volume as 0-100 (actual volume, even when muted). |
| `aria-valuetext` | `"75 percent"` or `"75 percent, muted"` when muted. |

#### Behavior

- `VolumeSlider.Root` calls `volume.changeVolume(value / 100)` from `onValueChange` — every pointermove and keyboard step triggers an immediate volume update. `onValueCommit` is not used; volume changes are cheap and instant, so there's no need for a separate commit step or throttling.
- When muted, fill shows 0% but `aria-valuenow` shows the actual volume. `aria-valuetext` communicates both: `"75 percent, muted"`.

#### Events (HTML)

`<media-volume-slider>` dispatches drag events only. All events bubble.

| Event | Detail | Fires when |
| ----- | ------ | ---------- |
| `drag-start` | — | Intentional drag begins. |
| `drag-end` | — | Drag ends. |

No `value-change` or `value-commit` events — value is managed from the store.

#### Renders

React: Renders `Slider.Root` with pre-configured props and percentage formatting context.
HTML: `<media-volume-slider>` custom element.

---

## React Namespace Re-exports

Domain sliders re-export all generic Slider parts under their own namespace. Users only need one import:

```ts
// time-slider/index.parts.ts
export { Root } from './time-slider-root';
// Re-export all generic parts
export { Track, Fill, Buffer, Thumb, Preview, Value } from '../slider/index.parts';
```

Every part except Root is the same generic `Slider.*` component — re-exported for convenience.

| `TimeSlider.*` | Same as |
| -------------- | ------- |
| `TimeSlider.Root` | (domain-specific) |
| `TimeSlider.Track` | `Slider.Track` |
| `TimeSlider.Fill` | `Slider.Fill` |
| `TimeSlider.Buffer` | `Slider.Buffer` |
| `TimeSlider.Thumb` | `Slider.Thumb` |
| `TimeSlider.Preview` | `Slider.Preview` |
| `TimeSlider.Value` | `Slider.Value` |

| `VolumeSlider.*` | Same as |
| ----------------- | ------- |
| `VolumeSlider.Root` | (domain-specific) |
| `VolumeSlider.Track` | `Slider.Track` |
| `VolumeSlider.Fill` | `Slider.Fill` |
| `VolumeSlider.Buffer` | `Slider.Buffer` |
| `VolumeSlider.Thumb` | `Slider.Thumb` |
| `VolumeSlider.Preview` | `Slider.Preview` |
| `VolumeSlider.Value` | `Slider.Value` |

`Slider.*` is still exported for users building custom slider types (e.g., speed slider, quality slider).

---

## HTML Element Tags

### Generic (shared across all slider types)

| Element | Tag |
| ------- | --- |
| Root | `<media-slider>` |
| Track | `<media-slider-track>` |
| Fill | `<media-slider-fill>` |
| Buffer | `<media-slider-buffer>` |
| Thumb | `<media-slider-thumb>` |
| Preview | `<media-slider-preview>` |
| Value | `<media-slider-value>` |

### Domain Roots

| Element | Tag |
| ------- | --- |
| TimeSlider | `<media-time-slider>` |
| VolumeSlider | `<media-volume-slider>` |

### Registration

Registration files live in `src/define/ui/` (following the existing convention), exported as `@videojs/html/ui/*` via package.json exports. Registering a domain slider auto-registers basic structural parts (track, fill, buffer, thumb, value). Preview is registered separately — it's heavier and opt-in.

```ts
// @videojs/html/ui/time-slider
// Registers: media-time-slider + basic parts
//   (media-slider-track, media-slider-fill, media-slider-buffer,
//    media-slider-thumb, media-slider-value)

// @videojs/html/ui/volume-slider
// Registers: media-volume-slider + basic parts
//   (media-slider-track, media-slider-fill, media-slider-buffer,
//    media-slider-thumb, media-slider-value)

// @videojs/html/ui/slider-preview
// Registers: media-slider-preview (separate, opt-in)
```
