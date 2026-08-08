---
name: create-react-component
description: Create or change Video.js React UI components. Use for React component boundaries, state ownership, compound parts, render customization, styling hooks, exports, or client behavior.
---

# React component implementation

Read the relevant core contract, nearest React component and tests, public exports, and UI design record before choosing a pattern. Use `packages/react/src/ui/play-button/` for a simple control and `packages/react/src/ui/slider/` for a compound control.

## Workflow

1. Define the state owner, rendered semantics, callbacks, optional parts, styling contract, and consumer opt-outs.
2. Put runtime-neutral state and actions in `packages/core/src/core/ui/`; put reusable DOM interaction in `packages/core/src/dom/ui/`; subscribe to the narrowest player state in React.
3. Reuse `createMediaButton` when its contract fits. Otherwise use `UIComponentProps` and `renderElement` so DOM props, event handlers, state callbacks, and refs compose correctly.
4. Add a compound part only for a semantic, focusable, placeable, omittable, or replaceable node. Keep context values narrow and scoped to the owning root; do not mirror derived state through effects.
5. Expose discrete state through mapped `data-*` attributes and dynamic layout values through stable CSS custom properties. Leave visual defaults to skins and CSS.
6. Preserve the default semantic element while allowing deliberate replacement through `render`. Ensure omitted parts and unsupported features do not leave hidden behavior or required markup behind.
7. Update component and namespace exports without pulling optional dependencies into unrelated imports. Add focused core and React tests for rendered behavior, ref/prop composition, context boundaries, and customization.

Use `packages/react/src/ui/create-media-button.tsx`, `packages/react/src/utils/use-render.tsx`, and `packages/react/src/ui/slider/index.parts.ts` as implementation anchors. Check `packages/react/package.json` and `packages/react/tsdown.config.ts` when the public or bundle boundary changes.

## Example

Input: “Create the React chapter-skip control.”

Output: A scoped core contract, composable React adapter, stable styling hooks, deliberate render escape hatch, exports, and focused tests.
