# Styling Patterns

Style headless components with CSS classes, data attributes, and CSS variables.

**Reference:** [Base UI Styling Handbook](https://base-ui.com/react/handbook/styling)

---

## Style Hooks

### className as Function

Access component state for conditional classes:

```tsx
<Switch.Thumb className={(state) => (state.checked ? 'checked' : 'unchecked')} />
```

### style as Function

Access component state for conditional inline styles:

```tsx
<Switch.Thumb
  style={(state) => ({
    transform: state.checked ? 'translateX(20px)' : 'translateX(0)',
  })}
/>
```

---

## Data Attributes

Target component states with CSS selectors.

### Standard Attributes

| Attribute                         | Values                                                    | Purpose                 |
| --------------------------------- | --------------------------------------------------------- | ----------------------- |
| `data-state`                      | `open`, `closed`, `checked`, `unchecked`, `indeterminate` | Primary state           |
| `data-open` / `data-closed`       | present/absent                                            | Visibility state        |
| `data-checked` / `data-unchecked` | present/absent                                            | Toggle state            |
| `data-disabled`                   | present/absent                                            | Disabled state          |
| `data-highlighted`                | present/absent                                            | Focus/hover in groups   |
| `data-popup-open`                 | present/absent                                            | Trigger when popup open |
| `data-side`                       | `top`, `bottom`, `left`, `right`                          | Popup positioning       |
| `data-align`                      | `start`, `center`, `end`                                  | Popup alignment         |
| `data-orientation`                | `horizontal`, `vertical`                                  | Layout direction        |
| `data-starting-style`             | present/absent                                            | Enter transition state  |
| `data-ending-style`               | present/absent                                            | Exit transition state   |

### CSS Usage

```css
.switch[data-checked] {
  background-color: var(--color-primary);
}

.switch[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

[data-highlighted] {
  background: var(--color-highlight);
}
```

### Attribute Rules

- Boolean: present = true, absent = false
- Use `undefined` to omit (not `false`)
- Consistent naming across components

---

## CSS Variables

Dynamic values exposed for positioning and sizing.

### Common Variables

| Variable             | Purpose                         |
| -------------------- | ------------------------------- |
| `--available-height` | Max height before viewport edge |
| `--available-width`  | Max width before viewport edge  |
| `--anchor-width`     | Width of anchor element         |
| `--anchor-height`    | Height of anchor element        |
| `--transform-origin` | Calculated transform origin     |

### Component-Specific Variables

| Component | Variable                     | Purpose                |
| --------- | ---------------------------- | ---------------------- |
| Accordion | `--accordion-content-height` | Animated height        |
| Select    | `--select-trigger-width`     | Match popup to trigger |
| Slider    | `--slider-thumb-transform`   | Thumb position         |

### Usage

```css
/* Constrain popup to viewport */
.popup {
  max-height: var(--available-height);
  overflow-y: auto;
}

/* Match popup width to trigger */
.select-content {
  width: var(--anchor-width);
}

/* Scale from anchor */
.popup {
  transform-origin: var(--transform-origin);
}
```

---

## Framework Integration

### Tailwind CSS

Data attributes work with Tailwind's `data-*` variants:

```tsx
<Menu.Item
  className="
  px-3 py-2 cursor-pointer
  data-[highlighted]:bg-blue-100
  data-[highlighted]:text-blue-900
  data-[disabled]:text-gray-400
  data-[disabled]:cursor-not-allowed
"
>
  Copy
</Menu.Item>
```

### CSS Modules

```tsx
import styles from './menu.module.css';

<Menu.Item className={styles.item}>Copy</Menu.Item>;
```

```css
/* menu.module.css */
.item[data-highlighted] {
  background-color: var(--blue-100);
}
```

### CSS-in-JS

Wrap component parts with styled():

```tsx
const StyledMenuItem = styled(Menu.Item)`
  &[data-highlighted] {
    background-color: var(--blue-100);
  }
`;
```

---

## Guidelines

| Use                | For                                              |
| ------------------ | ------------------------------------------------ |
| Data attributes    | Discrete states (open/closed, checked, disabled) |
| CSS variables      | Continuous values (heights, widths, positions)   |
| className function | State-dependent class composition                |
| style function     | State-dependent inline styles                    |

**Avoid:**

- Inline styles for state (fights theming)
- Shipping CSS in core (specificity conflicts)
- Non-standard attribute names

---

## See Also

- [Animation](animation.md) — animating state transitions
- [Anti-Patterns](anti-patterns.md) — styling mistakes
