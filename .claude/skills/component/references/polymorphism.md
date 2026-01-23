# Polymorphism Patterns

Patterns for rendering component behavior on custom elements.

## Overview

Polymorphism allows users to customize which element a component renders as. Two main approaches:

| Pattern       | Library | Approach                     |
| ------------- | ------- | ---------------------------- |
| `render` prop | Base UI | Explicit function or element |
| `asChild`     | Radix   | Clone child element          |

**Recommendation: Prefer `render` prop** for explicit state access and clearer prop flow.

---

## `render` Pattern (Preferred)

### Element Form — Simple Cases

```tsx
// Renders MyButton with Dialog.Trigger behavior
<Dialog.Trigger render={<MyButton size="md" />}>Open dialog</Dialog.Trigger>
```

### Function Form — State Access

```tsx
// Access internal state for conditional rendering
<Switch.Thumb
  render={(props, state) => <span {...props}>{state.checked ? <CheckedIcon /> : <UncheckedIcon />}</span>}
/>
```

---

## `asChild` Pattern

### Usage

```tsx
<Dialog.Trigger asChild>
  <MyButton size="md">Open dialog</MyButton>
</Dialog.Trigger>
```

---

## Why `render` > `asChild`

| Concern            | `render`                              | `asChild`                                 |
| ------------------ | ------------------------------------- | ----------------------------------------- |
| **Prop flow**      | Explicit — you spread props visibly   | Hidden — `cloneElement` merges implicitly |
| **State access**   | Function form exposes component state | No state access                           |
| **TypeScript**     | Predictable inference                 | Can slow IDE autocomplete                 |
| **Debugging**      | Traceable prop flow                   | Magic makes tracing difficult             |
| **React guidance** | Aligns with React docs                | Uses `cloneElement` (React warns against) |

### The Problem with `asChild`

React's documentation warns that `cloneElement` "is uncommon and can lead to fragile code" and makes "it hard to tell how the data flows through your app."

`asChild` hides complexity rather than eliminating it:

```tsx
// asChild — implicit prop injection
<Dialog.Trigger asChild>
  <Button>Open</Button>  {/* Which props does Button receive? */}
</Dialog.Trigger>

// render — explicit prop handling
<Dialog.Trigger render={<Button />}>
  Open
</Dialog.Trigger>
```

With `asChild`, the child component must:

1. Spread all props it receives
2. Forward refs correctly
3. Handle event handler merging

Nothing enforces these requirements at compile time — breakage is silent.

---

## Prop Merging

Both patterns need to merge props carefully:

| Type           | Behavior            |
| -------------- | ------------------- |
| Event handlers | Chain — both called |
| `className`    | Concatenate         |
| `style`        | Shallow merge       |
| Other props    | Consumer overrides  |

> **Reference:** [Base UI mergeProps](https://github.com/mui/base-ui/blob/master/packages/react/src/merge-props/mergeProps.ts)

---

## Avoiding the `as` Prop

The `as` prop (polymorphic components) has TypeScript performance issues:

```tsx
// BAD: slow TypeScript, poor autocomplete
<Button as="a" href="/home">Link</Button>

// GOOD: use render prop instead
<Button render={<a href="/home" />}>Link</Button>
```

The `as` prop requires complex generic types that slow down the TypeScript language server.

---

## When to Use Each

| Scenario              | Pattern                      |
| --------------------- | ---------------------------- |
| Simple element swap   | `asChild` acceptable         |
| State-based rendering | `render` (function form)     |
| Complex prop merging  | `render` (explicit control)  |
| Debugging issues      | `render` (visible prop flow) |
| Maximum type safety   | `render`                     |

---

## See Also

- [Progressive Disclosure](../../api-design/principles/progressive-disclosure.md) — layered complexity
- [Anti-Patterns](anti-patterns.md) — polymorphism pitfalls
