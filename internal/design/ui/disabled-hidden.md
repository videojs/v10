---
status: decided
date: 2026-04-18
---

# Disabled & Hidden States for Controls

## Decision

Use `aria-disabled` (never HTML `disabled`) for all toolbar buttons. Three visual states driven by data attributes:

| State | ARIA | HTML (custom element) | React | Styling |
|-------|------|-----------------------|-------|---------|
| **Unsupported** | `aria-disabled="true"` | `hidden` + `data-hidden` + `data-disabled` | returns `null` | Browser hides natively |
| **Unavailable** (Cast only) | `aria-disabled="true"` | `data-disabled` | `data-disabled` on `<button>` | Reduced opacity via `[data-disabled]` |
| **Disabled** (prop) | `aria-disabled="true"` | `data-disabled` | `data-disabled` on `<button>` | Reduced opacity via `[data-disabled]` |
| **Available + enabled** | _(none)_ | _(none)_ | _(none)_ | Fully interactive |

`data-availability` remains as a string enum (`available`, `unavailable`, `unsupported`) for consumers that need the raw value.

## Context

Feature buttons (Fullscreen, PiP, Cast) need to communicate three distinct states to users and assistive technology:

1. **Unsupported** — the browser lacks the capability entirely (e.g., PiP on older Safari). Applies to Fullscreen, PiP, and Cast.
2. **Unavailable** — the API exists but no target is available (e.g., no cast device found). Only applies to Cast.
3. **Disabled** — the developer explicitly disabled the control via a prop

Unsupported features are hidden entirely. Unavailable features (Cast only — no device found) and explicitly disabled buttons remain visible but non-interactive. `disabled` in state covers both the prop and feature unavailability. We evaluated `disabled` vs `aria-disabled`, `hidden` vs `aria-hidden`, and how Radix, Base UI, and WAI-ARIA APG handle these patterns.

## Alternatives Considered

- **HTML `disabled` attribute** — Removes elements from the tab order entirely. This breaks the APG toolbar pattern, which requires all toolbar buttons to remain focusable via arrow keys. It also prevents tooltips and hover states from working on disabled buttons.

- **Hybrid approach (like Base UI's `focusableWhenDisabled`)** — Adds a prop to toggle between `disabled` and `aria-disabled`. Unnecessary complexity for our use case since we always want buttons to remain focusable.

- **CSS-only hiding (`display: none` via data attributes)** — Our prior approach used `[data-availability]:not([data-available])` to hide buttons. This works but lacks native semantics. The HTML `hidden` attribute provides the same effect with proper semantics and works without any CSS.

## Rationale

### Why `aria-disabled` over `disabled`

The WAI-ARIA APG toolbar pattern explicitly recommends `aria-disabled` for toolbar buttons:

- **Keeps buttons in tab order** — keyboard users can discover disabled controls and understand what's available
- **Allows tooltips** — hover events still fire on `aria-disabled` elements, so tooltips can explain why a control is disabled
- **Consistent across custom elements** — HTML `disabled` only has native behavior on form controls (`<button>`, `<input>`), not custom elements

This aligns with both Radix (uses `aria-disabled` for custom interactive elements, `[data-disabled]` for styling) and Base UI (uses `aria-disabled` when `focusableWhenDisabled` is true, exposes `[data-disabled]`).

### Why HTML `hidden` for unavailable features

When a feature is unsupported or unavailable, the button should not be visible at all. The HTML `hidden` attribute:

- Works without CSS — no `display: none` rule needed
- Has native browser semantics
- Is set via `getAttrs()` alongside `aria-disabled`, keeping all attribute logic in one place

On the React side, the component returns `null` instead — the idiomatic React approach for conditional rendering.

### Why separate `data-disabled` and `data-hidden`

These serve different styling purposes:

- `data-disabled` — reduced opacity, `cursor: not-allowed` (button is visible but non-interactive)
- `data-hidden` — a styling hook for consumers; the HTML `hidden` attribute handles actual hiding

Both are driven by state fields (`disabled`, `hidden`) through the standard `applyStateDataAttrs` data attribute system.

## References

- [WAI-ARIA APG Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) — recommends `aria-disabled` for toolbar buttons
- [WAI-ARIA APG Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) — "when the action associated with a button is unavailable, the button has `aria-disabled` set to `true`"
- [Radix Primitives Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) — `aria-disabled` + `[data-disabled]` for custom elements
- [Base UI Accessibility](https://base-ui.com/react/handbook/styling) — `focusableWhenDisabled` prop, `[data-disabled]` attr
- [MDN: aria-disabled](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled)
