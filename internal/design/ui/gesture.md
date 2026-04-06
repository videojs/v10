---
status: draft
date: 2026-03-19
---

# Gesture

## API

### Component

A single generic `<media-gesture>` component with `type` and `action` props.

The component accepts additional props as needed (e.g. `value` for seek offset, `axis` for swipe direction). The `value` prop is intentionally generic on the component interface — typing it precisely per action would require discriminated unions that add complexity for marginal safety. The underlying functions provide precise types.

#### HTML

```html
<!-- Full surface gestures -->
<media-gesture type="tap" action="togglePaused"></media-gesture>
<media-gesture type="swipe" action="seek" axis="x" threshold="30"></media-gesture>

<!-- Regions — container splits equally by active region count -->
<media-gesture type="doubletap" action="seek" value="-10" region="left"></media-gesture>
<media-gesture type="doubletap" action="toggleFullscreen" region="center"></media-gesture>
<media-gesture type="doubletap" action="seek" value="10" region="right"></media-gesture>

<!-- Pointer filtering — different actions for touch vs mouse -->
<media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>
<media-gesture type="tap" action="togglePaused" pointer="mouse"></media-gesture>
```

#### React

```tsx
{/* Full surface gestures */}
<MediaGesture type="tap" action="togglePaused" />
<MediaGesture type="swipe" action="seek" axis="x" threshold={30} />

{/* Regions */}
<MediaGesture type="doubletap" action="seek" value={-10} region="left" />
<MediaGesture type="doubletap" action="toggleFullscreen" region="center" />
<MediaGesture type="doubletap" action="seek" value={10} region="right" />

{/* Pointer filtering */}
<MediaGesture type="tap" action="toggleControls" pointer="touch" />
<MediaGesture type="tap" action="togglePaused" pointer="mouse" />

{/* Callback region — full control over hit testing */}
<MediaGesture
  type="doubletap"
  action="seek"
  value={-10}
  region={(state) => state.x < state.containerWidth * 0.2}
/>
```

#### `region`

Divides the container into equal zones based on how many gestures of the same `type` have a `region` prop. The container is split equally along the horizontal axis — each region gets the same share.

| Active regions | Layout |
|---|---|
| `left`, `right` | Halves (50% / 50%) |
| `left`, `center`, `right` | Thirds (33% / 34% / 33%) |

```
region="left" + region="right"    → halves
 ┌─────────────┬─────────────┐
 │    left     │    right    │
 │    (50%)    │    (50%)    │
 └─────────────┴─────────────┘

region="left" + region="center" + region="right"    → thirds
 ┌────────┬─────────┬────────┐
 │  left  │ center  │ right  │
 │ (33%)  │  (34%)  │ (33%)  │
 └────────┴─────────┴────────┘
When omitted, the gesture covers the full container surface. Full-surface gestures and region gestures of the same `type` can coexist — region gestures take priority within their zone, the full-surface gesture handles everything else.

In React, `region` also accepts a callback that receives the gesture state and returns `true` or `false`. This gives full programmatic control over hit testing for custom zones that don't fit the `left` / `center` / `right` model:

```tsx
<MediaGesture
  type="swipe"
  action="setVolume"
  region={(state) => state.x > state.containerWidth / 2}
/>
```

#### `pointer`

Filters the gesture by pointer type. Maps directly to `PointerEvent.pointerType`. When omitted, the gesture responds to all pointer types.

```html
<!-- Touch: tap toggles controls visibility (mobile pattern) -->
<media-gesture type="tap" action="toggleControls" pointer="touch"></media-gesture>

<!-- Mouse: tap toggles play/pause (desktop pattern) -->
<media-gesture type="tap" action="togglePaused" pointer="mouse"></media-gesture>
```

This solves the common conflict where the same gesture type needs different behavior on mobile vs desktop — without media queries or JS-toggled `disabled` props.

Values: `mouse`, `touch`, `pen`.

#### Props

| Prop | Applies to | Description |
|---|---|---|
| `type` | all | Gesture type: `tap`, `doubletap`, `swipe` |
| `action` | all | Player action to trigger. Typed to all store actions for HTML (does not guarantee the action exists at runtime). |
| `value` | action-specific | Action parameter (e.g. seek offset) |
| `region` | all | Gesture zone within the container. String: `left`, `center`, `right` — divided equally by active region count. In React, also accepts a `(state) => boolean` callback for custom hit testing. Omit for full surface. |
| `pointer` | all | Filters by pointer type: `mouse`, `touch`, `pen`. Omit for all pointer types. |
| `axis` | swipe | Constrain to `x` or `y` |
| `threshold` | swipe | Minimum displacement (px) before the gesture fires |
| `disabled` | all | Disables the gesture |
| `preventScroll` | swipe | Delays gesture recognition to allow page scrolling on touch devices. `true` defaults to `250ms`. Accepts a number (ms) for custom delay. |

### Conflict resolution

When multiple gestures could match the same pointer event, the component resolves conflicts using these rules:

**Tap vs. doubletap timing** — When both `tap` and `doubletap` gestures exist on the same surface, single taps are delayed by a short window (~300ms) to wait for a potential second tap. If a second tap arrives → doubletap fires. If not → tap fires. When no doubletap gestures are registered, taps fire immediately with no delay.

**Pointer type filtering** — Gestures with a `pointer` prop only match events from that pointer type. A `pointer="touch"` gesture ignores mouse clicks entirely. This is checked before any other resolution.

**Region specificity** — When a region gesture and a full-surface gesture of the same `type` both match, the region gesture takes priority within its zone. The full-surface gesture handles events outside all regions. Named regions (`left`, `center`, `right`) don't overlap each other.

### Gesture coordinator

Underneath both the component and the factory functions sits a `GestureCoordinator`, one per container. Gesture detectors (tap, swipe, etc.) recognize raw input and report to the coordinator — they don't fire actions themselves. The coordinator holds the registry of gesture entries (type, handler, region, pointer, disabled) and decides what actually fires and when.

This separation means detectors are stateless recognizers that don't know about each other. The coordinator is the single place where conflict resolution, region hit testing, pointer filtering, and tap/doubletap timing live. All three API layers — component, factory, hook — register entries with the same coordinator instance for a given container.

### Gesture functions

Each gesture type is implemented as an independent factory function. Inspired by [`@use-gesture`](https://github.com/pmndrs/use-gesture), which separates gesture recognition from what you do with the result.

```ts
createTapGesture(target, handler, options?)
createDoubleTapGesture(target, handler, options?)
createSwipeGesture(target, handler, options?)
```

Each factory takes a target element and a handler, returns a cleanup function. These live in a shared package — framework-agnostic.

This decomposition ensures:

- **Gesture logic stays independent** — tap detection doesn't import swipe math. The component selects the right factory based on its `type` prop.
- **Cross-framework sharing** — the same `createSwipeGesture` powers the HTML custom element, the React hook, and any future platform adapter.
- **Tree-shaking for advanced users** — importing `createSwipeGesture` directly only pulls in swipe. The generic component bundles all types, but action handlers are lightweight so the tradeoff is acceptable at the component level.

### HTML advanced usage

For HTML users who need more control than `<media-gesture>` provides — custom gesture-to-action mappings, non-standard targets, or tree-shaking — the factory functions are importable directly:

```html
<media-player>
  <media-container>
    <video src="video.mp4"></video>
  </media-container>
</media-player>

<script type="module">
  import { createSwipeGesture } from '@videojs/html';

  const container = document.querySelector('media-container');
  const player = document.querySelector('media-player');

  const destroy = createSwipeGesture(container, (state) => {
    if (state.axis === 'x') {
      player.store.seek(player.store.currentTime + state.distance);
    }
  }, { axis: 'x', threshold: 30 });
</script>
```

The declarative component remains the recommended API. These functions are the escape hatch — the same functions that power `<media-gesture>` internally, exposed for users who want full control.

### React hooks

Gestures map naturally to hooks — more idiomatic and a better TypeScript story since each hook can precisely type its handler state and options. The store is typed naturally through the callback — hooks call store actions directly rather than going through a generic `action` string.

```tsx
// Specific hooks — precise types, tree-shakeable
useSwipeGesture((state) => {
  store.seek(store.currentTime + state.distance);
}, { axis: 'x', threshold: 30 });

// Combined hook — mirrors the generic component
useGesture({
  onTap: (state) => { /* ... */ },
  onDoubleTap: (state) => { /* ... */ },
  onSwipe: (state) => { /* ... */ },
});
```

Hooks use the `(handler, options?)` pattern — callback first, options second — consistent with `@use-gesture`'s `useDrag(handler, config?)` and React's own `useEffect(callback, deps)` convention.

Hooks get the player container from context by default but accept a `target` override in options:

```tsx
const ref = useRef<HTMLDivElement>(null);
useSwipeGesture(handler, { target: ref });
```

## Context

Following the earlier decision that gestures should be UI components (not store features), the question became what shape the component API should take — one generic component or multiple specialized ones per gesture type or action.

## Decision

Use a single generic `<media-gesture>` component with `type` and `action` props instead of separate specialized components.

The component is a declarative shell over composable gesture primitives. Most users use the component; users who need finer control import the functions directly. On the React side, hooks provide the idiomatic equivalent.

This was chosen because:

- **Simple API** — one component covers all gesture-action combinations. Easy to learn and document.
- **Alignment with `media-hotkeys`** — hotkeys will follow the same pattern: a single declarative component with configurable bindings. Gestures and hotkeys are conceptually sibling APIs.
- **Declarative shell, imperative core** — the generic component is a thin declarative interface. JS does the heavy lifting and the tree-shaking story decomposes into functions that users can import directly. In React that means hooks. In HTML that means importing JS in a script block.

### Alternatives considered

- **Action-based components** (`media-play-gesture`, `media-seek-gesture`) — component per player action. Naming felt awkward — "play" and "seek" are player actions, not gestures. Conflates the input mechanism with the action it triggers.

- **Granular input components** (`media-press-gesture`, `media-swipe-gesture`) — component per input primitive. Still requires an `action` prop to map the gesture to player behavior, so it doesn't eliminate configuration — just moves it. Felt still coupled to the store while pretending to be about the gesture primitive.

- **Specialized per gesture type** (`<DoubleTapGesture>`, `<TapGesture>`) — would allow tree-shaking unused types, but the action logic adds minimal weight. Bundle size savings don't justify the API fragmentation.

- **Specialized per action** (`<TogglePauseGesture>`, `<SeekGesture>`) — even more granular, but creates many components for a narrow domain. Harder to discover, larger API surface.
