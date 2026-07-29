---
status: decided
date: 2026-04-27
---

# Disabled & Hidden States for Controls

## Decision

Use `aria-disabled` (never HTML `disabled`) for all toolbar buttons. Controls distinguish whether an action is available, should remain discoverable, or should be removed from the layout:

| State | Controls | ARIA | HTML (custom element) | React | Styling |
|-------|----------|------|-----------------------|-------|---------|
| **Unsupported** | Fullscreen, PiP, Cast, AirPlay | `aria-disabled="true"` | `hidden` + `data-hidden` + `data-disabled` | returns `null` | Browser hides natively |
| **Unavailable and not useful yet** | Fullscreen/PiP support unresolved; captions or AirPlay absent | `aria-disabled="true"` | `hidden` + `data-hidden` + `data-disabled` | returns `null` | Browser hides natively |
| **Unavailable but discoverable** | Cast API supported, no device reachable | `aria-disabled="true"` | `data-disabled` | `data-disabled` on `<button>` | Default skin disabled styling |
| **Disabled** (prop) | Available controls | `aria-disabled="true"` | `data-disabled` | `data-disabled` on `<button>` | Default skin disabled styling |
| **Available + enabled** | All controls | _(none)_ | _(none)_ | _(none)_ | Fully interactive |

`data-availability` remains as a string enum (`available`, `unavailable`, `unsupported`) for consumers that need the raw value.

## Context

Feature buttons (Fullscreen, PiP, Cast, AirPlay, Captions) need to communicate distinct states to users and assistive technology:

1. **Unsupported** — the browser lacks the capability entirely (e.g., PiP on older Safari). Applies to Fullscreen, PiP, Cast, and AirPlay.
2. **Unavailable** — the capability is not usable now. Its meaning depends on the feature: Fullscreen and PiP use it while support is unresolved, Captions uses it when no caption/subtitle tracks exist, Cast uses it when its API exists but no device is reachable, and AirPlay uses it when no target is available.
3. **Disabled** — the developer explicitly disabled the control via a prop.

Unsupported features and controls without meaningful content or resolved support are hidden entirely. Cast remains visible but non-interactive when its API is supported and no device is reachable, allowing tooltips to explain the missing target. Explicitly disabled, otherwise available buttons also remain visible and non-interactive. `disabled` in state covers both the prop and feature unavailability. We evaluated `disabled` vs `aria-disabled`, `hidden` vs `aria-hidden`, and how Radix, Base UI, and WAI-ARIA APG handle these patterns.

## Alternatives Considered

- **HTML `disabled` attribute** — Removes elements from the tab order entirely. This breaks the APG toolbar pattern, which requires all toolbar buttons to remain focusable via arrow keys. It also prevents tooltips and hover states from working on disabled buttons.

- **Hybrid approach (like Base UI's `focusableWhenDisabled`)** — Adds a prop to toggle between `disabled` and `aria-disabled`. Unnecessary complexity for our use case since we always want buttons to remain focusable.

- **CSS-only hiding (`display: none` via data attributes)** — Our prior approach used `[data-availability]:not([data-available])` to hide buttons. This works but lacks native semantics. The HTML `hidden` attribute provides the same effect with proper semantics and works without any CSS.

## Rationale

### Why `aria-disabled` over `disabled`

The WAI-ARIA APG toolbar pattern explicitly recommends `aria-disabled` for toolbar buttons:

- **Keeps buttons in tab order** — keyboard users can discover disabled controls and understand what's available.
- **Allows tooltips** — hover events still fire on `aria-disabled` elements, so tooltips can explain why a control is disabled.
- **Consistent across custom elements** — HTML `disabled` only has native behavior on form controls (`<button>`, `<input>`), not custom elements.

This aligns with both Radix (uses `aria-disabled` for custom interactive elements, `[data-disabled]` for styling) and Base UI (uses `aria-disabled` when `focusableWhenDisabled` is true, exposes `[data-disabled]`).

### Why HTML `hidden` for controls that are not useful yet

When a feature is unsupported, capability detection is unresolved, or a content-dependent control has no content, the button should not be visible. The HTML `hidden` attribute:

- Works without CSS — no `display: none` rule needed.
- Has native browser semantics.
- Is set via `getAttrs()` alongside `aria-disabled`, keeping all attribute logic in one place.

On the React side, the component returns `null` instead — the idiomatic React approach for conditional rendering. The `createMediaButton` factory accepts an optional `isSupported` callback; AirPlay, Cast, Captions, Fullscreen, and PiP each pass `(state) => !state.hidden`.

### Why separate `data-disabled` and `data-hidden`

These serve different purposes:

- `data-disabled` — a hook for a non-interactive button. Default skins provide disabled styling when the button remains visible.
- `data-hidden` — a styling hook for consumers; the HTML `hidden` attribute handles actual hiding.

Both are driven by state fields (`disabled`, `hidden`) through the standard `applyStateDataAttrs` data attribute system.

### Implementation notes

- All affected controls derive `disabled = props.disabled || availability !== 'available'`.
- Fullscreen, PiP, and AirPlay derive `hidden = availability !== 'available'`; Cast derives `hidden = availability === 'unsupported'`; Captions derives `hidden = availability === 'unavailable'`.
- `getAttrs()` returns `aria-disabled` from `state.disabled` and the native `hidden` attribute from `state.hidden`.
- `toggle()` short-circuits when the derived state is disabled, then invokes the underlying media call. Direct core callers generally receive any rejection; AirPlay continues to absorb user-cancelled request failures. `MediaButtonElement` and `createMediaButton` log rejected activations in `__DEV__` and absorb them at the UI event boundary to avoid unhandled promise rejections.

## References

- [WAI-ARIA APG Toolbar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) — recommends `aria-disabled` for toolbar buttons.
- [WAI-ARIA APG Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) — "when the action associated with a button is unavailable, the button has `aria-disabled` set to `true`".
- [Radix Primitives Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility) — `aria-disabled` + `[data-disabled]` for custom elements.
- [Base UI Accessibility](https://base-ui.com/react/handbook/styling) — `focusableWhenDisabled` prop, `[data-disabled]` attr.
- [MDN: aria-disabled](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled).
