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
                    │  SliderCSSVars (constants)    │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │       @videojs/core/dom       │
                    │                               │
                    │  createSlider() ← interaction │
                    │  getSliderCSSVars() ← format  │
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

Runtime-agnostic class. Computes slider state and ARIA attributes from raw values. Returns raw percentages — CSS custom property formatting is handled by the DOM layer.

### Interface

```ts
interface SliderProps {
  min?: number;                                // default: 0
  max?: number;                                // default: 100
  step?: number;                               // default: 1
  largeStep?: number;                          // default: 10
  orientation?: 'horizontal' | 'vertical';     // default: 'horizontal'
  disabled?: boolean;                          // default: false
  thumbAlignment?: 'center' | 'edge';         // default: 'center'
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
  thumbAlignment: 'center' | 'edge';
}
```

### Interaction State

`SliderInteraction` is the interaction state managed by `createSlider` via `createState` (from `@videojs/store`). The UI layer subscribes to it but never writes it directly:

```ts
interface SliderInteraction {
  pointerPercent: number;  // pointer position as 0-100
  dragPercent: number;     // percent where the drag is (from createSlider)
  dragging: boolean;
  pointing: boolean;
  focused: boolean;
}
```

`interactive` is derived by Core: `pointing || focused || dragging`.

### Methods

```ts
class SliderCore {
  static readonly defaultProps: NonNullableObject<SliderProps>;

  setProps(props: SliderProps): void;

  getState(interaction: SliderInteraction, value: number): SliderState;
  // Core owns the merge of interaction + value.
  // For generic slider, `value` is the controlled/uncontrolled value.
  // Domain cores override to accept media state and compute `value` internally.

  getThumbAttrs(state: SliderState): SliderThumbAttrs;
  // Returns: role, tabIndex, aria-valuemin, aria-valuemax, aria-valuenow,
  //          aria-orientation, aria-disabled
  // These go on the Thumb element (the focusable role="slider" element).

  valueFromPercent(percent: number): number;
  // Clamps to [min, max], snaps to step.
  // For generic sliders, snaps to `step`. Domain cores can override
  // snap precision (e.g., TimeSliderCore uses sub-second precision during drag).

  percentFromValue(value: number): number;
  // Value as percentage of range
}
```

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

Root handles pointer events and provides context (data attrs, raw state for CSS vars) to children. Thumb carries `role="slider"`, receives keyboard focus, and owns all ARIA attributes. There is no separate Control element. Children other than Thumb (Track, Fill, Buffer, Preview) are purely visual.

## Value Snapping Precision

`valueFromPercent()` must handle floating-point precision carefully. Without rounding, values like `0.1 + 0.2` produce `0.30000000000000004`.

### `roundValueToStep`

Rounds a value to the nearest step, anchored at `min`:

```ts
function roundValueToStep(value: number, step: number, min: number): number {
  const nearest = Math.round((value - min) / step) * step + min;
  return Number(nearest.toFixed(getDecimalPrecision(step)));
}
```

The `toFixed(getDecimalPrecision(step))` call derives precision from the step value itself. If `step = 0.01`, the result is fixed to 2 decimal places. If `step = 5`, no decimal places. This prevents accumulating floating-point drift.

### `getDecimalPrecision`

```ts
function getDecimalPrecision(num: number): number {
  if (Math.abs(num) < 1) {
    // Handles scientific notation (e.g., 0.00000001 → 1e-8)
    const parts = num.toExponential().split('e-');
    const mantissaDecimals = parts[0].split('.')[1];
    return (mantissaDecimals ? mantissaDecimals.length : 0) + parseInt(parts[1], 10);
  }
  const decimalPart = num.toString().split('.')[1];
  return decimalPart ? decimalPart.length : 0;
}
```

### Where It's Used

- `SliderCore.valueFromPercent()` — snaps computed value to step precision after percent → value conversion.
- Keyboard handler — rounds current value to nearest step before computing next value. Without this, a pointer drag that landed at 47.3 on a step-5 slider would produce unexpected keyboard steps (47.3 → 52.3 instead of 45 → 50).
- All percentage calculations for CSS vars use 3 decimal places (`45.123%`) for smooth visual animation, separate from value-level step precision.

Pattern taken from Base UI's `roundValueToStep` utility.

## Documentation Constants

Data attributes and CSS custom properties each get a `as const` object with JSDoc descriptions. The site docs builder extracts these to generate API reference tables.

### Data Attributes

Follows the existing pattern (`PlayButtonDataAttrs`). One file per component, named `*-data-attrs.ts`. Convention is `*DataAttrs`, not `*DataAttributes`:

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
// Note: thumbAlignment is in SliderState but excluded from SliderDataAttrs.
// Pass SliderDataAttrs as the StateAttrMap to applyStateDataAttrs() to prevent
// auto-generation of a data-thumbalignment attribute.
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
- `SliderDataAttrs` used at runtime by `applyStateDataAttrs()` in the UI layer
- `SliderCSSVars` used at runtime by `getSliderCSSVars()` in `@videojs/core/dom`
- Both extracted at build time by the site docs builder for API reference

## TimeSliderCore

Extends `SliderCore` with media time concerns.

```ts
interface TimeSliderProps extends SliderProps {
  label?: string;                          // default: 'Seek'
}

interface TimeSliderState extends SliderState {
  currentTime: number;
  duration: number;
  seeking: boolean;
  bufferPercent: number;
}

class TimeSliderCore extends SliderCore {
  getTimeState(interaction: SliderInteraction, media: TimeMediaState): TimeSliderState;
  // Core owns the value swap: dragging ? valueFromPercent(dragPercent) : currentTime.
  // bufferPercent is computed from bufferedEnd / duration.
  // The DOM layer uses this to format --media-slider-buffer.

  getTimeThumbAttrs(state: TimeSliderState): TimeSliderThumbAttrs;
  // Extends getThumbAttrs() with: aria-label (from props.label, default "Seek"),
  // aria-valuetext="2 minutes, 30 seconds of 10 minutes"

  formatValue(value: number): string;
  // Returns formatted time string (e.g., "1:30")
}
```

```ts
interface TimeMediaState {
  currentTime: number;
  duration: number;
  seeking: boolean;
  bufferedEnd: number;    // end of last buffered range
}
```

Core owns the value swap: when not dragging, `value` = `currentTime`. When dragging, `value` = `valueFromPercent(interaction.dragPercent)`. This domain logic lives in Core so both frameworks get it for free.

### Time Formatting

Uses `TimeCore` (already exists in `@videojs/core`) for `aria-valuetext`. On initialization and focus, the value text follows the pattern `"{current} of {duration}"`. During value changes, duration is omitted (`"{current}"` only) to reduce screen reader verbosity. Each uses a human-readable phrase from `formatTimeAsPhrase()`. See [decisions.md](decisions.md#time-slider-aria-valuetext-format).

## VolumeSliderCore

Extends `SliderCore` with volume concerns.

```ts
interface VolumeSliderProps extends SliderProps {
  label?: string;                          // default: 'Volume'
}

interface VolumeSliderState extends SliderState {
  volume: number;
  muted: boolean;
}

class VolumeSliderCore extends SliderCore {
  getVolumeState(interaction: SliderInteraction, media: VolumeMediaState): VolumeSliderState;
  // Core owns the value swap: dragging ? valueFromPercent(dragPercent) : volume * 100.
  // When muted: `value` = actual volume * 100 (always reflects real level),
  // `fillPercent` = muted ? 0 : percentFromValue(value) (visual silence).
  // `aria-valuenow` uses `value` (actual volume), not `fillPercent`.

  getVolumeThumbAttrs(state: VolumeSliderState): VolumeSliderThumbAttrs;
  // Extends getThumbAttrs() with: aria-label (from props.label, default "Volume"),
  // aria-valuetext="75 percent" (or "75 percent, muted" when muted)
}
```

```ts
interface VolumeMediaState {
  volume: number;   // 0-1 from store
  muted: boolean;
}
```

Default props override: `min=0, max=100, step=5, largeStep=10, orientation='horizontal'`.

Volume is stored as 0-1 in the store but displayed as 0-100 in the slider. `VolumeSliderCore` handles this conversion.

When muted, fill shows 0% but `aria-valuenow` reflects the actual volume level. `aria-valuetext` communicates both: `"75 percent, muted"`. This lets screen reader users know the slider's underlying value while also understanding the muted state.

## createSlider (DOM)

Factory function in `@videojs/core/dom` — parallel to `createButton()`. Manages interaction state via `createState` (from `@videojs/store`). Returns split event handler props and a subscribable interaction state.

### Interface

```ts
interface SliderOptions {
  getOrientation: () => 'horizontal' | 'vertical';
  isRTL: () => boolean;
  isDisabled: () => boolean;
  getPercent: () => number;             // current value as 0-100 (for keyboard stepping)
  getStepPercent: () => number;         // step as percentage of range (0-100)
  getLargeStepPercent: () => number;    // largeStep as percentage of range (0-100)
  seekThrottle?: number;               // trailing-edge throttle for onValueCommit during drag (ms, default 100, 0 disables)
  onValueChange: (percent: number) => void;   // percent is 0-100
  onValueCommit: (percent: number) => void;   // percent is 0-100
  onDragStart?: () => void;                   // intentional drag begins (after threshold)
  onDragEnd?: () => void;                     // drag ends
}

interface SliderRootProps {
  onPointerDown: (event: UIPointerEvent) => void;
  onPointerMove: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
}

interface SliderThumbProps {
  onKeyDown: (event: UIKeyboardEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
}

function createSlider(options: SliderOptions): {
  interaction: State<SliderInteraction>;  // read-only, subscribable
  rootProps: SliderRootProps;
  thumbProps: SliderThumbProps;
  destroy: () => void;                   // cleanup throttle timers
};
```

`createSlider` internally creates a `WritableState<SliderInteraction>` via `createState()`. Pointer and keyboard handlers patch this state directly. The returned `interaction` is the read-only `State<SliderInteraction>` — consumers subscribe via `.subscribe()` and read via `.current`.

**What `createSlider` manages internally:**
- `interaction.dragging` — set `true` after drag threshold, `false` on pointerup/pointercancel
- `interaction.pointing` — set `true` on pointermove over Root, `false` on pointerleave
- `interaction.focused` — set `true`/`false` via Thumb's `onFocus`/`onBlur`
- `interaction.pointerPercent` — updated on pointermove over Root (for preview positioning)
- `interaction.dragPercent` — updated on pointermove during drag (for value computation)

**What `createSlider` delegates to the caller (via callbacks):**
- `onValueChange(percent)` — caller converts to domain value and updates visual state
- `onValueCommit(percent)` — caller converts to domain value and commits (seek, volume change)

The `getPercent` getter is still needed for keyboard stepping — `createSlider` calls it during keyboard events to know the current value percent (which depends on media state, not just interaction state).

All percentage values use 0-100 range, consistent with `SliderState.fillPercent` and CSS var output.

Root receives pointer props (click-to-seek, drag initiation). Thumb receives keyboard handler and focus tracking. This split reflects DOM responsibility: Root owns the hit area, Thumb owns focus and keyboard interaction.

`pointerdown` on Root programmatically focuses the Thumb element. This ensures `interactive` state is correct, `:focus-visible` styling works, and screen readers track the active element during pointer interaction.

### Pointer Behavior

Uses pointer events exclusively — no separate touch event path. `touch-action: none` on Root ensures reliable pointer event delivery from touch input. See [decisions.md](decisions.md#pointer-events-only-no-separate-touch-path).

1. **pointerdown** on Root — focus the Thumb element. Call `onValueChange(percent)` immediately (click-to-seek). Add `pointermove`, `pointerup`, `pointercancel`, and `touchmove` listeners on `document`. Track a `moveCount` for drag threshold. Do NOT call `onDragStart()` yet.
2. **pointermove** on document — increment `moveCount`. If `moveCount` exceeds the intentional drag threshold (2 events), call `onDragStart()` and set `dragging = true`. Call `onValueChange(percent)`. When `seekThrottle > 0` and dragging, also call `onValueCommit(percent)` through a trailing-edge throttle. **Safety check:** if `event.pointerType !== 'touch'` and `event.buttons === 0`, treat as lost pointerup — call `onDragEnd()` and clean up. (`buttons` is unreliable for touch pointer events; touch relies on `pointerup`/`pointercancel` instead.)
3. **pointerup** on document — end drag. Remove document listeners. Call `onValueCommit(percent)` (unthrottled, final value), `onDragEnd()`.
4. **pointercancel** on document — treat as drag end. Remove document listeners. Call `onDragEnd()`. Fires when the browser takes over the gesture (e.g., navigation swipe). Without handling it, the slider gets stuck in dragging state.
5. **pointermove** on Root (no drag) — call `onPointerMove(percent)` for preview positioning.
6. **pointerleave** on Root — call `onPointerLeave()`.
7. **touchmove** on document — `{ passive: false }`, calls `event.preventDefault()` to block page scroll. Does not compute any slider values. Added on `pointerdown`, removed on `pointerup`/`pointercancel`/drag end. Scoped to active drag only — never left attached.

**Listener options:** Document `pointermove` uses `{ passive: true }`. Document `touchmove` uses `{ passive: false }` (needs `preventDefault()`). Document `pointerup` and `pointercancel` use default options.

Percent calculation from pointer event:

```ts
function getPercentFromPointerEvent(
  event: PointerEvent,
  rect: DOMRect,
  orientation: string,
  direction: 'ltr' | 'rtl' = 'ltr'
): number {
  let ratio: number;
  if (orientation === 'vertical') {
    ratio = 1 - (event.clientY - rect.top) / rect.height;  // bottom = 0%, top = 100%
  } else if (direction === 'rtl') {
    ratio = (rect.right - event.clientX) / rect.width;      // right = 0%, left = 100%
  } else {
    ratio = (event.clientX - rect.left) / rect.width;       // left = 0%, right = 100%
  }
  return ratio * 100;  // 0-100
}
```

**Vertical + RTL:** Vertical sliders are unaffected by text direction — bottom is always 0% (silent/start), top is always 100% (loud/end), regardless of RTL. Only horizontal sliders flip for RTL.

### Keyboard Behavior

All via `onKeyDown` on the **Thumb** element (the focusable `role="slider"` element):

| Key | Action |
| --- | ------ |
| `ArrowRight` / `ArrowUp` | `onValueChange(current + stepPercent)` then `onValueCommit` |
| `ArrowLeft` / `ArrowDown` | `onValueChange(current - stepPercent)` then `onValueCommit` |
| `Shift + Arrow` | `onValueChange(current ± largeStepPercent)` then `onValueCommit` |
| `PageUp` | `onValueChange(current + largeStepPercent)` then `onValueCommit` |
| `PageDown` | `onValueChange(current - largeStepPercent)` then `onValueCommit` |
| `Home` | `onValueChange(0)` then `onValueCommit` |
| `End` | `onValueChange(100)` then `onValueCommit` |
| `0`–`9` | `onValueChange(N * 10)` then `onValueCommit` — jump to 0%–90% |

`createSlider` does NOT know about step values or min/max — it only works in percentages (0-100). The caller converts using `SliderCore.valueFromPercent()`.

**`event.preventDefault()`** is called for all handled keys to prevent page scrolling and other default browser behaviors.

**RTL direction:** `createSlider` accepts an `isRTL` callback. When RTL, `ArrowRight` subtracts `stepPercent` (decreases) and `ArrowLeft` adds `stepPercent` (increases). `ArrowUp`/`ArrowDown` are unaffected. Both Base UI and Vidstack implement this.

**Round before stepping:** Before computing the next value from a keyboard step, the current value is rounded to the nearest step via `roundValueToStep()`. This prevents drift when the current value isn't aligned to a step boundary (e.g., after a pointer drag landed between steps). See [Value Snapping Precision](#value-snapping-precision).

**Numeric keys** match YouTube behavior (0 = start, 5 = midpoint, 9 = 90%). Only active when `metaKey` is not held.

## Data Flow

### React Time Slider

```
                    ┌─── createSlider() ───┐
                    │  interaction (State)  │ ← subscribable via useSyncExternalStore
                    │  rootProps            │ → Root element (pointer events)
                    │  thumbProps           │ → Thumb element (keyboard + focus)
                    └──────────┬───────────┘
                               │
    ┌──────────────────────────┼───────────────────────────┐
    │                          │                           │
    ▼                          ▼                           ▼
interaction.current     onValueChange(%)            onValueCommit(%)
    │                   (visual update only)        (throttled during drag)
    │                          │                           │
    │                          │                    TimeSliderCore
    │                          │                      .valueFromPercent()
    │                          │                           │
    │                          │                    time.seek(seconds)
    │                          │                           │
    │                          │                    Store updates
    │                          │                           │
    ▼                          ▼                           ▼
┌───────────────────────────────────────────────────────────────┐
│  TimeSlider.Root render                                       │
│                                                               │
│  const interaction = useSelector(slider.interaction, s => s); │
│  const media = usePlayer(selectTimeAndBuffer);                │
│  const state = core.getTimeState(interaction, media);         │
│  const cssVars = getTimeSliderCSSVars(state);                 │
│  const thumbAttrs = core.getTimeThumbAttrs(state);            │
│                                                               │
│  → CSS vars on Root                                           │
│  → Data attrs on Root + children (via context)                │
│  → ARIA on Thumb (via context)                                │
└───────────────────────────────────────────────────────────────┘
```

During drag: `onValueChange` fires on every pointermove. `onValueCommit` fires through a trailing-edge throttle (default 100ms) to seek without flooding the media element. On drag end, `onValueCommit` fires unthrottled with the final value.

On keyboard: both `onValueChange` and `onValueCommit` fire immediately on each step (no throttle).

`interaction` state updates are batched via `queueMicrotask` — multiple patches per pointermove (e.g., `pointing` + `pointerPercent` + `dragPercent`) collapse into one subscriber notification. Microtasks fire before the next animation frame, so rendering stays in sync.

### HTML Time Slider

```
                    ┌─── createSlider() ───┐
                    │  interaction (State)  │ ← subscribe → requestUpdate()
                    │  rootProps            │ → self (pointer events)
                    │  thumbProps           │ → <media-slider-thumb>
                    └──────────┬───────────┘
                               │
    ┌──────────────────────────┼───────────────────────────┐
    │                          │                           │
interaction.current     onValueChange(%)            onValueCommit(%)
    │                                                      │
    │                                               time.seek(seconds)
    │                                                      │
    ▼                                                      ▼
┌───────────────────────────────────────────────────────────────┐
│  TimeSliderElement.update()                                   │
│                                                               │
│  const interaction = this.#slider.interaction.current;        │
│  const media = this.#playerController.state;                  │
│  const state = this.#core.getTimeState(interaction, media);   │
│  const cssVars = getTimeSliderCSSVars(state);                 │
│                                                               │
│  → CSS vars on self (style.setProperty)                       │
│  → Data attrs on self + children (applyStateDataAttrs)        │
│  → ARIA on thumb (applyElementProps)                          │
│  → CustomEvent dispatch (drag-start, drag-end)                │
└───────────────────────────────────────────────────────────────┘
```

## CSS Custom Property Computation

CSS custom property formatting lives in `@videojs/core/dom`, not in `SliderCore`. Core returns raw percentages in `SliderState` (`fillPercent`, `pointerPercent`). `TimeSliderState` adds `bufferPercent`. The DOM layer formats these as CSS var strings:

```ts
// packages/core/src/dom/ui/slider-css-vars.ts

function getSliderCSSVars(state: SliderState): Record<string, string> {
  return {
    [SliderCSSVars.fill]: `${state.fillPercent.toFixed(3)}%`,
    [SliderCSSVars.pointer]: `${state.pointerPercent.toFixed(3)}%`,
  };
}

function getTimeSliderCSSVars(state: TimeSliderState): Record<string, string> {
  return {
    ...getSliderCSSVars(state),
    [SliderCSSVars.buffer]: `${state.bufferPercent.toFixed(3)}%`,
  };
}
```

**Implementation note:** Return types shown as `Record<string, string>` for readability. In implementation, prefer a mapped type over `SliderCSSVars` keys for type safety — consumers can only access valid CSS var keys.

Volume slider has no buffer, so it uses `getSliderCSSVars()` directly — no `getVolumeSliderCSSVars` needed.

The `SliderCSSVars` constant stays in `@videojs/core` (alongside `SliderDataAttrs`) for documentation extraction — it defines the property names and JSDoc descriptions. The DOM layer uses it at runtime for the keys. This keeps Core runtime-agnostic (React Native has no CSS custom properties) while keeping the source of truth for property names in one place.

## Callback Flow

`createSlider()` manages interaction state internally via `createState` and exposes two callbacks for the UI layer to handle domain logic:

| `createSlider` concern | How it surfaces | Notes |
| --- | --- | --- |
| `dragging`, `pointing`, `focused`, `pointerPercent`, `dragPercent` | `interaction: State<SliderInteraction>` | Managed internally. UI subscribes and reads `.current`. |
| `onValueChange(percent)` | React: `props.onValueChange(value)` / HTML: `CustomEvent('value-change')` | Generic root exposes. Domain roots handle internally. |
| `onValueCommit(percent)` | React: `props.onValueCommit(value)` / HTML: `CustomEvent('value-commit')` | Generic root exposes. Domain roots handle internally (`time.seek()`, `volume.changeVolume()`). |
| Drag start/end | React: `props.onDragStart()` / HTML: `CustomEvent('drag-start')` | All roots expose. Controls feature uses to pause auto-hide. |

### User-Facing Surface by Component

**Generic `Slider.Root`:**

| React prop | HTML event | Fires when |
| --- | --- | --- |
| `onValueChange` | `value-change` | Every value change (drag, keyboard). `detail: { value }` |
| `onValueCommit` | `value-commit` | Gesture complete (pointerup, keyboard step). `detail: { value }` |
| `onDragStart` | `drag-start` | Intentional drag begins (after threshold). |
| `onDragEnd` | `drag-end` | Drag ends. |

**Domain roots (`TimeSlider.Root`, `VolumeSlider.Root`):**

| React prop | HTML event | Fires when |
| --- | --- | --- |
| `onDragStart` | `drag-start` | Intentional drag begins. |
| `onDragEnd` | `drag-end` | Drag ends. |

Domain roots do not expose `onValueChange` or `onValueCommit` — they manage value internally from the store.

### Custom DOM Event Convention

HTML custom elements dispatch custom DOM events using **kebab-case** names. All events **bubble** (consistent with native `input`/`change` events). Events carrying data use `CustomEvent` with a typed `detail`:

```ts
this.dispatchEvent(new CustomEvent('value-change', {
  bubbles: true,
  detail: { value },
}));

this.dispatchEvent(new CustomEvent('drag-start', { bubbles: true }));
```

This is a new convention for `@videojs/html` — existing elements (buttons, time display) don't dispatch custom events. The slider is the first component to need user-facing interaction callbacks beyond what the store provides.

### Event Interfaces (HTML)

Typed event maps for TypeScript consumers:

```ts
// packages/html/src/ui/slider/slider-events.ts

interface SliderValueEventDetail {
  value: number;
}

interface SliderEventMap {
  'value-change': CustomEvent<SliderValueEventDetail>;
  'value-commit': CustomEvent<SliderValueEventDetail>;
  'drag-start': CustomEvent<void>;
  'drag-end': CustomEvent<void>;
}

// Domain roots only emit drag events
interface DomainSliderEventMap {
  'drag-start': CustomEvent<void>;
  'drag-end': CustomEvent<void>;
}
```

Elements get typed `addEventListener` overloads:

```ts
interface TimeSliderElement {
  addEventListener<K extends keyof DomainSliderEventMap>(
    type: K,
    listener: (this: TimeSliderElement, ev: DomainSliderEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
}
```

Usage:

```ts
const slider = document.querySelector('media-time-slider');
slider.addEventListener('drag-start', () => {
  // typed, no detail
});

const generic = document.querySelector('media-slider');
generic.addEventListener('value-change', (e) => {
  e.detail.value;  // typed as number
});
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
├── slider-css-vars.ts          # getSliderCSSVars(), getTimeSliderCSSVars()
├── event.ts                    # (existing) UIEvent types, + UIPointerEvent
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
├── slider-element.ts           # <media-slider> (generic root, for custom slider types)
├── slider-events.ts            # SliderEventMap, DomainSliderEventMap, detail types
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

Registration files live in `src/define/ui/` (following the existing convention), exported as `@videojs/html/ui/*` via package.json exports. Importing a domain slider auto-registers basic structural parts but NOT heavy optional parts like Preview.

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

### Performance

**Visibility optimization:** HTML slider elements should use `IntersectionObserver` to skip reactive updates when not visible or not intersecting the viewport. When controls are auto-hidden, a hidden slider shouldn't trigger layout or paint. Important for battery life on mobile.

**CSS containment:** Slider elements should use `contain: layout style` for paint isolation. Prevents slider updates from triggering layout recalculations in parent elements.

**CSS on Root:** `touch-action: none` (prevent browser touch gestures during drag), `user-select: none` (prevent text selection during drag).

**`autocomplete="off"`** on Thumb (the focusable element) to prevent browser autocomplete from interfering with keyboard interaction.

### Controls Integration

The slider exposes drag start/end events — React callback props, HTML custom DOM events (`drag-start`/`drag-end`). The **controls feature** (which manages auto-hide) should listen for these to pause auto-hide during drag — prevents the control bar from disappearing while the user is actively scrubbing. The slider has no knowledge of controls; it just exposes the interaction lifecycle.

## Thumb Alignment

`thumbAlignment` prop on Root controls how the thumb relates to the track at min/max values. Default: `'center'`.

### Center Mode (Default)

Thumb center aligns with track edges. `--media-slider-fill` = `valuePercent%` directly.

```
Track:  |════════════════════════════|
Thumb:  ◯                            (at 0%)
        ↑ center on left edge, half overflows left

Track:  |════════════════════════════|
Thumb:                              ◯ (at 100%)
                                    ↑ center on right edge, half overflows right
```

No DOM measurement needed. Simple percentage mapping.

### Edge Mode

Thumb stays fully within track bounds. At 0%, the thumb's leading edge aligns with the track's leading edge. At 100%, the thumb's trailing edge aligns with the track's trailing edge.

```
Track:  |════════════════════════════|
Thumb:  [◯]                          (at 0%, thumb pinned inside left edge)

Track:  |════════════════════════════|
Thumb:                            [◯] (at 100%, thumb pinned inside right edge)
```

This requires adjusting `--media-slider-fill` so the percentage accounts for the thumb's physical size.

### Edge Mode Computation

Root uses `ResizeObserver` on the Thumb and track elements to measure their sizes. The adjusted fill percentage maps the value to the inset travel range:

```ts
// thumbRatio = thumbSize / trackSize (e.g., 16px / 300px ≈ 0.053)
// thumbOffset = thumbRatio / 2
// adjustedPercent = thumbOffset + valuePercent * (1 - thumbRatio)

// At value 0%:   adjustedPercent = thumbOffset                    (≈ 2.67%)
// At value 50%:  adjustedPercent = thumbOffset + 0.5 * (1-ratio)  (≈ 50%)
// At value 100%: adjustedPercent = 1 - thumbOffset                (≈ 97.33%)
```

The adjustment is internal to Root — `--media-slider-fill` is set to the adjusted percentage. Users' CSS (`left: var(--media-slider-fill)`, `width: var(--media-slider-fill)`) works unchanged. Fill and Thumb both consume the same adjusted value.

### Implementation

**In `SliderCore`:** A new method `adjustPercentForAlignment()` takes the raw value percent and thumb/track dimensions, returns the adjusted percent. This keeps the computation runtime-agnostic (takes dimensions as numbers, doesn't read DOM).

**In HTML elements:** The domain root element (`<media-time-slider>`, `<media-volume-slider>`) creates a `ResizeObserver` in `connectedCallback()` observing both the Thumb and the Root (as track proxy). On resize, it reads `borderBoxSize` and stores the thumb/track dimensions. These are passed to `SliderCore.adjustPercentForAlignment()` during CSS var computation. Observer is disconnected in `disconnectedCallback()`.

**In React:** The domain Root component uses a `ResizeObserver` via a ref callback on the rendered Thumb element. When dimensions change, it re-renders with updated fill values.

**Vertical orientation:** Uses height instead of width for both thumb and track measurements.

## Constraints

- `SliderCore` must not import any DOM APIs — returns raw percentages, not CSS strings
- `createSlider` must not reference React or Lit — uses `createState` from `@videojs/store` for interaction state
- Generic slider parts (Track, Fill, Buffer, Thumb, Preview, Value) must not know about time or volume
- Domain sliders only customize Root — all other parts are generic `Slider.*` re-exports
- Domain roots must not bake in child elements — the user composes everything
- Root handles pointer events and provides context. Thumb carries `role="slider"`, keyboard, and ARIA. No separate Control element.
- Thumb is always present in the DOM — hide visually with CSS for a "thumbless" look
- Root provides context that aligns children: CSS vars, data attributes, value formatting, ARIA attrs and step values for Thumb
- CSS custom properties are outputs only — no component reads them back
- All percentages use 0-100 range throughout the stack. CSS var output uses 3 decimal places for smooth animation (`45.123%`)
- Registration from `@videojs/html/ui/*` — domain sliders auto-register basic parts, preview is separate
