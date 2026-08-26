---
name: create-react-component
description: Create or change Video.js React UI components. Use for React component boundaries, state ownership, compound parts, render customization, styling hooks, exports, or client behavior.
---

# React component implementation

Read the relevant core contract, nearest React component and tests, public exports, and UI design record before choosing a pattern. Use `packages/react/src/ui/play-button/` for a simple control and `packages/react/src/ui/slider/` for a compound control.

## Workflow

1. Classify the request as a reusable primitive or app/skin composition before defining its contract. Then define the state owner, semantics, APIs, optional parts, styling contract, and opt-outs.
2. Put runtime-neutral state and actions in `packages/core/src/core/ui/`; put reusable DOM interaction in `packages/core/src/dom/ui/`; subscribe to the narrowest player state in React.
3. Reuse `createMediaButton` when its contract fits. Otherwise use `UIComponentProps` and `renderElement` so DOM props, event handlers, state callbacks, and refs compose correctly.
4. Let React own rendered DOM updates: express them through props, state, context, and render output. Reserve refs for browser imperatives such as focus or measurement; avoid mutating React-owned nodes so debugging, tests, hydration, and integrations remain authoritative.
5. Add a compound part only for a semantic, focusable, placeable, omittable, or replaceable node. Keep context values narrow and scoped to the owning root; do not mirror derived state through effects. If the API starts coordinating independent behavior, extract another component or hook instead of adding modes and options.
6. Expose discrete state through mapped `data-*` attributes and dynamic layout values through stable CSS custom properties. Leave visual defaults to skins and CSS. Treat descendant selectors, `:has()`, and other complex selectors introduced by composition as a likely sign that the primitive boundary or styling hooks need improvement.
7. Preserve the default semantic element while allowing deliberate replacement through `render`. Ensure omitted parts and unsupported features do not leave hidden behavior or required markup behind.
8. Export compound APIs as tree-shakeable ESM namespaces with `export * as Name from './index.parts'`; keep parts as direct re-exports and do not assemble a runtime namespace object. When a compound specializes another compound, re-export unchanged base parts under the specialized namespace and create a specialized part only when its behavior or defaults differ. Avoid pulling optional dependencies into unrelated imports. Add focused tests for rendered behavior, ref/prop composition, context boundaries, and customization.

Use `packages/react/src/ui/create-media-button.tsx`, `packages/react/src/utils/use-render.tsx`, and `packages/react/src/ui/slider/index.parts.ts` as implementation anchors. Check `packages/react/package.json` and `packages/react/vite.config.ts` when the public or bundle boundary changes.

## Example

Input: “Create the React chapter-skip control.”

Output: A scoped core contract, composable React adapter, stable styling hooks, deliberate render escape hatch, exports, and focused tests.
