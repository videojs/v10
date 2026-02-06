# Video.js Component Architecture

Video.js components use a three-layer architecture separating framework-agnostic logic from platform implementations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  @videojs/core          Framework-agnostic business logic   │
│  @videojs/core/dom      Shared DOM utilities                │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼                                   ▼
      @videojs/html                     @videojs/react
      Web Components (Lit)              React Components
```

| Package | Responsibility |
|---------|----------------|
| `@videojs/core` | Core classes with `getState()`/`getAttrs()`/actions |
| `@videojs/core/dom` | DOM utilities, selectors, button behavior |
| `@videojs/html` | Web Components consuming core via controllers |
| `@videojs/react` | React components consuming core via hooks |

---

## Core Class Pattern

Every UI component has a `*Core` class in `@videojs/core`.

### Props Interface

```ts
interface PlayButtonProps {
  /** Custom label for the button. */
  label?: string | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
}
```

- All props optional with `| undefined` (explicit optionality)
- JSDoc for each prop

### State Interface

```ts
// When keys match the feature state, use Pick (preserves JSDoc on IDE hover)
interface PlayButtonState extends Pick<PlaybackState, 'paused' | 'ended' | 'started'> {}

// When renaming keys, use Pick for matching keys and add JSDoc for renamed ones
interface FullscreenButtonState extends Pick<FullscreenState, 'fullscreen'> {
  /** Whether fullscreen can be requested on this platform. */
  availability: FullscreenState['fullscreenAvailability'];
}
```

- Primitives only — no methods
- Use `Pick<FeatureState, ...>` to select relevant fields — preserves JSDoc on IDE hover
- When a key is renamed for the button context, use `FeatureState['...']` for the type and add a JSDoc description

### Core Class

```ts
class PlayButtonCore {
  static readonly defaultProps: NonNullableObject<Props>;
  
  setProps(props: Props): void;           // Merge with defaults
  getLabel(state: FeatureState): string;  // Computed label
  getAttrs(state: FeatureState): ElementProps;  // ARIA only
  getState(state: FeatureState): State;   // Primitives only
  toggle(state: FeatureState): Promise<void>;   // Action
}

namespace PlayButtonCore {
  export type Props = PlayButtonProps;
  export type State = PlayButtonState;
}
```

**Rules:**

- `static readonly defaultProps` with `NonNullableObject<Props>` type
- `getAttrs()` returns ARIA attributes only (no `data-*`)
- `getState()` returns primitives only (no methods) — converted to `data-*` for CSS
- Action methods receive feature state from store
- Namespace exports `Props` and `State` types

---

## State vs Attrs Separation

| Method | Returns | Purpose |
|--------|---------|---------|
| `getAttrs()` | ARIA attributes | Accessibility (`aria-label`, `aria-disabled`) |
| `getState()` | Primitives | CSS styling via `data-*` attributes |

**Why separate:**

- CSS targets `[data-paused]`, `[data-ended]` selectors
- ARIA attrs remain semantically accurate
- Can update independently

---

## Data Attribute Enums

Enums provide single source of truth + API reference tooling:

```ts
export enum PlayButtonDataAttrs {
  /** Present when the media is paused. */
  paused = 'data-paused',
  /** Present when the media has ended. */
  ended = 'data-ended',
}
```

JSDoc comments generate API documentation.

---

## ElementProps

Shared interface in `core/element.ts`. Extend as components need new attributes:

- Add `aria-*` attributes used by any component
- Use string literal types where ARIA spec defines allowed values
- `undefined` removes the attribute

---

## Web Component (Lit)

```ts
class PlayButtonElement extends MediaElement {
  static readonly tagName = 'media-play-button';
  static override properties = { label: { type: String }, disabled: { type: Boolean } };

  readonly #core = new PlayButtonCore();
  readonly #state = new PlayerController(this, playerContext, selectPlayback);
  #disconnect: AbortController | null = null;
  
  // Lifecycle: see flow below
}
```

**Lifecycle flow:**

1. `connectedCallback` — Create `AbortController`, apply button props via `applyElementProps()`
2. `disconnectedCallback` — Abort controller for cleanup
3. `willUpdate` — Sync component props to core via `setProps()`
4. `update` — Apply `getAttrs()` and `getState()` to element

**Key utilities:**

- `PlayerController(host, context, selector)` — Store subscription
- `applyElementProps(el, props, signal)` — Apply attrs + events
- `applyStateDataAttrs(el, state)` — State → `data-*`
- `logMissingFeature(name, feature)` — Deduped warning

---

## React Component

```tsx
const PlayButton = forwardRef(function PlayButton(props, ref) {
  const playback = usePlayer(selectPlayback);
  const [core] = useState(() => new PlayButtonCore());
  const { getButtonProps, buttonRef } = useButton({ onActivate, isDisabled });

  return renderElement('button', { render, className, style }, {
    state: core.getState(playback),
    ref: [ref, buttonRef],
    props: [core.getAttrs(playback), elementProps, getButtonProps()],
  });
});
```

**Flow:**

1. `usePlayer(selector)` — Subscribe to store slice
2. `useState(() => new Core())` — Lazy init core class
3. `useButton()` — Get accessible button behavior
4. `renderElement()` — Render with state→data-attrs, ref composition, props merge

**Props type:** `UIComponentProps<Tag, State>` allows `className`/`style` as functions of state.

---

## Shared Utilities

### @videojs/core/dom

| Utility | Purpose |
|---------|---------|
| `createButton(options)` | Accessible button (Enter/Space, click, disabled) |
| `applyElementProps(el, props, signal?)` | Apply attrs and events to DOM |
| `applyStateDataAttrs(el, state)` | State object → `data-*` attributes |
| `getStateDataAttrs(state)` | State → data-attrs object (React) |
| `logMissingFeature(name, feature)` | Deduped console.warn |
| `selectPlayback` / `selectVolume` | Store selectors |

### @videojs/react/utils

| Utility | Purpose |
|---------|---------|
| `renderElement(tag, props, params)` | Render with state, refs, props merge |
| `mergeProps(...propSets)` | Chain events, concat className, merge style |
| `composeRefs(...refs)` | Compose refs (React 19 cleanup support) |

---

## File Organization

```
packages/
├── core/src/
│   ├── core/
│   │   ├── element.ts                    # ElementProps interface
│   │   └── ui/{component}/
│   │       ├── {component}-core.ts       # Core class
│   │       ├── {component}-core.test.ts  # Core tests
│   │       └── {component}-data-attrs.ts # Data attr enum
│   └── dom/ui/                           # createButton, utils
├── html/src/
│   ├── ui/{component}/                   # Web Component
│   ├── define/ui/                        # Side-effect registration
│   └── player/player-controller.ts       # Store controller
└── react/src/
    ├── ui/{component}/                   # React component
    ├── ui/hooks/                         # Behavior hooks
    └── utils/                            # renderElement, mergeProps
```

**No barrel exports for simple components** — Don't create `index.ts` files for simple UI components. Export directly from individual files. Reserve `index.ts` barrels for compound components with multiple related exports that form a cohesive API.

---

## Component Registration

```ts
// define/ui/play-button.ts
customElements.define(PlayButtonElement.tagName, PlayButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PlayButtonElement.tagName]: PlayButtonElement;
  }
}
```

- Tag name: `static readonly tagName = 'media-{name}'`
- Registration in `define/ui/` directory
- Augment `HTMLElementTagNameMap` for TypeScript
