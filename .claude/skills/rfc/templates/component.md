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
<ComponentName disabled>Unavailable</ComponentName>
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

## Anatomy

### React

```tsx
import { Slider } from '@videojs/react';

<Slider.Root defaultValue={50}>
  {' '}
  {/* Container, state owner */}
  <Slider.Control>
    {' '}
    {/* Interactive area */}
    <Slider.Track>
      {' '}
      {/* Visual track */}
      <Slider.Indicator /> {/* Filled portion */}
      <Slider.Thumb /> {/* Draggable handle */}
    </Slider.Track>
  </Slider.Control>
</Slider.Root>;
```

### HTML

```html
<vjs-slider value="50">
  <vjs-slider-control>
    <vjs-slider-track>
      <vjs-slider-indicator></vjs-slider-indicator>
      <vjs-slider-thumb></vjs-slider-thumb>
    </vjs-slider-track>
  </vjs-slider-control>
</vjs-slider>
```

## Examples

### Range Slider

```tsx
<Slider.Root defaultValue={[25, 75]}>
  <Slider.Control>
    <Slider.Track>
      <Slider.Indicator />
      <Slider.Thumb index={0} aria-label="Minimum" />
      <Slider.Thumb index={1} aria-label="Maximum" />
    </Slider.Track>
  </Slider.Control>
</Slider.Root>
```

### Vertical Orientation

```tsx
<Slider.Root orientation="vertical">
  <Slider.Control>
    <Slider.Track>
      <Slider.Indicator />
      <Slider.Thumb />
    </Slider.Track>
  </Slider.Control>
</Slider.Root>
```

## Parts

### Root

Container element. Owns state, provides context to children.

#### Props

| Prop           | Type                                             | Default        | Description            |
| -------------- | ------------------------------------------------ | -------------- | ---------------------- |
| `value`        | `number \| number[]`                             | —              | Controlled value.      |
| `defaultValue` | `number \| number[]`                             | `0`            | Uncontrolled value.    |
| `min`          | `number`                                         | `0`            | Minimum value.         |
| `max`          | `number`                                         | `100`          | Maximum value.         |
| `step`         | `number`                                         | `1`            | Step increment.        |
| `orientation`  | `'horizontal' \| 'vertical'`                     | `'horizontal'` | Slider orientation.    |
| `disabled`     | `boolean`                                        | `false`        | Disables interaction.  |
| `render`       | `ReactElement \| (props, state) => ReactElement` | —              | Custom render element. |

#### Callbacks

| Callback        | Signature                                             | Description            |
| --------------- | ----------------------------------------------------- | ---------------------- |
| `onValueChange` | `(value: number \| number[], reason: string) => void` | Fired on value change. |
| `onValueCommit` | `(value: number \| number[]) => void`                 | Fired on drag end.     |

#### Data Attributes

| Attribute          | Description                 |
| ------------------ | --------------------------- |
| `data-dragging`    | Present while dragging.     |
| `data-orientation` | `horizontal` or `vertical`. |
| `data-disabled`    | Present when disabled.      |

#### CSS Custom Properties

| Property            | Default | Description   |
| ------------------- | ------- | ------------- |
| `--vjs-slider-size` | `200px` | Track length. |

### Control

Interactive area that responds to pointer events.

#### Props

| Prop     | Type                                             | Default | Description            |
| -------- | ------------------------------------------------ | ------- | ---------------------- |
| `render` | `ReactElement \| (props, state) => ReactElement` | —       | Custom render element. |

#### Data Attributes

| Attribute          | Description                 |
| ------------------ | --------------------------- |
| `data-dragging`    | Present while dragging.     |
| `data-orientation` | `horizontal` or `vertical`. |

### Track

Visual track element.

#### Props

| Prop     | Type                                             | Default | Description            |
| -------- | ------------------------------------------------ | ------- | ---------------------- |
| `render` | `ReactElement \| (props, state) => ReactElement` | —       | Custom render element. |

#### CSS Custom Properties

| Property         | Default | Description       |
| ---------------- | ------- | ----------------- |
| `--vjs-track-bg` | `#333`  | Track background. |

### Indicator

Filled portion of the track.

#### Props

| Prop     | Type                                             | Default | Description            |
| -------- | ------------------------------------------------ | ------- | ---------------------- |
| `render` | `ReactElement \| (props, state) => ReactElement` | —       | Custom render element. |

#### CSS Custom Properties

| Property             | Default | Description |
| -------------------- | ------- | ----------- |
| `--vjs-indicator-bg` | `#fff`  | Fill color. |

### Thumb

Draggable handle.

#### Props

| Prop     | Type                                             | Default | Description                   |
| -------- | ------------------------------------------------ | ------- | ----------------------------- |
| `index`  | `number`                                         | —       | Thumb index for range slider. |
| `render` | `ReactElement \| (props, state) => ReactElement` | —       | Custom render element.        |

#### Data Attributes

| Attribute       | Description                        |
| --------------- | ---------------------------------- |
| `data-focused`  | Present when focused.              |
| `data-dragging` | Present while dragging this thumb. |
| `data-index`    | Thumb index in range sliders.      |

#### CSS Custom Properties

| Property           | Default | Description |
| ------------------ | ------- | ----------- |
| `--vjs-thumb-size` | `16px`  | Thumb size. |

## Styling

High-level styling guidance.

```css
/* Basic horizontal slider */
vjs-slider {
  --vjs-slider-size: 200px;
  --vjs-track-bg: #333;
  --vjs-indicator-bg: #fff;
  --vjs-thumb-size: 16px;
}

/* Vertical variant */
vjs-slider[data-orientation='vertical'] {
  --vjs-slider-size: 120px;
}

/* Disabled state */
vjs-slider[data-disabled] {
  opacity: 0.5;
  pointer-events: none;
}
```

## Accessibility

### Keyboard

| Key              | Action                 |
| ---------------- | ---------------------- |
| `ArrowRight/Up`  | Increase by step       |
| `ArrowLeft/Down` | Decrease by step       |
| `PageUp`         | Increase by large step |
| `PageDown`       | Decrease by large step |
| `Home`           | Set to minimum         |
| `End`            | Set to maximum         |

### ARIA

- Root role: `slider` (or `group` for range)
- Thumb: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- `aria-orientation` for vertical sliders
- `aria-label` on Thumb for range sliders

## Open Questions

- Unresolved decisions
````

## Tips

1. **Anatomy first** — Show component structure before API details
2. **Named examples** — Real scenarios: "Range Slider", "Vertical Orientation"
3. **Full types** — Show union types, callback signatures
4. **`render` prop** — Document on every part for composition
5. **Data attributes** — Essential for styling component states

## Reference

Components follow patterns from:

- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Base UI](https://base-ui.com/) component APIs
- [Radix UI](https://www.radix-ui.com/) as fallback

Load the `aria` skill for accessibility implementation details.
Load the `component` skill for component architecture patterns.
