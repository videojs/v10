---
name: implement-accessible-ui
description: Implement accessible Video.js UI. Use for semantics, ARIA, keyboard interaction, focus, screen readers, captions, or live regions.
---

# Accessibility

Start from the rendered semantics and interaction contract. Prefer native HTML; add ARIA only where native semantics cannot express the control.

## Workflow

1. Read the component, its rendered output, interaction tests, and adjacent accessible controls.
2. Define expected name, role, value/state, keyboard behavior, focus behavior, and announcements.
3. Load only the applicable reference:
   - Keyboard: `references/keyboard.md`
   - Focus: `references/focus.md`
   - Roles and states: `references/aria.md`
   - React-specific implementation: `references/react.md`
   - Media-player behavior: `references/media.md`
   - Suspected smell: `references/anti-patterns.md`
4. Implement the smallest semantic change and add behavior-focused tests.
5. Verify keyboard and focus behavior in a browser when interaction changed.

Never remove visible focus without a replacement, use positive `tabindex`, convey meaning only with color, or use a changing label where a state attribute is the correct contract.

## Example

Input: “Make the custom volume slider keyboard accessible.”

Output: Correct native or ARIA semantics, keyboard and focus behavior, announcements, focused tests, and browser verification.
