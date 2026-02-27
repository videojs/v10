# Design Decisions

Rationale behind popover component choices.

## Component Structure

### Platform-Specific Component Structure

**Decision:** HTML uses a single `<media-popover>` element. React uses a five-part compound pattern (Root, Trigger, Positioner, Popup, Arrow).

**HTML (single element):** The popover is a self-contained `<media-popover>` custom element. The trigger is an external element linked via the `commandfor` attribute (W3C Invoker Commands pattern). The popover element acts as both the popup container and the positioned element.

**React (compound pattern):** The popover uses Root (state/context provider, no DOM), Trigger (button), Positioner (transparent pass-through, no DOM), Popup (positioned dialog with Popover API), Arrow (decorative caret).

**Alternatives:**

- Same compound structure for both platforms — would require 5 HTML custom elements (`<media-popover>`, `<media-popover-trigger>`, `<media-popover-positioner>`, `<media-popover-popup>`, `<media-popover-arrow>`). This conflicted with the tech preview API surface and felt overly verbose for HTML usage.
- Single element for both platforms — React benefits from compound composition where each part can receive independent props, refs, and event handlers.

**Rationale:** Different platforms have different ergonomic needs. HTML custom elements work best as self-contained units — a single `<media-popover>` with `commandfor`-based trigger discovery matches the W3C Invoker Commands pattern and the tech preview API. React benefits from compound composition — users can place refs on individual parts, pass custom event handlers, and compose exactly the structure they need. The shared `PopoverCore` and `createPopover()` layers ensure identical behavior.

### `commandfor` Trigger Discovery (HTML)

**Decision:** In HTML, the trigger is discovered by querying `[commandfor="${this.id}"]` on the root node.

**Alternatives:**

- Require a `<media-popover-trigger>` child element — adds markup verbosity, requires custom element registration.
- Manual `trigger-id` attribute — requires the trigger to have an `id`, adds coupling.
- Slot-based approach — `<slot name="trigger">` would work in Shadow DOM but adds complexity for Light DOM usage.

**Rationale:** `commandfor` is a W3C standard pattern (Invoker Commands) for linking a button to the element it controls. It works in both document and shadow root contexts via `getRootNode().querySelector()`. The trigger can be any element, placed anywhere in the DOM — not just a direct child. This matches the tech preview's approach and is the most flexible option.

### Positioner as Transparent Pass-Through (React)

**Decision:** `Popover.Positioner` renders no DOM element — it returns `children` directly. Positioning logic lives on `PopoverPopup`.

**Alternatives:**

- Positioner renders a `<div>` with positioning styles — this was the original design, but the popup enters the top layer via `showPopover()`, which removes it from its parent's layout context. Positioning styles on a wrapper outside the top layer have no effect.
- Remove Positioner entirely — would break API compatibility for consumers already using `<Popover.Positioner>`.

**Rationale:** The Popover API's top-layer promotion is the root cause: `showPopover()` moves the popup element to a layer above everything else, disconnected from its parent's positioning context. Styles on the Positioner wrapper have no effect. Moving positioning to the Popup (the element that actually enters the top layer) is the correct fix. Keeping Positioner as a pass-through preserves the compound API shape without adding unnecessary DOM.

### Root Renders No DOM

**Decision:** `Popover.Root` in React renders no DOM element — it's a context provider only. In HTML, `<media-popover>` is the popup element itself (no separate root/context provider).

**Alternatives:**

- Root wraps children in a `<div>` — adds an unnecessary wrapper to every popover.
- No Root, context on Trigger — Trigger becomes responsible for both interaction and state management, coupling concerns.

**Rationale:** Popover state management (open/close, controlled/uncontrolled, hover delays) is orthogonal to DOM rendering. A provider-only Root keeps the rendered DOM minimal. Users compose the exact DOM structure they need.

### No Default Children

**Decision:** Root does not render default parts. Users compose every part explicitly.

**Rationale:** Same reasoning as the slider — compound components should not assume structure. Some popovers need an arrow, others don't. Some need a positioner with specific styling, others use a different positioning approach. Explicit composition avoids the "how do I remove the default arrow" problem.

## Positioning

### CSS Anchor Positioning with Manual Fallback

**Decision:** Primary positioning uses the [CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning) specification. When `supportsAnchorPositioning()` returns false, a JavaScript-computed manual fallback kicks in.

**Alternatives:**

- JavaScript-only positioning (Floating UI, Popper.js) — battle-tested, but adds runtime cost for measuring and repositioning. Requires ResizeObserver/IntersectionObserver for boundary awareness.
- CSS Anchor Positioning only — not widely supported yet. Would break in older browsers.
- Manual positioning only — misses the opportunity to leverage the browser's native positioning.

**Rationale:** CSS Anchor Positioning is the future of popover positioning on the web. It handles overflow, scrolling, and resizing natively without JavaScript measurement. Using it as the primary strategy with a JS fallback provides the best experience on modern browsers while maintaining compatibility. The detection is cached module-level and the code paths are cleanly separated.

### Positioning on the Popup Element

**Decision:** Both HTML and React apply positioning styles to the popup element (the element that calls `showPopover()` and enters the top layer), not to a separate positioning wrapper.

**Alternatives:**

- Positioning on a wrapper `<div>` (original compound design) — the wrapper stays in normal document flow while the popup element is promoted to the top layer. The wrapper's positioning styles have no effect on the top-layer element.

**Rationale:** The native Popover API promotes the popup element to the top layer, removing it from its parent's layout context. Any positioning applied to a parent/wrapper element is ignored. This is why the original 5-element compound pattern broke — the `<media-popover-positioner>` had the positioning styles but `<media-popover-popup>` (with `popover="manual"`) was in the top layer and couldn't see them.

### Anchor Name from Element ID

**Decision:** The CSS anchor name is derived from the popover's `id` attribute (HTML) or a generated unique ID (React). E.g., `--settings-popover`.

**Alternatives:**

- Incrementing counter (`--popover-1`, `--popover-2`) — less readable in DevTools.
- Random ID — unpredictable, harder to debug.

**Rationale:** Using the element's `id` makes anchor names human-readable and predictable. In DevTools, seeing `position-anchor: --settings-popover` is immediately understandable. Matches the tech preview pattern.

### Inline Styles for Manual Positioning

**Decision:** The manual fallback applies `top` and `left` directly as inline styles on the popup element. Sizing constraints (`anchorWidth`, `anchorHeight`, `availableWidth`, `availableHeight`) remain as CSS custom properties.

**Alternatives:**

- CSS custom properties for `top`/`left` (previous design) — adds indirection that forces users to write `top: var(--media-popover-top)` in their styles. Easy to miss, extra setup for no benefit.
- Transform-based positioning — `transform: translate(x, y)` avoids layout but conflicts with user transforms.

**Rationale:** The slider uses CSS vars for fill/pointer/buffer because parts consume those values in different ways (`width` vs `transform: scaleX()`). Popover positioning has a single correct application — there's no reason for `top`/`left` to be indirect. Inline styles just work, matching the CSS Anchor Positioning path where the browser also applies positioning directly. Sizing constraints stay as CSS vars because users genuinely need to consume them differently (`max-width`, `max-height`, custom layouts).

### Side Offset Increases Distance

**Decision:** `sideOffset` always increases the distance between trigger and popover, regardless of which side. A positive `sideOffset` on `side="top"` moves the popover further above the trigger.

**Alternatives:**

- Side offset in a fixed direction (always positive = up/right) — inconsistent mental model depending on side.
- No offset, users use `margin` — works but less ergonomic for common use cases.

**Rationale:** "Offset" should mean "push the popover further away from the trigger." This is the intuitive mental model and matches Radix and Base UI behavior.

### `--media-popover-*` Prefix

**Decision:** Use `--media-popover-*` for CSS custom property names.

**Rationale:** Matches the `--media-slider-*` convention. `--media-` prefix is descriptive without being brand-specific.

## Interaction

### Click-to-Toggle as Default

**Decision:** Default interaction is click-to-toggle. Hover requires opting in via `openOnHover` prop.

**Alternatives:**

- Hover as default — would be surprising for most media player popovers (settings menus should require a click).
- Separate `HoverPopover` component — API surface bloat for a prop-level difference.

**Rationale:** Most media player popovers (settings, chapter list, audio tracks) are click-to-open. Hover is only needed for specific cases like volume popover. Making hover opt-in keeps the default behavior predictable.

### Hover with Media Query Guard

**Decision:** When `openOnHover` is true, hover behavior only activates when `matchMedia('(hover: hover)')` matches. Touch devices fall back to click-to-toggle automatically.

**Alternatives:**

- Always enable hover regardless of device — touch devices would trigger open on tap-and-hold, confusing behavior.
- Use `pointerType` check on each event — more granular but requires per-event branching.

**Rationale:** The `(hover: hover)` media query is the standard way to detect hover capability. It correctly handles touch-only devices, mouse users, and hybrid devices (laptop with touchscreen). A single check at pointer-enter time is simpler and more reliable than per-event `pointerType` inspection.

### Hover Delay Defaults (300ms Open, 0ms Close)

**Decision:** Default `delay` is 300ms for open, `closeDelay` is 0ms for close.

**Alternatives:**

- Symmetric delays (e.g., 200ms both) — closing feels sluggish.
- No open delay — popover flashes open during casual mouse movement.
- Both 0ms — too sensitive, opens on accidental hover.

**Rationale:** 300ms open delay prevents accidental activation during casual mouse movement. 0ms close delay gives immediate feedback when the user moves away. Users can customize both values. The popup's `onPointerEnter` cancels pending close, so moving from trigger to popup feels seamless.

### Popup Cancels Pending Close

**Decision:** When the pointer enters the popup element, any pending close timeout is cancelled. This applies to hover popovers only.

**Alternatives:**

- No cancellation — popup closes when pointer leaves trigger, even if moving toward popup content.
- Invisible "bridge" element connecting trigger and popup — complex DOM manipulation for the same result.

**Rationale:** Users moving from trigger to popup expect the popover to stay open. Without this, there's a gap between trigger and popup where the popover would close. The cancel-on-popup-enter pattern is standard (Radix, Base UI, Floating UI all implement it).

### Thunks for Option Callbacks

**Decision:** `createPopover` options that read prop values (`closeOnEscape`, `closeOnOutsideClick`, `openOnHover`, `delay`, `closeDelay`) are thunks (zero-arg functions) rather than static values.

```ts
createPopover({
  closeOnEscape: () => propsRef.current.closeOnEscape,
  openOnHover: () => propsRef.current.openOnHover,
  // ...
});
```

**Alternatives:**

- Static values, recreate factory on prop change — loses state (open/close), wastes memory.
- Static values with setter methods — more API surface.
- Event emitter pattern — over-engineered for this use case.

**Rationale:** The factory instance lives for the component's lifetime. Props can change anytime (React re-renders). Thunks let the factory always read the latest prop values without being recreated. This is the same pattern used by the slider's `createSlider()` options (`getOrientation`, `isDisabled`, etc.).

## State

### Transition Status as Interaction State

**Decision:** `PopoverInteraction` includes `transitionStatus: 'closed' | 'opening' | 'open' | 'closing'` alongside `open: boolean`.

**Alternatives:**

- Boolean `open` only — no way to track transition lifecycle. Popup would be removed immediately, cutting off CSS transitions.
- Separate `animating` boolean — doesn't distinguish opening from closing.
- `transitionStatus` only, no `open` boolean — requires checking `status !== 'closed'` everywhere instead of `open`.

**Rationale:** The popup must stay in the DOM during the `closing` phase so CSS transitions can complete. `transitionStatus` enables this: `Popup` returns `null` only when `!open && transitionStatus === 'closed'`. Having both `open` and `transitionStatus` is intentional — `open` is the semantic state (is the popover logically open?), `transitionStatus` is the animation state.

### Transition-Aware Closing

**Decision:** Closing uses a double-RAF then `Promise.all(getAnimations().filter(...).map(t => t.finished))` pattern to wait for CSS transitions before hiding.

The filter uses duck-typing (`'transitionProperty' in anim`) rather than `instanceof CSSTransition` because the latter is unreliable across browser environments.

**Alternatives:**

- `transitionend` event — unreliable when multiple transitions are involved or when transitions are cancelled mid-flight.
- Fixed timeout — brittle, doesn't adapt to actual transition duration.
- No transition support — popover snaps closed, poor visual experience.

**Rationale:** `getAnimations()` is the reliable way to wait for all in-flight CSS transitions. The Web Animations API returns actual `Animation` objects that can be awaited. Double-RAF ensures the browser has had time to compute transition start states before we query animations. This pattern is used by Base UI.

### Abort Guards in RAF Callbacks

**Decision:** Both `applyOpen` and `applyClose` RAF callbacks check `abort.signal.aborted` before executing.

```ts
requestAnimationFrame(() => {
  if (abort.signal.aborted) return;
  requestAnimationFrame(() => {
    if (abort.signal.aborted) return;
    // proceed
  });
});
```

**Alternatives:**

- Cancel RAFs on destroy via `cancelAnimationFrame` — requires tracking RAF IDs, more bookkeeping.
- No guards — callbacks execute after destroy, operating on nulled elements.

**Rationale:** `destroy()` can be called at any time (component unmount, disconnect). Queued RAF callbacks from `applyOpen`/`applyClose` would execute on the next frame, potentially calling `showPopover()`/`hidePopover()` on nulled element references. The signal check is lightweight and consistent with the AbortController cleanup pattern used throughout.

## Accessibility

### `role="dialog"` on Popup

**Decision:** The popup element has `role="dialog"`. The trigger has `aria-haspopup="dialog"`.

**Alternatives:**

- `role="menu"` — only appropriate when the popover content is a menu with `menuitem` roles. Our popover is generic — it can contain any content.
- `role="listbox"` — only for selection lists.
- No role — assistive technology wouldn't announce the popup.

**Rationale:** `dialog` is the generic role for floating interactive content. Even when the popover contains a menu, the dialog role works correctly. Specific content-role components (Menu) can override the popup role as needed. This matches Radix and Base UI.

### `aria-modal` Only for `modal: true`

**Decision:** `aria-modal="true"` is set only when `modal === true`, not when `modal === 'trap-focus'`.

**Alternatives:**

- Set `aria-modal` for both `true` and `'trap-focus'` — would tell screen readers that background content is inaccessible, which is only true with full modal behavior.
- Never set `aria-modal` — loses semantic information for truly modal popovers.

**Rationale:** `aria-modal` tells assistive technology that content outside the dialog is inert. `'trap-focus'` is a behavioral concern (keyboard focus stays within the popover) but doesn't make background content semantically inaccessible. The separation matters: a volume popover might trap focus for keyboard users but should still let screen readers access the rest of the player.

### `aria-controls` Links Trigger to Popup

**Decision:** Trigger has `aria-controls={popupId}`, where `popupId` is the popover element's `id` (HTML) or a generated unique ID (React).

**Alternatives:**

- `aria-owns` — implies a parent-child relationship that doesn't match the DOM structure.
- No linking — screen readers can't programmatically navigate from trigger to popup.

**Rationale:** `aria-controls` is the standard way to indicate that a button controls a specific element. Combined with `aria-expanded` and `aria-haspopup`, it gives assistive technology a complete picture of the trigger-popup relationship.

### Arrow is `aria-hidden="true"`

**Decision:** The Arrow element has `aria-hidden="true"`.

**Rationale:** The arrow is purely decorative — a visual indicator of which element the popover is anchored to. It has no interactive or informational role for assistive technology.

## Platform

### Native Popover API (`popover="manual"`)

**Decision:** The popup element uses the native [Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API) with `popover="manual"` mode. Opening calls `showPopover()`, closing calls `hidePopover()`.

**Alternatives:**

- `popover="auto"` — auto-dismisses on outside interaction. But we manage dismissal ourselves (with configurable `closeOnEscape` and `closeOnOutsideClick`), so auto behavior would conflict.
- z-index stacking — fragile, requires managing z-index across the entire application.
- `<dialog>` element — modal-focused, doesn't support non-modal popovers well. Also doesn't provide top-layer rendering for non-modal use.

**Rationale:** `popover="manual"` gives us top-layer rendering (above all other content, no z-index needed) without auto-dismiss behavior. We control open/close entirely through `createPopover()`. The Popover API has broad browser support (Chrome 114+, Firefox 125+, Safari 17+) which aligns with Video.js 10's browser targets.

### `setPopupElement` Calls `showPopover` When Already Open

**Decision:** When `setPopupElement(el)` is called and the interaction state is already open, the factory automatically calls `tryShowPopover(el)` on the new element.

**Rationale:** In React, state changes trigger re-renders. When `open()` is called, it sets interaction to `{ open: true }`, which causes a re-render, which mounts `PopoverPopup`, which calls `setPopupElement`. But `applyOpen()` (which calls `showPopover`) already ran synchronously during `open()` — at that point, the popup element wasn't mounted yet. Without this fix, the popup would be logically open but never shown in the top layer.

### Document Listeners Scoped to Open State

**Decision:** Escape and outside-click listeners are attached when the popover opens and removed when it closes.

**Alternatives:**

- Always-attached listeners — waste of resources when popover is closed. Multiple closed popovers on a page would all be listening.
- Listener on popup element only — can't catch Escape when focus is outside popup, can't detect outside clicks.

**Rationale:** Matches the slider's approach with document `pointermove`/`pointerup` during drag. Listeners are only active when needed. Cleanup is centralized in the AbortController pattern.

### Controlled and Uncontrolled Modes

**Decision:** Both React and HTML support controlled (`open` prop/attribute) and uncontrolled (`defaultOpen` prop/attribute) modes. The `onOpenChange` callback (React) / `open-change` event (HTML) fires for both.

**Controlled mode:** External state syncs to internal interaction state. When `open` prop changes, `popover.open()` / `popover.close()` is called.

**Uncontrolled mode:** `defaultOpen` is applied once at creation. Internal state manages everything.

**Rationale:** Standard React pattern. Some consumers need external control (e.g., "close all popovers when video plays"). Others just want a self-managing popover. Both get the same callback/event for observation.

### Single Registration Entry Point

**Decision:** The single `<media-popover>` element is registered in a single entry point (`@videojs/html/ui/popover`).

**Rationale:** There's only one element to register. The entry point follows the same pattern as other UI components.

## Naming

### `Popup` Not `Content`

**Decision:** `Popover.Popup` / `<media-popover>`.

**Alternatives:**

- `Content` (Radix) — too generic, doesn't communicate that this is the floating element.
- `Panel` — implies a specific visual treatment.
- `Dialog` — already the role, using it as the name conflates DOM structure with ARIA semantics.

**Rationale:** "Popup" directly communicates what the element is — the thing that pops up. Combined with the native Popover API naming (`showPopover()`/`hidePopover()`), it creates a consistent mental model.

### `Positioner` Kept for API Compatibility

**Decision:** `Popover.Positioner` is kept in the React API even though it's now a transparent pass-through.

**Alternatives:**

- Remove Positioner entirely — breaks existing consumer code that wraps `Popover.Popup` in `Popover.Positioner`.
- Deprecation warning — adds noise for a harmless component.

**Rationale:** Keeping the Positioner as a no-op pass-through preserves backward compatibility at zero cost. Consumers who wrote `<Popover.Positioner><Popover.Popup>...</Popover.Popup></Popover.Positioner>` continue to work unchanged. New consumers can omit it if they prefer.

## Open Questions

### Flip/Shift Behavior

Should the popover automatically flip to the opposite side when there isn't enough space? Should it shift along the alignment axis to stay within the boundary? CSS Anchor Positioning handles this natively with `position-try-fallbacks`, but the manual fallback would need JavaScript logic. Not implemented yet.

### Focus Trapping

The `modal: 'trap-focus'` option is reserved but not implemented. When implemented, it should trap Tab/Shift+Tab within the popup content. This needs to handle edge cases like focus sentinels, initial focus target, and return focus on close.

### Nested Popovers

How should nested popovers (e.g., a settings menu with a submenu popover) interact? Should closing the parent close all children? Should outside-click detection respect the nesting hierarchy? Not yet designed.
