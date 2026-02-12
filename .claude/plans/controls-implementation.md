# Controls Implementation Plan

Implementation plan for `internal/design/ui/controls-design.md`.

## Deliverables

1. **`controlsFeature`** — store slice tracking user activity and computing controls visibility
2. **`ControlsCore`** — runtime-agnostic state projection (core layer)
3. **`<media-controls>` / `<media-controls-group>`** — HTML custom elements
4. **`<Controls.Root>` / `<Controls.Group>`** — React compound component

## Decisions

Resolved during planning:

| Question | Decision | Rationale |
|----------|----------|-----------|
| Cross-feature state access (reading `paused`) | Direct `store.state` access | `attach()` already has full store; simpler than importing selectors inside features |
| Null container handling | Require container, `__DEV__` warning, skip tracking | Design doc says activity is tracked on container; container-mixin always provides one |
| Idle timeout default | 2000ms | Matches Media Chrome and Video.js 7 |

---

## Phase 1: Controls Feature (Store Layer)

**Goal:** `controlsFeature` slice — activity tracking + visibility computation.

### 1.1 Add `MediaControlsState` interface

**File:** `packages/core/src/core/media/state.ts`

Add alongside existing state interfaces:

```ts
export interface MediaControlsState {
  /** Raw activity state — true if user recently interacted. */
  userActive: boolean;
  /** Computed visibility: userActive || paused. */
  controlsVisible: boolean;
}
```

No actions — activity tracking is internal to the feature, not user-callable.

### 1.2 Create `controlsFeature`

**New file:** `packages/core/src/dom/store/features/controls.ts`

Follows the `playbackFeature` / `fullscreenFeature` pattern:

```ts
export const controlsFeature = definePlayerFeature({
  state: (): MediaControlsState => ({
    userActive: true,
    controlsVisible: true,
  }),

  attach({ target, signal, set, store }) { ... },
});
```

**`attach()` responsibilities:**

1. **Guard container** — if `target.container` is null, log `__DEV__` warning and return (no tracking).

2. **Media type detection** — `target.media.tagName === 'AUDIO'`. Audio: always visible, skip idle setup.

3. **Idle timer** — 2000ms `setTimeout`. Helpers:
   - `setActive()` — `set({ userActive: true, controlsVisible: true })`, then `scheduleIdle()`
   - `setInactive()` — `set({ userActive: false, controlsVisible: !!store.state.paused })`
   - `scheduleIdle()` — `clearTimeout(timer); timer = setTimeout(setInactive, 2000)`
   - `clearIdle()` — `clearTimeout(timer)`

4. **Container event listeners** (all with `{ signal }`):

   | Event | Handler |
   |-------|---------|
   | `pointermove` | `setActive` |
   | `pointerdown` | Record `Date.now()` for tap detection |
   | `pointerup` | Touch + < 250ms: toggle visibility. Mouse: `setActive` |
   | `keyup` | `setActive` |
   | `focusin` | `setActive` |
   | `mouseleave` | `setInactive` immediately |

5. **Touch tap-to-toggle** — On `pointerup`:
   ```
   if (e.pointerType === 'touch' && Date.now() - downTime < 250):
     if controlsVisible → setInactive(), clearIdle()
     else → setActive()
   else:
     setActive()
   ```

6. **Playback state subscription** — `store.subscribe()` with `{ signal }` to watch `paused` changes. On change, recompute `controlsVisible = get().userActive || store.state.paused`.

7. **Initial state** — If already playing (`!store.state.paused`), schedule idle timer.

### 1.3 Create selector

**File:** `packages/core/src/dom/store/selectors.ts`

Add:

```ts
import { controlsFeature } from './features/controls';
export const selectControls = createSelector(controlsFeature);
```

### 1.4 Add to feature presets

**File:** `packages/core/src/dom/store/features/feature.parts.ts`

- Add `controlsFeature` to `video` and `audio` preset arrays
- Export short alias: `export { controlsFeature as controls }`

**File:** `packages/core/src/dom/media/types.ts`

- Add `controlsFeature` to `VideoFeatures` and `AudioFeatures` tuple types
- Import `MediaControlsState` into the union

### 1.5 Update barrel exports

**File:** `packages/core/src/dom/store/features/index.ts` — re-export `controlsFeature`

`state.ts` and `selectors.ts` are already re-exported through existing barrels.

### 1.6 Write feature tests

**New file:** `packages/core/src/dom/store/features/tests/controls.test.ts`

Test cases:

- **Initial state**: `userActive: true`, `controlsVisible: true`
- **Idle timeout**: sets inactive after 2000ms of no activity
- **Pointer move**: resets idle timer, stays active
- **Touch tap-to-toggle**: tap toggles visibility
- **Paused keeps visible**: `controlsVisible` stays true when paused even if idle
- **Resume hides**: `controlsVisible` goes false when playing + idle
- **`mouseleave`**: immediately sets inactive
- **`keyup`**: resets idle timer
- **`focusin`**: resets idle timer
- **Audio media**: always visible, no auto-hide
- **Recomputes on pause change**: subscribes to store, recomputes when `paused` changes
- **Cleanup**: signal abort removes all listeners and clears timer

Use `vi.useFakeTimers()` for timer tests.

---

## Phase 2: Core UI Classes

**Goal:** Runtime-agnostic state projection for the controls container.

### 2.1 `ControlsCore`

**New file:** `packages/core/src/core/ui/controls/controls-core.ts`

Follows `PosterCore` pattern (simplest — no props, no actions):

```ts
export interface ControlsState {
  visible: boolean;
}

export class ControlsCore {
  getState(media: MediaControlsState): ControlsState {
    return { visible: media.controlsVisible };
  }
}

export namespace ControlsCore {
  export type State = ControlsState;
}
```

### 2.2 `ControlsDataAttrs`

**New file:** `packages/core/src/core/ui/controls/controls-data-attrs.ts`

```ts
export const ControlsDataAttrs = {
  visible: 'data-visible',
} as const satisfies StateAttrMap<ControlsState>;
```

### 2.3 No core class for `ControlsGroup`

Follows `TimeGroupElement` precedent — groups are pure structural containers with no core logic.

### 2.4 Update core barrel

**File:** `packages/core/src/core/index.ts` — add re-exports for controls core + data attrs.

### 2.5 Write core tests

**New file:** `packages/core/src/core/ui/controls/tests/controls-core.test.ts`

- `getState` returns `{ visible: true }` when `controlsVisible: true`
- `getState` returns `{ visible: false }` when `controlsVisible: false`

---

## Phase 3: HTML Custom Elements

**Goal:** `<media-controls>` and `<media-controls-group>` web components.

### 3.1 `ControlsElement`

**New file:** `packages/html/src/ui/controls/controls-element.ts`

Follows `PosterElement` pattern (non-interactive, state-driven):

```ts
export class ControlsElement extends MediaElement {
  static readonly tagName = 'media-controls';

  readonly #core = new ControlsCore();
  readonly #state = new PlayerController(this, playerContext, selectControls);

  update() {
    const controls = this.#state.value;
    if (!controls) return;
    const state = this.#core.getState(controls);
    applyStateDataAttrs(this, state, ControlsDataAttrs);
  }
}
```

Key behavior:
- Sets `data-visible` attribute when controls should be visible
- No shadow DOM (inherits from `MediaElement`)
- Subscribes to controls feature state via `PlayerController`

### 3.2 `ControlsGroupElement`

**New file:** `packages/html/src/ui/controls/controls-group-element.ts`

Follows `TimeGroupElement` pattern — minimal container with a11y:

```ts
export class ControlsGroupElement extends MediaElement {
  static readonly tagName = 'media-controls-group';

  override connectedCallback() {
    super.connectedCallback();
    if (this.hasAttribute('aria-label') || this.hasAttribute('aria-labelledby')) {
      this.setAttribute('role', 'group');
    }
  }
}
```

### 3.3 Registration

**New file:** `packages/html/src/define/ui/controls.ts`

```ts
import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';

customElements.define(ControlsElement.tagName, ControlsElement);
customElements.define(ControlsGroupElement.tagName, ControlsGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
```

**File:** `packages/html/package.json` — add `src/define/ui/controls.ts` to `sideEffects` array and add subpath export `./ui/controls`.

### 3.4 Update HTML barrel

**File:** `packages/html/src/index.ts` — export `ControlsElement` and `ControlsGroupElement`.

---

## Phase 4: React Components

**Goal:** `<Controls.Root>` and `<Controls.Group>` React compound component.

### 4.1 `Controls.Root`

**New file:** `packages/react/src/ui/controls/controls-root.tsx`

Follows `Poster` pattern (non-interactive, store-connected):

```tsx
export interface ControlsRootProps extends UIComponentProps<'div', ControlsCore.State> {}

export const ControlsRoot = forwardRef(function ControlsRoot(
  componentProps: ControlsRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;
  const controls = usePlayer(selectControls);
  const [core] = useState(() => new ControlsCore());

  if (!controls) {
    if (__DEV__) logMissingFeature('Controls.Root', 'controls');
    return null;
  }

  const state = core.getState(controls);

  return renderElement('div', { render, className, style }, {
    state,
    stateAttrMap: ControlsDataAttrs,
    ref: [forwardedRef],
    props: [elementProps],
  });
});

export namespace ControlsRoot {
  export type Props = ControlsRootProps;
  export type State = ControlsCore.State;
}
```

### 4.2 `Controls.Group`

**New file:** `packages/react/src/ui/controls/controls-group.tsx`

Follows `Time.Group` pattern (stateless wrapper):

```tsx
export interface ControlsGroupProps extends UIComponentProps<'div', Record<string, never>> {}

export const ControlsGroup = forwardRef(function ControlsGroup(
  componentProps: ControlsGroupProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const role = elementProps['aria-label'] || elementProps['aria-labelledby']
    ? 'group'
    : undefined;

  return renderElement('div', { render, className, style }, {
    state: {},
    ref: [forwardedRef],
    props: [{ role }, elementProps],
  });
});

export namespace ControlsGroup {
  export type Props = ControlsGroupProps;
}
```

### 4.3 Compound namespace

**New file:** `packages/react/src/ui/controls/index.ts`

```ts
export * as Controls from './index.parts';
```

**New file:** `packages/react/src/ui/controls/index.parts.ts`

```ts
export { ControlsRoot as Root, type ControlsRootProps as RootProps } from './controls-root';
export { ControlsGroup as Group, type ControlsGroupProps as GroupProps } from './controls-group';
```

### 4.4 Update React barrel

**File:** `packages/react/src/index.ts` — add `Controls` export.

---

## Phase 5: Tests

### 5.1 Feature tests (Phase 1.6)

Most critical tests — the feature contains all the logic.

### 5.2 Core UI tests (Phase 2.5)

Trivial — `getState` projection.

### 5.3 HTML element tests

**New file:** `packages/html/src/ui/controls/tests/controls-element.test.ts`

- `data-visible` attribute present when controls visible
- `data-visible` attribute absent when controls hidden
- `ControlsGroupElement` applies `role="group"` only when `aria-label` present
- `ControlsGroupElement` does not apply `role="group"` without label

### 5.4 React component tests

**New file:** `packages/react/src/ui/controls/tests/controls-root.test.tsx`

- Renders `data-visible` when controls are visible
- Returns null when controls feature not in store (`__DEV__` warning)
- `Controls.Group` applies conditional `role="group"`
- `Controls.Group` renders children

---

## Phase 6: Build & Verify

```bash
# Build core first (html and react depend on built .d.ts)
pnpm -F @videojs/core build

# Build dependent packages
pnpm -F @videojs/html build
pnpm -F @videojs/react build

# Verify
pnpm typecheck
pnpm test
pnpm lint
```

---

## Execution Order

| # | Task | Package | Depends On |
|---|------|---------|------------|
| 1 | `MediaControlsState` interface | core | — |
| 2 | `controlsFeature` slice | core/dom | 1 |
| 3 | `selectControls` selector | core/dom | 2 |
| 4 | Feature presets + types update | core/dom | 2 |
| 5 | Feature barrel exports | core/dom | 2 |
| 6 | Feature tests | core | 2 |
| 7 | `ControlsCore` + data attrs | core | 1 |
| 8 | Core barrel update | core | 7 |
| 9 | Core tests | core | 7 |
| 10 | Build core | core | 1-9 |
| 11 | `ControlsElement` + `ControlsGroupElement` | html | 10 |
| 12 | HTML registration + package.json + barrel | html | 11 |
| 13 | HTML tests | html | 11 |
| 14 | Build html | html | 11-13 |
| 15 | `Controls.Root` + `Controls.Group` | react | 10 |
| 16 | React compound namespace + barrel | react | 15 |
| 17 | React tests | react | 15 |
| 18 | Build react | react | 15-17 |
| 19 | Full typecheck + test + lint | all | 1-18 |

---

## New Files (16)

| File | Purpose |
|------|---------|
| `packages/core/src/dom/store/features/controls.ts` | Controls feature slice |
| `packages/core/src/dom/store/features/tests/controls.test.ts` | Feature tests |
| `packages/core/src/core/ui/controls/controls-core.ts` | Core state projection |
| `packages/core/src/core/ui/controls/controls-data-attrs.ts` | Data attribute map |
| `packages/core/src/core/ui/controls/tests/controls-core.test.ts` | Core tests |
| `packages/html/src/ui/controls/controls-element.ts` | `<media-controls>` |
| `packages/html/src/ui/controls/controls-group-element.ts` | `<media-controls-group>` |
| `packages/html/src/ui/controls/tests/controls-element.test.ts` | HTML element tests |
| `packages/html/src/define/ui/controls.ts` | Custom element registration |
| `packages/react/src/ui/controls/controls-root.tsx` | `Controls.Root` |
| `packages/react/src/ui/controls/controls-group.tsx` | `Controls.Group` |
| `packages/react/src/ui/controls/index.ts` | Compound namespace barrel |
| `packages/react/src/ui/controls/index.parts.ts` | Named part exports |
| `packages/react/src/ui/controls/tests/controls-root.test.tsx` | React tests |

## Modified Files (8-9)

| File | Change |
|------|--------|
| `packages/core/src/core/media/state.ts` | Add `MediaControlsState` |
| `packages/core/src/core/index.ts` | Re-export controls core |
| `packages/core/src/dom/store/selectors.ts` | Add `selectControls` |
| `packages/core/src/dom/store/features/index.ts` | Re-export `controlsFeature` |
| `packages/core/src/dom/store/features/feature.parts.ts` | Add to presets |
| `packages/core/src/dom/media/types.ts` | Update feature tuple types |
| `packages/html/package.json` | sideEffects + subpath export |
| `packages/html/src/index.ts` | Export controls elements |
| `packages/react/src/index.ts` | Export `Controls` namespace |
