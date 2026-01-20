# API Design Conventions

Prop naming, defaults, and documentation patterns for consistent component APIs.

**Reference implementations:** [Base UI](https://base-ui.com/), [Radix](https://www.radix-ui.com/), [Ark UI](https://ark-ui.com/)

---

## Prop Naming

### Boolean Props

Use positive adjectives, avoid `is`/`has` prefixes:

| ✅ Good | ❌ Avoid |
|---------|----------|
| `disabled` | `isDisabled` |
| `required` | `isRequired` |
| `open` | `isOpen` |
| `loading` | `isLoading` |

---

### State Props

| State | Uncontrolled | Controlled | Handler |
|-------|--------------|------------|---------|
| Open | `defaultOpen` | `open` | `onOpenChange` |
| Value | `defaultValue` | `value` | `onValueChange` |
| Checked | `defaultChecked` | `checked` | `onCheckedChange` |
| Selected | `defaultSelected` | `selected` | `onSelectedChange` |

---

### Event Handlers

Pattern: `on` + Noun + Verb

| ✅ Good | ❌ Avoid |
|---------|----------|
| `onOpenChange` | `handleOpen`, `setOpen` |
| `onValueChange` | `onChange` (too generic) |
| `onSelect` | `onItemSelected` |
| `onDismiss` | `onClose` (ambiguous) |

---

## Standard Props by Category

### Interaction

```typescript
disabled?: boolean;
required?: boolean;
readOnly?: boolean;
autoFocus?: boolean;
```

### Collections

```typescript
multiple?: boolean;       // Allow multiple selection
loopFocus?: boolean;      // Arrow keys loop at ends
orientation?: 'horizontal' | 'vertical';
typeahead?: boolean;      // A-Z navigation
```

### Popups

```typescript
modal?: boolean | 'trap-focus';
closeOnEscape?: boolean;
closeOnOutsideClick?: boolean;
keepMounted?: boolean;    // Keep in DOM when closed
```

### Positioning

```typescript
side?: 'top' | 'bottom' | 'left' | 'right';
align?: 'start' | 'center' | 'end';
sideOffset?: number;
alignOffset?: number;
collision?: 'flip' | 'shift' | 'none';
```

---

## Change Event Details

**What:** Rich context passed to change handlers.

**Why:** Enables conditional logic — prevent changes, track analytics, debug.

```typescript
interface ChangeDetails {
  reason: string;      // 'click' | 'keyboard' | 'blur' | 'escape' | 'outside-click'
  event?: Event;       // Original DOM event
  cancel(): void;      // Prevent internal state change
}
```

**Usage:** `onOpenChange={(open, details) => { if (details.reason === 'outside-click') details.cancel(); }}`

---

## Imperative Actions

**What:** Expose actions via `actionsRef` for programmatic control.

**Common actions:**
- `open()`, `close()`, `toggle()` — Popups
- `focus()` — Focus management
- `scrollToIndex(i)` — Virtualized lists

**Pattern:** `<Dialog.Root actionsRef={ref}>` → `ref.current.open()`

---

## Render Delegation

### The `render` Prop

**What:** Replace default element while preserving behavior.

**Forms:**
- Element: `render={<a href="..." />}` — Props merged onto element
- Function: `render={(props, state) => ...}` — Full control

### `className` / `style` as Function

**What:** State-aware styling without external state.

**Pattern:** `className={(state) => state.checked ? 'on' : 'off'}`

---

## Defaults

### Sensible Defaults (80% case)

| Prop | Default | Rationale |
|------|---------|-----------|
| `side` | `'bottom'` | Most common popup position |
| `align` | `'center'` | Visually balanced |
| `sideOffset` | `8` | Standard spacing |
| `closeOnEscape` | `true` | Expected behavior |
| `loopFocus` | `true` | Better keyboard UX |

### Require Explicit Opt-in

| Prop | Default | Rationale |
|------|---------|-----------|
| `autoFocus` | `false` | Can be disorienting |
| `modal` | `false` | Has side effects (scroll lock) |
| `keepMounted` | `false` | Performance |

---

## Escape Hatches

| Need | Solution |
|------|----------|
| DOM access | Forward refs to root element |
| Custom attributes | Spread `...props` |
| Custom portal target | `container` prop on Portal |
| Override handlers | Spread after internal handlers |

---

## Documentation Pattern

### Props Table

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controlled open state |
| `defaultOpen` | `boolean` | `false` | Initial open state |
| `onOpenChange` | `(open, details) => void` | — | Called on state change |

### Data Attributes Table

| Attribute | When Present |
|-----------|--------------|
| `data-open` | Component is open |
| `data-disabled` | Component is disabled |

### Anatomy Section

Show component structure with all parts.

### Examples Section

Basic usage, controlled, with custom trigger, etc.

---

## Versioning

| Change | Breaking? |
|--------|-----------|
| Add optional prop | No |
| Change default value | **Yes** |
| Remove prop | **Yes** |
| Add required prop | **Yes** |

### Deprecation Pattern

1. Add new prop alongside old
2. Log warning when old prop used
3. Remove old prop in next major

---

## Checklist for New Components

- [ ] Boolean props use positive adjectives
- [ ] State props follow `value`/`defaultValue`/`onValueChange`
- [ ] Change handlers receive `details` with `reason` and `cancel()`
- [ ] Ref forwarded to root DOM element
- [ ] `render` prop for element polymorphism
- [ ] `className` accepts function
- [ ] State exposed via `data-*` attributes
- [ ] Additional HTML attributes spread
- [ ] Types exported (`Component.Props`, `Component.State`)

---

## References

| Library | API Style |
|---------|-----------|
| [Base UI API](https://base-ui.com/react/components/dialog) | Canonical reference |
| [Radix API](https://www.radix-ui.com/primitives/docs/components/dialog) | Alternative conventions |
| [Ark UI API](https://ark-ui.com/react/docs/components/dialog) | Cross-framework |
