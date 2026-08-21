---
name: implement-ui-transition
description: Implement UI transitions and rendered presence. Use for lifecycle, cancellation, rapid reopen, or HTML/React parity.
---

# UI transition implementation

Read `packages/core/src/core/ui/transition.ts`, `packages/core/src/dom/ui/transition.ts`, their tests, and the nearest HTML and React integrations before changing transition behavior. Popover is the general open/close example; input indicators cover payload retention during exit.

## Workflow

1. Define logical state, rendered presence, transition completion, and the lifetime of focus, payload, locks, and callbacks.
2. Reuse `TransitionState`, `TransitionDataAttrs`, and `createTransition`. Do not add component-local timers or framework-only presence state for the shared lifecycle.
3. Apply `data-starting-style` before the first visible frame. Keep content active during `data-ending-style`; let CSS own duration, easing, transforms, and other presentation.
4. Adapt the same transition state into HTML and React. Keep immediate change callbacks distinct from completion callbacks, and retain data needed to render the exiting state.
5. Handle no-animation completion, cancellation, rapid reopen, repeated updates during exit, disconnect, and destroy. Never infer completion from a fixed CSS duration.
6. Add CSS custom properties only for dynamic geometry or values consumers need for styling. Preserve a usable reduced-motion path without changing semantic state or focus order.
7. Test state and data-attribute ordering, presence through exit, completion, races, cleanup, and platform parity. Verify the rendered transition in a browser when timing or layout matters.

Use `packages/core/src/dom/ui/tests/transition.test.ts`, `packages/core/src/dom/ui/popover/`, `packages/html/src/ui/popover/`, `packages/react/src/ui/popover/`, and the input-indicator implementations as comparison anchors.

## Example

Input: “Keep the chapter indicator mounted while its exit animation completes.”

Output: Shared presence state, stable exiting content, CSS-owned motion, race-safe cleanup, matching adapters, and focused tests.
