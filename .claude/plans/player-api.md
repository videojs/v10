# Player API Implementation Plan

**Status:** IN PROGRESS
**RFC:** `rfc/player-api/`

## Overview

Implement the unified Player API with:

- Two-store architecture (Media + Player stores)
- Proxy-based tracking for efficient subscriptions
- `createPlayer` / `createMedia` factories
- Primitives API (`hasFeature`, `getFeature`, etc.)

### Key Deliverables

1. **Proxy system** — Flattened state/requests with per-render tracking
2. **Feature primitives** — `hasFeature`, `getFeature`, `throwMissingFeature`
3. **Feature types** — `createMediaFeature`, `createPlayerFeature`
4. **Platform factories** — `createPlayer`/`createMedia` for React and HTML/Lit
5. **Player infrastructure** — `PlayerTarget`, `Container` component
6. **Presets** — Curated feature collections

---

## Phase Structure

```
Phase 0: Store Features Map ──────────────────────────┐
                                                      │
Phase 1: Proxy System + Tracking ─────────────────────┤
                                                      │
Phase 2: Feature Type System ─────────────────────────┤
                                                      │
         ┌────────────────┬───────────────┐           │
Phase 3A: React           Phase 3B: Lit   ────────────┤
                                                      │
Phase 4: PlayerTarget + Container ────────────────────┤
                                                      │
Phase 5: Presets + Exports ───────────────────────────┘
```

---

## Phase 0: Store Features as Map

**Goal:** Update Store to use `Map<symbol, Feature>` for O(1) feature lookup.

**File:** `packages/store/src/core/store.ts`

### Changes

```ts
export class Store<Target, Features extends AnyFeature<Target>[]> {
  readonly #featureMap: Map<symbol, AnyFeature<Target>>;
  readonly #features: Features;

  constructor(config: StoreConfig<Target, Features>) {
    this.#features = config.features;
    this.#featureMap = new Map(config.features.map((f) => [f.id, f]));
    // ...
  }

  /** Check if store has a feature by id */
  hasFeature(feature: AnyFeature): boolean {
    return this.#featureMap.has(feature.id);
  }

  /** Get feature by id */
  getFeature<F extends AnyFeature>(feature: F): F | undefined {
    return this.#featureMap.get(feature.id) as F | undefined;
  }
}
```

### Tests

- `store.hasFeature(playbackFeature)` returns true when included
- `store.hasFeature(volumeFeature)` returns false when not included

---

## Phase 1: Proxy System

**Goal:** Framework-agnostic proxy with per-render property tracking.

**Files:**

- `packages/store/src/core/proxy.ts`
- `packages/store/src/core/tests/proxy.test.ts`

### API

```ts
export const STORE_SYMBOL = Symbol.for('@videojs/store');

export interface StoreProxy<S extends AnyStore = AnyStore> {
  readonly [STORE_SYMBOL]: S;
  [key: string]: unknown;
}

/** Create a tracking proxy that merges state and requests */
export function createProxy<S extends AnyStore>(store: S, options?: ProxyOptions): StoreProxy<S>;

export interface ProxyOptions {
  onAccess?: (key: string) => void;
}

/** Get the underlying store from a proxy */
export function getStore<S extends AnyStore>(proxy: StoreProxy<S>): S;

/** Type guard - checks if feature is in store */
export function hasFeature<F extends AnyFeature>(
  proxy: StoreProxy,
  feature: F
): proxy is StoreProxy & FlattenedFeature<F>;

/** Get feature state/requests, properties as T | undefined */
export function getFeature<F extends AnyFeature>(proxy: StoreProxy, feature: F): Partial<FlattenedFeature<F>>;

/** Throw error when required feature is missing */
export function throwMissingFeature(feature: AnyFeature, options: { displayName: string }): never;
```

### Implementation Notes

- Proxy merges `store.state.current` and `store.request`
- Property access tracked via `onAccess` callback
- `hasFeature` calls `store.hasFeature(feature)` internally

---

## Phase 2: Feature Type System

**Goal:** Add `type: 'media' | 'player'` discriminator.

**File:** `packages/store/src/core/feature.ts`

### Changes

```ts
export type FeatureType = 'media' | 'player';

export interface Feature<Target, State, Requests> {
  readonly id: symbol;
  readonly type: FeatureType;
  readonly initialState: State;
  readonly getSnapshot: FeatureGetSnapshot<Target, State>;
  readonly subscribe: FeatureSubscribe<Target, State>;
  readonly request: ResolvedRequestConfigMap<Target, Requests>;
}

// New factories
export function createMediaFeature<Target>(): MediaFeatureFactory<Target>;
export function createPlayerFeature<Target>(): PlayerFeatureFactory<Target>;
```

### Migration

Update `packages/core/src/dom/store/features/*.ts`:

- Change `createFeature<HTMLMediaElement>()` to `createMediaFeature<HTMLMediaElement>()`
- All existing features become `type: 'media'`

---

## Phase 3A: React Platform Factory

**Goal:** Implement `createPlayer` and `createMedia` for React.

**Files:**

```
packages/react/src/player/
├── create-player.tsx
├── create-media.tsx
├── context.tsx
├── hooks/
│   ├── use-player.ts
│   ├── use-media.ts
│   ├── use-tracked-proxy.ts
│   └── use-merged-proxy.ts
└── index.ts
```

### API

```tsx
function createPlayer<F extends AnyFeature[]>(
  config: F | { features: F }
): {
  Provider: FC<ProviderProps>;
  Container: FC<ContainerProps>;
  usePlayer: () => UnknownPlayer;
  useMedia: () => UnknownMedia;
};

function createMedia<F extends MediaFeature[]>(
  features: F
): {
  Provider: FC<ProviderProps>;
  useMedia: () => UnknownMedia;
};
```

### Tracking Hook Pattern

```ts
function useTrackedProxy<S extends AnyStore>(store: S): StoreProxy<S> {
  const trackedRef = useRef(new Set<string>());
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const proxy = useMemo(
    () =>
      createProxy(store, {
        onAccess: (key) => trackedRef.current.add(key),
      }),
    [store]
  );

  useEffect(() => {
    const keys = Array.from(trackedRef.current);
    if (keys.length === 0) {
      return store.state.subscribe(forceUpdate);
    }
    return store.state.subscribe(keys as any[], forceUpdate);
  }, [store]);

  // Reset tracking each render
  trackedRef.current = new Set();

  return proxy;
}
```

### Container Component

```tsx
function Container({ children }: ContainerProps) {
  const { playerStore, mediaStore } = usePlayerContext();

  const attachRef = useCallback(
    (el: HTMLElement | null) => {
      if (!el) return;
      return playerStore.attach({ container: el, media: mediaStore });
    },
    [playerStore, mediaStore]
  );

  return <div ref={attachRef}>{children}</div>;
}
```

---

## Phase 3B: HTML/Lit Platform Factory

**Goal:** Implement `createPlayer` and `createMedia` for HTML/Lit.

**Files:**

```
packages/html/src/player/
├── create-player.ts
├── create-media.ts
├── controllers/
│   ├── player-controller.ts
│   └── media-controller.ts
├── mixins/
│   ├── provider-mixin.ts
│   └── container-mixin.ts
└── index.ts
```

### API

```ts
function createPlayer<F extends AnyFeature[]>(
  config
): {
  ProviderElement: typeof HTMLElement;
  ContainerElement: typeof HTMLElement;
  ProviderMixin: MixinFn;
  ContainerMixin: MixinFn;
  MediaProviderMixin: MixinFn;
  PlayerController: typeof Controller;
  MediaController: typeof Controller;
};
```

### PlayerController Pattern

```ts
class PlayerController implements ReactiveController {
  #host: ReactiveControllerHost & HTMLElement;
  #tracked = new Set<string>();
  #unsubscribe = noop;

  get value(): UnknownPlayer {
    return this.#createMergedProxy();
  }

  hostConnected() {
    // Subscribe to tracked keys on both stores
  }

  hostDisconnected() {
    this.#unsubscribe();
  }
}
```

---

## Phase 4: Player Target Types

**Goal:** Define target types for player features.

**File:** `packages/core/src/dom/store/target.ts`

```ts
export interface MediaTarget {
  element: HTMLMediaElement;
}

export interface PlayerTarget {
  container: HTMLElement;
  media: Store<MediaTarget, any[]>;
}

export type UnknownMediaStore = Store<MediaTarget, []>;
export type UnknownPlayerStore = Store<PlayerTarget, []>;

export interface UnknownMedia extends StoreProxy<UnknownMediaStore> {}
export interface UnknownPlayer extends StoreProxy<UnknownPlayerStore> {}
```

---

## Phase 5: Presets

**Goal:** Create curated feature collections.

**Files:**

```
packages/core/src/dom/presets/
├── index.ts
├── website.ts
└── background.ts
```

### website.ts

```ts
import { bufferFeature, playbackFeature, sourceFeature, timeFeature, volumeFeature } from '../store/features';

export const website = [playbackFeature, volumeFeature, timeFeature, bufferFeature, sourceFeature] as const;
```

### background.ts

```ts
import { playbackFeature, sourceFeature } from '../store/features';

export const background = [playbackFeature, sourceFeature] as const;
```

---

## Package Exports

### @videojs/store

```ts
// Proxy
export { createProxy, getStore, hasFeature, getFeature, throwMissingFeature, STORE_SYMBOL } from './core/proxy';
export type { StoreProxy } from './core/proxy';

// Feature factories
export { createMediaFeature, createPlayerFeature } from './core/feature';
```

### @videojs/core/dom

```ts
export { presets } from './presets';
export type { MediaTarget, PlayerTarget, UnknownMedia, UnknownPlayer } from './store/target';
```

### @videojs/react

```ts
export { createPlayer, createMedia } from './player';
export { presets, media } from '@videojs/core/dom';
export { hasFeature, getFeature, throwMissingFeature } from '@videojs/store';
```

### @videojs/html

```ts
export { createPlayer, createMedia } from './player';
export { presets, media } from '@videojs/core/dom';
export { hasFeature, getFeature, throwMissingFeature } from '@videojs/store';
```

---

## Implementation Order

| Phase | Description           | Depends On | Est. Effort |
| ----- | --------------------- | ---------- | ----------- |
| 0     | Store features as Map | -          | Small       |
| 1     | Proxy system          | Phase 0    | Medium      |
| 2     | Feature type system   | Phase 0    | Small       |
| 3A    | React createPlayer    | Phase 1, 2 | Medium      |
| 3B    | HTML/Lit createPlayer | Phase 1, 2 | Medium      |
| 4     | PlayerTarget types    | Phase 2    | Small       |
| 5     | Presets               | Phase 2    | Small       |

**Parallel:** Phase 3A and 3B can run in parallel.

---

## Open Items

1. **Player features** — fullscreen, idle, keyboard, gestures not in scope. Infrastructure ready.
2. **Tracking optimization** — Current: track all accessed keys. Future: finalize after first render.
3. **DevTools** — Future addition for debugging.

---

## Key Decisions

| Decision               | Choice                 | Rationale                                |
| ---------------------- | ---------------------- | ---------------------------------------- |
| Feature storage        | `Map<symbol, Feature>` | O(1) lookup for hasFeature               |
| Proxy location         | `@videojs/store`       | Framework-agnostic                       |
| createPlayer location  | Per-platform           | html/react have different needs          |
| Tracking               | Per-render             | Reset each render, subscribe to accessed |
| Container (React)      | Wrapper div            | Simple, predictable behavior             |
| Media access in player | Store reference        | Direct store for now, proxy later        |
