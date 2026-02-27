---
status: draft
date: 2026-02-26
---

# Popover

Compound, headless popover components for media controls — menus, settings panels, and tooltip-like overlays.

## Contents

| Document                          | Purpose                                            |
| --------------------------------- | -------------------------------------------------- |
| [index.md](index.md)             | Overview, anatomy, quick start                     |
| [architecture.md](architecture.md) | Core classes, DOM interaction, positioning, file structure |
| [parts.md](parts.md)             | All compound parts — props, state, data attributes |
| [decisions.md](decisions.md)      | Design decisions and rationale                     |

## Problem

Media players need floating UI for controls that don't fit in the primary bar:

1. **Settings menus** — quality, playback speed, captions
2. **Volume popover** — vertical volume slider that appears on hover
3. **Info panels** — chapter lists, audio track selection

These all share mechanics (open/close, positioning relative to a trigger, keyboard dismissal, outside-click dismissal) but differ in content and interaction mode (click vs hover). They must position themselves correctly relative to their trigger element, ideally using CSS Anchor Positioning with a manual fallback for older browsers.

Requirements:

- Composable — users assemble parts, omit what they don't need
- Headless — no baked-in styles, CSS custom properties for positioning output
- Accessible — `role="dialog"`, `aria-expanded` on trigger, keyboard Escape to close
- Two interaction modes — click-to-toggle and hover-to-open (with configurable delays)
- Two positioning strategies — native CSS Anchor Positioning with automatic JS fallback
- Cross-platform — same core logic drives React components and HTML custom elements
- Transition-aware — tracks CSS transition lifecycle so closing animations complete before removal

## Anatomy

### React

```tsx
import { Popover } from '@videojs/react';

<Popover.Root>
  <Popover.Trigger>Settings</Popover.Trigger>
  <Popover.Popup>
    <Popover.Arrow />
    {/* popover content */}
  </Popover.Popup>
</Popover.Root>
```

### HTML

```ts
import '@videojs/html/ui/popover';
```

```html
<!-- Trigger is an external element linked via commandfor -->
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

HTML uses a **single `<media-popover>` element** that is both the popup and the positioned container. The trigger is an external element linked via the `commandfor` attribute (W3C Invoker Commands pattern). This matches the tech-preview API surface.

## Layers

Three layers, each independently useful:

| Layer | Package | Purpose |
| ----- | ------- | ------- |
| Core | `@videojs/core` | State computation, ARIA attrs, default props. No DOM. |
| DOM | `@videojs/core/dom` | Open/close interaction (`createPopover`), positioning (`getAnchorPositionStyle`), transition tracking. |
| UI | `@videojs/react`, `@videojs/html` | Compound components and custom elements. |

See [architecture.md](architecture.md) for internals.

## CSS Custom Properties

Popovers expose sizing constraint values as CSS custom properties on the popup element. These are **output values** for the manual positioning fallback. When CSS Anchor Positioning is natively supported, the browser handles placement and these vars are not set.

### Offset Variables (Input)

| Property | Default | Description |
| -------- | ------- | ----------- |
| `--media-popover-side-offset` | `0px` | Distance from trigger along the side axis. |
| `--media-popover-align-offset` | `0px` | Offset along the alignment axis. |

These are **input values** — set them in CSS to control positioning. The CSS Anchor Positioning path inlines `var(--media-popover-side-offset, 0px)` directly in `calc()` expressions. The manual fallback reads resolved values via `getComputedStyle()`.

```css
/* Push the popup 8px away from the trigger */
media-popover,
[data-popover-popup] {
  --media-popover-side-offset: 8px;
}
```

### Sizing Variables (Output)

| Property | Example | Description |
| -------- | ------- | ----------- |
| `--media-popover-anchor-width` | `120px` | Anchor element's width. |
| `--media-popover-anchor-height` | `40px` | Anchor element's height. |
| `--media-popover-available-width` | `350px` | Available width between trigger and boundary edge. |
| `--media-popover-available-height` | `280px` | Available height between trigger and boundary edge. |

These are **output values** set by the manual positioning fallback for CSS-based sizing constraints. When CSS Anchor Positioning is natively supported, the browser handles placement and these vars are not set.

Positioning (`top`/`left`) is applied directly as inline styles on the popup element — no CSS var indirection. Unlike the slider (where parts consume continuous values in different ways), popover positioning has a single correct application.

```css
/* Constrain popup size to available space */
media-popover,
[data-popover-popup] {
  max-width: var(--media-popover-available-width);
  max-height: var(--media-popover-available-height);
}
```

## Data Attributes

State is exposed through data attributes for CSS targeting. In HTML, applied to the `<media-popover>` element. In React, applied to all compound parts.

| Attribute | Values | When |
| --------- | ------ | ---- |
| `data-open` | present/absent | Popover is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Which side the popover is positioned relative to the trigger. |
| `data-align` | `start` / `center` / `end` | How the popover is aligned along the specified side. |

```css
/* Style popover based on side */
media-popover[data-side="top"] {
  /* arrow or content adjustments */
}

/* Style trigger when popover is open (React) */
[data-popover-trigger][data-open] {
  background: rgba(255, 255, 255, 0.2);
}
```

## Interaction Modes

### Click (default)

Click the trigger to toggle open/close. Closes on Escape key or outside click.

```tsx
<Popover.Root>
  <Popover.Trigger>Settings</Popover.Trigger>
  <Popover.Popup>{/* ... */}</Popover.Popup>
</Popover.Root>
```

### Hover

Set `openOnHover` to open on pointer enter with configurable delays. Falls back to click-to-toggle when `(hover: hover)` media query doesn't match (touch devices).

```tsx
<Popover.Root openOnHover delay={300} closeDelay={100}>
  <Popover.Trigger>Volume</Popover.Trigger>
  <Popover.Popup>{/* ... */}</Popover.Popup>
</Popover.Root>
```

Pointer entering the popup cancels pending close — users can move from trigger to popup without it closing.

## Accessibility

The trigger carries `aria-expanded` and `aria-haspopup="dialog"`, linked to the popup via `aria-controls`. The popup carries `role="dialog"` with conditional `aria-modal`.

```html
<!-- Trigger with ARIA (applied automatically by <media-popover>) -->
<button
  commandfor="settings-popover"
  aria-expanded="true"
  aria-haspopup="dialog"
  aria-controls="settings-popover">
  Settings
</button>

<!-- Popover element IS the popup -->
<media-popover
  id="settings-popover"
  role="dialog">
  <!-- content -->
</media-popover>
```

### Keyboard

| Key | Action |
| --- | ------ |
| `Enter` / `Space` | Toggle popover via trigger click. |
| `Escape` | Close popover (when `closeOnEscape` is true). |

### Modal Behavior

The `modal` prop controls accessibility semantics:

| Value | Behavior |
| ----- | -------- |
| `false` (default) | Non-modal. Background content remains interactive. |
| `true` | Sets `aria-modal="true"` on the popup. |
| `'trap-focus'` | Reserved for future focus trapping. Does not set `aria-modal`. |

## Related Docs

- [architecture.md](architecture.md) — Core classes, file structure, data flow
- [parts.md](parts.md) — Full API for every compound part
- [decisions.md](decisions.md) — Design rationale
