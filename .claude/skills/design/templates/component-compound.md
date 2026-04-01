---
status: draft
---

# ComponentName

One-sentence description.

## Problem

What pain exists. Why is a compound component needed here?

## Anatomy

### React

```tsx
import { ComponentName } from '@videojs/react';

<ComponentName.Root>           {/* Container, state owner */}
  <ComponentName.Track>        {/* Visual track */}
    <ComponentName.Fill />     {/* Filled portion */}
    <ComponentName.Thumb />    {/* Interactive handle */}
  </ComponentName.Track>
</ComponentName.Root>
```

### HTML

```html
<media-component-name>
  <media-component-track>
    <media-component-fill></media-component-fill>
    <media-component-thumb></media-component-thumb>
  </media-component-track>
</media-component-name>
```

## API Surface

### Props

| Prop           | Type                         | Default        | Description           |
| -------------- | ---------------------------- | -------------- | --------------------- |
| `value`        | `number`                     | —              | Controlled value.     |
| `defaultValue` | `number`                     | `0`            | Uncontrolled value.   |
| `orientation`  | `'horizontal' \| 'vertical'` | `'horizontal'` | Component orientation. |
| `disabled`     | `boolean`                    | `false`        | Disables interaction. |

### Callbacks

| Callback        | Signature                            | Description            |
| --------------- | ------------------------------------ | ---------------------- |
| `onValueChange` | `(value: number) => void`            | Fired on value change. |
| `onValueCommit` | `(value: number) => void`            | Fired on commit.       |

### Data Attributes

| Attribute          | Description                 |
| ------------------ | --------------------------- |
| `data-dragging`    | Present while dragging.     |
| `data-orientation` | `horizontal` or `vertical`. |
| `data-disabled`    | Present when disabled.      |

### CSS Custom Properties

| Property             | Default | Description       |
| -------------------- | ------- | ----------------- |
| `--vjs-component-bg` | `#000`  | Background color. |

> **Part-specific notes:** Call out anything noteworthy about individual parts here — e.g., "Thumb handles all pointer events and receives ARIA attributes" or "Fill renders as a pseudo-element in the HTML version."

## State & Store

### Required Features

- `featureName` — What state this component reads from

### State Read

| State       | Type     | Description               |
| ----------- | -------- | ------------------------- |
| `stateName` | `number` | What this state represents |

### State Written

| State       | Via            | Description                   |
| ----------- | -------------- | ----------------------------- |
| `stateName` | `requestName`  | When and why this is written  |

## Accessibility

### Keyboard

| Key              | Action                 |
| ---------------- | ---------------------- |
| `ArrowRight/Up`  | Increase by step       |
| `ArrowLeft/Down` | Decrease by step       |
| `Home`           | Set to minimum         |
| `End`            | Set to maximum         |

### ARIA

- Root role: `slider`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` on interactive element
- `aria-orientation` for vertical
- `aria-label` required for accessible name

### Focus Management

- Which element receives focus
- Tab order within the component
- Focus restoration behavior

## Open Questions

- Unresolved decisions
