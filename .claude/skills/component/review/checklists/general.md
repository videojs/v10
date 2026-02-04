# General Component Checklist

Standard patterns for headless UI components.

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

### Event Handler Naming

- [ ] Pattern: `on` + Noun + Verb
- [ ] Specific names over generic: `onValueChange` not `onChange`

### Standard Props by Category

**Interaction:** `disabled`, `required`, `readOnly`

**Collections:** `multiple`, `loopFocus`, `orientation`

**Popups:** `modal`, `closeOnEscape`, `closeOnOutsideClick`, `keepMounted`

### Refs

- [ ] Ref forwarded to root DOM element
- [ ] Parent can access DOM for focus, measurement

**Detection:** `forwardRef` not used

### Polymorphism

- [ ] Uses `render` prop or `asChild`, not `as` prop
- [ ] `render` function receives props and state
- [ ] State accessible for conditional rendering

**Detection:** Component has `as` prop

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

### CSS Variables

- [ ] CSS variables documented for customization
- [ ] Standard variables: `--available-height`, `--anchor-width`, `--transform-origin`

### No Shipped CSS

- [ ] Component is headless — no CSS imported
- [ ] User brings their own styles

**Detection:** `import 'component/styles.css'` in component

---

## Animation Support

- [ ] Exit animation possible (element not immediately unmounted)
- [ ] `data-state="open"` / `data-state="closed"` for CSS transitions
- [ ] `keepMounted` option for JS animation libraries

**Detection:** `{open && <Content />}` pattern without animation support

---

## SSR Safety

- [ ] No `document` or `window` at module scope
- [ ] Portals handle SSR (render fallback or wait for mount)
- [ ] IDs generated safely (no Math.random at module level)

**Detection:** `document.body` reference outside effect

---

## Accessibility

For full accessibility review, load the `aria` skill.

Quick checks:

- [ ] All interactive elements have accessible names
- [ ] Keyboard navigation works
- [ ] Focus managed for modals (trapped, restored)
- [ ] ARIA attributes reflect component state
