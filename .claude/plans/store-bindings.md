# Store React/DOM Bindings

> **For AI agents:** When marking a phase as complete, remove detailed API specs and replace with a PR reference (e.g., "Refer to PR #XXX for implementation details"). The PR is the source of truth for completed work.

## Goal

Implement React and DOM bindings for Video.js 10's store, enabling:

- Simple `createStore()` API that returns Provider + hooks/controllers
- Skins define their own store configs and export Provider + Skin + hooks
- Consumers can extend skin configs with additional slices
- Base hooks/controllers for testing and advanced use cases

## Key Decisions

| Decision            | Resolution                                                                          |
| ------------------- | ----------------------------------------------------------------------------------- |
| Store creation      | `createStore({ slices, displayName? })` - types inferred from slices                |
| Hook naming         | `useStore`, `useSelector`, `useRequest`, `useTasks`, `useMutation`, `useOptimistic` |
| Controller naming   | `SelectorController`, `RequestController`, `TasksController`, etc                   |
| Selector hook       | `useSelector(selector)` - requires selector (Redux-style)                           |
| Store hook          | `useStore()` - returns store instance                                               |
| Request hook        | `useRequest()` or `useRequest(r => r.foo)` - full map or single request             |
| Tasks hook          | `useTasks()` - returns `store.queue.tasks` (reactive, full lifecycle)               |
| Mutation hook       | `useMutation(r => r.foo)` - status tracking (isPending, isError, error)             |
| Optimistic hook     | `useOptimistic(r => r.foo, s => s.bar)` - optimistic value + status                 |
| Settled state       | Core Queue tracks last result/error per key, cleared on next request                |
| Base hooks          | All take store as first arg: `useSelector(store, sel)`, etc                         |
| createStore hooks   | Returns all hooks including `useMutation` and `useOptimistic`                       |
| Slice hook return   | `{ state, request, isAvailable }` - state/request null when unavailable             |
| Skin exports        | `Provider`, `Skin`, `extendConfig`                                                  |
| Slice namespace     | `export * as media` → `media.playback`                                              |
| Video component     | Generic, exported from `@videojs/react` (not from skins)                            |
| Lit mixins          | `StoreMixin` (combined), `StoreProviderMixin`, `StoreAttachMixin`                   |
| Primitives context  | `useStoreContext()` internal hook for primitive UI components                       |
| displayName         | For React DevTools component naming                                                 |
| Component types     | Namespace pattern: `Skin.Props` via `namespace Skin { export type Props }`          |
| Element define      | `FrostedSkinElement.define(tagName, { mixins })` for declarative setup              |
| Config extension    | `extendConfig()` uses `uniqBy` + `composeCallbacks` from utils                      |
| Provider resolution | Isolated by default; `inherit` prop to use parent store from context                |
| Store instance      | `create()` method for imperative store creation                                     |
| Package structure   | `store/react` and `store/lit` (no `store/dom`)                                      |

---

## Phase 0: Core Utilities [DONE]

> Refer to [PR #283](https://github.com/videojs/v10/pull/283) for implementation details.

Added `uniqBy`, `composeCallbacks` utilities and `extendConfig` for store.

---

## Phase 0.5: Queue Task Refactor [DONE]

> Refer to [PR #287](https://github.com/videojs/v10/pull/287) for implementation details.

Refactored Queue to use unified `tasks` map with status discriminator (`PendingTask | SuccessTask | ErrorTask`). Added `tryCatch` utility to `@videojs/utils/function`.

---

## Phase 1: React Bindings (`@videojs/store/react`) [DONE]

> Refer to [PR #288](https://github.com/videojs/v10/pull/288) for implementation details.

Basic React bindings for the store:

- Shared context (`useStoreContext`, `useParentStore`, `StoreContextProvider`)
- `createStore()` factory returning Provider + typed hooks
- Base hooks: `useSelector`, `useRequest`, `useTasks`
- Provider with `store` prop (pre-created) and `inherit` prop (parent context)
- `create()` method for imperative store creation

Types live next to implementations (no separate `types.ts`).

---

## Phase 2: Lit Bindings (`@videojs/store/lit`) [DONE]

> Refer to [PR #289](https://github.com/videojs/v10/pull/289) for implementation details.

Basic Lit bindings for the store:

- Controllers: `SelectorController`, `RequestController`, `TasksController` for reactive state
- Mixins: `StoreProviderMixin`, `StoreAttachMixin`, `StoreMixin` (combined) for custom elements
- `createStore()` factory returning typed mixins, context, and `create()` function
- Auto-attach media elements via slot change observation
- Proper cleanup on disconnect (slot listeners, subscriptions)
- Sync controller values on reconnect to avoid stale state

**Note:** `MutationController` and `OptimisticController` are NOT in this phase - they are Phase 4 and 5.

---

## Phase 3: DOM Media Slices (`@videojs/core/dom`) [DONE]

> Refer to [PR #292](https://github.com/videojs/v10/pull/292) for implementation details.

Modular media slices for `HTMLMediaElement`: `playbackSlice`, `timeSlice`, `bufferSlice`, `volumeSlice`, `sourceSlice`. Includes `media` namespace export, type guards, and `serializeTimeRanges` utility.

---

## Phase 4: React Package Setup (`@videojs/react`)

### 4.1 Video component

**File:** `packages/react/src/media/video.tsx`

```typescript
import type { VideoHTMLAttributes, RefCallback } from 'react';
import { useCallback } from 'react';
import { useStore } from '../store';
import { useComposedRefs } from '../utils/use-composed-refs';

export interface VideoProps extends VideoHTMLAttributes<HTMLVideoElement> {
  ref?: RefCallback<HTMLVideoElement> | React.RefObject<HTMLVideoElement>;
}

/**
 * Video element that automatically attaches to the store.
 * Uses React 19 ref cleanup pattern.
 */
export function Video({ children, ref, ...props }: VideoProps): JSX.Element {
  const store = useStore();

  const attachRef: RefCallback<HTMLVideoElement> = useCallback((el) => {
    if (el) {
      const detach = store.attach(el);
      // React 19: return cleanup function
      return detach;
    }
  }, [store]);

  const composedRef = useComposedRefs(ref, attachRef);

  return (
    <video ref={composedRef} {...props}>
      {children}
    </video>
  );
}
```

### 4.2 Package exports

**File:** `packages/react/src/index.ts`

```typescript
// Media elements
export { Video } from './media/video';
export type { VideoProps } from './media/video';

// Re-export slices for convenience (users import from @videojs/react, not @videojs/core/dom)
export { media } from '@videojs/core/dom';
// Re-export for extension
export { createStore } from '@videojs/store/react';
```

---

## Phase 5: Frosted Skin (React)

### 5.1 Store config

**File:** `packages/react/src/skins/frosted/store.ts`

```typescript
import type { AnySlice, StoreConfig } from '@videojs/store';

import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/react';

import { media } from './slices'; // internal - re-exported from @videojs/react

/** Base config for frosted skin. */
const baseConfig = {
  slices: [media.playback] as const,
  displayName: 'FrostedSkin',
};

/**
 * Extends frosted skin config with additional slices/hooks.
 * Composes lifecycle hooks (both called, base first).
 */
export function extendConfig<S extends readonly AnySlice[] = readonly []>(extension?: Partial<StoreConfig<any, S>>) {
  return extendBaseConfig(baseConfig, extension);
}

export const { Provider, create } = createStore(extendConfig());
```

### 5.2 Skin component

**File:** `packages/react/src/skins/frosted/skin.tsx`

```typescript
import type { PropsWithChildren } from 'react';

export type SkinProps = PropsWithChildren<{
  className?: string;
}>;

export function Skin({ children, className }: SkinProps): JSX.Element {
  return (
    <div className={`vjs-frosted-skin ${className ?? ''}`}>
      {children}
      {/* Controls rendered here */}
    </div>
  );
}

/**
 * Namespace pattern for component types.
 * Allows: `Skin.Props` instead of importing `SkinProps` separately.
 */
export namespace Skin {
  export type Props = SkinProps;
}
```

### 5.3 Exports

**File:** `packages/react/src/skins/frosted/index.ts`

```typescript
export { Skin } from './skin';
export type { SkinProps } from './skin';
export { extendConfig, Provider } from './store';
```

---

## Phase 6: Frosted Skin (HTML)

### 6.1 Store config

**File:** `packages/html/src/skins/frosted/store.ts`

```typescript
import type { AnySlice, StoreConfig } from '@videojs/store';

import { extendConfig as extendBaseConfig } from '@videojs/store';
import { createStore } from '@videojs/store/lit';

import { media } from './slices'; // internal - re-exported from @videojs/html

/** Base config for frosted skin. */
const baseConfig = {
  slices: [media.playback] as const,
};

/**
 * Extends frosted skin config with additional slices/hooks.
 * Composes lifecycle hooks (both called, base first).
 */
export function extendConfig<S extends readonly AnySlice[] = readonly []>(extension?: Partial<StoreConfig<any, S>>) {
  return extendBaseConfig(baseConfig, extension);
}

export const { StoreMixin, StoreProviderMixin, StoreAttachMixin, context } = createStore(extendConfig());
```

### 6.2 Skin component

**File:** `packages/html/src/skins/frosted/skin.ts`

```typescript
import { StoreAttachMixin, StoreMixin, StoreProviderMixin } from './store';

type Mixin = <T extends Constructor<HTMLElement>>(Base: T) => T;

export interface DefineOptions {
  /** Mixins to apply. Defaults to [StoreMixin] (combined provider + attach). */
  mixins?: Mixin[];
}

/**
 * Frosted skin element. Empty for now - controls will be added later.
 * Uses shadow DOM with slot for video element.
 */
export class FrostedSkinElement extends HTMLElement {
  /** Default tag name for this element. */
  static tagName = 'vjs-frosted-skin';

  /**
   * Define this element with the custom elements registry.
   *
   * @example
   * // Default: combined provider + attach
   * FrostedSkinElement.define('vjs-frosted-skin');
   *
   * @example
   * // Granular mixin control (e.g., attach only, inherit provider from parent)
   * FrostedSkinElement.define('vjs-thumbnail', { mixins: [StoreAttachMixin] });
   *
   * @example
   * // Custom store with extended slices
   * const { StoreMixin } = createStore(extendConfig({ slices: [chaptersSlice] }));
   * FrostedSkinElement.define('my-extended-player', { mixins: [StoreMixin] });
   */
  static define(tagName: string, options: DefineOptions = {}) {
    const { mixins = [StoreMixin] } = options;

    // Apply mixins in order (right to left composition)
    const Mixed = mixins.reduceRight((Base, mixin) => mixin(Base), this as typeof FrostedSkinElement);
    customElements.define(tagName, Mixed);
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<slot></slot>`;
  }
}
```

### 6.3 Define export

**File:** `packages/html/src/define/vjs-frosted-skin.ts`

```typescript
import { FrostedSkinElement } from '../skins/frosted/skin';

FrostedSkinElement.define('vjs-frosted-skin');
```

### 6.4 Exports

**File:** `packages/html/src/skins/frosted/index.ts`

```typescript
export { FrostedSkinElement } from './skin';
export type { DefineOptions } from './skin';
export { context, extendConfig, StoreAttachMixin, StoreMixin, StoreProviderMixin } from './store';
```

---

## Usage Examples

### React: Custom UI

```tsx
import { createStore, media, Video } from '@videojs/react';

// Note: media is re-exported from @videojs/react (not @videojs/core/dom)

const { Provider, useSelector, useRequest, useMutation, useOptimistic } = createStore({
  slices: [media.playback],
});

function App() {
  return (
    <Provider>
      <Video src="video.mp4" />
      <MyCustomControls />
    </Provider>
  );
}

function MyCustomControls() {
  const currentTime = useSelector((s) => s.currentTime);
  const seek = useRequest((r) => r.seek);
  return <button onClick={() => seek(0)}>Restart ({currentTime}s)</button>;
}

// With mutation status tracking
function PlayButton() {
  const paused = useSelector((s) => s.paused);
  const { mutate: play, isPending } = useMutation((r) => r.play);
  const { mutate: pause } = useMutation((r) => r.pause);

  return (
    <button onClick={() => (paused ? play() : pause())} disabled={isPending}>
      {paused ? 'Play' : 'Pause'}
    </button>
  );
}

// With optimistic updates
function VolumeSlider() {
  const { value, setValue, isPending, isError } = useOptimistic(
    (r) => r.changeVolume,
    (s) => s.volume
  );

  return (
    <>
      <input
        type="range"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ opacity: isPending ? 0.5 : 1 }}
      />
      {isError && <span>Failed to change volume</span>}
    </>
  );
}
```

### React: Pre-created store instance (imperative access)

```tsx
import { useState } from 'react';

import { createStore, media, Video } from '@videojs/react';

const { Provider, create, useSelector } = createStore({
  slices: [media.playback],
});

function App() {
  // Create store instance in useState for stable reference
  const [store] = useState(() => create());

  return (
    <Provider store={store}>
      <Video src="video.mp4" />
      <MyControls />
    </Provider>
  );
}
```

### React: Frosted skin

```tsx
import { Video } from '@videojs/react';
import { Provider, Skin } from '@videojs/react/skins/frosted';

function App() {
  return (
    <Provider>
      <Skin>
        <Video src="video.mp4" />
      </Skin>
    </Provider>
  );
}
```

### React: Extending frosted with custom slices

```tsx
import { createStore, Video } from '@videojs/react';
import { extendConfig, Skin } from '@videojs/react/skins/frosted';

import { chaptersSlice } from './slices/chapters';

// Extend frosted config with custom slice (merges with base slices)
const { Provider, useSlice } = createStore(
  extendConfig({ slices: [chaptersSlice] })
);

function App() {
  return (
    <Provider>
      <Skin>
        <Video src="video.mp4" />
      </Skin>
      <ChaptersPanel />
    </Provider>
  );
}

function ChaptersPanel() {
  const chapters = useSlice(chaptersSlice);
  if (!chapters.isAvailable) return null;
  return <div>{chapters.state.markers.map(...)}</div>;
}
```

### HTML: Frosted skin (CDN)

```html
<script type="module">
  import 'https://cdn.jsdelivr.net/npm/@videojs/html/define/vjs-frosted-skin.js';
</script>

<vjs-frosted-skin>
  <video src="video.mp4"></video>
</vjs-frosted-skin>
```

### HTML: Custom provider element

```html
<script type="module" src="./my-player.js"></script>

<my-player>
  <video src="video.mp4"></video>
  <!-- custom controls here -->
</my-player>
```

Where `my-player.js` contains:

```typescript
import { createStore, media } from '@videojs/html';

const { StoreMixin } = createStore({
  slices: [media.playback],
});

// Create custom element with store provider and auto-attach
class MyPlayer extends StoreMixin(HTMLElement) {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<slot></slot>`;
  }
}

customElements.define('my-player', MyPlayer);
```

### HTML: Extending frosted with custom slices

```html
<script type="module" src="./my-extended-skin.js"></script>

<my-extended-skin>
  <video src="video.mp4"></video>
</my-extended-skin>
```

Where `my-extended-skin.js` contains:

```typescript
import { extendConfig, FrostedSkinElement } from '@videojs/html/skins/frosted';
import { createStore } from '@videojs/store/lit';

import { chaptersSlice } from './slices/chapters.js';

// Extend frosted config with custom slice (merges with base slices)
const { StoreMixin } = createStore(extendConfig({ slices: [chaptersSlice] }));

FrostedSkinElement.define('my-extended-skin', { mixins: [StoreMixin] });
```

---

## File Structure

```
packages/utils/src/
├── array/
│   ├── uniq-by.ts              # DONE
│   ├── tests/
│   │   └── uniq-by.test.ts     # DONE
│   └── index.ts                # DONE
└── function/
    ├── compose-callbacks.ts    # DONE
    ├── tests/
    │   └── compose-callbacks.test.ts  # DONE
    └── index.ts                # DONE

packages/store/src/
├── core/
│   ├── store.ts                # existing
│   ├── slice.ts                # existing
│   ├── queue.ts                # existing
│   ├── extend-config.ts        # DONE
│   ├── tests/
│   │   └── extend-config.test.ts # DONE
│   └── index.ts                # DONE
├── react/
│   ├── context.ts              # NEW (internal shared context)
│   ├── create-store.ts         # NEW
│   ├── hooks.ts                # NEW (base hooks)
│   ├── types.ts                # NEW
│   └── index.ts
└── lit/
    ├── create-store.ts         # NEW (StoreMixin, StoreProviderMixin, StoreAttachMixin, context)
    ├── controllers.ts          # NEW (SelectorController, RequestController, etc.)
    ├── types.ts                # NEW
    └── index.ts

packages/core/src/dom/
├── store/
│   └── slices/
│       ├── playback.ts         # DONE
│       ├── time.ts             # DONE
│       ├── buffer.ts           # DONE
│       ├── volume.ts           # DONE
│       ├── source.ts           # DONE
│       ├── index.parts.ts      # DONE (media namespace parts)
│       ├── index.ts            # DONE (media namespace + exports)
│       └── tests/              # DONE
├── predicate.ts                # DONE (type guards)
└── index.ts                    # DONE

packages/react/src/
├── media/
│   └── video.tsx               # NEW
├── skins/
│   ├── frosted/
│   │   ├── store.ts            # NEW
│   │   ├── skin.tsx            # NEW
│   │   └── index.ts            # NEW
│   └── minimal/
│       └── ...
└── index.ts

packages/html/src/
├── define/
│   └── vjs-frosted-skin.ts     # NEW
├── skins/
│   ├── frosted/
│   │   ├── store.ts            # NEW
│   │   ├── skin.ts             # NEW
│   │   ├── styles.css          # NEW
│   │   └── index.ts            # NEW
│   └── minimal/
│       └── ...
└── index.ts
```

---

## Implementation Order

1. **Phase 0**: Core utilities **[DONE - PR #283]**
   - `uniqBy`, `composeCallbacks` utilities ✓
   - `extendConfig` ✓

2. **Phase 0.5**: Queue Task Refactor **[DONE - PR #287]**
   - Unified `tasks` map with status discriminator ✓
   - `PendingTask`, `SuccessTask`, `ErrorTask` types ✓
   - `reset(key)` method ✓
   - Update existing tests ✓
   - Added `tryCatch` utility to `@videojs/utils/function` ✓

3. **Phase 1**: React Bindings (basic) **[DONE - PR #288]**
   - Shared context, `useStoreContext` ✓
   - `createStore()` with `inherit` prop ✓
   - `useStore`, `useSelector`, `useRequest`, `useTasks` ✓
   - Base hooks for testing/advanced use ✓

4. **Phase 2**: Lit Bindings (basic) **[DONE - PR #289]**
   - `createStore()` with mixins ✓
   - `SelectorController`, `RequestController`, `TasksController` ✓
   - `@lit/context` integration ✓

5. **Phase 3**: DOM Media Slices **[DONE - PR #292]**
   - Modular slices: `playbackSlice`, `timeSlice`, `bufferSlice`, `volumeSlice`, `sourceSlice` ✓
   - `media` namespace export ✓
   - Type guards and utilities ✓

6. **Phase 4**: Mutation Hooks/Controllers
   - React: `useMutation(store, selector)`
   - Lit: `MutationController(host, store, selector)`

7. **Phase 5**: Optimistic Hooks/Controllers
   - React: `useOptimistic(store, reqSel, stateSel)`
   - Lit: `OptimisticController(host, store, reqSel, stateSel)`

8. **Phase 6**: Skins
   - React skin (Provider, Skin, extendConfig)
   - HTML skin (FrostedSkinElement, extendConfig)

Each phase includes tests.

---

## Package Configuration

### tsdown.config.ts Updates

Each package with new subpaths needs tsdown entry points:

**`packages/html/tsdown.config.ts`:**

```typescript
import { readdirSync } from 'node:fs';

// Dynamically gather define/ entries
const defineEntries = readdirSync('src/define')
  .filter((f) => f.endsWith('.ts'))
  .reduce(
    (acc, f) => {
      const name = f.replace('.ts', '');
      acc[`define/${name}`] = `src/define/${f}`;
      return acc;
    },
    {} as Record<string, string>
  );

export default {
  entry: {
    index: 'src/index.ts',
    'skins/frosted': 'src/skins/frosted/index.ts',
    ...defineEntries,
  },
};
```

**`packages/react/tsdown.config.ts`:**

```typescript
export default {
  entry: {
    index: 'src/index.ts',
    'skins/frosted': 'src/skins/frosted/index.ts',
  },
};
```

**`packages/store/tsdown.config.ts`:**

```typescript
export default {
  entry: {
    index: 'src/index.ts',
    react: 'src/react/index.ts',
    lit: 'src/lit/index.ts',
  },
};
```

### package.json Exports Updates

Use `types` + `default` format to match existing packages.

**`packages/html/package.json`:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./define/*": {
      "default": "./dist/define/*.js"
    },
    "./skins/frosted": {
      "types": "./dist/skins/frosted.d.ts",
      "default": "./dist/skins/frosted.js"
    }
  }
}
```

**`packages/react/package.json`:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./skins/frosted": {
      "types": "./dist/skins/frosted.d.ts",
      "default": "./dist/skins/frosted.js"
    }
  }
}
```

**`packages/store/package.json`:**

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./react": {
      "types": "./dist/react.d.ts",
      "default": "./dist/react.js"
    },
    "./lit": {
      "types": "./dist/lit.d.ts",
      "default": "./dist/lit.js"
    }
  }
}
```

---

## PR Coordination

### Related Issues

| Issue | Title               | Description                             | Status |
| ----- | ------------------- | --------------------------------------- | ------ |
| #218  | Store               | Parent tracking issue                   | Open   |
| #285  | Queue Task Refactor | Unified tasks map, status discriminator | Closed |
| #228  | Optimistic Updates  | useMutation, useOptimistic              | Open   |
| #229  | React Bindings      | createStore, hooks, context             | Closed |
| #230  | Lit Bindings        | Controllers, mixins, context            | Open   |
| #239  | DOM Media Slices    | media slices                            | Closed |
| #231  | Skin Stores         | Skin store configuration                | Open   |

### PR Strategy

```
PR #283: Core Utilities [DONE]
├── uniqBy, composeCallbacks (utils) ✓
├── extendConfig (store/core) ✓
└── Tests ✓

PR #287: Queue Task Refactor [DONE]
├── Unified Task type with status discriminator ✓
├── PendingTask, SuccessTask, ErrorTask ✓
├── Single `tasks` map, `reset(key)` method ✓
├── Update tests ✓
├── Added tryCatch utility ✓
└── Closes #285

PR #288: React Bindings (basic) [DONE]
├── createStore, Provider, useStore ✓
├── useSelector, useRequest, useTasks ✓
├── Base hooks for testing ✓
├── References #218
└── Closes #229

PR #289: Lit Bindings (basic) [DONE]
├── createStore with mixins ✓
├── SelectorController, RequestController, TasksController ✓
├── References #218
└── Closes #230

PR #292: DOM Media Slices [DONE]
├── Modular slices: playback, time, buffer, volume, source ✓
├── media namespace export ✓
├── Type guards and utilities ✓
├── References #218
└── Closes #239
├── References #218
└── Closes #230

PR D: Mutation Hooks/Controllers
├── React: useMutation
├── Lit: MutationController
└── References #228

PR E: Optimistic Hooks/Controllers
├── React: useOptimistic
├── Lit: OptimisticController
└── Closes #228

PR F: Skins
├── React skin (Provider, Skin, extendConfig)
├── HTML skin (FrostedSkinElement, extendConfig)
├── References #218
└── Closes #231
```

### Dependency Graph

```
PR #283 ───> PR #287 ───> PR #288 ───> PR D ───> PR E ───> PR F
                     └──> PR #289 (done) ──────────────────┘
                     └──> PR #292 (done) ──────────────────┘
```

PRs are sequential. PR #288, #289, #292 can technically parallel after PR #287, but we'll do them sequentially for easier review.

---

## Deferred

- Testing utilities (`@videojs/store/testing`) - separate plan
- Minimal skin implementation
