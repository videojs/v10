---
name: review-html-component
description: Review Video.js custom-element UI components without editing code. Use for HTML data flow, element boundaries, markup, styling APIs, transitions, rendered presence, opt-outs, registration, lifecycle, or bundle impact.
---

# HTML component review

Read the implementation, core and DOM contracts, rendered semantics, tests, definition entry, package metadata, relevant design record, and nearest comparable element.

1. Trace the source of truth, subscriptions, mutations, and events. Flag duplicated state, upward property writes, hidden coupling, or platform behavior that belongs in core.
2. Check that each element or compound part has a scoped responsibility. Require markup for semantics, focus, content, or consumer composition; prefer CSS or pseudo-elements for purely visual structure.
3. Review the whole public surface: properties, reflected attributes, events, methods, context, data attributes, CSS custom properties, tag names, and exports. Tie every addition to a concrete consumer.
4. Test opt-outs: optional parts can be omitted, author-owned attributes are preserved, styling can be replaced, and optional behavior is not activated by unrelated imports.
5. Inspect registration and tree-shaking boundaries. Element classes should not self-register; `define/ui` modules should register narrowly through `safeDefine`; `package.json` and build entries must mark only real side effects.
6. Check connection, disconnection, destruction, upgrade behavior, transition presence and races, cleanup, accessibility, and platform tests. Verify interaction in a browser when focus, keyboard, pointer, timing, or rendered structure matters.

Use `packages/html/src/ui/play-button/`, `packages/html/src/ui/slider/`, `packages/html/src/define/ui/`, `packages/html/package.json`, and `packages/html/tsdown.config.ts` as comparison anchors.

Report findings by severity with the location, affected consumer, evidence, and smallest viable improvement. Separate correctness and contract gaps from optional trade-offs.

## Example

Input: “Review the new HTML chapter menu.”

Output: Prioritized findings about ownership, DOM anatomy, events, styling contracts, opt-outs, lifecycle, registration, or bundle boundaries.
