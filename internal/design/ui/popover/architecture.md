# Architecture

Internal structure of the popover component system.

## Overview

```
                    ┌──────────────────────────────┐
                    │       @videojs/core           │
                    │                               │
                    │  PopoverCore ← state + ARIA   │
                    │  PopoverCSSVars (constants)   │
                    │  PopoverDataAttrs (constants) │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │       @videojs/core/dom       │
                    │                               │
                    │  createPopover() ← open/close │
                    │  getAnchorPositionStyle()     │
                    │  getManualPositionStyle()     │
                    └──────────────┬───────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                                         │
  ┌───────────▼───────────┐             ┌───────────────▼────────────┐
  │   @videojs/react      │             │   @videojs/html            │
  │                       │             │                            │
  │  Popover.Root         │             │  <media-popover>           │
  │  Popover.Trigger      │             │  <media-popover-trigger>   │
  │  Popover.Positioner   │             │  <media-popover-positioner>│
  │  Popover.Popup        │             │  <media-popover-popup>     │
  │  Popover.Arrow        │             │  <media-popover-arrow>     │
  └───────────────────────┘             └────────────────────────────┘
```

State flows top-down: Core computes state and ARIA -> DOM layer handles open/close interaction and positioning -> UI renders.

## PopoverCore

Runtime-agnostic class. Computes popover state and ARIA attributes from interaction state and props. No DOM dependencies.

### Interface

```ts
type PopoverSide = 'top' | 'bottom' | 'left' | 'right';
type PopoverAlign = 'start' | 'center' | 'end';

interface PopoverProps {
  side?: PopoverSide;            // default: 'top'
  align?: PopoverAlign;          // default: 'center'
  sideOffset?: number;           // default: 0
  alignOffset?: number;          // default: 0
  modal?: boolean | 'trap-focus'; // default: false
  closeOnEscape?: boolean;       // default: true
  closeOnOutsideClick?: boolean; // default: true
}

interface PopoverRootProps extends PopoverProps {
  open?: boolean;                // controlled
  defaultOpen?: boolean;         // uncontrolled
  openOnHover?: boolean;
  delay?: number;                // hover open delay (ms)
  closeDelay?: number;           // hover close delay (ms)
}
```

### Interaction State

`PopoverInteraction` is the interaction state managed by `createPopover` via `createState()`. The UI layer subscribes to it but never writes it directly:

```ts
interface PopoverInteraction {
  open: boolean;
  transitionStatus: 'closed' | 'opening' | 'open' | 'closing';
}
```

The `transitionStatus` tracks the CSS transition lifecycle:
- `closed` — Popover is fully hidden.
- `opening` — `showPopover()` called, first rAF pending.
- `open` — Visible and interactive (set on next rAF after opening).
- `closing` — CSS transitions playing, waiting for `getAnimations()` to finish.

### Methods

```ts
class PopoverCore {
  static readonly defaultProps: NonNullableObject<PopoverProps>;

  constructor(props?: PopoverProps);
  setProps(props: PopoverProps): void;

  getState(interaction: PopoverInteraction): PopoverState;
  // Merges interaction state with resolved props.

  getTriggerAttrs(state: PopoverState, popupId?: string): {
    'aria-expanded': 'true' | 'false';
    'aria-haspopup': 'dialog';
    'aria-controls'?: string;  // present only when popupId provided
  };

  getPopupAttrs(state: PopoverState): {
    role: 'dialog';
    'aria-modal': 'true' | undefined;  // only when modal === true
  };
}
```

### ARIA Output

`getTriggerAttrs()` returns attributes for the Trigger element:

```ts
{
  'aria-expanded': 'true',
  'aria-haspopup': 'dialog',
  'aria-controls': 'media-popover-popup-1',
}
```

`getPopupAttrs()` returns attributes for the Popup element:

```ts
{
  role: 'dialog',
  'aria-modal': undefined,  // 'true' only when modal === true
}
```

`aria-modal` is set only for `modal === true`, not for `modal === 'trap-focus'`. The `'trap-focus'` mode is a behavioral concern (keyboard focus containment) rather than a semantic one.

## Documentation Constants

### Data Attributes

Follows the existing `*DataAttrs` pattern:

```ts
// popover-data-attrs.ts
export const PopoverDataAttrs = {
  /** Present when the popover is open. */
  open: 'data-open',
  /** Which side the popover is positioned relative to the trigger. */
  side: 'data-side',
  /** How the popover is aligned relative to the specified side. */
  align: 'data-align',
} as const satisfies StateAttrMap<PopoverState>;
```

### CSS Custom Properties

Follows the `*CSSVars` pattern established by the slider:

```ts
// popover-css-vars.ts
export const PopoverCSSVars = {
  /** Anchor element's width. */
  anchorWidth: '--media-popover-anchor-width',
  /** Anchor element's height. */
  anchorHeight: '--media-popover-anchor-height',
  /** Available width between trigger and boundary edge. */
  availableWidth: '--media-popover-available-width',
  /** Available height between trigger and boundary edge. */
  availableHeight: '--media-popover-available-height',
  /** Transform origin computed from anchor position. */
  transformOrigin: '--media-popover-transform-origin',
  /** Computed top offset for manual positioning fallback. */
  top: '--media-popover-top',
  /** Computed left offset for manual positioning fallback. */
  left: '--media-popover-left',
} as const;
```

## createPopover (DOM)

Factory function in `@videojs/core/dom`. Manages open/close interaction state via `createState()`. Returns split event handler props and a subscribable interaction state.

### Interface

```ts
type PopoverOpenChangeReason =
  | 'click' | 'hover' | 'focus'
  | 'escape' | 'outside-click' | 'blur';

interface PopoverChangeDetails {
  reason: PopoverOpenChangeReason;
  event?: Event;
}

interface PopoverOptions {
  onOpenChange: (open: boolean, details: PopoverChangeDetails) => void;
  closeOnEscape: () => boolean;         // thunk, evaluated at call time
  closeOnOutsideClick: () => boolean;   // thunk
  openOnHover?: () => boolean;          // thunk, optional
  delay?: () => number;                 // thunk, default 300ms
  closeDelay?: () => number;            // thunk, default 0ms
}

function createPopover(options: PopoverOptions): Popover;
```

Options use **thunks** (zero-arg functions) rather than static values so the DOM layer always reads the latest prop value. This prevents stale closures in React without requiring the factory to be recreated when props change.

### Return Value

```ts
interface Popover {
  interaction: State<PopoverInteraction>;    // subscribable, .current
  triggerProps: PopoverTriggerProps;
  popupProps: PopoverPopupProps;
  setTriggerElement: (el: HTMLElement | null) => void;
  setPopupElement: (el: HTMLElement | null) => void;
  setBoundaryElement: (el: HTMLElement | null) => void;
  open: (reason?: PopoverOpenChangeReason) => void;
  close: (reason?: PopoverOpenChangeReason) => void;
  destroy: () => void;
}
```

Split props:

```ts
interface PopoverTriggerProps {
  onClick: (event: UIEvent) => void;
  onPointerEnter: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
  onFocusIn: (event: UIFocusEvent) => void;
  onFocusOut: (event: UIFocusEvent) => void;
}

interface PopoverPopupProps {
  onPointerEnter: (event: UIPointerEvent) => void;
  onPointerLeave: (event: UIPointerEvent) => void;
  onFocusOut: (event: UIFocusEvent) => void;
}
```

### Open/Close Lifecycle

**Opening:**
1. `open()` called (from click, hover, or focus).
2. `onOpenChange(true, details)` fires.
3. `el.showPopover()` — uses native Popover API.
4. Interaction set to `{ open: true, transitionStatus: 'opening' }`.
5. Double `requestAnimationFrame` — ensures the element is painted.
6. Interaction set to `{ transitionStatus: 'open' }`.
7. Document-level listeners attached (Escape, outside click).

**Closing:**
1. `close()` called (from click, escape, outside click, hover, or blur).
2. `onOpenChange(false, details)` fires.
3. Interaction set to `{ transitionStatus: 'closing' }`.
4. Double `requestAnimationFrame` — allows CSS transitions to start.
5. Wait for all CSS transitions on popup via `el.getAnimations().filter(anim => 'transitionProperty' in anim).map(t => t.finished)`.
6. `el.hidePopover()`.
7. Interaction set to `{ open: false, transitionStatus: 'closed' }`.
8. Document-level listeners removed.

The double-RAF + `getAnimations()` pattern ensures CSS close transitions complete before the element is hidden. See [decisions.md — Transition-Aware Closing](decisions.md#transition-aware-closing).

### Document-Level Listeners

Scoped to open state — attached when popover opens, removed when it closes:

| Listener | Phase | Purpose |
| -------- | ----- | ------- |
| `keydown` on `document` | Bubble | Escape key closes (when `closeOnEscape()` is true). |
| `pointerdown` on `document` | Capture | Outside click closes (when `closeOnOutsideClick()` is true, target is outside trigger/popup). |

### Hover Behavior

1. `matchMedia('(hover: hover)')` check — hover mode only activates on devices with hover capability. Touch devices fall back to click-to-toggle.
2. `onPointerEnter` on trigger starts open delay timer (`delay()`, default 300ms).
3. `onPointerLeave` on trigger starts close delay timer (`closeDelay()`, default 0ms).
4. `onPointerEnter` on popup **cancels** pending close timeout — pointer moving from trigger to popup doesn't close the popover.
5. `onPointerLeave` on popup starts close delay timer.
6. `onFocusIn` on trigger opens immediately (keyboard focus should always open for a11y).
7. `onFocusOut` on trigger or popup closes if `relatedTarget` is outside both elements.

### Cleanup Pattern

Single `AbortController` centralizes all cleanup:

```ts
const abort = new AbortController();

// All subscriptions and timers reference abort.signal
abort.signal.addEventListener('abort', () => {
  clearTimeout(hoverTimeout);
  unsubscribeDocumentListeners?.();
  triggerElement = null;
  popupElement = null;
});

function destroy(): void {
  if (abort.signal.aborted) return;  // re-entry guard
  abort.abort();
}
```

RAF callbacks in `applyOpen`/`applyClose` check `abort.signal.aborted` before executing to prevent callbacks running after destroy.

## Positioning

Two strategies, auto-detected at runtime via `supportsAnchorPositioning()`.

### CSS Anchor Positioning (Modern Browsers)

When supported, positioning is handled entirely by the browser. No JavaScript measurement needed.

**Trigger receives:**

```css
anchor-name: --popover-1;
```

**Positioner receives:**

```css
position: fixed;
position-anchor: --popover-1;
/* Side placement (e.g., side="top"): */
bottom: anchor(top);
/* Alignment (e.g., align="center"): */
justify-self: anchor-center;
```

Side mapping — the popover sits on the **opposite** side of the anchor edge:

| `side` prop | CSS property set | Value |
| ----------- | --------------- | ----- |
| `top` | `bottom` | `anchor(top)` |
| `bottom` | `top` | `anchor(bottom)` |
| `left` | `right` | `anchor(left)` |
| `right` | `left` | `anchor(right)` |

`sideOffset` is applied via `calc()` on the side property. `alignOffset` is applied via `margin-inline-start` or `margin-block-start` for center alignment, or `calc()` on the alignment anchor function for start/end.

### Manual Positioning (Fallback)

When CSS Anchor Positioning is not supported, positions are computed in JavaScript from element `DOMRect`s.

**Positioner receives:**

```css
position: absolute;
--media-popover-top: 85px;
--media-popover-left: 200px;
--media-popover-anchor-width: 120px;
--media-popover-anchor-height: 40px;
--media-popover-available-width: 350px;
--media-popover-available-height: 280px;
--media-popover-transform-origin: center bottom;
```

Users must apply the position values in their CSS:

```css
media-popover-positioner {
  top: var(--media-popover-top);
  left: var(--media-popover-left);
}
```

### Positioning Functions

```ts
// Main entry — auto-selects strategy
function getAnchorPositionStyle(
  anchorName: string,
  opts: PositioningOptions,
  triggerRect?: DOMRect,
  positionerRect?: DOMRect,
  boundaryRect?: DOMRect,
): Record<string, string>;

// Anchor-name style for trigger element
function getAnchorNameStyle(anchorName: string): Record<string, string>;

// CSS vars for sizing constraints
function getPopoverCSSVars(
  triggerRect: DOMRect,
  boundaryRect: DOMRect,
  side: PopoverSide,
): Record<string, string>;

// Manual JS computation
function getManualPositionStyle(
  triggerRect: DOMRect,
  positionerRect: DOMRect,
  boundaryRect: DOMRect,
  opts: PositioningOptions,
): Record<string, string>;
```

`getAnchorPositionStyle` checks `supportsAnchorPositioning()` and delegates to the CSS anchor path (no rects needed) or the manual path (rects required). The result is cached per module at the `_supportsAnchorPositioning` variable.

## Data Flow

### React

```
                    ┌─── createPopover() ────────────────┐
                    │  interaction (State)                │ ← subscribable
                    │  triggerProps                       │ → Trigger element
                    │  popupProps                         │ → Popup element
                    │  setTriggerElement / setPopupElement│ → ref callbacks
                    └──────────────┬─────────────────────┘
                                   │
        ┌──────────────────────────┼────────────────────────┐
        │                          │                        │
        ▼                          ▼                        ▼
  interaction.current       onClick(event)          onOpenChange(open, details)
        │                   triggers open/close     fires user callback
        │                          │
        ▼                          ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  Popover.Root render                                         │
  │                                                              │
  │  const snapshot = useSnapshot(popover.interaction);           │
  │  const state = core.getState(snapshot);                      │
  │  const triggerAttrs = core.getTriggerAttrs(state, popupId);  │
  │  const popupAttrs = core.getPopupAttrs(state);               │
  │                                                              │
  │  Provides { core, popover, state, anchorName, popupId }      │
  │  via PopoverContext                                          │
  │                                                              │
  │  Children read context:                                      │
  │  → Trigger: ARIA attrs, data attrs, anchor-name style        │
  │  → Positioner: positioning styles, conditional visibility    │
  │  → Popup: dialog role, popover API, event handlers           │
  │  → Arrow: data attrs only                                    │
  └─────────────────────────────────────────────────────────────┘
```

### HTML

```
                    ┌─── createPopover() ────────────────┐
                    │  interaction (State)                │ ← subscribe → requestUpdate()
                    │  triggerProps                       │ → <media-popover-trigger>
                    │  popupProps                         │ → <media-popover-popup>
                    └──────────────┬─────────────────────┘
                                   │
  ┌────────────────────────────────┼──────────────────────────────┐
  │                                │                              │
  interaction.current       onClick(event)                 onOpenChange:
  │                                                        dispatches 'open-change'
  │                                                        CustomEvent
  │
  ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  PopoverElement (ContextProvider)                                │
  │                                                                  │
  │  willUpdate():                                                   │
  │    core.setProps(this);                                          │
  │    sync controlled open prop → popover.open() / popover.close() │
  │                                                                  │
  │  Provides via context:                                           │
  │  { core, popover, interaction, anchorName, popupId }             │
  │                                                                  │
  │  Children (ContextConsumer):                                     │
  │  → Trigger: applyElementProps(ARIA), applyStateDataAttrs,       │
  │             applyStyles(anchorName), triggerProps once           │
  │  → Positioner: applyStyles(positioning), display toggle         │
  │  → Popup: applyElementProps(ARIA), popupProps once, id          │
  │  → Arrow: applyStateDataAttrs, aria-hidden                      │
  └─────────────────────────────────────────────────────────────────┘
```

## File Structure

### Core

```
packages/core/src/core/ui/popover/
├── popover-core.ts             # PopoverCore class
├── popover-css-vars.ts         # PopoverCSSVars constant
├── popover-data-attrs.ts       # PopoverDataAttrs constant
├── index.ts                    # barrel exports
└── tests/
    └── popover-core.test.ts

packages/core/src/dom/ui/popover/
├── popover.ts                  # createPopover() factory
├── popover-positioning.ts      # getAnchorPositionStyle(), getManualPositionStyle()
└── tests/
    ├── popover.test.ts
    └── popover-positioning.test.ts
```

### React

```
packages/react/src/ui/popover/
├── index.ts                    # export * as Popover from './index.parts'
├── index.parts.ts              # export { Root, Trigger, Positioner, Popup, Arrow }
├── popover-context.tsx         # PopoverContext, usePopoverContext
├── popover-root.tsx            # Popover.Root (provider, no DOM)
├── popover-trigger.tsx         # Popover.Trigger (<button>)
├── popover-positioner.tsx      # Popover.Positioner (<div>)
├── popover-popup.tsx           # Popover.Popup (<div>)
└── popover-arrow.tsx           # Popover.Arrow (<div>)
```

### HTML

```
packages/html/src/ui/popover/
├── popover-context.ts          # PopoverContext (Symbol-keyed)
├── popover-element.ts          # <media-popover> (root, context provider)
├── popover-trigger-element.ts  # <media-popover-trigger>
├── popover-positioner-element.ts # <media-popover-positioner>
├── popover-popup-element.ts    # <media-popover-popup>
└── popover-arrow-element.ts    # <media-popover-arrow>

packages/html/src/define/ui/
└── popover.ts                  # customElements.define() for all 5 elements
```

## HTML Elements

### Context Flow

`PopoverElement` creates the `createPopover()` instance and provides context via `ContextProvider` using a Symbol key (`@videojs/popover`). Child elements subscribe via `ContextConsumer`.

The context value includes the raw `State<PopoverInteraction>` (not a pre-computed snapshot like React). Each child computes state via `core.getState(interaction.current)` in its update cycle, driven by `SnapshotController` which calls `requestUpdate()` on state changes.

### Event Binding

Child elements apply event handler props **once per connection** using a `#propsApplied` flag and an `AbortController` signal for cleanup:

```ts
// In context callback (runs once per connection)
if (!this.#propsApplied) {
  applyElementProps(this, popover.triggerProps, this.#disconnect.signal);
  this.#propsApplied = true;
}
```

This prevents double-binding if the context callback fires multiple times. The abort signal ensures listeners are cleaned up on `disconnectedCallback`.

### Unique IDs

HTML elements use an incrementing counter for unique anchor names and popup IDs:

```ts
// In PopoverElement.connectedCallback()
const id = counter++;
this.#anchorName = `popover-${id}`;
this.#popupId = `media-popover-popup-${id}`;
```

React uses `useId()` for the same purpose.

### Registration

All 5 elements are registered together in a single entry point (`@videojs/html/ui/popover`). Unlike slider (where preview is opt-in), all popover parts are lightweight enough to register together.

## Constraints

- `PopoverCore` must not import any DOM APIs — returns state objects and ARIA attribute maps
- `createPopover` must not reference React or Lit — uses `createState` from `@videojs/store`
- Positioning functions accept `DOMRect` values as parameters, not reading them internally (except via `supportsAnchorPositioning()` feature detection)
- CSS custom properties are output-only — manual positioning fallback values
- The native Popover API (`popover="manual"`, `showPopover()`, `hidePopover()`) handles top-layer rendering — no z-index management needed
- Close transition waits for CSS animations to finish — the positioner stays in the DOM during the `closing` phase
- Document-level listeners (Escape, outside click) are scoped to open state — not attached when closed
