# Component RFC Template

Two variants: simple (single element) and compound (multiple parts).

## When to Use

- New UI components
- Component API changes
- Interaction patterns (keyboard, touch, focus)
- Accessibility requirements

## Simple Component Template

For single-element components (Button, Icon, Badge).

````markdown
---
status: draft
---

# ComponentName

One-sentence description.

## Usage

### React

```tsx
import { ComponentName } from '@videojs/react';

<ComponentName prop="value" />;
```

### HTML

```html
<vjs-component-name prop="value"></vjs-component-name>
```

## API

### Props

| Prop       | Type      | Default | Description                   |
| ---------- | --------- | ------- | ----------------------------- |
| `prop`     | `string`  | —       | Required. What this controls. |
| `disabled` | `boolean` | `false` | Disables interaction.         |

### Callbacks

| Callback  | Signature    | Description          |
| --------- | ------------ | -------------------- |
| `onPress` | `() => void` | Fired on activation. |

### CSS Custom Properties

| Property             | Default | Description       |
| -------------------- | ------- | ----------------- |
| `--vjs-component-bg` | `#000`  | Background color. |

### Data Attributes

| Attribute       | Values          | Description     |
| --------------- | --------------- | --------------- |
| `data-disabled` | Present if true | Disabled state. |
| `data-pressed`  | Present if true | Pressed state.  |

## Accessibility

### Keyboard

| Key     | Action   |
| ------- | -------- |
| `Enter` | Activate |
| `Space` | Activate |

### ARIA

- Role: `button`
- `aria-disabled` when disabled

## Open Questions

- Unresolved decisions
````

## Compound Component Template

For multi-part components (Slider, Menu, Dialog).

````markdown
---
status: draft
---

# ComponentName

One-sentence description.

## Usage

### React

```tsx
import { ComponentName } from '@videojs/react';

<ComponentName.Root>
  <ComponentName.Track>
    <ComponentName.Thumb />
  </ComponentName.Track>
</ComponentName.Root>;
```

### HTML

```html
<vjs-component-name>
  <vjs-component-name-track>
    <vjs-component-name-thumb></vjs-component-name-thumb>
  </vjs-component-name-track>
</vjs-component-name>
```

## Parts

### Root

Container element. Provides context to children.

#### Props

| Prop    | Type     | Default | Description       |
| ------- | -------- | ------- | ----------------- |
| `value` | `number` | —       | Controlled value. |

#### Callbacks

| Callback        | Signature                 | Description      |
| --------------- | ------------------------- | ---------------- |
| `onValueChange` | `(value: number) => void` | Fired on change. |

#### Data Attributes

| Attribute       | Values          | Description  |
| --------------- | --------------- | ------------ |
| `data-dragging` | Present if true | Drag active. |

#### CSS Custom Properties

| Property          | Default | Description  |
| ----------------- | ------- | ------------ |
| `--vjs-slider-bg` | `#333`  | Track color. |

### Track

Visual track element.

#### Props

| Prop      | Type      | Default | Description      |
| --------- | --------- | ------- | ---------------- |
| `asChild` | `boolean` | `false` | Render as child. |

### Thumb

Draggable handle.

#### Props

| Prop      | Type      | Default | Description      |
| --------- | --------- | ------- | ---------------- |
| `asChild` | `boolean` | `false` | Render as child. |

#### Data Attributes

| Attribute      | Values          | Description  |
| -------------- | --------------- | ------------ |
| `data-focused` | Present if true | Focus state. |

## Styling

High-level styling guidance and examples.

```css
/* Horizontal slider */
vjs-slider {
  --vjs-slider-bg: #333;
  --vjs-slider-fill: #fff;
}

/* Vertical variant */
vjs-slider[data-orientation='vertical'] {
  --vjs-slider-size: 120px;
}
```

## Accessibility

### Keyboard

| Key          | Action         |
| ------------ | -------------- |
| `Arrow keys` | Adjust value   |
| `Home`       | Set to minimum |
| `End`        | Set to maximum |

### ARIA

- Root role: `slider`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `aria-orientation` for vertical

## Open Questions

- Unresolved decisions
````

## Tips

1. **Lead with usage** — Show the component in action before API tables
2. **Show both platforms** — React and HTML examples
3. **Accessibility first** — Keyboard and ARIA are essential
4. **Tables for everything** — Props, callbacks, CSS vars, data attributes
5. **Part-specific API** — Each part owns its props, callbacks, CSS vars, data attributes

## Reference

Components follow patterns from:

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Base UI](https://base-ui.com/) component APIs
- [Radix UI](https://www.radix-ui.com/) as fallback

Load the `aria` skill for accessibility implementation details.
Load the `component` skill for component architecture patterns.
