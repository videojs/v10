---
name: review-react-component-design
description: Review React component designs. Use for boundaries, APIs, opt-outs, and bundles.
---

# React component design review

Read the proposal, nearby records, and relevant React code, tests, exports, and package metadata.

1. Ask whether the proposal is a reusable primitive or app/skin composition before adding a component or part.
2. Trace ownership and data flow across core, DOM behavior, and React. Check effects and cleanup.
3. Review compound anatomy, React and CSS APIs, and whether each addition has a consumer. Leave visual structure to CSS. If the surface spans independent features, separate them into another component or hook. Treat descendant selectors, `:has()`, and other complex selectors introduced by composition as a likely sign of a weak primitive boundary or missing `data-*` or CSS custom-property hooks.
4. Exercise omission, render replacement, styling, behavior, and import opt-outs.
5. Weigh API complexity against bundle cost and verify client boundaries. Compound APIs should use tree-shakeable ESM namespace re-exports rather than runtime namespace objects. Check accessibility, interaction, and SSR constraints.

Use `packages/react/src/ui/`, `use-render.tsx`, and package metadata as evidence. Report findings by severity with the smallest change.

Where local precedent is insufficient, consult [React](https://react.dev/learn/you-might-not-need-an-effect) for data flow, [Base UI](https://base-ui.com/react/handbook/composition) for headless composition, [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) for interaction patterns, and [webpack](https://webpack.js.org/guides/tree-shaking/) for tree shaking.

## Example

Input: “Review this React chapter-menu design.”

Output: Prioritized findings about boundaries, APIs, opt-outs, SSR, accessibility, and bundle cost.
