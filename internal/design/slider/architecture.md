# Architecture

Internal structure of the slider component system.

## Overview

```
                    ┌──────────────────────────────┐
                    │       @videojs/core           │
                    │                               │
                    │  SliderCore ← generic logic   │
                    │    ├─ TimeSliderCore           │
                    │    └─ VolumeSliderCore         │
                    │  SliderDataAttrs              │
                    │  SliderCSSVars                │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │       @videojs/core/dom       │
                    │                               │
                    │  createSlider() ← interaction │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                                         │
  ┌───────────▼───────────┐             ┌───────────────▼────────────┐
  │   @videojs/react      │             │   @videojs/html            │
  │                       │             │                            │
  │  Slider.Root          │             │  <media-time-slider>       │
  │  Slider.Track/Fill    │             │  <media-volume-slider>     │
  │  Slider.Buffer        │             │  <media-slider-track>      │
  │  Slider.Thumb         │             │  <media-slider-fill>       │
  │  Slider.Preview       │             │  <media-slider-buffer>     │
  │  Slider.Value         │             │  <media-slider-thumb>      │
  │  TimeSlider.Root      │             │  <media-slider-preview>    │
  │  VolumeSlider.Root    │             │  <media-slider-value>      │
  └───────────────────────┘             └────────────────────────────┘
```

State flows top-down: Core computes state → DOM layer handles interaction → UI renders.

## SliderCore

Runtime-agnostic class. Computes slider state, ARIA attributes, and CSS custom properties from raw values.

### Interface

```ts
interface SliderProps {
  min?: number;                                // default: 0
  max?: number;                                // default: 100
  step?: number;                               // default: 1
  orientation?: 'horizontal' | 'vertical';     // default: 'horizontal'
  disabled?: boolean;                          // default: false
  keyStep?: number;                            // default: step
  keyLargeStep?: number;                       // default: keyStep * 10
}

interface SliderState {
  value: number;
  fillPercent: number;
  pointerPercent: number;
  dragging: boolean;
  pointing: boolean;
  interactive: boolean;
  orientation: 'horizontal' | 'vertical';
  disabled: boolean;
}
```

### Methods

```ts
class SliderCore {
  static readonly defaultProps: NonNullableObject<SliderProps>;

  setProps(props: SliderProps): void;

  getState(params: SliderStateParams): SliderState;

  getThumbAttrs(state: SliderState): ElementProps;
  // Returns: role, tabIndex, aria-valuemin, aria-valuemax, aria-valuenow,
  //          aria-orientation, aria-disabled
  // These go on the Thumb element (the focusable role="slider" element).

  getCSSVars(state: SliderState): Record<string, string>;
  // Returns: --media-slider-fill, --media-slider-pointer, --media-slider-buffer

  valueFromPercent(percent: number): number;
  // Clamps to [min, max], snaps to step

  percentFromValue(value: number): number;
  // Value as percentage of range
}
```

`SliderStateParams` separates the ephemeral interaction state (dragging, pointer position) from the value. This keeps `SliderCore` stateless — all state is owned by the UI layer:

```ts
interface SliderStateParams {
  value: number;
  pointerPercent: number;
  dragging: boolean;
  pointing: boolean;
  focused: boolean;
}
```

`interactive` is derived: `pointing || focused || dragging`.

### ARIA Output

`getThumbAttrs()` returns attributes for the **Thumb** element — the focusable `role="slider"` element per the [WAI-ARIA Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and the [Media Seek Slider Example](https://www.w3.org/WAI/ARIA/apg/patterns/slider/examples/slider-seek/):

```ts
{
  role: 'slider',
  tabIndex: 0,
  'aria-valuemin': 0,
  'aria-valuemax': 100,
  'aria-valuenow': 45,
  'aria-orientation': 'horizontal',
  'aria-disabled': undefined,  // omitted when not disabled
}
```

`aria-label` and `aria-valuetext` are NOT set by `SliderCore` — they're domain-specific. `TimeSliderCore` and `VolumeSliderCore` add them.

Root handles pointer events and provides context (CSS vars, data attrs) to children. Thumb carries `role="slider"`, receives keyboard focus, and owns all ARIA attributes. There is no separate Control element. Children other than Thumb (Track, Fill, Preview) are purely visual.

## Documentation Constants

Data attributes and CSS custom properties each get a `as const` object with JSDoc descriptions. The site docs builder extracts these to generate API reference tables.

### Data Attributes

Follows the existing pattern (`PlayButtonDataAttrs`, `MuteButtonDataAttributes`). One file per component, named `*-data-attrs.ts`:

```ts
// slider-data-attrs.ts
export const SliderDataAttrs = {
  /** Present while the user is dragging. */
  dragging: 'data-dragging',
  /** Present while the pointer is over the slider. */
  pointing: 'data-pointing',
  /** Present while hovering, focused, or dragging. */
  interactive: 'data-interactive',
  /** Layout direction (`horizontal` or `vertical`). */
  orientation: 'data-orientation',
  /** Present when the slider is disabled. */
  disabled: 'data-disabled',
} as const;
```

```ts
// time-slider-data-attrs.ts
export const TimeSliderDataAttrs = {
  ...SliderDataAttrs,
  /** Present while the media is seeking. */
  seeking: 'data-seeking',
} as const;
```

### CSS Custom Properties

New pattern — parallel to data attrs. One file per component, named `*-css-vars.ts`:

```ts
// slider-css-vars.ts
export const SliderCSSVars = {
  /** Current value as percentage of range. */
  fill: '--media-slider-fill',
  /** Pointer position as percentage of track. */
  pointer: '--media-slider-pointer',
  /** Buffered range as percentage. Set by domain roots that have a buffer concept. */
  buffer: '--media-slider-buffer',
} as const;
```

Both constants follow the same conventions:

- Property key is the semantic name (camelCase)
- Property value is the full attribute/property name (`data-*` or `--media-*`)
- JSDoc comment describes when/what
- Exported as `as const` for type narrowing
- Used at runtime by `getCSSVars()` and `applyStateDataAttrs()`
- Extracted at build time by the site docs builder for API reference

## TimeSliderCore

Extends `SliderCore` with media time concerns.

```ts
interface TimeSliderState extends SliderState {
  currentTime: number;
  duration: number;
  seeking: boolean;
  bufferPercent: number;
}

class TimeSliderCore extends SliderCore {
  getTimeState(params: TimeSliderStateParams): TimeSliderState;

  getTimeThumbAttrs(state: TimeSliderState): ElementProps;
  // Extends getThumbAttrs() with: aria-label="Seek",
  // aria-valuetext="2 minutes, 30 seconds of 10 minutes"

  formatValue(value: number): string;
  // Returns formatted time string (e.g., "1:30")
}
```

`TimeSliderStateParams` extends `SliderStateParams` with:

```ts
interface TimeSliderStateParams extends SliderStateParams {
  currentTime: number;
  duration: number;
  seeking: boolean;
  bufferedEnd: number;    // end of last buffered range
}
```

When not dragging, `value` = `currentTime`. When dragging, `value` = the drag position. The UI layer handles this swap.

### Time Formatting

Uses `TimeCore` (already exists in `@videojs/core`) for `aria-valuetext`. The value text follows the pattern: `"{current} of {duration}"` where each is a human-readable phrase from `formatTimeAsPhrase()`.

## VolumeSliderCore

Extends `SliderCore` with volume concerns.

```ts
interface VolumeSliderState extends SliderState {
  volume: number;
  muted: boolean;
}

class VolumeSliderCore extends SliderCore {
  getVolumeState(params: VolumeSliderStateParams): VolumeSliderState;

  getVolumeThumbAttrs(state: VolumeSliderState): ElementProps;
  // Extends getThumbAttrs() with: aria-label="Volume",
  // aria-valuetext="75 percent"
}
```

Default props override: `min=0, max=100, step=5, orientation='horizontal'`.

Volume is stored as 0-1 in the store but displayed as 0-100 in the slider. `VolumeSliderCore` handles this conversion.

## createSlider (DOM)

Factory function in `@videojs/core/dom` — parallel to `createButton()`. Returns **split props**: pointer event handlers for Root, keyboard handler for Thumb.

### Interface

```ts
interface SliderOptions {
  getOrientation: () => 'horizontal' | 'vertical';
  isDisabled: () => boolean;
  getPercent: () => number;             // current value as 0-1
  getStepPercent: () => number;         // step as fraction of range
  getLargeStepPercent: () => number;    // large step as fraction of range
  onValueChange: (percent: number) => void;
  onValueCommit: (percent: number) => void;
  onPointerMove: (percent: number) => void;
  onPointerLeave: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

interface SliderRootProps {
  onPointerDown: (event: UIPointerEvent) => void;
  onPointerMove: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
}

interface SliderThumbProps {
  onKeyDown: (event: UIKeyboardEvent) => void;
}

function createSlider(options: SliderOptions): {
  rootProps: SliderRootProps;
  thumbProps: SliderThumbProps;
};
```

Root receives pointer props (click-to-seek on track area, drag initiation). Thumb receives the keyboard handler (arrow keys, Page Up/Down, Home/End). This split reflects the DOM responsibility: Root owns the hit area, Thumb owns focus and keyboard interaction.

### Pointer Behavior

1. **pointerdown** on Root — begin drag. Add `pointermove` and `pointerup` listeners on `document` (to capture drag outside element). Call `onDragStart()`, `onValueChange(percent)`.
2. **pointermove** on document — update drag position. Call `onValueChange(percent)`.
3. **pointerup** on document — end drag. Remove document listeners. Call `onValueCommit(percent)`, `onDragEnd()`.
4. **pointermove** on Root (no drag) — call `onPointerMove(percent)` for preview positioning.
5. **pointerleave** on Root — call `onPointerLeave()`.

Percent calculation from pointer event:

```ts
function getPercentFromPointerEvent(
  event: PointerEvent,
  rect: DOMRect,
  orientation: string
): number {
  if (orientation === 'vertical') {
    return 1 - (event.clientY - rect.top) / rect.height;  // bottom = 0, top = 1
  }
  return (event.clientX - rect.left) / rect.width;  // left = 0, right = 1
}
```

### Keyboard Behavior

All via `onKeyDown` on the **Thumb** element (the focusable `role="slider"` element):

| Key | Action |
| --- | ------ |
| `ArrowRight` / `ArrowUp` | `onValueChange(current + stepPercent)` then `onValueCommit` |
| `ArrowLeft` / `ArrowDown` | `onValueChange(current - stepPercent)` then `onValueCommit` |
| `PageUp` | `onValueChange(current + largeStepPercent)` then `onValueCommit` |
| `PageDown` | `onValueChange(current - largeStepPercent)` then `onValueCommit` |
| `Home` | `onValueChange(0)` then `onValueCommit` |
| `End` | `onValueChange(1)` then `onValueCommit` |

`createSlider` does NOT know about step values or min/max — it only works in percentages (0-1). The caller converts using `SliderCore.valueFromPercent()`.

`getLargeStepPercent()` returns the large step (Page Up/Down) as a fraction of range. Defaults to `getStepPercent() * 10`. Domain sliders customize via `keyStep` and `keyLargeStep` props on Root (which provides these values to Thumb via context).

## Data Flow

### React Time Slider

```
Store ──selectTime──► TimeSlider.Root
Store ──selectBuffer─┘      │
                             │ createSlider()
                             │   rootProps → Root (pointer events)
                             │   thumbProps → Thumb (keyboard events)
                             ▼
                      pointer events on Root / keyboard on Thumb
                             │
                      onValueChange(%)
                             │
                      TimeSliderCore.valueFromPercent()
                             │
                      time.seek(seconds)
                             │
                      Store updates
```

### HTML Time Slider

```
Store ──PlayerController──► <media-time-slider>
                             (selectTime,buffer)
                             CSS vars, data attrs on Root
                             createSlider()
                               rootProps → self (pointer events)
                               thumbProps → <media-slider-thumb>
                                    │
                             <media-slider-thumb>
                               role="slider", ARIA attrs, keyboard
                                    │
                             onValueChange(%)
                                    │
                             time.seek(seconds)
```

## File Structure

### Core

```
packages/core/src/core/ui/slider/
├── slider-core.ts              # SliderCore class
├── slider-data-attrs.ts        # SliderDataAttrs constant
├── slider-css-vars.ts          # SliderCSSVars constant (fill, pointer, buffer)
├── time-slider-core.ts         # TimeSliderCore class
├── time-slider-data-attrs.ts   # TimeSliderDataAttrs constant (extends SliderDataAttrs + seeking)
├── volume-slider-core.ts       # VolumeSliderCore class
├── index.ts                    # barrel exports
└── tests/
    ├── slider-core.test.ts
    ├── time-slider-core.test.ts
    └── volume-slider-core.test.ts

packages/core/src/dom/ui/
├── slider.ts                   # createSlider() factory
├── event.ts                    # (existing) UIEvent types
└── tests/
    └── slider.test.ts
```

### React

```
packages/react/src/ui/slider/
├── index.ts                    # export * as Slider from './index.parts'
├── index.parts.ts              # export { Root, Track, Fill, Buffer, Thumb, Preview, Value }
├── slider-context.tsx          # SliderContext (state, formatting, data attrs)
├── slider-root.tsx             # Slider.Root
├── slider-track.tsx            # Slider.Track
├── slider-fill.tsx             # Slider.Fill
├── slider-buffer.tsx           # Slider.Buffer
├── slider-thumb.tsx            # Slider.Thumb
├── slider-preview.tsx          # Slider.Preview
├── slider-value.tsx            # Slider.Value
└── tests/

packages/react/src/ui/time-slider/
├── index.ts                    # export * as TimeSlider from './index.parts'
├── index.parts.ts              # export { Root } + re-export all generic parts
├── time-slider-root.tsx        # Only domain-specific part
└── tests/

packages/react/src/ui/volume-slider/
├── index.ts                    # export * as VolumeSlider from './index.parts'
├── index.parts.ts              # export { Root } + re-export all generic parts
├── volume-slider-root.tsx      # Only domain-specific part
└── tests/
```

### HTML

```
packages/html/src/ui/slider/
├── slider-track-element.ts     # <media-slider-track>
├── slider-fill-element.ts      # <media-slider-fill>
├── slider-buffer-element.ts    # <media-slider-buffer>
├── slider-thumb-element.ts     # <media-slider-thumb>
├── slider-preview-element.ts   # <media-slider-preview>
├── slider-value-element.ts     # <media-slider-value>
└── tests/

packages/html/src/ui/time-slider/
├── time-slider-element.ts      # <media-time-slider> (only domain-specific element)
└── tests/

packages/html/src/ui/volume-slider/
├── volume-slider-element.ts    # <media-volume-slider> (only domain-specific element)
└── tests/
```

## HTML Elements

Domain root elements (`TimeSliderElement`, `VolumeSliderElement`) handle pointer events via `createSlider().rootProps`, CSS custom properties, and data attributes. They provide context that aligns children — formatting for `<media-slider-value>`, ARIA attrs for `<media-slider-thumb>`, keyboard step values, and domain-specific data attributes.

`SliderThumbElement` carries `role="slider"`, `tabindex="0"`, all ARIA attributes, and the keyboard handler from `createSlider().thumbProps`. It is always present in the DOM — users hide it visually with CSS for a "thumbless" look.

Other structural elements (`SliderTrackElement`, `SliderFillElement`, `SliderBufferElement`) are pure `MediaElement` subclasses with only a `tagName`. `SliderValueElement` reads formatted text from context. `SliderPreviewElement` is registered separately (see Registration below).

### Data Attribute Inheritance

All state data attributes are applied to **both the root and every child element**. When Root updates `data-dragging`, Track, Fill, Buffer, Thumb, Preview, and Value also get `data-dragging` updated. This enables element-level CSS selectors (`media-slider-thumb[data-dragging]`) and direct Tailwind attributes (`data-[dragging]:scale-120`) without ancestor selectors.

The root element drives the updates — it computes state, then propagates data attributes to all registered children. In HTML, this happens via DOM attribute setting on child elements. In React, each child reads from slider context and applies attrs to its own element.

### CSS Custom Properties

CSS custom properties (`--media-slider-fill`, `--media-slider-pointer`, `--media-slider-buffer`) are set on the Root element only. They cascade naturally to children via CSS inheritance — no explicit propagation needed. Children reference them with `var()`.

This is different from data attributes (which are explicitly set on each child) because CSS inheritance handles cascading automatically, while data attributes don't cascade.

### Registration

Registration files live at `@videojs/html/ui/*`. Importing a domain slider auto-registers basic structural parts but NOT heavy optional parts like Preview.

```ts
// @videojs/html/ui/time-slider
// Registers: media-time-slider + basic parts
//   (media-slider-track, media-slider-fill, media-slider-buffer,
//    media-slider-thumb, media-slider-value)

// @videojs/html/ui/volume-slider
// Registers: media-volume-slider + basic parts

// @videojs/html/ui/slider-preview
// Registers: media-slider-preview (separate, opt-in)
```

This keeps the default bundle lean — preview involves positioning logic and is not needed for minimal slider usage.

## Constraints

- `SliderCore` must not import any DOM APIs
- `createSlider` must not reference React or Lit
- Generic slider parts (Track, Fill, Buffer, Thumb, Preview, Value) must not know about time or volume
- Domain sliders only customize Root — all other parts are generic `Slider.*` re-exports
- Domain roots must not bake in child elements — the user composes everything
- Root handles pointer events and provides context. Thumb carries `role="slider"`, keyboard, and ARIA. No separate Control element.
- Thumb is always present in the DOM — hide visually with CSS for a "thumbless" look
- Root provides context that aligns children: CSS vars, data attributes, value formatting, ARIA attrs for Thumb
- CSS custom properties are outputs only — no component reads them back
- All percentage calculations use 3 decimal places for smooth animation
- Registration from `@videojs/html/ui/*` — domain sliders auto-register basic parts, preview is separate
