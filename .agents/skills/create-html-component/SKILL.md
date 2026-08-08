---
name: create-html-component
description: Create or change Video.js custom-element UI components. Use for HTML component boundaries, properties, events, controllers, light-DOM parts, styling hooks, registration, or lifecycle.
---

# HTML component implementation

Read the relevant core contract, nearest HTML element and tests, definition entry, and UI design record before choosing a pattern. Use `packages/html/src/ui/play-button/` for a simple control and `packages/html/src/ui/slider/` for a compound control. Read `packages/element/README.md` when changing reactive properties, lifecycle, or controllers.

## Workflow

1. Define the state owner, rendered semantics, properties and attributes, events, optional parts, styling contract, and consumer opt-outs.
2. Put runtime-neutral state and actions in `packages/core/src/core/ui/`; put reusable DOM interaction in `packages/core/src/dom/ui/`; keep the element an adapter.
3. Match the nearest `MediaElement` or `MediaButtonElement` pattern. Send properties down and semantic events up; use controllers or context only across a real ownership boundary.
4. Add markup for semantics, focus, content, or parts consumers must place, omit, or replace. Leave purely visual structure to skins, CSS, or pseudo-elements.
5. Expose discrete state through mapped `data-*` attributes and dynamic layout values through stable CSS custom properties. Define each token's owner, units, and fallback.
6. Keep the element class free of registration side effects. Register it with `safeDefine` under `packages/html/src/define/ui/`, update `HTMLElementTagNameMap`, and preserve narrow import and `sideEffects` boundaries.
7. Clean up subscriptions, observers, listeners, locks, and async work across disconnect and destroy. Add focused core and HTML tests; verify interaction in a browser when semantics, focus, or pointer behavior changes.

Check `packages/html/package.json` and `packages/html/tsdown.config.ts` when adding an entrypoint or registration module. Run the narrow package tests and build; build changed exported types before repository typechecking.

## Example

Input: “Create the HTML chapter-skip control.”

Output: A scoped core contract, thin custom element, explicit definition entry, headless styling hooks, cleanup, and focused tests.
