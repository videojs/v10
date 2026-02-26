# Design Decisions

Rationale behind popover component choices.

## Component Structure

### Five-Part Compound (Root, Trigger, Positioner, Popup, Arrow)

**Decision:** The popover uses a five-part compound structure: Root (state/context provider, no DOM), Trigger (button), Positioner (positioning wrapper), Popup (dialog content), Arrow (decorative caret).

**Alternatives:**

- Three-part (Trigger, Content, Arrow) — simpler, but conflates positioning and content concerns. Radix uses this approach with `PopoverContent` handling both positioning and rendering.
- Trigger + Popup only — minimal, but positioning styles applied directly to content prevents independent styling of the positioned container vs. the visual popup.

**Rationale:** Separating Positioner from Popup gives users independent control over positioning strategy (absolute/fixed, anchor CSS) and content styling (background, border, padding). The positioner handles geometry; the popup handles appearance. This matches Base UI's architecture. Root as a provider-only component (no DOM) avoids adding a wrapper element to the rendered output.

### Root Renders No DOM

**Decision:** `Popover.Root` in React renders no DOM element — it's a context provider only. In HTML, `<media-popover>` is a custom element (so it exists in the DOM) but its role is purely providing context.

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

### Inline Styles for Manual Positioning

**Decision:** The manual fallback applies `top` and `left` directly as inline styles on the positioner element. Sizing constraints (`anchorWidth`, `anchorHeight`, `availableWidth`, `availableHeight`) remain as CSS custom properties.

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

- Boolean `open` only — no way to track transition lifecycle. Positioner would be removed immediately, cutting off CSS transitions.
- Separate `animating` boolean — doesn't distinguish opening from closing.
- `transitionStatus` only, no `open` boolean — requires checking `status !== 'closed'` everywhere instead of `open`.

**Rationale:** The positioner must stay in the DOM during the `closing` phase so CSS transitions can complete. `transitionStatus` enables this: `Positioner` returns `null` only when `!open && transitionStatus === 'closed'`. Having both `open` and `transitionStatus` is intentional — `open` is the semantic state (is the popover logically open?), `transitionStatus` is the animation state.

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

**Decision:** Trigger has `aria-controls={popupId}`, where `popupId` is a unique ID set on the Popup element.

**Alternatives:**

- `aria-owns` — implies a parent-child relationship that doesn't match the DOM structure.
- No linking — screen readers can't programmatically navigate from trigger to popup.

**Rationale:** `aria-controls` is the standard way to indicate that a button controls a specific element. Combined with `aria-expanded` and `aria-haspopup`, it gives assistive technology a complete picture of the trigger-popup relationship.

### Positioner is `role="presentation"`

**Decision:** The Positioner element has `role="presentation"` — it's a positioning wrapper with no semantic meaning.

**Rationale:** The Positioner exists purely for CSS positioning. It sits between the trigger and the dialog but has no semantic role. `role="presentation"` correctly removes it from the accessibility tree so screen readers don't announce an extra element.

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

### Document Listeners Scoped to Open State

**Decision:** Escape and outside-click listeners are attached when the popover opens and removed when it closes.

**Alternatives:**

- Always-attached listeners — waste of resources when popover is closed. Multiple closed popovers on a page would all be listening.
- Listener on popup element only — can't catch Escape when focus is outside popup, can't detect outside clicks.

**Rationale:** Matches the slider's approach with document `pointermove`/`pointerup` during drag. Listeners are only active when needed. Cleanup is centralized in the AbortController pattern.

### Controlled and Uncontrolled Modes

**Decision:** Both React and HTML support controlled (`open` prop) and uncontrolled (`defaultOpen` prop) modes. The `onOpenChange` callback fires for both.

**Controlled mode:** External state syncs to internal interaction state. When `open` prop changes, `popover.open()` / `popover.close()` is called.

**Uncontrolled mode:** `defaultOpen` is applied once at creation. Internal state manages everything.

**Rationale:** Standard React pattern. Some consumers need external control (e.g., "close all popovers when video plays"). Others just want a self-managing popover. Both get the same `onOpenChange` callback for observation.

### Single Registration Entry Point

**Decision:** All 5 popover elements are registered in a single entry point (`@videojs/html/ui/popover`).

**Alternatives:**

- Separate registration per part — too much ceremony for a component where all parts are always used together.
- Split registration (basic + arrow, like slider splits basic + preview) — arrow is lightweight, no reason to separate.

**Rationale:** Unlike slider (where preview involves heavy positioning logic and is genuinely optional), all popover parts are lightweight and typically used together. A single import keeps things simple.

## Naming

### `Popup` Not `Content`

**Decision:** `Popover.Popup` / `<media-popover-popup>`.

**Alternatives:**

- `Content` (Radix) — too generic, doesn't communicate that this is the floating element.
- `Panel` — implies a specific visual treatment.
- `Dialog` — already the role, using it as the name conflates DOM structure with ARIA semantics.

**Rationale:** "Popup" directly communicates what the element is — the thing that pops up. Combined with the native Popover API naming (`showPopover()`/`hidePopover()`), it creates a consistent mental model.

### `Positioner` Not `Anchor` or `Float`

**Decision:** `Popover.Positioner` / `<media-popover-positioner>`.

**Alternatives:**

- `Anchor` — confusing because the trigger is the anchor element. The positioner is positioned *by* the anchor.
- `Float` — implies Floating UI, which we don't use.
- No positioner (positioning on Popup directly) — conflates positioning and content styling.

**Rationale:** "Positioner" clearly communicates purpose: it's the element that handles positioning. Matches Base UI's naming.

## Open Questions

### Flip/Shift Behavior

Should the popover automatically flip to the opposite side when there isn't enough space? Should it shift along the alignment axis to stay within the boundary? CSS Anchor Positioning handles this natively with `position-try-fallbacks`, but the manual fallback would need JavaScript logic. Not implemented yet.

### Focus Trapping

The `modal: 'trap-focus'` option is reserved but not implemented. When implemented, it should trap Tab/Shift+Tab within the popup content. This needs to handle edge cases like focus sentinels, initial focus target, and return focus on close.

### Nested Popovers

How should nested popovers (e.g., a settings menu with a submenu popover) interact? Should closing the parent close all children? Should outside-click detection respect the nesting hierarchy? Not yet designed.
