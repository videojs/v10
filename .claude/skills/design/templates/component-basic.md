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

## Examples

### With Icon

```tsx
<ComponentName>
  <Icon name="play" />
  Play
</ComponentName>
```

### Disabled State

```tsx
<ComponentName disabled>{/* ... */}</ComponentName>
```

## API

### Props

| Prop       | Type                                             | Default | Description                   |
| ---------- | ------------------------------------------------ | ------- | ----------------------------- |
| `prop`     | `string`                                         | —       | Required. What this controls. |
| `disabled` | `boolean`                                        | `false` | Disables interaction.         |
| `render`   | `ReactElement \| (props, state) => ReactElement` | —       | Custom render element.        |

### Callbacks

| Callback  | Signature    | Description          |
| --------- | ------------ | -------------------- |
| `onPress` | `() => void` | Fired on activation. |

### Data Attributes

| Attribute       | Description            |
| --------------- | ---------------------- |
| `data-disabled` | Present when disabled. |
| `data-pressed`  | Present when pressed.  |
| `data-focused`  | Present when focused.  |

### CSS Custom Properties

| Property             | Default | Description       |
| -------------------- | ------- | ----------------- |
| `--vjs-component-bg` | `#000`  | Background color. |

## Accessibility

### Keyboard

| Key     | Action   |
| ------- | -------- |
| `Enter` | Activate |
| `Space` | Activate |

### ARIA

- Role: `button`
- `aria-disabled` when disabled

## Prior Art

How do other libraries handle this?

- **Base UI** — [API shape, relevant patterns]
- **WAI-ARIA APG** — [canonical accessibility pattern]
- **Player libraries** — [edge cases, feature requirements, context from Media Chrome, Vidstack, Video.js v8, Plyr]

## Open Questions

- Unresolved decisions
