# Parts

Full API for every part. HTML uses a single `<media-popover>` element. React uses a compound pattern with four parts.

## Root (React Only)

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
| `collisionPadding` | `number` | `0` | Minimum distance from boundary edges (px). |
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

### Renders

React: No DOM element. Provider only.

---

## `<media-popover>` (HTML Only)

Single self-contained custom element. Acts as both the popup container and the positioned element. Discovers its trigger externally via the `commandfor` attribute (W3C Invoker Commands pattern). Manages ARIA on both itself and the trigger, handles positioning, and dispatches events.

### HTML

```ts
import '@videojs/html/ui/popover';
```

```html
<button commandfor="settings-popover">Settings</button>

<media-popover
  id="settings-popover"
  side="top"
  align="center"
  close-on-escape
>
  <!-- popover content -->
</media-popover>
```

### Attributes

| Attribute | Type | Default | Maps to |
| --------- | ---- | ------- | ------- |
| `open` | Boolean | `false` | `open` prop |
| `default-open` | Boolean | `false` | `defaultOpen` prop |
| `side` | String | `'top'` | `side` prop |
| `align` | String | `'center'` | `align` prop |
| `side-offset` | Number | `0` | `sideOffset` prop |
| `align-offset` | Number | `0` | `alignOffset` prop |
| `collision-padding` | Number | `0` | `collisionPadding` prop |
| `collision-boundary` | String | — | Element ID for boundary lookup |
| `modal` | String | `false` | `modal` prop |
| `close-on-escape` | Boolean | `true` | `closeOnEscape` prop |
| `close-on-outside-click` | Boolean | `true` | `closeOnOutsideClick` prop |
| `open-on-hover` | Boolean | `false` | `openOnHover` prop |
| `delay` | Number | `300` | `delay` prop |
| `close-delay` | Number | `0` | `closeDelay` prop |

### Events

| Event | Detail | Fires when |
| ----- | ------ | ---------- |
| `open-change` | `{ open: boolean, reason: string, event?: Event }` | Popover opens or closes. |

### Trigger Discovery

The element finds its trigger by querying the root node for `[commandfor="${this.id}"]`. This works in both document and shadow root contexts. When a trigger is found:

1. Event handlers (`onClick`, `onPointerEnter`, `onPointerLeave`, `onFocusIn`, `onFocusOut`) are applied to the trigger.
2. ARIA attributes (`aria-expanded`, `aria-haspopup`, `aria-controls`) are applied to the trigger.
3. `anchor-name` CSS property is applied to the trigger (for CSS Anchor Positioning).
4. When the trigger changes or disconnects, old ARIA attributes are cleaned up.

### ARIA (automatic)

On the popover element itself:

| Attribute | Value |
| --------- | ----- |
| `role` | `"dialog"` |
| `aria-modal` | `"true"` only when `modal === true` |

On the discovered trigger:

| Attribute | Value |
| --------- | ----- |
| `aria-expanded` | `"true"` / `"false"` |
| `aria-haspopup` | `"dialog"` |
| `aria-controls` | `{popover-id}` (the popover's `id`) |

### Data Attributes

| Attribute | Values | Description |
| --------- | ------ | ----------- |
| `data-open` | present/absent | Popover is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Current positioning side. |
| `data-align` | `start` / `center` / `end` | Current alignment. |

### Positioning

Positioning styles are applied directly to the `<media-popover>` element. The element IS the popup that enters the top layer via the Popover API. See the [Positioning section in architecture.md](architecture.md#positioning) for details on CSS Anchor vs manual fallback.

### Collision Boundary

The `collision-boundary` attribute accepts an element ID. The referenced element's bounding rect is used as the boundary for manual positioning. When not set, defaults to `document.documentElement`.

### Renders

A single `<media-popover>` custom element. No child elements are generated — users compose content directly inside.

### Registration

```ts
// @videojs/html/ui/popover
// Registers: media-popover
```

---

## Trigger (React Only)

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

---

## Popup (React Only)

Content container. Carries the dialog role, positioning styles, and receives the native Popover API (`popover="manual"`). Handles visibility gating — returns `null` when closed and transitions complete.

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

### Positioning

PopoverPopup handles all positioning logic. It applies computed styles from `getAnchorPositionStyle()` directly:

**CSS Anchor Positioning (when supported):**

```css
/* Applied automatically */
position: fixed;
position-anchor: --settings-popover;
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

Manual positioning is computed in a `useLayoutEffect` — measure rects after layout, before paint.

### Visibility

Returns `null` when `!state.open && state.transitionStatus === 'closed'`. This means the popup remains in the DOM during close transitions, allowing CSS animations to complete before removal.

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

React: `<div>` with positioning styles, `popover="manual"`, dialog role, and event handlers.

---

## Arrow (React Only)

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
[data-popover-arrow] {
  width: 10px;
  height: 10px;
  background: white;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

[data-popover-arrow][data-side="top"] {
  transform: rotate(180deg);
}

[data-popover-arrow][data-side="bottom"] {
  transform: rotate(0deg);
}

[data-popover-arrow][data-side="left"] {
  transform: rotate(90deg);
}

[data-popover-arrow][data-side="right"] {
  transform: rotate(-90deg);
}
```

### Renders

React: `<div>` with `aria-hidden="true"`.

---

## React Namespace Exports

All parts are exported under the `Popover` namespace:

```ts
import { Popover } from '@videojs/react';

// Components
Popover.Root
Popover.Trigger
Popover.Popup
Popover.Arrow

// Types (via namespace)
Popover.RootProps
Popover.TriggerProps
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
| Popover | `<media-popover>` |

### Registration

Single element registered in a single entry point:

```ts
// @videojs/html/ui/popover
// Registers: media-popover
```
