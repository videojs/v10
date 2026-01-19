# Component Review Checklist

Comprehensive checklist for reviewing UI components against architecture patterns and conventions.

---

## Architecture

### Compound Components

- [ ] Component uses compound structure (Root, Trigger, Content, etc.)
- [ ] Each part maps 1:1 to a DOM element
- [ ] Parts can be reordered or omitted freely
- [ ] No prop explosion (>10 props suggests need for decomposition)

**Detection:** Single component with many configuration props

```tsx
// BAD: Prop explosion
<Dialog title="..." description="..." closeButton overlayClassName="..." />

// GOOD: Compound
<Dialog.Root>
  <Dialog.Overlay />
  <Dialog.Content>
    <Dialog.Title>...</Dialog.Title>
    <Dialog.Close />
  </Dialog.Content>
</Dialog.Root>
```

### Standard Hierarchies

| Type        | Expected Parts                                       |
| ----------- | ---------------------------------------------------- |
| Popups      | Root → Trigger → Portal → Positioner → Popup → Arrow |
| Collections | Root → List → Trigger + Panel                        |
| Forms       | Root → Label → Control → Description → Error         |

### Context Scoping

- [ ] Each Root creates isolated context
- [ ] Nested instances don't interfere

**Detection:** Nested components share unintended state

---

## State Management

### Controlled & Uncontrolled Support

- [ ] Both modes supported: `value` (controlled) and `defaultValue` (uncontrolled)
- [ ] Works correctly in either mode
- [ ] No state desync between modes

**Detection:** Only `defaultValue` or only `value` supported

| State   | Uncontrolled     | Controlled | Handler           |
| ------- | ---------------- | ---------- | ----------------- |
| Open    | `defaultOpen`    | `open`     | `onOpenChange`    |
| Value   | `defaultValue`   | `value`    | `onValueChange`   |
| Checked | `defaultChecked` | `checked`  | `onCheckedChange` |

### Change Event Details

- [ ] Handler receives value and details object
- [ ] Details includes `reason` (click, keyboard, blur, escape, etc.)
- [ ] Details includes `event` (original DOM event)
- [ ] Details includes `cancel()` for preventing change

**Detection:** Handler receives only value, no context

```typescript
// BAD
onOpenChange?: (open: boolean) => void;

// GOOD
onOpenChange?: (open: boolean, details: ChangeDetails) => void;
```

### Imperative Actions

- [ ] `actionsRef` prop exposes imperative methods where needed
- [ ] Common actions: `open()`, `close()`, `toggle()`, `focus()`

---

## Props & API

### Boolean Props

- [ ] Use positive adjectives: `disabled`, `required`, `open`
- [ ] Avoid `is`/`has` prefixes: not `isDisabled`, `isOpen`

| Good       | Avoid        |
| ---------- | ------------ |
| `disabled` | `isDisabled` |
| `open`     | `isOpen`     |
| `loading`  | `isLoading`  |

### Event Handler Naming

- [ ] Pattern: `on` + Noun + Verb
- [ ] Specific names over generic: `onValueChange` not `onChange`

| Good            | Avoid                   |
| --------------- | ----------------------- |
| `onOpenChange`  | `handleOpen`, `setOpen` |
| `onValueChange` | `onChange`              |
| `onSelect`      | `onItemSelected`        |

### Standard Props by Category

**Interaction:**

- [ ] `disabled?: boolean`
- [ ] `required?: boolean`
- [ ] `readOnly?: boolean`

**Collections:**

- [ ] `multiple?: boolean`
- [ ] `loopFocus?: boolean`
- [ ] `orientation?: 'horizontal' | 'vertical'`

**Popups:**

- [ ] `modal?: boolean`
- [ ] `closeOnEscape?: boolean`
- [ ] `closeOnOutsideClick?: boolean`
- [ ] `keepMounted?: boolean`

### Refs

- [ ] Ref forwarded to root DOM element
- [ ] Parent can access DOM for focus, measurement

**Detection:** `forwardRef` not used

```tsx
// BAD
const Button = ({ children }) => <button>{children}</button>;

// GOOD
const Button = forwardRef<HTMLButtonElement, Props>(({ children, ...props }, ref) => (
  <button ref={ref} {...props}>
    {children}
  </button>
));
```

### Polymorphism

- [ ] Uses `render` prop or `asChild`, not `as` prop
- [ ] `render` function receives props and state
- [ ] State accessible for conditional rendering

**Detection:** Component has `as` prop

```tsx
// BAD: TypeScript performance issues
<Button as="a" href="/">

// GOOD: render prop
<Button render={<a href="/" />}>

// GOOD: asChild
<Button asChild>
  <a href="/">Link</a>
</Button>
```

---

## Data Attributes & Styling

### State via Data Attributes

- [ ] State exposed via `data-*` attributes
- [ ] Enables CSS-only styling without JS

**Detection:** Inline styles for state, no data attributes

| Attribute          | When Present                |
| ------------------ | --------------------------- |
| `data-open`        | Component is open           |
| `data-closed`      | Component is closed         |
| `data-checked`     | Toggle is checked           |
| `data-disabled`    | Component is disabled       |
| `data-highlighted` | Item has focus within group |
| `data-side`        | Popup position side         |
| `data-align`       | Popup alignment             |

```tsx
// BAD
<button style={{ opacity: disabled ? 0.5 : 1 }}>

// GOOD
<button data-disabled={disabled || undefined}>
```

### CSS Variables

- [ ] CSS variables documented for customization
- [ ] Standard variables: `--available-height`, `--anchor-width`, `--transform-origin`

### No Shipped CSS

- [ ] Component is headless — no CSS imported
- [ ] User brings their own styles

**Detection:** `import 'component/styles.css'` in component

---

## Animation Support

### Exit Animations

- [ ] Exit animation possible (element not immediately unmounted)
- [ ] `data-state="open"` / `data-state="closed"` for CSS transitions
- [ ] `keepMounted` option for JS animation libraries

**Detection:** `{open && <Content />}` pattern without animation support

```tsx
// BAD: No exit animation possible
{open && <Dialog.Content>...</Dialog.Content>}

// GOOD: Data attributes for CSS
<Dialog.Content data-state={open ? 'open' : 'closed'}>

// GOOD: keepMounted for JS animation
<Dialog.Portal keepMounted>
  <AnimatePresence>
    {open && <Dialog.Content />}
  </AnimatePresence>
</Dialog.Portal>
```

---

## SSR Safety

- [ ] No `document` or `window` at module scope
- [ ] Portals handle SSR (render fallback or wait for mount)
- [ ] IDs generated safely (no Math.random at module level)

**Detection:** `document.body` reference outside effect

```tsx
// BAD
function Portal({ children }) {
  return createPortal(children, document.body);
}

// GOOD
function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{children}</>;
  return createPortal(children, document.body);
}
```

---

## Accessibility

For full accessibility review, load the `aria` skill and run `review/workflow.md`.

Quick checks:

- [ ] All interactive elements have accessible names
- [ ] Keyboard navigation works
- [ ] Focus managed for modals (trapped, restored)
- [ ] ARIA attributes reflect component state

---

## Anti-Pattern Summary

| Anti-Pattern        | Detection                             | Fix                           |
| ------------------- | ------------------------------------- | ----------------------------- |
| Prop explosion      | >10 props on one component            | Use compound components       |
| Inline state styles | `style={{ opacity: disabled ? ... }}` | Use data attributes           |
| Shipped CSS         | `import 'styles.css'` in component    | Headless, user brings styles  |
| `as` prop           | `<Button as="a">`                     | Use `render` or `asChild`     |
| Missing controlled  | Only `defaultValue`                   | Add `value` + `onValueChange` |
| Context collision   | Nested instances share state          | Scope contexts per Root       |
| No exit animation   | `{open && ...}` without `keepMounted` | Add animation support         |
| SSR unsafe          | `document.body` at module scope       | Guard with mount check        |
| No ref forwarding   | Missing `forwardRef`                  | Forward ref to DOM            |

---

## Severity Guide

### Critical

| Issue                        | Why                                 |
| ---------------------------- | ----------------------------------- |
| Missing controlled support   | Can't integrate with external state |
| Context collision in nesting | Breaks composition                  |
| SSR crash                    | Breaks server rendering             |
| Memory leak (no cleanup)     | Production issue                    |

### Major

| Issue                     | Why                  |
| ------------------------- | -------------------- |
| Prop explosion            | Poor DX, inflexible  |
| Missing data attributes   | Can't style with CSS |
| No exit animation support | Poor UX              |
| Boolean trap              | Confusing API        |
| Missing ref forwarding    | Can't access DOM     |

### Minor

| Issue                 | Why                 |
| --------------------- | ------------------- |
| Inconsistent naming   | API inconsistency   |
| Missing CSS variables | Harder to customize |
| Verbose handler names | Minor DX issue      |

---

## See Also

- [Anti-Patterns](../references/anti-patterns.md) — Full anti-pattern reference
- [Props](../references/props.md) — Prop naming conventions
- [Styling](../references/styling.md) — Data attributes and CSS variables
- [Accessibility Checklist](../../aria/review/checklist.md) — Full a11y checklist
