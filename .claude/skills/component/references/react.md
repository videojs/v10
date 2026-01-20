# React Component Patterns

React-specific implementation details for compound components. For framework-agnostic patterns, see [SKILL.md](../SKILL.md).

---

## Context Architecture

**What:** Compound components share state via React Context without prop drilling.

**Why:**

- Implicit state sharing between parts (Root → Trigger → Content)
- Clean consumer API — no manual wiring
- Nested contexts for multi-level components (Accordion → Item → Trigger)

**Pattern:**

- Create context with `undefined` default
- Consumer hook throws if used outside provider
- Root provides state, children consume

**Ref:** [Base UI Dialog Source](https://github.com/mui/base-ui/tree/master/packages/react/src/dialog)

---

## Essential Hooks

### `useControlledState`

**What:** Unifies controlled/uncontrolled state patterns.

**Why:** Single implementation handles both modes with consistent API.

**Behavior:**

- If `value` provided → controlled (external state)
- If only `defaultValue` → uncontrolled (internal state)
- Calls `onChange` in both modes

**Ref:** [Radix useControllableState](https://github.com/radix-ui/primitives/blob/main/packages/react/use-controllable-state/src/useControllableState.tsx)

---

### `useId`

**What:** Generate unique IDs for ARIA relationships.

**Why:** Labels, descriptions, and controls need matching IDs for accessibility.

**Note:** Built into React 18+. For earlier versions, use `@reach/auto-id`.

---

### `useFocusTrap`

**What:** Trap focus within a container (modal dialogs).

**Why:** Modal accessibility requires focus stays within dialog until closed.

**Behavior:**

- Tab at last element → first element
- Shift+Tab at first → last element
- Returns focus to trigger on close

**Ref:** [focus-trap](https://github.com/focus-trap/focus-trap) library

---

### `useRovingFocus`

**What:** Arrow key navigation within groups with single Tab stop.

**Why:** Standard keyboard pattern for menus, tablists, toolbars.

**Behavior:**

- Only focused item has `tabIndex={0}`
- Others have `tabIndex={-1}`
- Arrows move focus, optionally loops

**Ref:** [Radix RovingFocus](https://github.com/radix-ui/primitives/tree/main/packages/react/roving-focus)

---

### `useFloating`

**What:** Position floating elements relative to anchors.

**Why:** Popups need collision detection, scroll tracking, arrow positioning.

**Use:** Wrap `@floating-ui/react` with component-specific defaults.

**Ref:** [Floating UI React](https://floating-ui.com/docs/react)

---

## Ref Patterns

### Forward Refs on All Parts

**What:** Every compound component part forwards refs to its DOM element.

**Why:** Consumers need DOM access for focus management, measurements, animations.

**Pattern:** `forwardRef<HTMLElement, Props>((props, ref) => ...)`

---

### `useImperativeHandle` for Actions

**What:** Expose component actions through ref.

**Why:** Programmatic control — `dialogRef.current.open()`

**Pattern:**

```tsx
interface Actions {
  open(): void;
  close(): void;
}
useImperativeHandle(actionsRef, () => ({ open, close }));
```

**Ref:** [React useImperativeHandle](https://react.dev/reference/react/useImperativeHandle)

---

### `useMergeRefs` / `composeRefs`

**What:** Combine multiple refs pointing to same element.

**Why:** Compound components often need both:

- Internal ref (for positioning, focus management, measurements)
- Forwarded ref (for consumer access)
- Floating UI ref (for anchor positioning)

**Use cases:**

- Trigger needs internal ref + forwarded ref + floating anchor ref
- Popup needs internal ref + forwarded ref + floating ref
- Any part using `useFloating` alongside `forwardRef`

**Ref:** [Floating UI useMergeRefs](https://floating-ui.com/docs/react#usemergerefs), [Radix composeRefs](https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/composeRefs.tsx)

---

## Render Prop Implementation

**What:** The `render` prop replaces default element with custom element or component.

**Key pieces:**

- Accept `ReactElement` or `(props, state) => ReactElement`
- Use `cloneElement` for element form
- Use `mergeProps` to combine internal + external props

**`mergeProps` behavior:**

- Event handlers — chain (both called)
- className — concatenate
- style — shallow merge
- Other props — override

**Ref:** [Base UI useRender](https://github.com/mui/base-ui/blob/master/packages/react/src/use-render/useRender.ts)

---

## Render Delegation

**What:** Replace default rendered element while preserving component behavior.

**Why:**

- Element polymorphism (button → link)
- Integrate with existing component libraries
- Conditional rendering based on internal state

### Approaches

| Pattern        | Library | Usage                                                           |
| -------------- | ------- | --------------------------------------------------------------- |
| `render` prop  | Base UI | `render={<a href="..." />}` or `render={(props, state) => ...}` |
| `asChild` prop | Radix   | `<Trigger asChild><a href="...">Link</a></Trigger>`             |
| `as` prop      | Various | `<Button as="a" href="...">` — simpler, less flexible           |

### Key Utility: `mergeProps`

**What:** Safely combines props from component internals + consumer.

**Behavior:**

- Event handlers → chained (both called)
- `className` → concatenated
- `style` → shallow merged
- Other props → consumer overrides

**Ref:** [Base UI mergeProps](https://github.com/mui/base-ui/blob/master/packages/react/src/merge-props/mergeProps.ts), [Radix Slot](https://github.com/radix-ui/primitives/tree/main/packages/react/slot)

---

## Portal

**What:** Render children into `document.body` (or custom container).

**Why:** Popups need to escape parent overflow/stacking contexts.

**Implementation:** `createPortal(children, container)` after mount.

**Ref:** [React createPortal](https://react.dev/reference/react-dom/createPortal)

---

## Server Components

**What:** Compound components are Client Components (use hooks, events).

**Why:** Interactive components can't be Server Components.

**Pattern:** Mark with `'use client'` directive. Server Components can compose them.

---

## TypeScript Patterns

### Namespaced Types

**What:** Export types under component namespace.

**Why:** Clean imports — `Dialog.RootProps`, `Dialog.TriggerProps`

**Pattern:**

```tsx
export namespace Dialog {
  export interface RootProps { ... }
  export interface TriggerProps { ... }
}
```

---

### Generic Collections

**What:** Collection components generic over item type.

**Why:** Type-safe `value` and `onValueChange` for any item type.

**Pattern:** `function Select<T>({ value, onValueChange }: SelectProps<T>)`

---

### Polymorphic Components

**What:** Components accepting `as` prop with full type inference.

**Why:** `<Button as="a" href="...">` with correct HTML attributes.

**Ref:** [Radix Polymorphic](https://github.com/radix-ui/primitives/tree/main/packages/react/polymorphic)

---

## Performance

### Context Splitting

**What:** Separate contexts by update frequency.

**Why:** Prevent unnecessary re-renders — highlight changes shouldn't re-render entire tree.

**Pattern:** `MenuStateContext` (stable) vs `MenuHighlightContext` (frequent updates)

---

### Memoization

**What:** `useMemo` for context values, `memo` for parts.

**Why:** Stable references prevent child re-renders.

---

## Export Pattern

**What:** Named exports as namespace object.

**Pattern:**

```tsx
// dialog/index.ts
export { DialogRoot as Root } from './root';
export { DialogTrigger as Trigger } from './trigger';
// Usage: import * as Dialog from './dialog';
```

---

## Implementation Sources

| Pattern            | Reference                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Context + Compound | [Base UI Dialog](https://github.com/mui/base-ui/tree/master/packages/react/src/dialog)                               |
| Controlled State   | [Radix useControllableState](https://github.com/radix-ui/primitives/blob/main/packages/react/use-controllable-state) |
| Focus Trap         | [focus-trap-react](https://github.com/focus-trap/focus-trap-react)                                                   |
| Roving Focus       | [Radix RovingFocus](https://github.com/radix-ui/primitives/tree/main/packages/react/roving-focus)                    |
| Floating           | [Floating UI React](https://floating-ui.com/docs/react)                                                              |
| Merge Props        | [Base UI mergeProps](https://github.com/mui/base-ui/blob/master/packages/react/src/merge-props/mergeProps.ts)        |

---

## See Also

- [aria/react.md](../../aria/references/react.md) — React accessibility patterns (focus scope, announcements, a11y testing)
