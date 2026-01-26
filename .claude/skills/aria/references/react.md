# React Accessibility Patterns

React-specific patterns for accessibility. Covers hook architecture, ref management, and framework considerations.

## Contents

- [Hook Architecture](#hook-architecture) — Layer separation, behavior hooks
- [Focus Management Hooks](#focus-management-hooks) — Scope, ring detection, roving tabindex
- [Ref Patterns](#ref-patterns) — Merging refs, callback refs
- [Event Handling](#event-handling) — Keyboard normalization, press events
- [Announcements](#announcements) — Live regions, status messages
- [SSR Considerations](#ssr-considerations) — ID generation, hydration
- [Portal Accessibility](#portal-accessibility)

---

## Hook Architecture

Separate accessibility logic into composable hooks:

### Layer Separation

| Layer    | Responsibility | Example                  |
| -------- | -------------- | ------------------------ |
| State    | Component data | `useToggleState`         |
| Behavior | ARIA + events  | `useButton`, `useSlider` |
| Render   | DOM output     | Component JSX            |

This separation allows:

- Sharing accessibility logic across components
- Testing behavior independently
- Framework-agnostic core patterns

### Behavior Hook Pattern

```typescript
function useButton(props, ref) {
  return {
    buttonProps: {
      role: 'button',
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      onClick: props.onPress,
      'aria-disabled': props.isDisabled,
    },
  };
}
```

---

## Focus Management Hooks

### Focus Scope

Contain focus within a subtree:

```typescript
function useFocusScope(options: {
  contain?: boolean; // Trap focus
  restoreFocus?: boolean; // Restore on unmount
  autoFocus?: boolean; // Focus first element
}) {
  const scopeRef = useRef(null);
  const previousFocus = useRef(null);

  // Implementation handles:
  // - Finding focusable elements
  // - Tab wrapping at boundaries
  // - Restoring focus on unmount

  return { scopeRef };
}
```

### Focus Ring Detection

Detect keyboard vs pointer focus:

```typescript
function useFocusRing() {
  const [isFocusVisible, setFocusVisible] = useState(false);

  // Track input modality globally
  // Set true on keyboard events
  // Set false on pointer events

  return {
    isFocusVisible,
    focusProps: {
      onFocus: () => {
        /* check modality */
      },
      onBlur: () => setFocusVisible(false),
    },
  };
}
```

### Roving Tabindex Hook

```typescript
function useRovingTabindex(items: RefObject<HTMLElement>[]) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Returns props to spread on each item
  return items.map((ref, i) => ({
    tabIndex: i === activeIndex ? 0 : -1,
    onKeyDown: (e) => {
      // Handle arrow keys, Home, End
      // Update activeIndex
      // Call focus() on new active item
    },
  }));
}
```

---

## Ref Patterns

### Merging Refs

When component accepts ref but you also need internal ref:

```typescript
function useMergedRef<T>(...refs: Ref<T>[]): RefCallback<T> {
  return useCallback((value) => {
    refs.forEach(ref => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
    });
  }, refs);
}

// Usage
const Component = forwardRef((props, forwardedRef) => {
  const internalRef = useRef(null);
  const ref = useMergedRef(forwardedRef, internalRef);
  return <div ref={ref} />;
});
```

### Callback Refs for Dynamic Elements

```typescript
function useCallbackRef<T>(callback: (node: T | null) => void) {
  const ref = useRef(callback);

  useLayoutEffect(() => {
    ref.current = callback;
  });

  return useCallback((node: T | null) => {
    ref.current(node);
  }, []);
}
```

---

## Event Handling

### Keyboard Event Normalization

Handle cross-browser keyboard events:

```typescript
function useKeyboard(handlers: { onKeyDown?: (e: KeyboardEvent) => void; onKeyUp?: (e: KeyboardEvent) => void }) {
  return {
    keyboardProps: {
      onKeyDown: (e: ReactKeyboardEvent) => {
        // Normalize key values
        // Handle IME composition
        // Call appropriate handler
      },
    },
  };
}
```

### Press Events

Unified press handling for mouse, touch, keyboard:

```typescript
function usePress(props: {
  onPress?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  isDisabled?: boolean;
}) {
  return {
    pressProps: {
      onClick: props.onPress,
      onKeyDown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          props.onPress?.();
        }
      },
    },
  };
}
```

---

## Announcements

### Live Region Hook

```typescript
function useAnnounce() {
  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    // Get or create live region
    // Clear existing content
    // Set new content (triggers announcement)
  }, []);

  return { announce };
}
```

### Status Message Pattern

```typescript
function useFormValidation() {
  const { announce } = useAnnounce();

  const validate = (value) => {
    const error = getError(value);
    if (error) {
      announce(error, 'assertive');
    }
    return error;
  };

  return { validate };
}
```

---

## SSR Considerations

### ID Generation

Generate stable IDs for ARIA relationships:

```typescript
function useId(prefix?: string): string {
  // Use React 18's useId if available
  // Otherwise, generate stable ID
  // Avoid hydration mismatches
}

// Usage
function Dialog({ title, children }) {
  const titleId = useId('dialog-title');

  return (
    <div role="dialog" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {children}
    </div>
  );
}
```

### Hydration Safety

Avoid client-only APIs in initial render:

```typescript
function useSafeLayoutEffect(effect, deps) {
  // useLayoutEffect on client
  // useEffect (or skip) on server
  const isClient = typeof window !== 'undefined';
  const useIsomorphicEffect = isClient ? useLayoutEffect : useEffect;
  useIsomorphicEffect(effect, deps);
}
```

---

## Portal Accessibility

### Focus Containment with Portals

Portaled content (modals, popovers) needs special handling:

```typescript
function AccessiblePortal({ children, containFocus }) {
  return createPortal(
    <FocusScope contain={containFocus} restoreFocus autoFocus>
      {children}
    </FocusScope>,
    document.body
  );
}
```

### ARIA Relationships Across Portals

When trigger and content are in different DOM locations:

```typescript
function Popover({ trigger, content }) {
  const triggerId = useId('trigger');
  const contentId = useId('content');

  return (
    <>
      <button
        id={triggerId}
        aria-controls={contentId}
        aria-expanded={isOpen}
      >
        {trigger}
      </button>
      {isOpen && createPortal(
        <div
          id={contentId}
          role="dialog"
          aria-labelledby={triggerId}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
```

---

## State Hook Patterns

### Toggle State

```typescript
function useToggleState(props: {
  defaultSelected?: boolean;
  isSelected?: boolean;
  onChange?: (isSelected: boolean) => void;
}) {
  const [isSelected, setSelected] = useControlledState(
    props.isSelected,
    props.defaultSelected ?? false,
    props.onChange
  );

  return {
    isSelected,
    toggle: () => setSelected(!isSelected),
    setSelected,
  };
}
```

### Selection State (Single/Multi)

```typescript
function useSelectionState(props: {
  selectionMode: 'none' | 'single' | 'multiple';
  selectedKeys?: Set<Key>;
  defaultSelectedKeys?: Set<Key>;
  onSelectionChange?: (keys: Set<Key>) => void;
}) {
  // Handles controlled/uncontrolled
  // Enforces selection mode rules
  // Provides select/deselect/toggle methods
}
```

---

## Component Prop Patterns

### Spreading Props Safely

```typescript
// Separate ARIA/DOM props from component props
function splitProps<T>(props: T, ariaKeys: string[]) {
  const ariaProps = {};
  const restProps = {};

  for (const key in props) {
    if (ariaKeys.includes(key) || key.startsWith('aria-')) {
      ariaProps[key] = props[key];
    } else {
      restProps[key] = props[key];
    }
  }

  return [ariaProps, restProps];
}
```

### Render Props for Flexibility

```typescript
interface ButtonProps {
  children: ReactNode | ((state: ButtonState) => ReactNode);
}

interface ButtonState {
  isPressed: boolean;
  isFocused: boolean;
  isFocusVisible: boolean;
  isDisabled: boolean;
}

// Allows consumers to access state for custom rendering
<Button>
  {({ isPressed }) => (
    <span className={isPressed ? 'pressed' : ''}>Click me</span>
  )}
</Button>
```

---

## Testing Patterns

### Accessibility Testing Setup

```typescript
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

test('component has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Focus Testing

```typescript
import { fireEvent } from '@testing-library/react';

test('arrow keys navigate options', () => {
  const { getAllByRole } = render(<Listbox />);
  const options = getAllByRole('option');

  options[0].focus();
  fireEvent.keyDown(options[0], { key: 'ArrowDown' });

  expect(document.activeElement).toBe(options[1]);
});
```

### Screen Reader Simulation

```typescript
test('announces state changes', () => {
  const { getByRole } = render(<Toggle />);
  const button = getByRole('button');
  const liveRegion = getByRole('status');

  fireEvent.click(button);

  expect(liveRegion).toHaveTextContent('Enabled');
});
```

---

## See Also

- [component/react.md](../../component/references/react.md) — React component architecture (context, controlled state, render props)
