# Simple Component Template

For single-element components (Button, Icon, Badge).

See `references/components.md` for general guidance.

---

```markdown
---
status: draft
---

# ComponentName

One-sentence description.

## Usage

### React

\`\`\`tsx
import { ComponentName } from '@videojs/react';

<ComponentName prop="value" />;
\`\`\`

### HTML

\`\`\`html
<vjs-component-name prop="value"></vjs-component-name>
\`\`\`

## Examples

### With Icon

\`\`\`tsx
<ComponentName>
<Icon name="play" />
Play
</ComponentName>
\`\`\`

### Disabled State

\`\`\`tsx
<ComponentName disabled>{/_ ... _/}</ComponentName>
\`\`\`

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

## Open Questions

- Unresolved decisions
```
