# Animation Patterns

Animate component state changes with CSS or JavaScript libraries.

**Reference:** [Base UI Animation Handbook](https://base-ui.com/react/handbook/animation)

---

## CSS Transitions (Preferred)

Use `data-starting-style` / `data-ending-style` for smooth transitions:

```css
.popup {
  transform-origin: var(--transform-origin);
  transition:
    transform 150ms,
    opacity 150ms;
}

.popup[data-starting-style],
.popup[data-ending-style] {
  opacity: 0;
  transform: scale(0.9);
}
```

**Why transitions over animations:** Transitions can be cancelled midway. If user closes a popup before it finishes opening, it smoothly animates to closed without abrupt changes.

---

## CSS Animations

Use `data-open` / `data-closed` for keyframe animations:

```css
.popup[data-open] {
  animation: scaleIn 200ms ease-out;
}

.popup[data-closed] {
  animation: scaleOut 200ms ease-in;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes scaleOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}
```

---

## JavaScript Animation Libraries

### Unmounted Components (Dialog, Popover, Menu)

Components unmounted from DOM when closed need special handling for exit animations.

**Pattern:** Controlled `open` + `keepMounted` on Portal + AnimatePresence

```tsx
function AnimatedPopover() {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>Open</Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal keepMounted>
            <Popover.Positioner>
              <Popover.Popup
                render={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  />
                }
              >
                Content
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
```

### Kept Mounted Components

Components with `keepMounted` stay in DOM when closed — use state-based animation:

```tsx
<Popover.Popup
  render={(props, state) => (
    <motion.div
      {...props}
      initial={false}
      animate={{
        opacity: state.open ? 1 : 0,
        scale: state.open ? 1 : 0.9,
      }}
    />
  )}
>
  Content
</Popover.Popup>
```

### Manual Unmount Control

Use `actionsRef` for full lifecycle control:

```tsx
function ManualUnmount() {
  const [open, setOpen] = useState(false);
  const actionsRef = useRef(null);

  return (
    <Popover.Root open={open} onOpenChange={setOpen} actionsRef={actionsRef}>
      <Popover.Trigger>Open</Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal keepMounted>
            <Popover.Popup
              render={
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  onAnimationComplete={() => {
                    if (!open) actionsRef.current.unmount();
                  }}
                />
              }
            />
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
```

---

## Animation Detection

Base UI uses `element.getAnimations()` to detect when animations finish before unmounting.

**Important:** For animations without opacity (e.g., translating drawer), include `opacity: 0.9999` so detection works:

```tsx
<motion.div
  animate={{
    x: state.open ? 0 : -300,
    opacity: state.open ? 1 : 0.9999, // Enables detection
  }}
/>
```

---

## Height Animation (Accordion)

Animating `height: auto` requires measurement.

**Steps:**

1. On open: measure `scrollHeight`, animate 0 → measured
2. After animation: set to `auto` (allows content resize)
3. On close: set explicit height, animate to 0

```css
.accordion-content {
  overflow: hidden;
  transition: height 200ms ease-out;
}

.accordion-content[data-open] {
  animation: slideDown 200ms ease-out;
}

@keyframes slideDown {
  from {
    height: 0;
  }
  to {
    height: var(--accordion-content-height);
  }
}
```

**Double-rAF trick:** When closing, set explicit height before animating to 0. Browser needs a frame to register height before transitioning.

> **Reference:** [Radix Collapsible](https://www.radix-ui.com/primitives/docs/components/collapsible)

---

## Reduced Motion

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .popup {
    transition: none;
    animation: none;
  }
}
```

---

## See Also

- [Styling](styling.md) — data attributes for state
- [Collection](collection.md) — exit animations in lists
