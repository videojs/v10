---
name: build-ui-component
description: Build reusable Video.js HTML and React components. Use for contracts, controlled state, compound APIs, styling hooks, collections, animation, or parity.
---

# Component architecture

Read the core contract, both platform adapters, tests, and nearby components before choosing a pattern. Preserve the separation between runtime-neutral core state and HTML/React bindings.

## Workflow

1. Define observable behavior, ownership of state, platform parity, accessibility, and styling contracts.
2. Reuse an adjacent Video.js component shape where possible.
3. Load only relevant material:
   - Core component/API patterns: `references/videojs.md`
   - HTML controller or element implementation: `references/html.md`, then `references/videojs-element.md` if needed
   - React implementation: `references/react.md`
   - Props, controlled state, or polymorphism: `references/props.md`, `references/polymorphism.md`
   - Collections, animation, or styling: the matching file in `references/`
   - Suspected smell: `references/anti-patterns.md`
4. Define and test the accessible interaction contract when semantics or behavior change.
5. Implement behavior in the lowest shared layer and keep adapters thin.
6. Add focused core and platform tests, then verify interactive behavior in the browser when needed.

Expose meaningful state through stable `data-*` attributes and CSS variables rather than inline animation logic. Do not add controlled/uncontrolled modes, compound structure, or polymorphism unless the use case requires them.

## Example

Input: “Build matching HTML and React mute buttons.”

Output: A shared behavior contract, thin platform adapters, accessible interaction behavior, and focused parity tests.
