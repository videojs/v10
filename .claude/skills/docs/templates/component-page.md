# Component Page Template

Use this template for documenting UI components.

---

## Template

```markdown
## ComponentName

Brief description of what the component does.

<!-- Live demo here if possible -->

<ComponentName defaultValue={50}>
  <ComponentName.Track>
    <ComponentName.Fill />
  </ComponentName.Track>
  <ComponentName.Thumb />
</ComponentName>

### Features

- Feature one
- Feature two
- Feature three
- Keyboard accessible

### Installation

npm install @videojs/dom

### Anatomy

Import and assemble the parts:

import { ComponentName } from '@videojs/dom';

<ComponentName.Root>
<ComponentName.PartA />
<ComponentName.PartB>
<ComponentName.PartC />
</ComponentName.PartB>
</ComponentName.Root>

### API Reference

#### Root

Container element. Renders a `<div>`.

##### Props

| Prop            | Type                      | Default | Description         |
| --------------- | ------------------------- | ------- | ------------------- |
| `value`         | `number`                  | —       | Controlled value    |
| `defaultValue`  | `number`                  | `0`     | Initial value       |
| `disabled`      | `boolean`                 | `false` | Disable interaction |
| `onValueChange` | `(value: number) => void` | —       | Called on change    |

##### Data Attributes

| Attribute       | Description           |
| --------------- | --------------------- |
| `data-disabled` | Present when disabled |
| `data-state`    | `'idle' \| 'active'`  |

##### CSS Variables

| Variable           | Default | Description    |
| ------------------ | ------- | -------------- |
| `--component-size` | `100%`  | Container size |

#### PartA

Description. Renders a `<div>`.

##### Props

| Prop        | Type     | Default | Description |
| ----------- | -------- | ------- | ----------- |
| `className` | `string` | —       | CSS class   |

##### Data Attributes

| Attribute    | Description   |
| ------------ | ------------- |
| `data-state` | Current state |

#### PartB

Description. Renders a `<div>`.

[Continue for each part...]

### Examples

#### Basic

<ComponentName.Root>
<ComponentName.PartA />
</ComponentName.Root>

#### Controlled

function ControlledExample() {
const [value, setValue] = useState(50);

return (
<ComponentName.Root value={value} onValueChange={setValue}>
<ComponentName.PartA />
</ComponentName.Root>
);
}

#### Disabled

<ComponentName.Root disabled>
<ComponentName.PartA />
</ComponentName.Root>

#### Custom Styling

<ComponentName.Root className="custom-component">
<ComponentName.PartA />
</ComponentName.Root>

.custom-component {
--component-size: 200px;
}

.custom-component[data-state='active'] {
border-color: blue;
}

#### With Other Components

<Player>
  <ComponentName.Root>
    <ComponentName.PartA />
  </ComponentName.Root>
</Player>

### Accessibility

Follows [WAI-ARIA Pattern Name](https://www.w3.org/WAI/ARIA/apg/patterns/...).

#### Keyboard Interactions

| Key         | Action     |
| ----------- | ---------- |
| `Enter`     | Activate   |
| `Space`     | Activate   |
| `ArrowUp`   | Increase   |
| `ArrowDown` | Decrease   |
| `Home`      | Minimum    |
| `End`       | Maximum    |
| `Tab`       | Move focus |

#### ARIA Attributes

| Attribute       | Value           |
| --------------- | --------------- |
| `role`          | `slider`        |
| `aria-valuenow` | Current value   |
| `aria-valuemin` | Minimum value   |
| `aria-valuemax` | Maximum value   |
| `aria-label`    | Accessible name |

### See Also

- [RelatedComponent](/components/related)
- [Styling Guide](/handbook/styling)
- [Accessibility Guide](/handbook/accessibility)
```

---

## Anatomy Diagram

Show component structure visually:

```
┌─ Root ─────────────────────────────────┐
│                                        │
│  ┌─ Track ──────────────────────────┐  │
│  │                                  │  │
│  │  ┌─ Fill ─────────┐              │  │
│  │  │████████████████│              │  │
│  │  └────────────────┘              │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                     ○ Thumb            │
│                                        │
└────────────────────────────────────────┘
```

---

## Framework Variations

Include tabs for each framework:

````markdown
### Framework Examples

<Tabs>
<Tab label="React">
```tsx
import { Slider } from '@videojs/react';

function VolumeSlider() {
const [volume, setVolume] = useState(1);

return (
<Slider.Root value={volume} onValueChange={setVolume}>
<Slider.Track>
<Slider.Fill />
</Slider.Track>
<Slider.Thumb />
</Slider.Root>
);
}
````

</Tab>
<Tab label="Vue">
```vue
<script setup>
import { Slider } from '@videojs/vue';
import { ref } from 'vue';

const volume = ref(1);
</script>

<template>
  <Slider.Root v-model="volume">
    <Slider.Track>
      <Slider.Fill />
    </Slider.Track>
    <Slider.Thumb />
  </Slider.Root>
</template>
````

</Tab>
<Tab label="Svelte">
```svelte
<script>
  import { Slider } from '@videojs/svelte';
  
  let volume = 1;
</script>

<Slider.Root bind:value={volume}>
<Slider.Track>
<Slider.Fill />
</Slider.Track>
<Slider.Thumb />
</Slider.Root>

```
</Tab>
</Tabs>
```

````

---

## Styling Section

Always include styling examples:

```markdown
### Styling

#### With CSS

.slider[data-dragging] {
cursor: grabbing;
}

.slider-thumb:focus-visible {
outline: 2px solid blue;
}

#### With Tailwind

<Slider.Root className="relative w-full h-2">
<Slider.Track className="bg-gray-200 rounded-full h-full">
<Slider.Fill className="bg-blue-500 rounded-full h-full" />
</Slider.Track>
<Slider.Thumb className="absolute w-4 h-4 bg-white rounded-full shadow" />
</Slider.Root>

#### CSS Variables Reference

| Variable              | Default        | Description      |
| --------------------- | -------------- | ---------------- |
| `--slider-track-bg`   | `#e5e5e5`      | Track background |
| `--slider-fill-bg`    | `currentColor` | Fill color       |
| `--slider-thumb-size` | `16px`         | Thumb diameter   |
```

---

## Web Component Template

For `@videojs/html` components built with `@videojs/element`:

```markdown
## element-name

Brief description.

### Registration

import { ElementName } from '@videojs/html/path';

// Default registration
ElementName.define();

// Custom tag name
ElementName.define('custom-name');

// With custom mixin
import { createStore } from '@videojs/store/html';
import { extendConfig } from '@videojs/html/video/skin';

const { StoreMixin } = createStore(
extendConfig({ features: [customFeature] })
);

ElementName.define('custom-name', StoreMixin);

### HTML Usage

<element-name>
  <video src="video.mp4"></video>
</element-name>

### Attributes

| Attribute | Type     | Default | Description  |
| --------- | -------- | ------- | ------------ |
| `src`     | `string` | —       | Media source |

### Slots

| Slot      | Description                            |
| --------- | -------------------------------------- |
| (default) | Media element (`<video>` or `<audio>`) |

### Controllers Used

| Controller            | Usage           | Purpose              |
| --------------------- | --------------- | -------------------- |
| `SnapshotController`  | `store.state`   | Track playback state |
| `RequestController`   | `'play'`        | Play request         |

### Events

| Event       | Detail      | Description     |
| ----------- | ----------- | --------------- |
| `vjs:ready` | `{ store }` | Component ready |

### CSS Custom Properties

| Property             | Default | Description  |
| -------------------- | ------- | ------------ |
| `--vjs-accent-color` | `#fff`  | Accent color |

### Example

<vjs-frosted-skin>
  <video
    src="video.mp4"
    poster="poster.jpg"
  ></video>
</vjs-frosted-skin>

### Extending

import { createStore } from '@videojs/store/html';
import { extendConfig, FrostedSkinElement } from '@videojs/html/video/skin';
import { chaptersFeature } from './features/chapters';

const { StoreMixin } = createStore(
extendConfig({ features: [chaptersFeature] })
);

FrostedSkinElement.define('my-player', StoreMixin);

### See Also

- [Controllers](/api/controllers)
- [Creating Custom Elements](/guides/custom-elements)
```

---

## Checklist

When writing component documentation:

- [ ] Live demo at top
- [ ] Features list (3-5 bullets)
- [ ] Installation command
- [ ] Anatomy with all parts
- [ ] Props table for each part
- [ ] Data attributes for each part
- [ ] CSS variables table
- [ ] Basic example
- [ ] Controlled example
- [ ] Styling example
- [ ] Accessibility section
- [ ] Keyboard interactions table
- [ ] See Also section
````
