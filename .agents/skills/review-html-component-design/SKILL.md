---
name: review-html-component-design
description: Review HTML component designs. Use for boundaries, APIs, opt-outs, and bundles.
---

# HTML component design review

Read the proposal, nearby records, and relevant HTML code, tests, exports, and package metadata.

1. Ask whether the proposal is a reusable primitive or app/skin composition before adding an element or part.
2. Trace ownership and data flow across core, DOM behavior, and the element. Check lifecycle and cleanup.
3. Review light-DOM anatomy, element and CSS APIs, and whether each addition has a consumer. Leave visual structure to CSS. If the surface spans independent features, separate them into another element or controller. Treat descendant selectors, `:has()`, and other complex selectors introduced by composition as a likely sign of a weak primitive boundary or missing `data-*` or CSS custom-property hooks.
4. Exercise omission, replacement, styling, behavior, and registration opt-outs.
5. Weigh API complexity against bundle cost and verify side-effect boundaries. Check accessibility and interaction constraints.

Use `packages/html/src/ui/`, definition entries, and package metadata as evidence. Report findings by severity with the smallest change.

Where local precedent is insufficient, consult [Open UI](https://open-ui.org/component-spec-template/) for anatomy and API questions, [Lit](https://lit.dev/docs/composition/component-composition/) for element composition, [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) for interaction patterns, and [webpack](https://webpack.js.org/guides/tree-shaking/) for tree shaking.

## Example

Input: “Review this HTML chapter-menu design.”

Output: Prioritized findings about boundaries, APIs, opt-outs, lifecycle, accessibility, and bundle cost.
