# PlayButton Component Plan

**Issue:** [#265 UI: Play Button Component](https://github.com/videojs/v10/issues/265)
**Status:** Ready for implementation (all blockers closed)

## Summary

Implement the PlayButton component for toggling media playback across three layers:
1. **Core** (`@videojs/core`) - Runtime-agnostic interaction logic
2. **DOM** (`@videojs/core/dom`) - DOM props builder and keyboard handling
3. **React** (`@videojs/react`) - React component and hook
4. **HTML** (`@videojs/html`) - Web Component custom element

## Current State

**Existing Infrastructure:**
- `playbackFeature` exists in `packages/core/src/dom/store/features/playback.ts`
- Store React bindings (`createStore`, `useSnapshot`, `useRequest`) complete
- Store Lit bindings (controllers, mixins) complete
- Tech-preview packages contain reference implementations

**Gap:** No UI components exist in production packages. PlayButton establishes patterns for all future components.

---

## Phase 1: Core Layer (`@videojs/core`)

**File:** `packages/core/src/core/components/play-button.ts`

### Interfaces

```ts
interface PlayButtonProps {
  disabled?: boolean;
  label?: string;  // Custom aria-label override
}

interface PlayButtonCallbacks {
  onToggle?: () => void;
  onPlayRequest?: () => void;
  onPauseRequest?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onError?: (error: Error) => void;
}

interface PlayButtonState {
  paused: boolean;
  ended: boolean;
  label: string;  // Computed: "Play" | "Pause" | "Replay"
}
```

### Implementation

1. Implement `PlayButtonCore` class or factory:
   - `constructor(options: PlayButtonCoreOptions)` - receives store, props, callbacks
   - `toggle()` method - handles the request flow
   - `getState()` - returns computed state

2. Label computation:
   ```ts
   function getPlayButtonLabel(props: PlayButtonProps, state: { paused: boolean; ended: boolean }): string {
     if (props.label) return props.label;
     if (state.ended) return 'Replay';
     return state.paused ? 'Play' : 'Pause';
   }
   ```

3. Request flow:
   ```
   User clicks → onToggle → onPlayRequest/onPauseRequest → request.play/pause → onPlay/onPause/onError
   ```

---

## Phase 2: DOM Layer (`@videojs/core/dom`)

**File:** `packages/core/src/dom/components/play-button.ts`

### Data Attributes

```ts
interface PlayButtonDataAttributes {
  'data-paused'?: '';
  'data-ended'?: '';
  'data-disabled'?: '';
}
```

### Props Builder

```ts
function getPlayButtonProps(params: {
  props: PlayButtonProps;
  state: PlayButtonState;
  onToggle: () => void;
}): PlayButtonDOMProps;
```

Output includes:
- `role: 'button'`
- `tabindex: 0` (for non-button elements)
- `aria-label: state.label`
- `data-paused`, `data-ended`, `data-disabled` (boolean attributes)
- `onClick` handler
- `onKeyDown` handler (Enter/Space)

### Keyboard Handling

- Enter and Space both activate
- Prevent default for Space (avoids scroll)
- Respect disabled state

---

## Phase 3: React Package (`@videojs/react`)

**Files:**
- `packages/react/src/components/play-button.tsx`
- `packages/react/src/components/index.ts`

### Hook

```tsx
function usePlayButton(options?: UsePlayButtonOptions): {
  props: PlayButtonDOMProps;
  state: PlayButtonState;
};
```

### Component

```tsx
function PlayButton(props: PlayButtonProps): JSX.Element;

namespace PlayButton {
  export type Props = PlayButtonProps;
}
```

Features:
- `render` prop for custom rendering
- Ref forwarding via `useComposedRefs`
- Namespace pattern for types

---

## Phase 4: HTML Package (`@videojs/html`)

**Files:**
- `packages/html/src/elements/button.ts` (base)
- `packages/html/src/elements/play-button.ts`
- `packages/html/src/define/media-play-button.ts`

### Base ButtonElement

- Shadow DOM with slot
- Keyboard event handling (Enter/Space)
- `handleEvent` pattern

### PlayButtonElement

- Uses `SnapshotController` for state
- Uses `RequestController` for play/pause
- Dispatches callbacks as custom events: `toggle`, `playrequest`, `pauserequest`, `play`, `pause`, `error`

### Registration

```ts
customElements.define('media-play-button', PlayButtonElement);
```

---

## Phase 5: Testing

### Test Files

```
packages/core/src/core/components/tests/play-button.test.ts
packages/core/src/dom/components/tests/play-button.test.ts
packages/react/src/components/tests/play-button.test.tsx
packages/html/src/elements/tests/play-button.test.ts
```

### Test Coverage

**Core:**
- Label computation with all state combinations
- Callback ordering
- Error handling
- Disabled state behavior

**DOM:**
- Props builder output
- Data attributes presence/absence
- ARIA attributes
- Keyboard interaction

**React:**
- Hook returns correct props and state
- Component renders correctly
- `render` prop customization
- Event callbacks fire

**HTML:**
- Custom element registration
- Attribute/property reflection
- Custom event dispatch
- Keyboard accessibility

**Conformance:**
- Shared test suite for React/HTML behavioral parity

---

## File Structure

```
packages/core/src/
├── core/
│   └── components/
│       ├── play-button.ts
│       ├── index.ts
│       └── tests/
│           └── play-button.test.ts
└── dom/
    └── components/
        ├── play-button.ts
        ├── index.ts
        └── tests/
            └── play-button.test.ts

packages/react/src/
└── components/
    ├── play-button.tsx
    ├── index.ts
    └── tests/
        └── play-button.test.tsx

packages/html/src/
├── elements/
│   ├── button.ts
│   ├── play-button.ts
│   └── tests/
│       └── play-button.test.ts
└── define/
    └── media-play-button.ts
```

---

## Accessibility Checklist

- [ ] `role="button"` for non-button elements
- [ ] `aria-label` always present and meaningful
- [ ] `tabindex="0"` for keyboard navigation
- [ ] Enter and Space both activate
- [ ] Disabled state communicated and prevents activation
- [ ] Data attributes enable CSS-based state styling

---

## Design Decisions

| Decision | Resolution |
|----------|------------|
| Label pattern | Dynamic labels (Play/Pause/Replay) per issue spec |
| Core architecture | Class or factory with toggle method |
| Callback flow | Documented order with interception points |
| Error surface | `onError` callback for play failures |

---

## References

- **Issue:** https://github.com/videojs/v10/issues/265
- **Playback feature:** `packages/core/src/dom/store/features/playback.ts`
- **Tech-preview:** `packages/__tech-preview__/react/src/components/PlayButton.tsx`
- **Skills:** `component`, `aria` (media.md)
