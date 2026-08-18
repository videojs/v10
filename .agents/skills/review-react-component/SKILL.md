---
name: review-react-component
description: Review Video.js React UI components without editing code. Use for React data flow, component boundaries, compound APIs, render customization, styling APIs, transitions, rendered presence, opt-outs, exports, or bundle impact.
---

# React component review

Read the implementation, core and DOM contracts, rendered semantics, tests, exports, package metadata, relevant design record, and nearest comparable component.

1. Trace the source of truth, selectors, context, callbacks, and effects. Flag mirrored state, synchronization effects, broad subscriptions, unstable context values, or platform behavior that belongs in core.
2. Flag direct mutation of React-owned DOM or effects that synchronize rendered state; refs should be limited to browser imperatives so React debugging, tests, hydration, and integrations remain authoritative.
3. Check that each component or compound part has a scoped primitive responsibility; flag app or skin composition embedded in it. Prefer CSS or pseudo-elements when a distinction is purely visual.
4. Review the whole public surface: props, callbacks, context, refs, render functions, data attributes, CSS custom properties, namespaces, and exports. Controlled or uncontrolled modes must each have a demonstrated consumer. Split independent behavior into another component or hook when the surface is growing around multiple concerns. Flag descendant selectors, `:has()`, or other complex selectors introduced by composition as likely evidence of a weak primitive boundary or missing `data-*` or CSS custom-property hooks.
5. Test opt-outs: optional parts can be omitted, default markup remains useful, `render` replacements preserve semantics, props, events, and refs, and unsupported features leave no hidden behavior.
6. Inspect imports, dependencies, re-exports, client boundaries, and production tree shaking. Compound APIs should use `export * as Name from './index.parts'` with direct part re-exports, not a runtime namespace object. Optional parts or integrations should not force unrelated code into a consumer bundle.
7. Check transition presence and races, cleanup, SSR behavior, accessibility, and tests for state flow, nested roots, prop/ref composition, rendered output, and customization.

Use `packages/react/src/ui/create-media-button.tsx`, `packages/react/src/utils/use-render.tsx`, `packages/react/src/ui/play-button/`, `packages/react/src/ui/slider/`, `packages/react/package.json`, and `packages/react/tsdown.config.ts` as comparison anchors.

Report findings by severity with the location, affected consumer, evidence, and smallest viable improvement. Separate correctness and contract gaps from optional trade-offs.

## Example

Input: “Review the new React chapter menu.”

Output: Prioritized findings about ownership, compound anatomy, render escape hatches, styling contracts, opt-outs, exports, or bundle boundaries.
