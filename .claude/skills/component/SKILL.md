---
name: component
description: >-
  Build accessible, headless UI components with modern architecture patterns.
  Use when creating component libraries, design systems, or reusable UI primitives.
  Handles compound components, state management, accessibility, styling hooks, and API design.
  Includes HTML (controllers, ReactiveElement) and React (hooks, context) patterns.
  Triggers: "create component", "component pattern", "compound component", "headless component".
---

# Component Architecture Patterns

Build accessible, headless UI components using proven patterns from Base UI, Radix, and Ark UI. These patterns are **framework-agnostic** — core concepts apply across React, Vue, Svelte, Solid, and vanilla JS.

**Primary sources:**

- [Base UI Handbook](https://base-ui.com/react/handbook/overview)
- [Ark UI](https://ark-ui.com/) — Cross-framework implementation
- [Zag.js](https://zagjs.com/) — State machines for UI components

**Framework-specific:** [react.md](references/react.md) | [html.md](references/html.md)

---

## Core Principles

1. **Headless over styled** — Separate behavior from presentation
2. **Compound over monolithic** — Small composable parts over config-heavy megacomponents
3. **Controlled + uncontrolled** — Support both state ownership models
4. **Accessible by default** — ARIA, keyboard nav, focus management built-in
5. **State via attributes** — Expose state through `data-*` for framework-agnostic styling

---

## Pattern 1: Compound Components

**What:** Components as related parts sharing state through context, each mapping 1:1 to DOM elements.

**Why:**

- Declarative — assemble like building blocks, reorder/omit parts freely
- Each part is an independent styling target
- DOM structure maps directly to ARIA roles

**Standard hierarchies:**

| Type        | Parts                                                |
| ----------- | ---------------------------------------------------- |
| Popups      | Root → Trigger → Portal → Positioner → Popup → Arrow |
| Collections | Root → List → Trigger + Panel                        |
| Forms       | Root → Label → Control → Description → Error         |

**Ref:** [Base UI Composition](https://base-ui.com/react/handbook/composition)

---

## Pattern 2: Controlled & Uncontrolled State

**What:** Support external state control OR internal state with consistent prop naming.

**Why:**

- Flexibility for simple and complex use cases
- Predictable API across components
- Change details enable fine-grained control (cancel changes, track reasons)

**Convention:**

| State   | Uncontrolled     | Controlled | Handler                             |
| ------- | ---------------- | ---------- | ----------------------------------- |
| Open    | `defaultOpen`    | `open`     | `onOpenChange(open, details)`       |
| Value   | `defaultValue`   | `value`    | `onValueChange(value, details)`     |
| Checked | `defaultChecked` | `checked`  | `onCheckedChange(checked, details)` |

**Change details:** `{ reason, event, cancel() }`

**Ref:** [Base UI Customization](https://base-ui.com/react/handbook/customization)

---

## Pattern 3: Prop Getters

**What:** Functions returning HTML attributes for DOM elements, abstracting logic from rendering.

**Why:**

- Portable across frameworks (React, Vue, Svelte, Solid)
- Clean separation of concerns
- Composable via `mergeProps()`

**Example:** `getTriggerProps()` returns `{ aria-expanded, aria-haspopup, onClick, onKeyDown }`

**Ref:** [Zag.js](https://zagjs.com/), [Downshift](https://www.downshift-js.com/)

---

## Pattern 4: State via Data Attributes

**What:** Expose state through `data-*` attributes for CSS targeting.

**Why:**

- Framework-agnostic styling
- No JS needed for state-based styles
- Inspectable in DevTools

**Standard attributes:**

- `data-open` / `data-closed` — Visibility
- `data-checked` / `data-unchecked` — Toggle state
- `data-highlighted` — Focus within group
- `data-disabled`, `data-valid`, `data-invalid`
- `data-side`, `data-align` — Positioning

**CSS variables:** `--available-height`, `--anchor-width`, `--transform-origin`

**Ref:** [Base UI Styling](https://base-ui.com/react/handbook/styling)

---

## Pattern 5: Accessibility

**What:** ARIA, keyboard navigation, focus management built into architecture.

**Why:**

- Accessibility is structural, not decorative
- Users expect standard keyboard interactions
- Consistent patterns reduce errors

**Key concerns:**

- **ARIA attributes** — Auto-managed from state
- **Focus trapping** — Modals trap focus within
- **Roving tabindex** — One tabbable item, arrows navigate
- **Virtual focus** — `aria-activedescendant` for long lists
- **Typeahead** — A-Z jumps to matches

**Ref:** [Base UI Accessibility](https://base-ui.com/react/overview/accessibility), [WAI-ARIA Practices](https://www.w3.org/WAI/ARIA/apg/patterns/)

For detailed accessibility patterns, load the `aria` skill.

---

## Pattern 6: Floating Positioning

**What:** Position popups relative to triggers with collision detection.

**Why:** Handles viewport boundaries, scroll, resize automatically.

**Config:** `side`, `align`, `sideOffset`, `collision` (flip/shift), `trackAnchor`

**Ref:** [Floating UI](https://floating-ui.com/)

---

## API Conventions

| Category    | Props                                                          |
| ----------- | -------------------------------------------------------------- |
| Interaction | `disabled`, `required`, `readOnly`                             |
| Collections | `multiple`, `loopFocus`, `orientation`                         |
| Popups      | `modal`, `closeOnEscape`, `closeOnOutsideClick`, `keepMounted` |
| Positioning | `side`, `align`, `sideOffset`, `collision`                     |

**Imperative actions:** `actionsRef` exposing `open()`, `close()`, `toggle()`

See [props.md](references/props.md) for naming conventions.

---

## Reference Files

| File                                            | Contents                             |
| ----------------------------------------------- | ------------------------------------ |
| [html.md](references/html.md)                   | HTML controllers, mixins, context    |
| [videojs-element.md](references/videojs-element.md) | ReactiveElement lifecycle, properties, controllers |
| [react.md](references/react.md)                 | React hooks, context, refs           |
| [props.md](references/props.md)                 | Prop naming, conventions, defaults   |
| [styling.md](references/styling.md)             | Data attributes, CSS variables       |
| [animation.md](references/animation.md)         | CSS transitions, JS animation libs   |
| [polymorphism.md](references/polymorphism.md)   | render vs asChild patterns           |
| [collection.md](references/collection.md)       | Collections, portals, virtualization |
| [anti-patterns.md](references/anti-patterns.md) | Common component mistakes            |
| [videojs.md](references/videojs.md)             | Video.js component architecture      |

For accessibility patterns (ARIA, keyboard, focus), load the `aria` skill.

## Review

For structured component reviews, load the review workflow:

| File                                | Contents                    |
| ----------------------------------- | --------------------------- |
| [workflow.md](review/workflow.md)   | Review process and severity |
| [checklist.md](review/checklist.md) | Component review checklist  |
| [templates.md](review/templates.md) | Issue and report formats    |

---

## Implementation Sources

| Resource                                                                        | Use For                           |
| ------------------------------------------------------------------------------- | --------------------------------- |
| [Base UI Source](https://github.com/mui/base-ui/tree/master/packages/react/src) | React reference implementations   |
| [Radix Primitives](https://github.com/radix-ui/primitives)                      | Alternative approach              |
| [Zag.js](https://github.com/chakra-ui/zag)                                      | Framework-agnostic state machines |
| [Floating UI](https://floating-ui.com/docs/getting-started)                     | Positioning                       |

---

## Related Skills

| Need                   | Use          |
| ---------------------- | ------------ |
| Accessibility patterns | `aria` skill |
| API design principles  | `api` skill  |
| Documentation patterns | `docs` skill         |
| Component API reference  | `api-reference` skill |
