# Component Library Documentation Patterns

Patterns from Radix UI, Ark UI, React Aria, Melt UI, Bits UI, Kobalte.

## Per-Component Page Structure

All top-tier component libraries follow this structure:

1. **Live interactive demo** (top of page)
2. **Features bullet list** (3-5 key capabilities)
3. **Quick reference** (install, version, bundle size, source link)
4. **Anatomy diagram** (component tree)
5. **Basic example** (copy button, runnable)
6. **Advanced examples** (controlled, events, composition)
7. **Props/API Reference** (categorized tables)
8. **Data Attributes** (CSS styling hooks)
9. **CSS Variables** (theming)
10. **Accessibility** (keyboard table, ARIA)
11. **See also** (related components)

## Anatomy Documentation

Show component composition clearly:

```tsx
// ✅ Clear anatomy
import { Slider } from "@videojs/dom";

<Slider.Root>
  <Slider.Track>
    <Slider.Range />
  </Slider.Track>
  <Slider.Thumb />
</Slider.Root>;
```

Document what each part renders:

| Part    | Renders | Purpose                  |
| ------- | ------- | ------------------------ |
| `Root`  | `<div>` | Container, manages state |
| `Track` | `<div>` | Clickable track area     |
| `Range` | `<div>` | Filled portion           |
| `Thumb` | `<div>` | Draggable handle         |

## Props Tables

Standard format across all libraries:

| Prop            | Type                         | Default        | Description                  |
| --------------- | ---------------------------- | -------------- | ---------------------------- |
| `value`         | `number`                     | —              | Controlled value             |
| `defaultValue`  | `number`                     | `0`            | Initial value (uncontrolled) |
| `min`           | `number`                     | `0`            | Minimum value                |
| `max`           | `number`                     | `100`          | Maximum value                |
| `step`          | `number`                     | `1`            | Step increment               |
| `disabled`      | `boolean`                    | `false`        | Disable interaction          |
| `orientation`   | `'horizontal' \| 'vertical'` | `'horizontal'` | Slider direction             |
| `onValueChange` | `(value: number) => void`    | —              | Called on change             |

**Conventions:**

- Required props: no default, marked with `*` or bold
- Optional props: show default value
- Callback props: `on` prefix, show signature
- Enum props: show all options with `|`

## Data Attributes Tables

Document CSS hooks:

| Attribute          | Values                       | Description               |
| ------------------ | ---------------------------- | ------------------------- |
| `data-state`       | `'idle' \| 'dragging'`       | Current interaction state |
| `data-disabled`    | `''`                         | Present when disabled     |
| `data-orientation` | `'horizontal' \| 'vertical'` | Current orientation       |
| `data-focus`       | `''`                         | Present when focused      |

**Usage example:**

```css
.slider[data-dragging] {
  cursor: grabbing;
}

.slider[data-disabled] {
  opacity: 0.5;
  pointer-events: none;
}
```

## CSS Variables Tables

Document theming hooks:

| Variable                | Default        | Description        |
| ----------------------- | -------------- | ------------------ |
| `--slider-thumb-size`   | `20px`         | Thumb diameter     |
| `--slider-track-height` | `4px`          | Track thickness    |
| `--slider-range-color`  | `currentColor` | Filled range color |

## Context API (Ark UI Pattern)

Document programmatic access:

```tsx
import { Slider, useSliderContext } from "@videojs/dom";

function CustomThumb() {
  const slider = useSliderContext();
  return <div>{slider.value}%</div>;
}
```

| Property   | Type      | Description         |
| ---------- | --------- | ------------------- |
| `value`    | `number`  | Current value       |
| `percent`  | `number`  | Value as percentage |
| `dragging` | `boolean` | Whether dragging    |
| `disabled` | `boolean` | Whether disabled    |

## Dual API Pattern (React Aria)

Document both high-level components and low-level hooks:

### Component API

```tsx
import { Slider } from "@videojs/react";

<Slider defaultValue={50} />;
```

### Hook API

```tsx
import { useSlider } from "@videojs/react";

function CustomSlider() {
  const { rootProps, trackProps, thumbProps, state } = useSlider({
    defaultValue: 50,
  });

  return (
    <div {...rootProps}>
      <div {...trackProps}>
        <div {...thumbProps} />
      </div>
    </div>
  );
}
```

## Accessibility Section

Always include:

### Keyboard Interactions

| Key          | Action                 |
| ------------ | ---------------------- |
| `ArrowRight` | Increase by step       |
| `ArrowLeft`  | Decrease by step       |
| `ArrowUp`    | Increase by step       |
| `ArrowDown`  | Decrease by step       |
| `PageUp`     | Increase by large step |
| `PageDown`   | Decrease by large step |
| `Home`       | Set to min             |
| `End`        | Set to max             |

### ARIA

- Role: `slider`
- Required: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Optional: `aria-label`, `aria-valuetext`

### Focus Management

Document focus behavior, trap patterns, restore behavior.

## Framework-Specific Patterns

### React (Radix, React Aria)

- Hooks: `useSlider`, `useSliderContext`
- Refs: `forwardRef` on all parts
- Controlled/uncontrolled: `value` vs `defaultValue`

### Vue (Ark UI)

- v-model: `v-model:value`
- Slots: scoped slots for customization
- Composables: `useSlider()`

### Svelte (Melt UI, Bits UI)

- Builders: `createSlider()`
- Actions: `use:melt={$slider.root}`
- Stores: `$slider.value`
- Svelte 5: snippets for composition

### Solid (Kobalte)

- Primitives: `createSlider()`
- Signals: reactive by default
- `as` prop: polymorphic rendering

### Lit / Web Components

- Controllers: reactive state subscription
- Mixins: class composition for shared behavior
- Context: Lit Context Protocol for dependency injection
- Slots: `<slot>` for composition

## Polymorphic Components

Document `as` prop pattern:

```tsx
// Render as different element
<Slider.Root as="section">

// Render as custom component
<Slider.Root as={CustomContainer}>
```

## Composition Examples

Show real-world compositions:

```tsx
// Volume control with mute
<div className="volume-control">
  <MuteButton />
  <Slider.Root value={volume} onValueChange={setVolume}>
    <Slider.Track>
      <Slider.Range />
    </Slider.Track>
    <Slider.Thumb />
  </Slider.Root>
</div>
```

---

## Applicable to Video.js

The patterns above are drawn from many libraries. Not all apply to Video.js reference pages. Where existing patterns contradict the patterns outlined here, follow the existing patterns.

---

## See Also

- [Component Patterns](../../component/SKILL.md) — building headless components
