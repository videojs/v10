# Component RFC Template

For UI primitives and compound components.

## When to Use

- New UI components
- Component API changes
- Interaction patterns (keyboard, touch, focus)
- Accessibility requirements

## Key Differences from Feature RFCs

| Aspect        | Feature RFC            | Component RFC        |
| ------------- | ---------------------- | -------------------- |
| Primary focus | Architecture, patterns | Usage, accessibility |
| Code examples | API signatures         | JSX/HTML usage       |
| Structure     | Problem → Solution     | Usage → API → Design |
| Audience      | Library authors        | Component consumers  |

Component RFCs lead with **how to use it** because consumers care about the interface, not the implementation.

## Template

````markdown
---
status: draft
---

# ComponentName

One-sentence description of what this component does.

## Usage

### React

```tsx
import { ComponentName } from '@videojs/react';

function Player() {
  return <ComponentName prop="value">{/* children if applicable */}</ComponentName>;
}
```

### HTML

```html
<vjs-component-name prop="value">
  <!-- children if applicable -->
</vjs-component-name>
```

### Common Patterns

#### Pattern 1: Basic

```tsx
<ComponentName />
```

#### Pattern 2: With Options

```tsx
<ComponentName variant="secondary" disabled />
```

#### Pattern 3: Compound

```tsx
<ComponentName.Root>
  <ComponentName.Part />
</ComponentName.Root>
```

## API

### Props

| Prop       | Type      | Default | Description                   |
| ---------- | --------- | ------- | ----------------------------- |
| `prop`     | `string`  | —       | Required. What this controls. |
| `optional` | `boolean` | `false` | Optional. What this enables.  |

### State (if stateful)

| State    | Type      | Description                      |
| -------- | --------- | -------------------------------- |
| `active` | `boolean` | Whether the component is active. |

### Callbacks

| Callback   | Signature                 | Description               |
| ---------- | ------------------------- | ------------------------- |
| `onChange` | `(value: string) => void` | Fired when value changes. |

### CSS Custom Properties

| Property             | Default | Description       |
| -------------------- | ------- | ----------------- |
| `--vjs-component-bg` | `#000`  | Background color. |

### Data Attributes

| Attribute    | Values           | Description              |
| ------------ | ---------------- | ------------------------ |
| `data-state` | `idle`, `active` | Current component state. |

## Accessibility

### Keyboard

| Key          | Action       |
| ------------ | ------------ |
| `Enter`      | Activate     |
| `Space`      | Toggle       |
| `Escape`     | Close/cancel |
| `Arrow keys` | Navigate     |

### ARIA

- Role: `button` / `slider` / `menu` / etc.
- Required attributes: `aria-label`, `aria-pressed`, etc.
- Live region behavior (if applicable)

### Focus

- Focus visible styles
- Focus trap behavior (if modal)
- Focus restoration on close

## Design Notes

### Why This API Shape

Brief rationale for the prop/state design.

### Platform Differences

Any differences between React and HTML versions.

## Open Questions

- Unresolved design decisions
- Accessibility considerations needing input
````

## Compound Component Addition

For components with parts, add a Parts section:

```markdown
## Parts

### ComponentName.Root

Container element. Provides context to children.

| Prop    | Type     | Description       |
| ------- | -------- | ----------------- |
| `value` | `string` | Controlled value. |

### ComponentName.Trigger

Interactive element that activates the component.

| Prop      | Type      | Description              |
| --------- | --------- | ------------------------ |
| `asChild` | `boolean` | Render as child element. |

### ComponentName.Content

Content displayed when active.

| Prop    | Type               | Description |
| ------- | ------------------ | ----------- |
| `align` | `'start' \| 'end'` | Alignment.  |
```

## Slider-Type Components

For range inputs, add a Values section:

```markdown
## Values

| Property | Type     | Description     |
| -------- | -------- | --------------- |
| `min`    | `number` | Minimum value.  |
| `max`    | `number` | Maximum value.  |
| `value`  | `number` | Current value.  |
| `step`   | `number` | Step increment. |

### Derived Values

| Property  | Calculation                   | Description      |
| --------- | ----------------------------- | ---------------- |
| `percent` | `(value - min) / (max - min)` | Position as 0-1. |
```

## Tips

1. **Lead with usage** — Show the component in action before API tables
2. **Show both platforms** — React and HTML examples side by side
3. **Accessibility first** — Keyboard and ARIA requirements are essential
4. **Tables for props** — Scannable, consistent format
5. **Keep design notes brief** — Link to decisions doc if complex

## Reference

Components follow patterns from:

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- Radix UI component APIs
- Headless UI patterns

Load the `aria` skill for accessibility implementation details.
Load the `component` skill for component architecture patterns.
