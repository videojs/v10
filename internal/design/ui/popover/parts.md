# Parts

Full API for every compound part.

## Root

Provider component. Owns popover state, creates the `createPopover()` interaction instance, provides context to children. Renders no DOM element — children handle their own rendering.

### React

```tsx
import { Popover } from '@videojs/react';

<Popover.Root
  defaultOpen={false}
  side="top"
  closeOnEscape
  onOpenChange={(open, details) => {}}
>
  {/* children */}
</Popover.Root>
```

### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `open` | `boolean` | — | Controlled open state. |
| `defaultOpen` | `boolean` | `false` | Initial open state (uncontrolled). |
| `side` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Preferred side relative to trigger. |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment along the specified side. |
| `sideOffset` | `number` | `0` | Distance from trigger along the side axis (px). |
| `alignOffset` | `number` | `0` | Offset along the alignment axis (px). |
| `modal` | `boolean \| 'trap-focus'` | `false` | Modal behavior. See [index.md — Modal Behavior](index.md#modal-behavior). |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key. |
| `closeOnOutsideClick` | `boolean` | `true` | Close on click outside trigger and popup. |
| `openOnHover` | `boolean` | `false` | Open on pointer hover (with media query check). |
| `delay` | `number` | `300` | Hover open delay in milliseconds. |
| `closeDelay` | `number` | `0` | Hover close delay in milliseconds. |

### Callbacks

| Callback | Signature | Description |
| -------- | --------- | ----------- |
| `onOpenChange` | `(open: boolean, details: PopoverChangeDetails) => void` | Fired on every open/close state change. `details.reason` indicates the trigger: `'click'`, `'hover'`, `'focus'`, `'escape'`, `'outside-click'`, `'blur'`. |

### Events (HTML)

`<media-popover>` dispatches a custom DOM event on state change. Bubbles.

| Event | Detail | Fires when |
| ----- | ------ | ---------- |
| `open-change` | `{ open: boolean, reason: string, event?: Event }` | Popover opens or closes. |

### HTML Attributes

`<media-popover>` observes these attributes:

| Attribute | Type | Maps to |
| --------- | ---- | ------- |
| `open` | Boolean | `open` prop |
| `default-open` | Boolean | `defaultOpen` prop |
| `side` | String | `side` prop |
| `align` | String | `align` prop |
| `side-offset` | Number | `sideOffset` prop |
| `align-offset` | Number | `alignOffset` prop |
| `modal` | String | `modal` prop |
| `close-on-escape` | Boolean | `closeOnEscape` prop |
| `close-on-outside-click` | Boolean | `closeOnOutsideClick` prop |
| `open-on-hover` | Boolean | `openOnHover` prop |
| `delay` | Number | `delay` prop |
| `close-delay` | Number | `closeDelay` prop |

### Renders

React: No DOM element. Provider only.
HTML: `<media-popover>` custom element (context provider).

---

## Trigger

Button that controls the popover. Carries all ARIA attributes for the trigger role.

### React

```tsx
<Popover.Trigger>Settings</Popover.Trigger>
```

### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<PopoverState>` | — | Custom render element. |
| `className` | `string \| (state: PopoverState) => string` | — | Class name, optionally reactive. |
| `style` | `CSSProperties \| (state: PopoverState) => CSSProperties` | — | Inline style, optionally reactive. |

Plus all native `<button>` props.

### ARIA (automatic)

Set by `PopoverCore.getTriggerAttrs()`:

| Attribute | Value |
| --------- | ----- |
| `aria-expanded` | `"true"` / `"false"` |
| `aria-haspopup` | `"dialog"` |
| `aria-controls` | `{popupId}` (links to popup element) |

The UI layer also sets `type="button"` on the rendered element.

### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-open` | present/absent | Popover is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Current positioning side. |
| `data-align` | `start` / `center` / `end` | Current alignment. |

### Styling

Trigger receives `anchor-name` CSS property when CSS Anchor Positioning is supported. This is applied automatically — no user action needed.

### Event Handlers

Applied from `createPopover().triggerProps`:

| Handler | Purpose |
| ------- | ------- |
| `onClick` | Toggle open/close. |
| `onPointerEnter` | Start hover open delay (when `openOnHover`). |
| `onPointerLeave` | Start hover close delay (when `openOnHover`). |
| `onFocusIn` | Open on focus (when `openOnHover`). |
| `onFocusOut` | Close on blur (when focus leaves trigger and popup). |

### Renders

React: `<button>` with ARIA, data attrs, anchor-name style, and event handlers.
HTML: `<media-popover-trigger>` custom element.

---

## Positioner

Positioning wrapper between trigger and popup. Handles CSS Anchor Positioning or manual fallback styles. Conditionally removed from the DOM when fully closed (not open and transition complete).

### React

```tsx
<Popover.Positioner>
  <Popover.Popup>{/* ... */}</Popover.Popup>
</Popover.Positioner>
```

### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<PopoverState>` | — | Custom render element. |
| `className` | `string \| (state: PopoverState) => string` | — | Class name, optionally reactive. |
| `style` | `CSSProperties \| (state: PopoverState) => CSSProperties` | — | Inline style, optionally reactive. |

Plus all native `<div>` props.

### Visibility

Returns `null` (React) or sets `display: none` (HTML) when `!state.open && state.transitionStatus === 'closed'`. This means the positioner remains in the DOM during close transitions, allowing CSS animations to complete before removal.

### ARIA

| Attribute | Value |
| --------- | ----- |
| `role` | `"presentation"` |

### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-open` | present/absent | Popover is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Current positioning side. |
| `data-align` | `start` / `center` / `end` | Current alignment. |

### Positioning

Receives computed positioning styles from `getAnchorPositionStyle()`:

**CSS Anchor Positioning (when supported):**

```css
/* Applied automatically */
position: fixed;
position-anchor: --popover-1;
bottom: anchor(top);        /* example: side="top" */
justify-self: anchor-center; /* example: align="center" */
```

**Manual fallback:**

```css
/* Applied automatically via inline styles */
position: absolute;
top: 85px;
left: 200px;
/* Plus CSS vars for sizing constraints */
--media-popover-anchor-width: 120px;
--media-popover-available-width: 350px;
/* etc. */
```

Positioning is applied directly as inline `top`/`left` styles — no CSS var indirection needed. Sizing constraint CSS vars are set for user CSS to consume (e.g., `max-width: var(--media-popover-available-width)`).

### Renders

React: `<div>` with positioning styles.
HTML: `<media-popover-positioner>` custom element.

---

## Popup

Content container. Carries the dialog role and receives the native Popover API (`popover="manual"`).

### React

```tsx
<Popover.Popup>
  <Popover.Arrow />
  {/* content */}
</Popover.Popup>
```

### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<PopoverState>` | — | Custom render element. |
| `className` | `string \| (state: PopoverState) => string` | — | Class name, optionally reactive. |
| `style` | `CSSProperties \| (state: PopoverState) => CSSProperties` | — | Inline style, optionally reactive. |

Plus all native `<div>` props.

### ARIA (automatic)

Set by `PopoverCore.getPopupAttrs()`:

| Attribute | Value |
| --------- | ----- |
| `id` | `{popupId}` (linked from trigger's `aria-controls`) |
| `role` | `"dialog"` |
| `aria-modal` | `"true"` only when `modal === true` |

### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-open` | present/absent | Popover is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Current positioning side. |
| `data-align` | `start` / `center` / `end` | Current alignment. |

### Popover API

`createPopover()` automatically sets `popover="manual"` on the popup element and calls `showPopover()`/`hidePopover()` to open/close. This uses the native [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) for top-layer rendering without requiring z-index management.

### Event Handlers

Applied from `createPopover().popupProps`:

| Handler | Purpose |
| ------- | ------- |
| `onPointerEnter` | Cancel pending hover close (keeps popup open when pointer moves to it). |
| `onPointerLeave` | Start hover close delay (when `openOnHover`). |
| `onFocusOut` | Close if focus leaves both trigger and popup. |

### Renders

React: `<div>` with `popover="manual"`, dialog role, and event handlers.
HTML: `<media-popover-popup>` custom element.

---

## Arrow

Visual arrow/caret pointing toward the trigger. Purely decorative — hidden from assistive technology.

### React

```tsx
<Popover.Arrow />
```

### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `render` | `RenderProp<PopoverState>` | — | Custom render element. |
| `className` | `string \| (state: PopoverState) => string` | — | Class name, optionally reactive. |
| `style` | `CSSProperties \| (state: PopoverState) => CSSProperties` | — | Inline style, optionally reactive. |

Plus all native `<div>` props.

### ARIA

| Attribute | Value |
| --------- | ----- |
| `aria-hidden` | `"true"` |

### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-open` | present/absent | Popover is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Current positioning side. |
| `data-align` | `start` / `center` / `end` | Current alignment. |

### Styling

Use `data-side` to rotate the arrow based on popover position:

```css
media-popover-arrow {
  width: 10px;
  height: 10px;
  background: white;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

media-popover-arrow[data-side="top"] {
  transform: rotate(180deg);
}

media-popover-arrow[data-side="bottom"] {
  transform: rotate(0deg);
}

media-popover-arrow[data-side="left"] {
  transform: rotate(90deg);
}

media-popover-arrow[data-side="right"] {
  transform: rotate(-90deg);
}
```

### Renders

React: `<div>` with `aria-hidden="true"`.
HTML: `<media-popover-arrow>` custom element.

---

## React Namespace Exports

All parts are exported under the `Popover` namespace:

```ts
import { Popover } from '@videojs/react';

// Components
Popover.Root
Popover.Trigger
Popover.Positioner
Popover.Popup
Popover.Arrow

// Types (via namespace)
Popover.RootProps
Popover.TriggerProps
Popover.PositionerProps
Popover.PopupProps
Popover.ArrowProps

// Context
Popover.usePopoverContext
Popover.PopoverContextValue
```

---

## HTML Element Tags

| Part | Tag |
| ---- | --- |
| Root | `<media-popover>` |
| Trigger | `<media-popover-trigger>` |
| Positioner | `<media-popover-positioner>` |
| Popup | `<media-popover-popup>` |
| Arrow | `<media-popover-arrow>` |

### Registration

All elements registered in a single entry point:

```ts
// @videojs/html/ui/popover
// Registers: media-popover, media-popover-trigger,
//   media-popover-positioner, media-popover-popup,
//   media-popover-arrow
```
