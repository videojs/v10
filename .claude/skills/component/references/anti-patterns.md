# Component Anti-Patterns

Common mistakes when building UI components.

## Prop Explosion

```tsx
// BAD: 30+ props on one component
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Title"
  description="Desc"
  closeButton={true}
  overlayClassName="..."
  contentClassName="..."
  // ... 20 more props
/>

// GOOD: Compound components
<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Overlay className="..." />
  <Dialog.Content className="...">
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Close>Close</Dialog.Close>
  </Dialog.Content>
</Dialog.Root>
```

**Why it fails:** Inflexible, hard to style parts independently, poor TypeScript experience.

---

## Inline Styles for State

```tsx
// BAD: Forces JS styling, fights theming
<button style={{ opacity: disabled ? 0.5 : 1 }}>

// GOOD: Data attributes for CSS
<button data-disabled={disabled || undefined}>
```

```css
[data-disabled] {
  opacity: 0.5;
}
```

**Why it fails:** Specificity issues, can't be themed, harder to override.

---

## Shipping CSS in Core

```ts
// BAD: Specificity wars, hard to override
import '@lib/button/styles.css';

// GOOD: Headless — user brings styles
import { Button } from '@lib/button';
```

**Why it fails:** CSS conflicts, specificity battles, theming difficulties.

---

## The `as` Prop

```tsx
// BAD: TypeScript performance issues
<Button as="a" href="/home">Link</Button>

// GOOD: render prop
<Button render={<a href="/home" />}>Link</Button>

// GOOD: asChild for simple cases
<Button asChild>
  <a href="/home">Link</a>
</Button>
```

**Why it fails:** Complex generic types slow TypeScript language server and IDE.

---

## Hidden Prop Flow with `asChild`

```tsx
// BAD: Which props does Button receive?
<Dialog.Trigger asChild>
  <Button onClick={myHandler}>Open</Button>
</Dialog.Trigger>

// GOOD: Explicit prop handling
<Dialog.Trigger
  render={(props) => (
    <Button {...props} onClick={(e) => {
      myHandler(e);
      props.onClick?.(e);
    }}>
      Open
    </Button>
  )}
/>
```

**Why it fails:** Debugging difficult, behavior non-obvious, silent breakage.

---

## No State Access in Polymorphism

```tsx
// BAD: asChild can't access internal state
<Switch.Thumb asChild>
  <span>{/* How to show different icon when checked? */}</span>
</Switch.Thumb>

// GOOD: render function provides state
<Switch.Thumb
  render={(props, state) => (
    <span {...props}>
      {state.checked ? <CheckIcon /> : <XIcon />}
    </span>
  )}
/>
```

**Why it fails:** Can't conditionally render based on component state.

---

## Missing Controlled Support

```tsx
// BAD: Only uncontrolled
<Accordion defaultValue="item-1">

// GOOD: Both modes
<Accordion defaultValue="item-1">  {/* uncontrolled */}
<Accordion value={value} onValueChange={setValue}>  {/* controlled */}
```

**Why it fails:** Users can't integrate with external state management.

---

## Context Without Scoping

```tsx
// BAD: Nested components collide
<Dialog.Root>
  <Dialog.Content>
    <Dialog.Root>
      {' '}
      {/* Reads parent's context! */}
      <Dialog.Content />
    </Dialog.Root>
  </Dialog.Content>
</Dialog.Root>

// GOOD: Scoped contexts — each Root creates new scope
```

**Why it fails:** Nested instances interfere with each other.

---

## No Exit Animation Support

```tsx
// BAD: Element unmounts immediately
{open && <Dialog.Content>...</Dialog.Content>}

// GOOD: CSS exit animation with data attributes
<Dialog.Content data-state={open ? 'open' : 'closed'}>

// GOOD: JS animation with keepMounted
<Dialog.Portal keepMounted>
  <AnimatePresence>
    {open && <Dialog.Content />}
  </AnimatePresence>
</Dialog.Portal>
```

**Why it fails:** No opportunity to animate out before removal.

---

## Ignoring SSR

```tsx
// BAD: document undefined on server
function Portal({ children }) {
  return createPortal(children, document.body);
}

// GOOD: Wait for mount
function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;
  return createPortal(children, document.body);
}
```

**Why it fails:** `document` doesn't exist during SSR.

---

## Focus Not Managed

```tsx
// BAD: Focus lost when dialog opens
<Dialog open={open}>
  <Dialog.Content>...</Dialog.Content>
</Dialog>

// GOOD: Focus trapped and restored
<Dialog open={open}>
  <Dialog.Content>
    <FocusScope trapped restoreFocus>
      ...
    </FocusScope>
  </Dialog.Content>
</Dialog>
```

**Why it fails:** Keyboard users can navigate outside modal, focus lost on close.

---

## Non-Standard Attribute Names

```tsx
// BAD: Inconsistent naming
<Component isOpen={true} isDisabled={false}>

// GOOD: Consistent data attributes
<Component
  data-state={open ? 'open' : 'closed'}
  data-disabled={disabled || undefined}
>
```

**Why it fails:** Inconsistent API, harder to style with CSS selectors.

---

## Forgetting Ref Forwarding

```tsx
// BAD: Ref can't reach DOM element
const Button = ({ children }) => <button>{children}</button>;

// GOOD: Forward ref
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ children, ...props }, ref) => (
  <button ref={ref} {...props}>
    {children}
  </button>
));
```

**Why it fails:** Parent components can't access DOM for focus, measurement.

---

## Testing Checklist

- [ ] No prop explosion (use compound components)
- [ ] State styled via data attributes, not inline
- [ ] No CSS shipped in component package
- [ ] Polymorphism via `render` or `asChild`, not `as`
- [ ] Both controlled and uncontrolled modes
- [ ] Nested instances don't interfere
- [ ] Exit animations possible
- [ ] SSR-safe (no `document` at module scope)
- [ ] Focus managed for modals
- [ ] Refs forwarded to DOM elements

---

## See Also

- [Accessibility Anti-Patterns](../../aria/references/anti-patterns.md) — a11y mistakes
- [Polymorphism](polymorphism.md) — correct render customization
