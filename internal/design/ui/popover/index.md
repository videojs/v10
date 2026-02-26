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

- Compound and composable — users assemble parts, omit what they don't need
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
  <Popover.Positioner>
    <Popover.Popup>
      <Popover.Arrow />
      {/* popover content */}
    </Popover.Popup>
  </Popover.Positioner>
</Popover.Root>
```

### HTML

```ts
import '@videojs/html/ui/popover';
```

```html
<media-popover>
  <media-popover-trigger>Settings</media-popover-trigger>
  <media-popover-positioner>
    <media-popover-popup>
      <media-popover-arrow></media-popover-arrow>
      <!-- popover content -->
    </media-popover-popup>
  </media-popover-positioner>
</media-popover>
```

## Layers

Three layers, each independently useful:

| Layer | Package | Purpose |
| ----- | ------- | ------- |
| Core | `@videojs/core` | State computation, ARIA attrs, default props. No DOM. |
| DOM | `@videojs/core/dom` | Open/close interaction (`createPopover`), positioning (`getAnchorPositionStyle`), transition tracking. |
| UI | `@videojs/react`, `@videojs/html` | Compound components and custom elements. |

See [architecture.md](architecture.md) for internals.

## CSS Custom Properties

Popovers expose sizing constraint values as CSS custom properties on the positioner element. These are **output values** for the manual positioning fallback. When CSS Anchor Positioning is natively supported, the browser handles placement and these vars are not set.

| Property | Example | Description |
| -------- | ------- | ----------- |
| `--media-popover-anchor-width` | `120px` | Anchor element's width. |
| `--media-popover-anchor-height` | `40px` | Anchor element's height. |
| `--media-popover-available-width` | `350px` | Available width between trigger and boundary edge. |
| `--media-popover-available-height` | `280px` | Available height between trigger and boundary edge. |

Positioning (`top`/`left`) is applied directly as inline styles on the positioner — no CSS var indirection. Unlike the slider (where parts consume continuous values in different ways), popover positioning has a single correct application.

```css
/* Constrain popup size to available space */
media-popover-popup {
  max-width: var(--media-popover-available-width);
  max-height: var(--media-popover-available-height);
}
```

When CSS Anchor Positioning is supported, the positioner receives native CSS properties (`position-anchor`, `anchor()` functions) and the CSS vars above are not set.

## Data Attributes

State is exposed through data attributes for CSS targeting. Applied to the trigger and all child parts (Positioner, Popup, Arrow).

| Attribute | Values | When |
| --------- | ------ | ---- |
| `data-open` | present/absent | Popover is open. |
| `data-side` | `top` / `bottom` / `left` / `right` | Which side the popover is positioned relative to the trigger. |
| `data-align` | `start` / `center` / `end` | How the popover is aligned along the specified side. |

```css
/* Rotate arrow based on side */
media-popover-arrow[data-side="top"] {
  transform: rotate(180deg);
}

media-popover-arrow[data-side="bottom"] {
  transform: rotate(0deg);
}

/* Style trigger when popover is open */
media-popover-trigger[data-open] {
  background: rgba(255, 255, 255, 0.2);
}
```

## Interaction Modes

### Click (default)

Click the trigger to toggle open/close. Closes on Escape key or outside click.

```tsx
<Popover.Root>
  <Popover.Trigger>Settings</Popover.Trigger>
  {/* ... */}
</Popover.Root>
```

### Hover

Set `openOnHover` to open on pointer enter with configurable delays. Falls back to click-to-toggle when `(hover: hover)` media query doesn't match (touch devices).

```tsx
<Popover.Root openOnHover delay={300} closeDelay={100}>
  <Popover.Trigger>Volume</Popover.Trigger>
  {/* ... */}
</Popover.Root>
```

Pointer entering the popup cancels pending close — users can move from trigger to popup without it closing.

## Accessibility

The Trigger carries `aria-expanded` and `aria-haspopup="dialog"`, linked to the Popup via `aria-controls`. The Popup carries `role="dialog"` with conditional `aria-modal`.

```html
<media-popover>
  <media-popover-trigger
    aria-expanded="true"
    aria-haspopup="dialog"
    aria-controls="media-popover-popup-1">
    Settings
  </media-popover-trigger>
  <media-popover-positioner role="presentation">
    <media-popover-popup
      id="media-popover-popup-1"
      role="dialog">
      <!-- content -->
    </media-popover-popup>
  </media-popover-positioner>
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
