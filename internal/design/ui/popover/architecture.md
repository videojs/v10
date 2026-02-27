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
  │   (compound pattern)  │             │   (single element)         │
  │                       │             │                            │
  │  Popover.Root         │             │  <media-popover>           │
  │  Popover.Trigger      │             │  (self-contained)          │
  │  Popover.Popup        │             │                            │
  │  Popover.Arrow        │             │                            │
  └───────────────────────┘             └────────────────────────────┘
```

State flows top-down: Core computes state and ARIA -> DOM layer handles open/close interaction and positioning -> UI renders.

**Platform-specific architecture:** HTML uses a single `<media-popover>` element that is both the popup and positioned container. React uses a compound pattern where `PopoverPopup` handles positioning, Popover API, and ARIA. See [decisions.md — Platform-Specific Component Structure](decisions.md#platform-specific-component-structure).

## PopoverCore

Runtime-agnostic class. Computes popover state and ARIA attributes from interaction state and props. No DOM dependencies.

### Interface

```ts
type PopoverSide = 'top' | 'bottom' | 'left' | 'right';
type PopoverAlign = 'start' | 'center' | 'end';

interface PopoverProps {
  side?: PopoverSide;            // default: 'top'
  align?: PopoverAlign;          // default: 'center'
  modal?: boolean | 'trap-focus'; // default: false
  closeOnEscape?: boolean;       // default: true
  closeOnOutsideClick?: boolean; // default: true
}
// Offsets (sideOffset, alignOffset) are CSS-var-only — not props.
// Set via --media-popover-side-offset / --media-popover-align-offset.

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
  'aria-controls': 'settings-popover',
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

Follows the `*CSSVars` pattern established by the slider. Offset CSS vars are **inputs** (set by the user); sizing constraint CSS vars are **outputs** (set by the manual fallback). Positioning (`top`/`left`) is applied directly as inline styles (see [decisions.md — Inline Styles for Manual Positioning](decisions.md#inline-styles-for-manual-positioning)):

```ts
// popover-css-vars.ts
export const PopoverCSSVars = {
  /** Distance from trigger along side axis (input). */
  sideOffset: '--media-popover-side-offset',
  /** Offset along alignment axis (input). */
  alignOffset: '--media-popover-align-offset',
  /** Anchor element's width (output). */
  anchorWidth: '--media-popover-anchor-width',
  /** Anchor element's height (output). */
  anchorHeight: '--media-popover-anchor-height',
  /** Available width between trigger and boundary edge (output). */
  availableWidth: '--media-popover-available-width',
  /** Available height between trigger and boundary edge (output). */
  availableHeight: '--media-popover-available-height',
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
  readonly triggerElement: HTMLElement | null;
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

### `setPopupElement` and Open Timing

When `setPopupElement(el)` is called and the interaction is already open (`open: true`), the factory automatically calls `showPopover()` on the new element. This handles the React timing issue where the popup mounts _after_ the state changes to open (Root calls `open()`, which sets interaction to open, which triggers re-render, which mounts Popup, which calls `setPopupElement`).

### Open/Close Lifecycle

**Opening:**
1. `open()` called (from click, hover, or focus).
2. Interaction set to `{ open: true, transitionStatus: 'opening' }`.
3. `el.showPopover()` — uses native Popover API.
4. Single `requestAnimationFrame` — ensures the element is painted.
5. Interaction set to `{ transitionStatus: 'open' }`.
6. `onOpenChange(true, details)` fires.
7. Document-level listeners attached reactively (subscription fires when `open` becomes true).

**Closing:**
1. `close()` called (from click, escape, outside click, hover, or blur).
2. `onOpenChange(false, details)` fires.
3. Interaction set to `{ transitionStatus: 'closing' }`.
4. Double `requestAnimationFrame` — allows CSS transitions to start.
5. Wait for all CSS transitions on popup via `el.getAnimations().filter(anim => 'transitionProperty' in anim).map(t => t.finished)`.
6. `el.hidePopover()`.
7. Interaction set to `{ open: false, transitionStatus: 'closed' }`.
8. Document-level listeners removed.

Opening uses a single RAF (just needs one frame for paint). Closing uses a double-RAF + `getAnimations()` pattern to ensure CSS close transitions start and complete before the element is hidden. See [decisions.md — Transition-Aware Closing](decisions.md#transition-aware-closing).

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
  cleanupDocumentListeners();
  triggerEl = null;
  popupEl = null;
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
anchor-name: --settings-popover;
```

The anchor name is derived from the popover's `id` (HTML) or a generated unique ID (React).

**Popup element receives:**

```css
position: fixed;
position-anchor: --settings-popover;
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

Offsets use CSS custom properties inlined in `calc()` expressions — no JS needed on the CSS anchor path:

```css
/* side=top, align=center */
bottom: calc(anchor(top) + var(--media-popover-side-offset, 0px));
justify-self: anchor-center;
margin-inline-start: var(--media-popover-align-offset, 0px);
```

For start/end alignment, `alignOffset` is applied via `calc()` on the alignment anchor function.

### Manual Positioning (Fallback)

When CSS Anchor Positioning is not supported, positions are computed in JavaScript from element `DOMRect`s.

**Popup element receives:**

```css
position: absolute;
top: 85px;
left: 200px;
--media-popover-anchor-width: 120px;
--media-popover-anchor-height: 40px;
--media-popover-available-width: 350px;
--media-popover-available-height: 280px;
```

Positioning (`top`/`left`) is applied directly as inline styles. No user CSS is needed for placement. Sizing constraint CSS vars are available for optional use (e.g., `max-width: var(--media-popover-available-width)`).

### Where Positioning Is Applied

| Platform | Element receiving positioning styles |
| -------- | ----------------------------------- |
| HTML | `<media-popover>` (the element IS the popup) |
| React | `PopoverPopup` `<div>` (the element that enters the top layer) |

In both platforms, positioning is applied to the same element that calls `showPopover()`. This is essential because the top layer is outside the normal document flow — positioning a wrapper element that isn't in the top layer would have no effect on the popup.

### Positioning Functions

```ts
interface PositioningOptions {
  side: PopoverSide;
  align: PopoverAlign;
}

interface ManualOffsets {
  sideOffset: number;
  alignOffset: number;
}

// Main entry — auto-selects strategy.
// CSS anchor path uses var() for offsets (no JS values needed).
// Manual path requires resolved offsets from getComputedStyle().
function getAnchorPositionStyle(
  anchorName: string,
  opts: PositioningOptions,
  triggerRect?: DOMRect,
  popupRect?: DOMRect,
  boundaryRect?: DOMRect,
  offsets?: ManualOffsets,
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
  popupRect: DOMRect,
  opts: PositioningOptions,
  offsets?: ManualOffsets,
): Record<string, string>;

// Resolve offset CSS vars from computed style
function resolveOffsets(el: Element): ManualOffsets;
```

`getAnchorPositionStyle` checks `supportsAnchorPositioning()` and delegates to the CSS anchor path (no rects needed, offsets via `var()`) or the manual path (rects required, offsets resolved from `getComputedStyle()`). The detection result is cached per module at the `_supportsAnchorPositioning` variable.

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
  │  → Popup: positioning + dialog role + popover API + events   │
  │  → Arrow: data attrs only                                    │
  └─────────────────────────────────────────────────────────────┘
```

### HTML

```
                    ┌─── createPopover() ────────────────┐
                    │  interaction (State)                │ ← subscribe → requestUpdate()
                    │  triggerProps                       │ → discovered trigger element
                    │  popupProps                         │ → self (<media-popover>)
                    └──────────────┬─────────────────────┘
                                   │
  ┌────────────────────────────────┼──────────────────────────────┐
  │                                │                              │
  interaction.current       onClick(event)                 onOpenChange:
  │                         (on trigger)                   dispatches 'open-change'
  │                                                        CustomEvent
  │
  ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  PopoverElement (self-contained)                                 │
  │                                                                  │
  │  connectedCallback():                                            │
  │    createPopover() + setPopupElement(this)                       │
  │    applyElementProps(this, popupProps)  ← popup events on self   │
  │    new SnapshotController(this, interaction)                     │
  │                                                                  │
  │  update():                                                       │
  │    #findTrigger() → querySelector('[commandfor="${this.id}"]')   │
  │    #syncTrigger() → apply triggerProps + ARIA to trigger         │
  │    applyStyles(this, getAnchorPositionStyle(...))                │
  │    applyElementProps(this, popupAttrs) + applyStateDataAttrs     │
  └─────────────────────────────────────────────────────────────────┘
```

## File Structure

### Core

```
packages/core/src/core/ui/popover/
├── popover-core.ts             # PopoverCore class
├── popover-css-vars.ts         # PopoverCSSVars constant
├── popover-data-attrs.ts       # PopoverDataAttrs constant
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
├── index.parts.ts              # export { Root, Trigger, Popup, Arrow }
├── popover-context.tsx         # PopoverContext, usePopoverContext
├── popover-root.tsx            # Popover.Root (provider, no DOM)
├── popover-trigger.tsx         # Popover.Trigger (<button>)
├── popover-popup.tsx           # Popover.Popup (<div>, positioning + popover API)
└── popover-arrow.tsx           # Popover.Arrow (<div>)
```

### HTML

```
packages/html/src/ui/popover/
└── popover-element.ts          # <media-popover> (self-contained)

packages/html/src/define/ui/
└── popover.ts                  # customElements.define() for media-popover
```

## HTML Element

### Trigger Discovery

`PopoverElement` finds its trigger via `commandfor` attribute linkage:

```ts
#findTrigger(): HTMLElement | null {
  if (!this.id) return null;
  const root = this.getRootNode() as Document | ShadowRoot;
  return root.querySelector(`[commandfor="${this.id}"]`);
}
```

This works in both document and shadow root contexts. The trigger is re-discovered on every update cycle, so dynamically added triggers are supported.

### Trigger Lifecycle

When a new trigger is discovered (or the trigger changes):

1. Old trigger: ARIA attributes (`aria-expanded`, `aria-haspopup`, `aria-controls`) are removed, event handlers are aborted.
2. New trigger: `setTriggerElement(el)` registers it with the popover, event handlers are applied via `applyElementProps`, ARIA and anchor-name styles are applied on each update.

### Self-Positioning

The element applies positioning styles to itself — it IS the popup:

```ts
// In update():
applyStyles(this, getAnchorPositionStyle(this.id, posOpts, triggerRect, selfRect, boundaryRect));
```

The anchor name is derived from the element's `id`, making it human-readable (e.g., `--settings-popover` instead of `--popover-1`).

### Registration

Single element registered in a single entry point (`@videojs/html/ui/popover`):

```ts
customElements.define('media-popover', PopoverElement);
```

## Constraints

- `PopoverCore` must not import any DOM APIs — returns state objects and ARIA attribute maps
- `createPopover` must not reference React or Lit — uses `createState` from `@videojs/store`
- Positioning functions accept `DOMRect` values as parameters, not reading them internally (except via `supportsAnchorPositioning()` feature detection)
- CSS custom properties are output-only — manual positioning fallback values
- The native Popover API (`popover="manual"`, `showPopover()`, `hidePopover()`) handles top-layer rendering — no z-index management needed
- Positioning must be applied to the same element that enters the top layer (the popup) — not a wrapper outside the top layer
- Close transition waits for CSS animations to finish — the popup stays in the DOM during the `closing` phase
- Document-level listeners (Escape, outside click) are scoped to open state — not attached when closed
