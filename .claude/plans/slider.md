# Slider Component Implementation

**Status:** READY
**Design Doc:** `internal/design/ui/slider/`
**Issues:** #275 (time slider), #267 (volume slider), #269 (seek slider)

## Branch Strategy

```
main
 ├─ feat/store-snapshot                (PR 0 — merges to main first)
 └─ feat/slider-core                   (PR 1, rebased after PR 0 merges)
      └─ feat/slider-dom                (PR 2)
          ├─ feat/slider-react           (PR 3)
          │    └─ feat/slider-preview-react   (PR 5)
          └─ feat/slider-html            (PR 4)
               └─ feat/slider-preview-html    (PR 6)
```

PR 0 merges to `main` independently — it's a general-purpose store primitive, not slider-specific.
PRs 3 and 4 are siblings off `feat/slider-dom`. React and HTML have no dependency on each other.
Preview PRs branch off their respective UI PRs because they need the slider context definitions.

---

## PR 0: Store Snapshot Primitives

**Branch:** `feat/store-snapshot`
**Base:** `main`
**Package:** `@videojs/store`

Adds `useSnapshot` — a React hook for subscribing to `State<T>` containers from `createState()`.
This bridges the store's raw reactive state to React rendering. Required because `useStore`
only accepts `AnyStore` (with `.state`, `.attach()`, `.destroy()`), not `State<T>` (with
`.current` and `.subscribe()`). HTML elements don't need a controller equivalent — they
subscribe directly via `state.subscribe(() => this.requestUpdate(), { signal })`.

### 0.1 `useSnapshot` — React Hook

**File:** `packages/store/src/react/hooks/use-snapshot.ts`

Subscribes to a `State<T>` container. Without selector, returns the full snapshot. With
selector, returns derived value with `shallowEqual` comparison to avoid unnecessary re-renders.

```ts
import type { State } from '../../core/state';
import { type Comparator, type Selector, useSelector } from './use-selector';

/** Subscribe to a State container's current value. */
export function useSnapshot<T extends object>(state: State<T>): T;

export function useSnapshot<T extends object, R>(
  state: State<T>,
  selector: Selector<T, R>,
  isEqual?: Comparator<R>
): R;

export function useSnapshot<T extends object, R>(
  state: State<T>,
  selector?: Selector<T, R>,
  isEqual?: Comparator<R>
): T | R {
  return useSelector(
    (cb) => state.subscribe(cb),
    () => state.current,
    selector ?? ((s: T) => s as unknown as R),
    isEqual
  );
}
```

**Overload semantics:**
- `useSnapshot(state)` — returns `T`, re-renders on any shallow change to the state object.
- `useSnapshot(state, selector)` — returns `R`, re-renders only when `selector(state.current)` changes (per `shallowEqual`).
- Optional third arg `isEqual` for custom comparator.

### 0.2 Barrel Exports

**`packages/store/src/react/hooks/index.ts`** — add:
```ts
export { useSnapshot } from './use-snapshot';
```

**`packages/store/src/react/index.ts`** — add (this barrel imports directly from individual
hook files, not from `hooks/index.ts`):
```ts
export { useSnapshot } from './hooks/use-snapshot';
```

### 0.3 Tests

**File:** `packages/store/src/react/hooks/tests/use-snapshot.test.tsx`

- Without selector: returns full state, re-renders on patch
- With selector: returns selected value, only re-renders when selected value changes
- Custom comparator
- Does not re-render when patched values are identical (Object.is)
- Works with microtask batching (multiple patches → one render)

### 0.4 Verify

```bash
pnpm -F @videojs/store test src/react/hooks/tests/use-snapshot
pnpm -F @videojs/store build
pnpm typecheck
pnpm lint:fix:file <changed-files>
```

---

## PR 1: Core Layer

**Branch:** `feat/slider-core`
**Base:** `main` (after PR 0 merges)
**Packages:** `@videojs/utils`, `@videojs/core`

### 1.1 Fix `formatTimeAsPhrase(0)` in `@videojs/utils`

**File:** `packages/utils/src/time/format.ts`

The function returns `""` when `seconds = 0` because all three units (h, m, s) fail the `value > 0` check, producing an empty `parts` array. When `seconds = 0`, `aria-valuetext` for a time slider at video start would be `"of 10 minutes"` instead of `"0 seconds of 10 minutes"`.

**Fix:** When `positiveSeconds === 0`, return `"0 seconds"` directly. Or modify the seconds entry in the map to pass through when all parts would be empty.

**Test:** Add `it('formats zero seconds', () => expect(formatTimeAsPhrase(0)).toBe('0 seconds'))` to `packages/utils/src/time/tests/format.test.ts`.

### 1.2 `rafThrottle` — rAF-Based Throttle Utility

**File:** `packages/utils/src/dom/raf-throttle.ts`

Throttles a function to fire at most once per animation frame. Used by the slider to
throttle seek events during scrubbing — naturally adapts to device refresh rate and avoids
intermediate seeks that would never be visually rendered.

```ts
export interface RafThrottled<Args extends unknown[]> {
  (...args: Args): void;
  cancel(): void;
}

export function rafThrottle<Args extends unknown[]>(
  fn: (...args: Args) => void
): RafThrottled<Args> {
  let rafId: number | null = null;
  let latestArgs: Args;

  const throttled = (...args: Args): void => {
    latestArgs = args;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      fn(...latestArgs);
    });
  };

  throttled.cancel = (): void => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}
```

**Barrel:** Add to `packages/utils/src/dom/index.ts`:
```ts
export { rafThrottle, type RafThrottled } from './raf-throttle';
```

**Test:** `packages/utils/src/dom/tests/raf-throttle.test.ts`
- Calls function on next animation frame
- Collapses multiple calls into one (latest args win)
- `.cancel()` prevents pending call
- New calls work after cancel

### 1.3 `isRTL` — RTL Direction Detection

**File:** `packages/utils/src/dom/direction.ts`

Detects right-to-left text direction for an element. Checks `element.closest('[dir]')` first
for fast attribute lookup, then falls back to `getComputedStyle` which respects inherited
direction from stylesheets.

```ts
export function isRTL(element: Element): boolean {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  if (dir) return dir.toLowerCase() === 'rtl';
  return getComputedStyle(element).direction === 'rtl';
}
```

**Barrel:** Add to `packages/utils/src/dom/index.ts`:
```ts
export { isRTL } from './direction';
```

**Test:** `packages/utils/src/dom/tests/direction.test.ts`
- Returns `false` for default LTR element
- Returns `true` when ancestor has `dir="rtl"`
- Returns `true` when element has `dir="rtl"`

### 1.4 `SliderCore` — Generic Slider State

**File:** `packages/core/src/core/ui/slider/slider-core.ts`

Stateless class that computes derived slider state from interaction + value inputs. Follows existing core class patterns (`PlayButtonCore`, `TimeCore`).

```ts
export interface SliderProps {
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  largeStep?: number | undefined;
  orientation?: 'horizontal' | 'vertical' | undefined;
  disabled?: boolean | undefined;
  thumbAlignment?: 'center' | 'edge' | undefined;
}

export interface SliderInteraction {
  pointerPercent: number;
  dragPercent: number;
  dragging: boolean;
  pointing: boolean;
  focused: boolean;
}

export interface SliderState {
  value: number;
  fillPercent: number;
  pointerPercent: number;
  dragging: boolean;
  pointing: boolean;
  interactive: boolean;   // dragging || pointing || focused
  orientation: 'horizontal' | 'vertical';
  disabled: boolean;
  thumbAlignment: 'center' | 'edge';
}

```

**Class shape:**

```ts
export class SliderCore {
  static readonly defaultProps: NonNullableObject<SliderProps>;
  // defaultProps: min=0, max=100, step=1, largeStep=10,
  //   orientation='horizontal', disabled=false, thumbAlignment='center'

  #props = { ...SliderCore.defaultProps };

  constructor(props?: SliderProps);
  setProps(props: SliderProps): void;

  getState(interaction: SliderInteraction, value: number): SliderState;
  // Computes fillPercent = percentFromValue(value), pointerPercent from interaction,
  // interactive = dragging || pointing || focused. All percentages 0-100.

  getAttrs(state: SliderState);
  // Returns inlined ARIA attrs object (no explicit return type — TS infers).
  // Returns { role, tabIndex, autocomplete, aria-valuemin, aria-valuemax,
  //   aria-valuenow, aria-orientation, aria-disabled }.
  // Generic — no label or valuetext.

  valueFromPercent(percent: number): number;
  // Converts 0-100 percent to a value in [min, max], snapped to step.
  // Uses roundValueToStep.

  percentFromValue(value: number): number;
  // Converts a value to 0-100 percent relative to [min, max].

  adjustPercentForAlignment(rawPercent: number, thumbSize: number, trackSize: number): number;
  // For 'edge' thumb alignment: adjusts percent so thumb stays within track bounds.
  // center mode: identity (return rawPercent).
}

export namespace SliderCore {
  export type Props = SliderProps;
  export type State = SliderState;
  export type Interaction = SliderInteraction;
}
```

**Utility functions** in `@videojs/utils/number` (new subpath):

```ts
export function clamp(value: number, min: number, max: number): number;
// Clamp a value between min and max (inclusive).

export function roundToStep(value: number, step: number, min: number): number;
// Snap a value to the nearest step, offset from min.
// Derives decimal precision from step's string representation to avoid floating-point drift.
// Integer steps skip toFixed entirely.
```

Requires adding `./number` export to `packages/utils/package.json` and `number` entry to `packages/utils/tsdown.config.ts`.

### 1.5 `TimeSliderCore` — Time-Domain Slider

**File:** `packages/core/src/core/ui/slider/time-slider-core.ts`

Extends `SliderCore`. Accepts `MediaTimeState & MediaBufferState` (canonical types from `@videojs/core`) + `SliderInteraction`, returns time-specific state.

```ts
export interface TimeSliderState extends SliderState, Pick<MediaTimeState, 'currentTime' | 'duration' | 'seeking'> {
  bufferPercent: number;
}
```

Uses `Pick<>` to select specific fields from canonical media state. No custom `TimeMediaState` wrapper — accepts the full `MediaTimeState & MediaBufferState` and computes `bufferedEnd` internally from `media.buffered` ranges.

**Class shape:**

```ts
export interface TimeSliderProps extends SliderProps {
  label?: string | undefined;
}

export class TimeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<TimeSliderProps>;
  // Inherits slider defaults. label='Seek'.

  getTimeState(media: MediaTimeState & MediaBufferState, interaction: SliderInteraction): TimeSliderState;
  // - min=0, max=duration (overrides generic min/max on each call).
  // - Value swap: dragging ? valueFromPercent(dragPercent) : currentTime.
  // - Computes bufferedEnd from media.buffered ranges internally.
  // - bufferPercent = (bufferedEnd / duration) * 100 || 0.
  // - Delegates to super.getState() for base slider state.

  override getAttrs(state: TimeSliderState);
  // Returns inlined object (no explicit return type).
  // Adds aria-label (default 'Seek') and aria-valuetext
  //   e.g., "5 minutes, 30 seconds of 10 minutes"
  // Spreads super.getAttrs(state) for base ARIA.
}

export namespace TimeSliderCore {
  export type Props = TimeSliderProps;
  export type State = TimeSliderState;
}
```

### 1.6 `VolumeSliderCore` — Volume-Domain Slider

**File:** `packages/core/src/core/ui/slider/volume-slider-core.ts`

Extends `SliderCore`. Accepts `MediaVolumeState` (canonical type from `@videojs/core`) + `SliderInteraction`, returns volume-specific state.

```ts
export interface VolumeSliderState extends SliderState, Pick<MediaVolumeState, 'volume' | 'muted'> {}
```

Uses `Pick<>` to select specific fields from canonical media state. No custom `VolumeMediaState` wrapper.

**Class shape:**

```ts
export interface VolumeSliderProps extends SliderProps {
  label?: string | undefined;
}

export class VolumeSliderCore extends SliderCore {
  static override readonly defaultProps: NonNullableObject<VolumeSliderProps>;
  // min=0, max=100, step=1, largeStep=10, label='Volume'.

  getVolumeState(media: MediaVolumeState, interaction: SliderInteraction): VolumeSliderState;
  // - Value: always volume * 100 (actual volume as percent, regardless of muted).
  // - Value swap: dragging ? valueFromPercent(dragPercent) : volume * 100.
  // - fillPercent: muted ? 0 : base.fillPercent. Visual silence when muted.
  // - Delegates to super.getState() for base slider state.

  override getAttrs(state: VolumeSliderState);
  // Returns inlined object (no explicit return type).
  // Adds aria-label (default 'Volume') and aria-valuetext
  //   e.g., "75 percent, muted"
  // Spreads super.getAttrs(state) for base ARIA.
}

export namespace VolumeSliderCore {
  export type Props = VolumeSliderProps;
  export type State = VolumeSliderState;
}
```

### 1.7 Constants

**File:** `packages/core/src/core/ui/slider/slider-data-attrs.ts`

```ts
import type { StateAttrMap } from '../types';
import type { SliderState } from './slider-core';

export const SliderDataAttrs = {
  dragging: 'data-dragging',
  pointing: 'data-pointing',
  interactive: 'data-interactive',
  orientation: 'data-orientation',
  disabled: 'data-disabled',
} as const satisfies StateAttrMap<SliderState>;
```

**File:** `packages/core/src/core/ui/slider/time-slider-data-attrs.ts`

```ts
import type { StateAttrMap } from '../types';
import type { TimeSliderState } from './time-slider-core';

export const TimeSliderDataAttrs = {
  ...SliderDataAttrs,
  seeking: 'data-seeking',
} as const satisfies StateAttrMap<TimeSliderState>;
```

**File:** `packages/core/src/core/ui/slider/slider-css-vars.ts`

```ts
export const SliderCSSVars = {
  fill: '--media-slider-fill',
  pointer: '--media-slider-pointer',
  buffer: '--media-slider-buffer',
} as const;
```

### 1.8 Barrel Export

No `index.ts` barrel — existing UI components don't use one. Add individual exports
to `packages/core/src/core/index.ts` (matching the pattern for play-button, time, etc.):

```ts
export * from './ui/slider/slider-core';
export * from './ui/slider/time-slider-core';
export * from './ui/slider/volume-slider-core';
export * from './ui/slider/slider-data-attrs';
export * from './ui/slider/time-slider-data-attrs';
export * from './ui/slider/slider-css-vars';
```

### 1.9 Tests

**File:** `packages/core/src/core/ui/slider/tests/slider-core.test.ts`

- `clamp`: within range, clamp to min, clamp to max, min equals max, negative ranges
- `roundToStep`: nearest step, min offset, decimal steps, value equals min
- `SliderCore.getState`: basic value to percent, interaction passthrough, interactive derivation (including focused)
- `SliderCore.getAttrs`: ARIA output
- `SliderCore.valueFromPercent`: min/max bounds, step snapping
- `SliderCore.percentFromValue`: inverse of valueFromPercent
- `SliderCore.adjustPercentForAlignment`: center (identity) and edge modes
- Default props

**File:** `packages/core/src/core/ui/slider/tests/time-slider-core.test.ts`

- `getTimeState`: value swap on drag vs non-drag, buffer percent from buffered ranges, duration as max
- `getAttrs`: aria-label, aria-valuetext formatting
- Zero duration edge case
- Seeking state passthrough

**File:** `packages/core/src/core/ui/slider/tests/volume-slider-core.test.ts`

- `getVolumeState`: value always actual volume, fillPercent=0 when muted, value swap on drag
- `getAttrs`: aria-label, aria-valuetext with and without muted
- Volume 0-1 to 0-100 percent mapping

### 1.10 Verify

```bash
pnpm -F @videojs/utils test src/time/tests/format.test.ts
pnpm -F @videojs/utils test src/dom/tests/raf-throttle.test.ts
pnpm -F @videojs/utils test src/dom/tests/direction.test.ts
pnpm -F @videojs/utils build
pnpm -F @videojs/core test src/core/ui/slider
pnpm -F @videojs/core build
pnpm typecheck
pnpm lint:fix:file <changed-files>
```

---

## PR 2: DOM Layer

**Branch:** `feat/slider-dom`
**Base:** `feat/slider-core`
**Package:** `@videojs/core` (dom subpath)

### 2.1 `UIPointerEvent` Type

**File:** `packages/core/src/dom/ui/event.ts`

Extend existing event types with pointer-specific properties:

```ts
export interface UIPointerEvent extends UIEvent {
  clientX: number;
  clientY: number;
  pointerId: number;
  pointerType: string;
}
```

### 2.2 `createSlider()` — Interaction Factory

**File:** `packages/core/src/dom/ui/slider.ts`

Factory function that manages pointer and keyboard interaction state. Returns a subscribable
`State<SliderInteraction>` plus props objects for Root and Thumb elements.

**New pattern:** Unlike `createButton()` (stateless, returns plain props), `createSlider()` is
stateful — it creates a `State<SliderInteraction>` via `createState()` from `@videojs/store`,
has a `destroy()` lifecycle, and returns a subscription handle. This is justified because
slider interaction is inherently stateful (drag tracking, pointer capture, percent calculation)
unlike button activation. `@videojs/core` already depends on `@videojs/store` (`workspace:*`).

```ts
export interface SliderOptions {
  /** Element reference for getBoundingClientRect() and pointer capture. */
  getElement: () => HTMLElement;

  getOrientation: () => 'horizontal' | 'vertical';
  isRTL: () => boolean;
  isDisabled: () => boolean;

  // For keyboard: what's the current value as a percent?
  getPercent: () => number;
  getStepPercent: () => number;
  getLargeStepPercent: () => number;

  onValueChange?: ((percent: number) => void) | undefined;
  onValueCommit?: ((percent: number) => void) | undefined;
  onDragStart?: (() => void) | undefined;
  onDragEnd?: (() => void) | undefined;
}

export interface SliderRootProps {
  onPointerDown: (event: UIPointerEvent) => void;
  onPointerMove: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
}

export interface SliderThumbProps {
  onKeyDown: (event: UIKeyboardEvent) => void;
  onFocus: (event: UIEvent) => void;
  onBlur: (event: UIEvent) => void;
}

export interface SliderHandle {
  interaction: State<SliderInteraction>;
  rootProps: SliderRootProps;
  thumbProps: SliderThumbProps;
  destroy: () => void;
}

export function createSlider(options: SliderOptions): SliderHandle;
```

**Behavior:**

1. Creates `WritableState<SliderInteraction>` via `createState()`.
2. **Pointer down on root:** Capture pointer, start drag. Compute percent from pointer position. Patch `{ dragging: true, dragPercent, pointerPercent }`. Call `onDragStart`. Call `onValueChange(dragPercent)`.
3. **Pointer move:** If dragging — update `dragPercent`, call `onValueChange`. If not dragging — update `pointerPercent` only (hover preview). Patch to state.
4. **Pointer up (window listener):** End drag. Call `onValueCommit(dragPercent)`. Call `onDragEnd`. Patch `{ dragging: false }`. Release pointer capture.
5. **Pointer leave:** If not dragging, reset `{ pointing: false, pointerPercent: 0 }`.
6. **Keyboard (on thumb):**
   - `ArrowRight`/`ArrowUp`: increment by step percent
   - `ArrowLeft`/`ArrowDown`: decrement by step percent
   - `PageUp`: increment by large step percent
   - `PageDown`: decrement by large step percent
   - `Home`: go to 0%
   - `End`: go to 100%
   - RTL: invert horizontal arrows
   - Vertical: Up = increase, Down = decrease
   - Call `onValueChange` then `onValueCommit` on each key.
7. **Focus/blur on thumb:** Patch `{ focused }`.
8. **Disabled check:** All handlers early-return if `isDisabled()`.

**Internal helper:**

```ts
function getPercentFromPointerEvent(
  event: UIPointerEvent,
  rect: DOMRect,
  orientation: 'horizontal' | 'vertical',
  isRTL: boolean
): number;
// Horizontal: (clientX - rect.left) / rect.width * 100, flipped for RTL.
// Vertical: (rect.bottom - clientY) / rect.height * 100 (bottom = 0%).
// Clamped to [0, 100].
```

**Notes:**
- The element reference (`getElement()`) is used for `getBoundingClientRect()` in percent calculations and `setPointerCapture()`/`releasePointerCapture()` during drag. `UIPointerEvent` does not carry `target`/`currentTarget` (consistent with the existing `UIEvent` pattern) — the element reference comes from options, not events.
- On pointerdown, the factory calls `getElement().setPointerCapture(event.pointerId)`. This means the Root element itself captures — all subsequent pointermove/pointerup events flow to it regardless of mouse position.
- The `destroy()` function aborts internal AbortController (cleans up any listeners).
- `onPointerMove` on the root also handles pointerup detection (via `event.buttons === 0` fallback for edge cases where pointerup fires on window but state is stale).
- RTL detection: `isRTL()` callback (from options) should use `isRTL(element)` from `@videojs/utils/dom` (added in PR 1). Cache the result on `pointerdown` — direction doesn't change mid-drag.
- The `onValueChange` callback can be wrapped with `rafThrottle` from `@videojs/utils/dom` by the consumer (e.g., `TimeSlider.Root` throttles seek events). The factory itself fires callbacks on every interaction.

### 2.3 CSS Variable Formatting

**File:** `packages/core/src/dom/ui/slider-css-vars.ts`

```ts
import { SliderCSSVars } from '../../core/ui/slider/slider-css-vars';
import type { SliderState } from '../../core/ui/slider/slider-core';
import type { TimeSliderState } from '../../core/ui/slider/time-slider-core';

export function getSliderCSSVars(state: SliderState): Record<string, string> {
  return {
    [SliderCSSVars.fill]: `${state.fillPercent.toFixed(3)}%`,
    [SliderCSSVars.pointer]: `${state.pointerPercent.toFixed(3)}%`,
  };
}

export function getTimeSliderCSSVars(state: TimeSliderState): Record<string, string> {
  return {
    ...getSliderCSSVars(state),
    [SliderCSSVars.buffer]: `${state.bufferPercent.toFixed(3)}%`,
  };
}
```

### 2.4 Barrel Export

Add exports to `packages/core/src/dom/index.ts`:

```ts
export * from './ui/event';  // Exposes UIEvent, UIKeyboardEvent, UIPointerEvent
export * from './ui/slider';
export * from './ui/slider-css-vars';
```

Note: `./ui/event` is not currently exported from the barrel. Adding it exposes `UIEvent`,
`UIKeyboardEvent`, and the new `UIPointerEvent` as public API from `@videojs/core/dom`.
This is intentional — these types are needed by consumers building custom interaction handlers.

### 2.5 Tests

**File:** `packages/core/src/dom/ui/tests/slider.test.ts`

- `createSlider` returns correct shape
- Pointer down starts drag, `onDragStart` called, interaction state updates
- Pointer move during drag calls `onValueChange` with percent
- Pointer up calls `onValueCommit`, `onDragEnd`, drag ends
- Pointer move without drag updates `pointerPercent` (hover)
- Pointer leave resets pointing
- Keyboard: arrow keys increment/decrement, Page/Home/End, RTL flip, vertical inversion
- Disabled handlers no-op
- Destroy cleans up

**File:** `packages/core/src/dom/ui/tests/slider-css-vars.test.ts`

- `getSliderCSSVars`: correct keys and 3-decimal formatting
- `getTimeSliderCSSVars`: includes buffer var

### 2.6 Verify

```bash
pnpm -F @videojs/core test src/dom/ui/tests/slider
pnpm -F @videojs/core build
pnpm typecheck
pnpm lint:fix:file <changed-files>
```

---

## PR 3: React Components

**Branch:** `feat/slider-react`
**Base:** `feat/slider-dom`
**Package:** `@videojs/react`

### 3.1 Slider Context

**File:** `packages/react/src/ui/slider/slider-context.ts`

Internal context carrying shared slider state for child parts. The root element applies
ARIA attrs directly via `core.getAttrs(state)` and provides interaction data to children.
No `thumbAttrs` in context — `getAttrs()` returns an inferred type (no named interface).

```ts
interface SliderContextValue {
  state: SliderState;
  thumbProps: SliderThumbProps;
  stateAttrMap: StateAttrMap<SliderState>;
  getAttrs: (state: SliderState) => object; // core.getAttrs bound to core instance
  formatValue?: (value: number, type: 'current' | 'pointer') => string;
}
```

The `stateAttrMap` ensures generic parts only generate data attributes for the correct keys
(e.g., `data-dragging`, `data-disabled`) — not for every state property like `value` or
`fillPercent`. Domain roots provide their specific map: `SliderDataAttrs` for generic/volume,
`TimeSliderDataAttrs` for time (adds `data-seeking`).

**Note:** This is the first UI component in the codebase to create its own React/Lit context.
Existing components (Time.Value, etc.) read from the player store directly. The slider needs
component-level context because child parts need shared interaction state from `createSlider()`,
not from the player store. This is a justified new pattern.

### 3.2 `useSlider` Hook

**File:** `packages/react/src/ui/hooks/use-slider.ts`

Encapsulates `createSlider()` lifecycle for React. Uses `useSnapshot` from `@videojs/store/react` to subscribe to `State<SliderInteraction>`.

```ts
interface UseSliderOptions {
  core: SliderCore;
  computeState: (interaction: SliderInteraction) => SliderState;
  onValueChange?: (percent: number) => void;
  onValueCommit?: (percent: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  isRTL?: boolean;
}

interface UseSliderResult {
  state: SliderState;
  rootProps: SliderRootProps;
  thumbProps: SliderThumbProps;
  cssVars: Record<string, string>;
}

function useSlider(options: UseSliderOptions): UseSliderResult;
```

**Implementation:**
- `useState(() => createSlider(...))` for lazy init.
- `useSnapshot(slider.interaction)` to subscribe to `State<SliderInteraction>` (from PR 0).
- Compute `state = options.computeState(interaction)`.
- Compute `cssVars = getSliderCSSVars(state)`.
- On unmount: call `slider.destroy()`.
- Memoize `SliderOptions` callbacks with refs to avoid recreating the slider.

### 3.3 Generic `Slider.Root`

**File:** `packages/react/src/ui/slider/slider-root.tsx`

The generic root creates its own `SliderCore`, calls `useSlider`, provides `SliderContext`, renders a `<div>` with CSS vars and pointer handlers.

All React component files start with `'use client';` directive. Parameter is always named
`componentProps`. Destructure `render, className, style` first, then core props, then `...elementProps`.

```tsx
'use client';

export interface SliderRootProps extends UIComponentProps<'div', SliderCore.State>, SliderCore.Props {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const Root = forwardRef(function SliderRoot(
  componentProps: SliderRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, min, max, step, largeStep,
    orientation, disabled, thumbAlignment, value, defaultValue,
    onValueChange, onValueCommit, onDragStart, onDragEnd,
    ...elementProps } = componentProps;

  // 1. Lazy-init SliderCore, call setProps.
  const [core] = useState(() => new SliderCore());
  core.setProps({ min, max, step, largeStep, orientation, disabled, thumbAlignment });

  // 2. Call useSlider with generic computeState.
  // 3. For controlled: value comes from props. For uncontrolled: track internal state.
  // 4. Provide SliderContext.
  // 5. CSS vars passed as { style: cssVarsObj } in props array:
  return renderElement('div', { render, className, style }, {
    state,
    stateAttrMap: SliderDataAttrs,
    ref: [forwardedRef],
    props: [core.getAttrs(state), { style: cssVars }, elementProps],
  });
});

export namespace Root {
  export type Props = SliderRootProps;
  export type State = SliderCore.State;
}
```

### 3.4 Generic Parts

All generic parts consume `SliderContext` for data attributes. Each is a thin `forwardRef` wrapper around `renderElement`.

**`Slider.Track`** — `packages/react/src/ui/slider/slider-track.tsx`
- Renders `<div>` with data attributes from context state.
- No special behavior.

**`Slider.Fill`** — `packages/react/src/ui/slider/slider-fill.tsx`
- Renders `<div>` with data attributes.
- Sizing is pure CSS via `var(--media-slider-fill)`.

**`Slider.Buffer`** — `packages/react/src/ui/slider/slider-buffer.tsx`
- Renders `<div>` with data attributes.
- Sizing is pure CSS via `var(--media-slider-buffer)`.

**`Slider.Thumb`** — `packages/react/src/ui/slider/slider-thumb.tsx`
- Renders `<div>` with `role="slider"`, ARIA attrs from context `thumbAttrs`.
- Event handlers from context `thumbProps`.
- `tabIndex={0}`, `autocomplete="off"`.
- Data attributes from context state.

**`Slider.Value`** — `packages/react/src/ui/slider/slider-value.tsx`
- Renders `<output>` with `aria-live="off"`.
- Props: `type?: 'current' | 'pointer'`.
- Reads formatted value from context `formatValue(value, type)`.
- Falls back to raw number if no formatter.

### 3.5 Domain Roots

**`TimeSlider.Root`** — `packages/react/src/ui/time-slider/time-slider-root.tsx`

- `'use client';` directive at line 1.
- Connects to media store: `usePlayer(selectTime)`, `usePlayer(selectBuffer)`.
- **Feature guard:** `if (!time) { if (__DEV__) logMissingFeature('TimeSlider', 'time'); return null; }`
  Same for buffer (optional — buffer can be absent without breaking, just no buffer bar).
- Computes `bufferedEnd` from `MediaBufferState.buffered` (last range end, or 0).
- Lazy-inits `TimeSliderCore`, calls `setProps`.
- Calls `useSlider` with `computeState = (interaction) => core.getTimeState(interaction, mediaState)`.
- `onValueChange`: visual update (CSS vars refresh).
- `onValueCommit`: calls `mediaState.seek(core.valueFromPercent(percent))`, throttled via `seekThrottle` prop (default 100ms, trailing edge).
- `onDragStart`/`onDragEnd`: user callbacks.
- Provides `SliderContext` with time formatting: `formatValue = (value, type) => formatTime(value)`.
- Uses `TimeSliderDataAttrs` for state-to-data-attr mapping.
- Uses `getTimeSliderCSSVars` for CSS vars (includes buffer).
- Props: `label`, `seekThrottle`, `disabled`, `thumbAlignment`, `step` (default 0.1 in seconds), `largeStep` (default 10 seconds), `render`, `onDragStart`, `onDragEnd`.
- renderElement CSS vars: `props: [core.getAttrs(state), { style: cssVars }, elementProps]`.
- `export namespace Root { export type Props = TimeSliderRootProps; export type State = TimeSliderCore.State; }`

**`VolumeSlider.Root`** — `packages/react/src/ui/volume-slider/volume-slider-root.tsx`

- `'use client';` directive at line 1.
- Connects to media store: `usePlayer(selectVolume)`.
- **Feature guard:** `if (!volume) { if (__DEV__) logMissingFeature('VolumeSlider', 'volume'); return null; }`
- Lazy-inits `VolumeSliderCore`, calls `setProps`.
- Calls `useSlider` with `computeState = (interaction) => core.getVolumeState(interaction, mediaState)`.
- `onValueChange`: calls `mediaState.changeVolume(core.valueFromPercent(percent) / 100)` immediately. Volume changes are cheap and instant — no throttle.
- `onValueCommit`: same as `onValueChange` (no separate commit behavior for volume).
- Provides `SliderContext` with percentage formatting: `formatValue = (value) => Math.round(value) + '%'`.
- Uses `SliderDataAttrs` for state-to-data-attr mapping.
- Uses `getSliderCSSVars` for CSS vars (no buffer).
- Props: `label`, `orientation`, `disabled`, `thumbAlignment`, `step` (default 1%), `largeStep` (default 10%), `render`, `onDragStart`, `onDragEnd`.
- renderElement CSS vars: `props: [core.getAttrs(state), { style: cssVars }, elementProps]`.
- `export namespace Root { export type Props = VolumeSliderRootProps; export type State = VolumeSliderCore.State; }`

### 3.6 Barrel Files

**`packages/react/src/ui/slider/index.ts`:**

```ts
export * as Slider from './index.parts';
```

**`packages/react/src/ui/slider/index.parts.ts`:**

```ts
export { Root, type SliderRootProps as RootProps } from './slider-root';
export { Track, type SliderTrackProps as TrackProps } from './slider-track';
export { Fill, type SliderFillProps as FillProps } from './slider-fill';
export { Buffer, type SliderBufferProps as BufferProps } from './slider-buffer';
export { Thumb, type SliderThumbProps as ThumbProps } from './slider-thumb';
export { Value, type SliderValueProps as ValueProps } from './slider-value';
```

**`packages/react/src/ui/time-slider/index.ts`:**

```ts
export * as TimeSlider from './index.parts';
```

**`packages/react/src/ui/time-slider/index.parts.ts`:**

```ts
export { Root, type TimeSliderRootProps as RootProps } from './time-slider-root';
export { Track, Fill, Buffer, Thumb, Value } from '../slider/index.parts';
export type { SliderTrackProps as TrackProps, SliderFillProps as FillProps,
  SliderBufferProps as BufferProps, SliderThumbProps as ThumbProps,
  SliderValueProps as ValueProps } from '../slider/index.parts';
```

**`packages/react/src/ui/volume-slider/index.ts`:**

```ts
export * as VolumeSlider from './index.parts';
```

**`packages/react/src/ui/volume-slider/index.parts.ts`:**

```ts
export { Root, type VolumeSliderRootProps as RootProps } from './volume-slider-root';
// Buffer is re-exported for API consistency but renders nothing useful
// for volume sliders — VolumeSlider.Root does not set --media-slider-buffer.
export { Track, Fill, Buffer, Thumb, Value } from '../slider/index.parts';
export type { SliderTrackProps as TrackProps, SliderFillProps as FillProps,
  SliderBufferProps as BufferProps, SliderThumbProps as ThumbProps,
  SliderValueProps as ValueProps } from '../slider/index.parts';
```

Add to `packages/react/src/index.ts`:

```ts
export { Slider } from './ui/slider';
export { TimeSlider } from './ui/time-slider';
export { VolumeSlider } from './ui/volume-slider';
```

### 3.7 Sandbox Demo (gitignored)

Update `packages/sandbox/src/react/main.tsx` (or create a new route) with a working slider demo:

```tsx
<Provider>
  <Container>
    <Video src="..." />
    <TimeSlider.Root>
      <TimeSlider.Track>
        <TimeSlider.Fill />
        <TimeSlider.Buffer />
      </TimeSlider.Track>
      <TimeSlider.Thumb />
    </TimeSlider.Root>
    <VolumeSlider.Root>
      <VolumeSlider.Track>
        <VolumeSlider.Fill />
      </VolumeSlider.Track>
      <VolumeSlider.Thumb />
    </VolumeSlider.Root>
  </Container>
</Provider>
```

### 3.8 Tests

**File:** `packages/react/src/ui/slider/tests/slider.test.tsx`

- Generic `Slider.Root` renders with correct data attributes and CSS vars.
- `Slider.Thumb` has correct ARIA attributes.
- `Slider.Value` renders formatted output.
- Context propagation to children.
- `onValueChange` / `onValueCommit` callbacks fire.

**File:** `packages/react/src/ui/time-slider/tests/time-slider.test.tsx`

- Renders with mocked player store.
- CSS vars include buffer.
- `data-seeking` attribute.
- Seek is called on value commit.
- Time formatting in `Value`.

**File:** `packages/react/src/ui/volume-slider/tests/volume-slider.test.tsx`

- Renders with mocked player store.
- Fill is 0 when muted.
- `changeVolume` called on value change.
- `aria-valuetext` includes muted state.

### 3.9 Verify

```bash
pnpm -F @videojs/react test src/ui/slider
pnpm -F @videojs/react test src/ui/time-slider
pnpm -F @videojs/react test src/ui/volume-slider
pnpm -F @videojs/react build
pnpm typecheck
pnpm lint:fix:file <changed-files>
```

---

## PR 4: HTML Custom Elements

**Branch:** `feat/slider-html`
**Base:** `feat/slider-dom`
**Package:** `@videojs/html`

### 4.1 Event Types

**File:** `packages/html/src/ui/slider/slider-events.ts`

```ts
export interface SliderValueEventDetail {
  value: number;
}

export interface SliderEventMap {
  'value-change': CustomEvent<SliderValueEventDetail>;
  'value-commit': CustomEvent<SliderValueEventDetail>;
  'drag-start': CustomEvent<void>;
  'drag-end': CustomEvent<void>;
}

export interface DomainSliderEventMap {
  'drag-start': CustomEvent<void>;
  'drag-end': CustomEvent<void>;
}
```

### 4.2 `SliderElement` — Generic Root

**File:** `packages/html/src/ui/slider/slider-element.ts`

Extends `MediaElement`. The generic slider root handles pointer events, CSS variables, data attributes, and custom DOM events. Can be used standalone (without domain sliders) for custom slider use cases.

```ts
import type { PropertyDeclarationMap } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

export class SliderElement extends MediaElement {
  static readonly tagName = 'media-slider';

  static override properties = {
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    orientation: { type: String },
    disabled: { type: Boolean },
    thumbAlignment: { type: String, attribute: 'thumb-alignment' },
  } satisfies PropertyDeclarationMap<keyof SliderCore.Props>;

  // Property defaults from core
  value = 0;
  min = SliderCore.defaultProps.min;
  max = SliderCore.defaultProps.max;
  step = SliderCore.defaultProps.step;
  largeStep = SliderCore.defaultProps.largeStep;
  orientation = SliderCore.defaultProps.orientation;
  disabled = SliderCore.defaultProps.disabled;
  thumbAlignment = SliderCore.defaultProps.thumbAlignment;

  readonly #core = new SliderCore();
  #slider: SliderHandle | null = null;
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // 1. Create AbortController
    // 2. Create slider via createSlider() with options:
    //    - getElement: () => this
    //    - getOrientation, isRTL (via isRTL from @videojs/utils/dom), isDisabled
    //    - getPercent, getStepPercent, getLargeStepPercent
    //    - onValueChange: dispatch 'value-change' event
    //    - onValueCommit: dispatch 'value-commit' event
    //    - onDragStart: dispatch 'drag-start' event
    //    - onDragEnd: dispatch 'drag-end' event
    // 3. Apply rootProps to this element via applyElementProps(this, rootProps, signal)
    // 4. Subscribe to interaction state for re-renders:
    //    slider.interaction.subscribe(() => this.requestUpdate(),
    //      { signal: this.#disconnect.signal })
    // 5. Set touch-action: none, user-select: none, contain: layout style
    // 6. Provide sliderContext via ContextProvider
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // 1. slider.destroy()
    // 2. abort controller (also cleans up interaction subscription)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    // Recompute state from core + interaction
    // Apply CSS vars via this.style.setProperty(key, value) — NOT applyElementProps
    // Apply data attrs via applyStateDataAttrs(this, state, SliderDataAttrs)
    // Apply ARIA via applyElementProps(this, this.#core.getAttrs(state))
    // Update sliderContext provider value
  }
}
```

### 4.3 Structural Part Elements

All child elements consume `sliderContext` via `ContextConsumer` and apply data attributes
from the context's `stateAttrMap` in their `update()` method. This ensures data attributes
like `data-dragging`, `data-pointing`, `data-interactive`, `data-orientation`, `data-disabled`
propagate to every child.

**`SliderTrackElement`** — `packages/html/src/ui/slider/slider-track-element.ts`
```ts
export class SliderTrackElement extends MediaElement {
  static readonly tagName = 'media-slider-track';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  protected override update(): void {
    super.update();
    const ctx = this.#ctx.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
```

**`SliderFillElement`** — `packages/html/src/ui/slider/slider-fill-element.ts`
```ts
export class SliderFillElement extends MediaElement {
  static readonly tagName = 'media-slider-fill';
  // Same ContextConsumer + applyStateDataAttrs pattern as Track
}
```

**`SliderBufferElement`** — `packages/html/src/ui/slider/slider-buffer-element.ts`
```ts
export class SliderBufferElement extends MediaElement {
  static readonly tagName = 'media-slider-buffer';
  // Same ContextConsumer + applyStateDataAttrs pattern as Track
}
```

### 4.4 `SliderThumbElement`

**File:** `packages/html/src/ui/slider/slider-thumb-element.ts`

```ts
export class SliderThumbElement extends MediaElement {
  static readonly tagName = 'media-slider-thumb';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  override connectedCallback(): void {
    super.connectedCallback();
    // Set role="slider", tabindex="0", autocomplete="off" as initial attributes
  }

  protected override update(): void {
    super.update();
    const ctx = this.#ctx.value;
    if (!ctx) return;

    // Apply ARIA from context thumbAttrs
    applyElementProps(this, ctx.thumbAttrs);
    // Apply keyboard/focus handlers from context thumbProps
    // (needs signal management — apply once in connectedCallback or re-apply)
    applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
```

**Note:** `thumbProps` (keyboard/focus handlers) should be applied once in `connectedCallback`
with a signal, not re-applied every update. The root element can apply them directly to the
thumb child, or the thumb can read them from context on first connect.

### 4.5 `SliderValueElement`

**File:** `packages/html/src/ui/slider/slider-value-element.ts`

```ts
export class SliderValueElement extends MediaElement {
  static readonly tagName = 'media-slider-value';

  static override properties = {
    type: { type: String },  // 'current' | 'pointer'
  };

  type: 'current' | 'pointer' = 'current';

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-live', 'off');
  }

  protected override update(): void {
    super.update();
    const ctx = this.#ctx.value;
    if (!ctx) return;

    // Get value based on type
    const value = this.type === 'pointer'
      ? ctx.state.pointerPercent
      : ctx.state.value;

    // Format and set text content
    this.textContent = ctx.formatValue
      ? ctx.formatValue(value, this.type)
      : String(Math.round(value));

    applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
```

### 4.6 Context Communication (HTML)

The HTML slider needs a way for the root element to communicate state to child elements. Options:

- **Context** (`@videojs/element/context`): The `SliderElement` provides a context that children consume via `ContextConsumer`. This is consistent with how `PlayerController` uses `playerContext`.
- Create a `sliderContext` with `createContext()`.
- Root provides it, structural children consume it.

```ts
// packages/html/src/ui/slider/slider-context.ts
import { createContext } from '@videojs/element/context';
import type { StateAttrMap } from '@videojs/core';

export interface SliderContextValue {
  state: SliderState;
  thumbProps: SliderThumbProps;
  stateAttrMap: StateAttrMap<SliderState>;
  formatValue?: (value: number, type: 'current' | 'pointer') => string;
}

const SLIDER_CONTEXT_KEY = Symbol('@videojs/slider');
export const sliderContext = createContext<SliderContextValue, typeof SLIDER_CONTEXT_KEY>(SLIDER_CONTEXT_KEY);
```

Root provides via `ContextProvider`. Children consume via `ContextConsumer` and apply
data-attrs/ARIA in their `update()` method. The `stateAttrMap` ensures only the correct
state keys become data attributes (not `value`, `fillPercent`, etc.).

### 4.7 Domain Elements

**`TimeSliderElement`** — `packages/html/src/ui/time-slider/time-slider-element.ts`

```ts
import type { PropertyDeclarationMap } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

export class TimeSliderElement extends MediaElement {
  static readonly tagName = 'media-time-slider';

  static override properties = {
    label: { type: String },
    seekThrottle: { type: Number, attribute: 'seek-throttle' },
    disabled: { type: Boolean },
    thumbAlignment: { type: String, attribute: 'thumb-alignment' },
  } satisfies PropertyDeclarationMap<keyof TimeSliderCore.Props>;

  label = TimeSliderCore.defaultProps.label;
  seekThrottle = 100;
  disabled = TimeSliderCore.defaultProps.disabled;
  thumbAlignment = TimeSliderCore.defaultProps.thumbAlignment;

  readonly #core = new TimeSliderCore();
  readonly #timeState = new PlayerController(this, playerContext, selectTime);
  readonly #bufferState = new PlayerController(this, playerContext, selectBuffer);
  #slider: SliderHandle | null = null;
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // 1. Create AbortController
    // 2. Create slider via createSlider({ getElement: () => this, ... })
    // 3. min=0, max=duration always
    // 4. onValueChange: visual update only (triggers re-render)
    // 5. onValueCommit: timeState.seek(core.valueFromPercent(percent)), throttled
    // 6. Apply rootProps via applyElementProps(this, rootProps, signal)
    // 7. Subscribe: slider.interaction.subscribe(() => this.requestUpdate(), { signal })
    // 8. Set contain, touch-action, user-select
    // 9. Provide sliderContext via ContextProvider
    // 10. DEV: logMissingFeature if !this.#timeState.value
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const media = this.#timeState.value;
    if (!media) return;
    // Compute TimeSliderState from core + interaction + media state
    // Apply CSS vars via this.style.setProperty() using getTimeSliderCSSVars()
    // Apply data attrs via applyStateDataAttrs(this, state, TimeSliderDataAttrs)
    // Apply ARIA via applyElementProps(this, this.#core.getAttrs(state))
    // Update sliderContext provider value
  }
}
```

**`VolumeSliderElement`** — `packages/html/src/ui/volume-slider/volume-slider-element.ts`

```ts
import type { PropertyDeclarationMap } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

export class VolumeSliderElement extends MediaElement {
  static readonly tagName = 'media-volume-slider';

  static override properties = {
    label: { type: String },
    orientation: { type: String },
    disabled: { type: Boolean },
    thumbAlignment: { type: String, attribute: 'thumb-alignment' },
  } satisfies PropertyDeclarationMap<keyof VolumeSliderCore.Props>;

  label = VolumeSliderCore.defaultProps.label;
  orientation = VolumeSliderCore.defaultProps.orientation;
  disabled = VolumeSliderCore.defaultProps.disabled;
  thumbAlignment = VolumeSliderCore.defaultProps.thumbAlignment;

  readonly #core = new VolumeSliderCore();
  readonly #volumeState = new PlayerController(this, playerContext, selectVolume);
  #slider: SliderHandle | null = null;
  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    // 1. Create AbortController
    // 2. Create slider via createSlider({ getElement: () => this, ... })
    // 3. onValueChange: volumeState.changeVolume(percent / 100)
    // 4. Apply rootProps via applyElementProps(this, rootProps, signal)
    // 5. Subscribe: slider.interaction.subscribe(() => this.requestUpdate(), { signal })
    // 6. Provide sliderContext via ContextProvider
    // 7. DEV: logMissingFeature if !this.#volumeState.value
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    const media = this.#volumeState.value;
    if (!media) return;
    // Compute VolumeSliderState from core + interaction + volume state
    // Apply CSS vars via this.style.setProperty() using getSliderCSSVars()
    // Apply data attrs via applyStateDataAttrs(this, state, SliderDataAttrs)
    // Apply ARIA via applyElementProps(this, this.#core.getAttrs(state))
    // Update sliderContext provider value
  }
}
```

### 4.8 Registration Files

Shared child elements are extracted into their own define modules. Both `time-slider` and
`volume-slider` import these as side-effect imports. The ES module singleton guarantee ensures
each executes only once — no `defineCustomElement` guard needed.

**Shared define modules:**

**`packages/html/src/define/ui/slider-track.ts`:**
```ts
import { SliderTrackElement } from '../../ui/slider/slider-track-element';

customElements.define(SliderTrackElement.tagName, SliderTrackElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderTrackElement.tagName]: SliderTrackElement;
  }
}
```

**`packages/html/src/define/ui/slider-fill.ts`:**
```ts
import { SliderFillElement } from '../../ui/slider/slider-fill-element';

customElements.define(SliderFillElement.tagName, SliderFillElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderFillElement.tagName]: SliderFillElement;
  }
}
```

**`packages/html/src/define/ui/slider-buffer.ts`:**
```ts
import { SliderBufferElement } from '../../ui/slider/slider-buffer-element';

customElements.define(SliderBufferElement.tagName, SliderBufferElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderBufferElement.tagName]: SliderBufferElement;
  }
}
```

**`packages/html/src/define/ui/slider-thumb.ts`:**
```ts
import { SliderThumbElement } from '../../ui/slider/slider-thumb-element';

customElements.define(SliderThumbElement.tagName, SliderThumbElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderThumbElement.tagName]: SliderThumbElement;
  }
}
```

**`packages/html/src/define/ui/slider-value.ts`:**
```ts
import { SliderValueElement } from '../../ui/slider/slider-value-element';

customElements.define(SliderValueElement.tagName, SliderValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderValueElement.tagName]: SliderValueElement;
  }
}
```

**Domain define modules (import shared as side effects):**

**`packages/html/src/define/ui/time-slider.ts`:**
```ts
import { TimeSliderElement } from '../../ui/time-slider/time-slider-element';

// Side-effect imports — each module executes once (ES module singleton)
import './slider-track';
import './slider-fill';
import './slider-buffer';
import './slider-thumb';
import './slider-value';

customElements.define(TimeSliderElement.tagName, TimeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSliderElement.tagName]: TimeSliderElement;
  }
}
```

**`packages/html/src/define/ui/volume-slider.ts`:**
```ts
import { VolumeSliderElement } from '../../ui/volume-slider/volume-slider-element';

// Side-effect imports — shared modules already executed if time-slider was imported first
import './slider-track';
import './slider-fill';
import './slider-thumb';
import './slider-value';

customElements.define(VolumeSliderElement.tagName, VolumeSliderElement);

declare global {
  interface HTMLElementTagNameMap {
    [VolumeSliderElement.tagName]: VolumeSliderElement;
  }
}
```

**Package.json exports** — No changes needed. The existing wildcard glob in `packages/html/package.json`
already covers any new files added to `src/define/ui/`:
```json
"./ui/*": { "types": "...", "development": "...", "default": "..." }
```
New define files (`time-slider.ts`, `volume-slider.ts`, `slider-track.ts`, etc.) are automatically
exposed as `@videojs/html/ui/time-slider`, `@videojs/html/ui/slider-track`, etc.

### 4.9 Barrel Export

Add to `packages/html/src/index.ts`:
```ts
export { SliderElement } from './ui/slider/slider-element';
export { SliderTrackElement } from './ui/slider/slider-track-element';
export { SliderFillElement } from './ui/slider/slider-fill-element';
export { SliderBufferElement } from './ui/slider/slider-buffer-element';
export { SliderThumbElement } from './ui/slider/slider-thumb-element';
export { SliderValueElement } from './ui/slider/slider-value-element';
export { TimeSliderElement } from './ui/time-slider/time-slider-element';
export { VolumeSliderElement } from './ui/volume-slider/volume-slider-element';
```

### 4.10 Sandbox Demo (gitignored)

Update `packages/sandbox/src/html/main.ts` with:

```html
<media-time-slider>
  <media-slider-track>
    <media-slider-fill></media-slider-fill>
    <media-slider-buffer></media-slider-buffer>
  </media-slider-track>
  <media-slider-thumb></media-slider-thumb>
</media-time-slider>

<media-volume-slider>
  <media-slider-track>
    <media-slider-fill></media-slider-fill>
  </media-slider-track>
  <media-slider-thumb></media-slider-thumb>
</media-volume-slider>
```

### 4.11 Tests

**File:** `packages/html/src/ui/slider/tests/slider-element.test.ts`
- Element registers with correct tag name
- Reactive properties reflect to attributes
- CSS vars set on host
- Data attributes propagate
- Custom events fire: `value-change`, `value-commit`, `drag-start`, `drag-end`
- Thumb child gets ARIA

**File:** `packages/html/src/ui/time-slider/tests/time-slider-element.test.ts`
- Connects to store, renders time state
- Buffer CSS var present
- `data-seeking` attribute
- Seek called on commit

**File:** `packages/html/src/ui/volume-slider/tests/volume-slider-element.test.ts`
- Volume changes on value change
- Muted fill is 0
- Vertical orientation support

### 4.12 Verify

```bash
pnpm -F @videojs/html test src/ui/slider
pnpm -F @videojs/html test src/ui/time-slider
pnpm -F @videojs/html test src/ui/volume-slider
pnpm -F @videojs/html build
pnpm typecheck
pnpm lint:fix:file <changed-files>
```

---

## PR 5: React Preview Component

**Branch:** `feat/slider-preview-react`
**Base:** `feat/slider-react`
**Package:** `@videojs/react`

### Positioning Strategy (CSS-Only)

No Floating UI dependency. Slider preview uses pure CSS positioning with JS-computed clamping,
matching Vidstack's proven approach:

- Absolute positioning within the slider root
- Horizontal position: `left: min(max(0px, calc(var(--media-slider-pointer) - halfWidth)), calc(100% - fullWidth))`
- Vertical offset: `bottom: calc(100% + var(--media-slider-preview-offset, 8px))`
- `ResizeObserver` on the preview element recalculates clamping when content changes size
- Supports `noClamp` prop for previews that intentionally extend beyond slider bounds
- The `--media-slider-pointer` CSS variable is already set by the slider root (from PR 2)

### 5.1 `Slider.Preview`

**File:** `packages/react/src/ui/slider/slider-preview.tsx`

```tsx
export interface SliderPreviewProps extends UIComponentProps<'div', SliderState> {
  noClamp?: boolean;
}

export const Preview = forwardRef(function SliderPreview(
  props: SliderPreviewProps,
  ref: ForwardedRef<HTMLDivElement>
) {
  const context = useContext(SliderContext);
  const previewRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // ResizeObserver tracks preview width for clamping
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Compute clamped left position
  const halfWidth = width / 2;
  const style = props.noClamp
    ? { left: `calc(var(--media-slider-pointer) - ${halfWidth}px)` }
    : { left: `min(max(0px, calc(var(--media-slider-pointer) - ${halfWidth}px)), calc(100% - ${width}px))` };

  // Render <div> with position: absolute, clamped style, data attributes from context.
});
```

Re-export from `Slider`, `TimeSlider`, and `VolumeSlider` namespaces.

### 5.2 Tests

- Preview renders within slider context
- Data attributes propagate
- Clamping style applied by default
- `noClamp` disables clamping

### 5.3 Verify

```bash
pnpm -F @videojs/react test src/ui/slider/tests/slider-preview
pnpm -F @videojs/react build
pnpm typecheck
```

---

## PR 6: HTML Preview Element

**Branch:** `feat/slider-preview-html`
**Base:** `feat/slider-html`
**Package:** `@videojs/html`

### 6.1 `SliderPreviewElement`

**File:** `packages/html/src/ui/slider/slider-preview-element.ts`

```ts
export class SliderPreviewElement extends MediaElement {
  static readonly tagName = 'media-slider-preview';

  static override properties = {
    noClamp: { type: Boolean, attribute: 'no-clamp' },
  };

  noClamp = false;

  readonly #ctx = new ContextConsumer(this, {
    context: sliderContext,
    subscribe: true,
  });

  #resizeObserver: ResizeObserver | null = null;
  #width = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    // Set position: absolute, width: max-content
    this.#resizeObserver = new ResizeObserver(([entry]) => {
      this.#width = entry.contentRect.width;
      this.#updatePosition();
    });
    this.#resizeObserver.observe(this);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
  }

  #updatePosition(): void {
    const halfWidth = this.#width / 2;
    if (this.noClamp) {
      this.style.left = `calc(var(--media-slider-pointer) - ${halfWidth}px)`;
    } else {
      this.style.left = `min(max(0px, calc(var(--media-slider-pointer) - ${halfWidth}px)), calc(100% - ${this.#width}px))`;
    }
  }

  protected override update(): void {
    super.update();
    const ctx = this.#ctx.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
    this.#updatePosition();
  }
}
```

### 6.2 Registration

**`packages/html/src/define/ui/slider-preview.ts`:**

```ts
import { SliderPreviewElement } from '../../ui/slider/slider-preview-element';
customElements.define(SliderPreviewElement.tagName, SliderPreviewElement);

declare global {
  interface HTMLElementTagNameMap {
    [SliderPreviewElement.tagName]: SliderPreviewElement;
  }
}
```

No changes needed to `packages/html/package.json` — the existing `"./ui/*"` wildcard
covers `@videojs/html/ui/slider-preview` automatically.

### 6.3 Tests & Verify

```bash
pnpm -F @videojs/html test src/ui/slider/tests/slider-preview
pnpm -F @videojs/html build
pnpm typecheck
```

---

## File Structure Summary

```
packages/store/src/react/hooks/
  use-snapshot.ts                      # useSnapshot hook (PR 0)
  tests/use-snapshot.test.ts

packages/utils/src/time/
  format.ts                            # Fix formatTimeAsPhrase(0)
  tests/format.test.ts                 # Add zero-seconds test

packages/utils/src/dom/
  raf-throttle.ts                      # rafThrottle utility (PR 1)
  direction.ts                         # isRTL utility (PR 1)
  tests/
    raf-throttle.test.ts
    direction.test.ts

packages/core/src/core/ui/slider/
  slider-core.ts                       # SliderCore class + types + utilities
  time-slider-core.ts                  # TimeSliderCore class + types
  volume-slider-core.ts                # VolumeSliderCore class + types
  slider-data-attrs.ts                 # SliderDataAttrs, TimeSliderDataAttrs
  slider-css-vars.ts                   # SliderCSSVars constant
  tests/
    slider-core.test.ts
    time-slider-core.test.ts
    volume-slider-core.test.ts

packages/core/src/dom/ui/
  event.ts                             # Add UIPointerEvent
  slider.ts                            # createSlider() factory
  slider-css-vars.ts                   # getSliderCSSVars, getTimeSliderCSSVars
  tests/
    slider.test.ts
    slider-css-vars.test.ts

packages/react/src/ui/
  hooks/use-slider.ts                  # useSlider hook
  slider/
    index.ts                           # export * as Slider
    index.parts.ts                     # Root, Track, Fill, Buffer, Thumb, Value
    slider-context.ts                  # React context
    slider-root.tsx
    slider-track.tsx
    slider-fill.tsx
    slider-buffer.tsx
    slider-thumb.tsx
    slider-preview.tsx                 # PR 5
    slider-value.tsx
    tests/
      slider.test.tsx
  time-slider/
    index.ts                           # export * as TimeSlider
    index.parts.ts                     # Root + re-exports
    time-slider-root.tsx
    tests/
      time-slider.test.tsx
  volume-slider/
    index.ts                           # export * as VolumeSlider
    index.parts.ts                     # Root + re-exports
    volume-slider-root.tsx
    tests/
      volume-slider.test.tsx

packages/html/src/ui/
  slider/
    slider-element.ts                  # <media-slider>
    slider-track-element.ts            # <media-slider-track>
    slider-fill-element.ts             # <media-slider-fill>
    slider-buffer-element.ts           # <media-slider-buffer>
    slider-thumb-element.ts            # <media-slider-thumb>
    slider-value-element.ts            # <media-slider-value>
    slider-preview-element.ts          # <media-slider-preview> (PR 6)
    slider-events.ts                   # Event type interfaces
    slider-context.ts                  # Lit context for child communication
    tests/
      slider-element.test.ts
  time-slider/
    time-slider-element.ts             # <media-time-slider>
    tests/
      time-slider-element.test.ts
  volume-slider/
    volume-slider-element.ts           # <media-volume-slider>
    tests/
      volume-slider-element.test.ts

packages/html/src/define/ui/
  slider-track.ts                      # Shared: <media-slider-track>
  slider-fill.ts                       # Shared: <media-slider-fill>
  slider-buffer.ts                     # Shared: <media-slider-buffer>
  slider-thumb.ts                      # Shared: <media-slider-thumb>
  slider-value.ts                      # Shared: <media-slider-value>
  time-slider.ts                       # Domain: <media-time-slider> + imports shared
  volume-slider.ts                     # Domain: <media-volume-slider> + imports shared
  slider-preview.ts                    # Registration: preview (PR 6)
```

## Resolved Questions

1. **Idempotent custom element registration** — Extract shared child elements (`<media-slider-track>`, `-fill`, `-buffer`, `-thumb`, `-value`) into their own `define/ui/slider-track.ts`, `define/ui/slider-fill.ts`, etc. Both `time-slider` and `volume-slider` define files import the shared ones as side-effect imports. ES module singleton guarantee ensures each executes only once. No `defineCustomElement` guard utility needed — the shared module extraction is sufficient.

2. **Seek throttle implementation** — No throttle/debounce exists in `@videojs/utils`. Add `rafThrottle` to `@videojs/utils/dom` — a reusable rAF-based throttle that automatically adapts to device refresh rate. Added to PR 1 as a new utility. API: `const throttled = rafThrottle(fn)` returns a throttled function with a `.cancel()` method.

3. **RTL detection** — No RTL handling exists anywhere in v10. Add `isRTL(element: Element): boolean` to `@videojs/utils/dom` using `getComputedStyle(element).direction === 'rtl'`. In `createSlider`, the `isRTL()` callback reads this once on `pointerdown` and caches for the drag session. Keyboard arrows flip in RTL per WAI-ARIA slider spec. Added to PR 1 as a new utility.

4. **Slider Preview positioning** — CSS-only. No Floating UI needed. Vidstack confirms: they use absolute positioning + `min(max(...), ...)` CSS clamping for slider preview, reserving `@floating-ui/dom` only for tooltips/menus. A `ResizeObserver` recalculates clamping when preview content changes size. PRs 5/6 use this approach.

## Resolved During Audit

- **`ElementProps` extension** — No. `SliderThumbAttrs` is a standalone type with slider-specific ARIA attrs. It bypasses `ElementProps` and is applied directly via `applyElementProps` to the thumb element.
- **CSS custom properties** — Set via `element.style.setProperty()` in the element's `update()` method, not through `applyElementProps` (which only handles attributes and event listeners).
- **HTML interaction subscription** — Direct `state.subscribe(() => this.requestUpdate(), { signal })` instead of `SnapshotController`. Simpler, uses existing `AbortController` cleanup.
- **Preview branch bases** — Preview PRs branch off their respective UI PRs (React/HTML), not off DOM, because they need the slider context definitions.
- **`StateAttrMap` import** — From `'../types'` (in `packages/core/src/core/ui/types.ts`), not from a nonexistent `element.ts`.
- **Core barrel** — Individual file exports in `packages/core/src/core/index.ts`, no `index.ts` barrel in the slider directory (matching existing convention).
