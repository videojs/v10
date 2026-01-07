# Computed Layer Design

## Problem Statement

Derived slices are too heavy for simple computed values, but inline selectors don't solve:

1. **No memoization** - same derivation recomputes per-subscriber
2. **No derived-from-derived** - can't build on other computed values
3. **Guards can't access** - computed values not available in request guards
4. **Framework coupling** - each framework re-implements memoization

## Requirements

| Requirement           | Description                                              |
| --------------------- | -------------------------------------------------------- |
| Lives alongside store | Not part of slice model, optional layer                  |
| Memoization           | Same derivation computed once, shared across subscribers |
| Works in guards       | Guards can access computed values synchronously          |
| Derived-from-derived  | Computed values can depend on other computed             |
| Tree-shakeable        | Users who don't use it don't pay for it                  |
| Framework-agnostic    | Works with React, Lit, and vanilla JS                    |

---

## Option Analysis

### Option A: Factory Function (Record-based)

```ts
const computed = createComputed(store, {
  progress: (s) => (s.duration > 0 ? s.currentTime / s.duration : 0),
  isBuffering: (s) => s.waiting && !s.paused,
});
// Usage: computed.progress, computed.subscribe('progress', cb)
```

| Aspect               | Analysis                                            |
| -------------------- | --------------------------------------------------- |
| Type inference       | Simple - infer return types from selector functions |
| Guards               | Easy - `computed.progress` is synchronous getter    |
| React/Lit            | Straightforward - subscribe to specific keys        |
| Memoization          | Per-key caching, invalidate on dependency change    |
| Bundle size          | Single import, tree-shakes if unused                |
| Derived-from-derived | Awkward - need to reference sibling selectors       |

**Verdict:** Clean API but limited composability. Derived-from-derived requires awkward patterns.

### Option B: Individual Atoms (Jotai-style)

```ts
const progressAtom = computed(store, (s) => s.currentTime / s.duration);
const isBufferingAtom = computed(store, (s) => s.waiting && !s.paused);

// Derived from derived:
const showBufferIndicator = computed(
  [isBufferingAtom, progressAtom],
  (buffering, progress) => buffering && progress > 0.1
);
```

| Aspect               | Analysis                                         |
| -------------------- | ------------------------------------------------ |
| Type inference       | Complex - must handle single store vs atom array |
| Guards               | Requires atom registry or passing atoms to guard |
| React/Lit            | Each atom is independent, compose as needed      |
| Memoization          | Each atom self-memoizes                          |
| Bundle size          | Most tree-shakeable - only used atoms included   |
| Derived-from-derived | Natural composition pattern                      |

**Verdict:** Maximum flexibility, but fragmented. Guard integration awkward without shared registry.

### Option C: Store Extension

```ts
const extended = extendStore(store, {
  computed: {
    progress: (s) => s.currentTime / s.duration,
  },
});
// extended.state includes { currentTime, duration, progress }
```

| Aspect               | Analysis                                      |
| -------------------- | --------------------------------------------- |
| Type inference       | Complex - must merge computed into state type |
| Guards               | Natural - computed in state, guards see it    |
| React/Lit            | Seamless - selectors just work                |
| Memoization          | Must compute during state updates             |
| Bundle size          | Less tree-shakeable - computed tied to store  |
| Derived-from-derived | Requires topological sort of computed fields  |

**Verdict:** Most seamless, but couples computed to store lifecycle. Harder to tree-shake.

---

## Recommendation: Hybrid Approach (Option B + Registry)

Combine atomic composability with a registry pattern for guard access:

### Design Principles

1. **Atoms for composition** - Each computed value is independent
2. **Registry for guards** - Shared registry enables guard access
3. **Lazy evaluation** - Computed values only calculated when accessed
4. **Smart invalidation** - Track dependencies, recompute only when needed

### API Design

#### Core: `createComputed`

```ts
// Single computed value from store state
const progress = createComputed(store, (state) => {
  return state.duration > 0 ? state.currentTime / state.duration : 0;
});

// Access computed value
progress.get(); // 0.5
progress.subscribe(cb); // () => unsubscribe

// Derived from another computed
const isNearEnd = createComputed(progress, (progress) => progress > 0.9);

// Derived from multiple sources
const showBufferUI = createComputed(
  [isBufferingAtom, progressAtom],
  (buffering, progress) => buffering && progress > 0.1
);
```

#### Registry for Guards: `createComputedRegistry`

```ts
const registry = createComputedRegistry(store, {
  progress: (s) => (s.duration > 0 ? s.currentTime / s.duration : 0),
  isBuffering: (s) => s.waiting && !s.paused,
  // Derived from computed
  showBufferIndicator: (_, computed) => computed.isBuffering && computed.progress > 0.1,
});

// Guards receive registry
const playSlice = createSlice<HTMLVideoElement>()({
  // ...
  request: {
    seek: {
      guard: (ctx) => {
        const progress = registry.get('progress');
        return progress < 0.95; // Can't seek in last 5%
      },
      handler: (time, { target }) => (target.currentTime = time),
    },
  },
});
```

#### React Integration

```ts
// Hook for single computed
function useComputed<T>(computed: Computed<T>): T {
  return useSyncExternalStore(
    computed.subscribe,
    computed.get,
    computed.get
  );
}

// Usage
function ProgressBar() {
  const progress = useComputed(progressAtom);
  return <div style={{ width: `${progress * 100}%` }} />;
}

// From registry
function useRegistryValue<K extends keyof Registry>(registry: Registry, key: K): Registry[K] {
  const computed = registry.computed(key);
  return useComputed(computed);
}
```

#### Lit Integration

```ts
class ComputedController<T> implements ReactiveController {
  #computed: Computed<T>;
  #value: T;
  #unsubscribe = noop;

  constructor(host: ReactiveControllerHost, computed: Computed<T>) {
    this.#computed = computed;
    this.#value = computed.get();
    host.addController(this);
  }

  get value(): T {
    return this.#value;
  }

  hostConnected(): void {
    this.#unsubscribe = this.#computed.subscribe((value) => {
      this.#value = value;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe();
  }
}
```

---

## Implementation

### File: `packages/store/src/core/computed.ts`

```ts
import type { AnyStore, InferStoreState } from './store';

// ----------------------------------------
// Types
// ----------------------------------------

export interface Computed<T> {
  /** Get current memoized value */
  get(): T;
  /** Subscribe to value changes */
  subscribe(listener: (value: T) => void): () => void;
  /** Force recomputation on next access */
  invalidate(): void;
}

export type ComputedSelector<State, T> = (state: State) => T;

export type ComputedDeps = Computed<any>[] | readonly Computed<any>[];

export type InferComputedValues<Deps extends ComputedDeps> = {
  [K in keyof Deps]: Deps[K] extends Computed<infer T> ? T : never;
};

// ----------------------------------------
// createComputed (from store)
// ----------------------------------------

export function createComputed<S extends AnyStore, T>(
  store: S,
  selector: ComputedSelector<InferStoreState<S>, T>
): Computed<T>;

export function createComputed<Deps extends ComputedDeps, T>(
  deps: Deps,
  combiner: (...values: InferComputedValues<Deps>) => T
): Computed<T>;

export function createComputed<S extends AnyStore, T>(
  source: S | ComputedDeps,
  selectorOrCombiner: ComputedSelector<InferStoreState<S>, T> | ((...args: any[]) => T)
): Computed<T> {
  if (isStore(source)) {
    return createStoreComputed(source, selectorOrCombiner as ComputedSelector<InferStoreState<S>, T>);
  }
  return createDerivedComputed(source as ComputedDeps, selectorOrCombiner);
}

// ----------------------------------------
// Store-based Computed
// ----------------------------------------

function createStoreComputed<S extends AnyStore, T>(
  store: S,
  selector: ComputedSelector<InferStoreState<S>, T>
): Computed<T> {
  let cachedValue: T;
  let isValid = false;
  const listeners = new Set<(value: T) => void>();

  const compute = () => {
    const newValue = selector(store.state);
    if (!isValid || !Object.is(cachedValue, newValue)) {
      cachedValue = newValue;
      isValid = true;
    }
    return cachedValue;
  };

  // Subscribe to store changes
  let storeUnsub: (() => void) | null = null;

  const ensureSubscribed = () => {
    if (!storeUnsub) {
      storeUnsub = store.subscribe(() => {
        const prev = cachedValue;
        isValid = false;
        const next = compute();
        if (!Object.is(prev, next)) {
          for (const listener of listeners) {
            listener(next);
          }
        }
      });
    }
  };

  return {
    get() {
      ensureSubscribed();
      if (!isValid) compute();
      return cachedValue;
    },
    subscribe(listener) {
      ensureSubscribed();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        // Optionally: unsubscribe from store when no listeners
        // if (listeners.size === 0 && storeUnsub) {
        //   storeUnsub();
        //   storeUnsub = null;
        // }
      };
    },
    invalidate() {
      isValid = false;
    },
  };
}

// ----------------------------------------
// Derived Computed (from other Computed)
// ----------------------------------------

function createDerivedComputed<Deps extends ComputedDeps, T>(
  deps: Deps,
  combiner: (...values: InferComputedValues<Deps>) => T
): Computed<T> {
  let cachedValue: T;
  let isValid = false;
  const listeners = new Set<(value: T) => void>();
  const unsubscribers: (() => void)[] = [];

  const compute = () => {
    const values = deps.map((d) => d.get()) as InferComputedValues<Deps>;
    const newValue = combiner(...values);
    if (!isValid || !Object.is(cachedValue, newValue)) {
      cachedValue = newValue;
      isValid = true;
    }
    return cachedValue;
  };

  const ensureSubscribed = () => {
    if (unsubscribers.length === 0) {
      for (const dep of deps) {
        unsubscribers.push(
          dep.subscribe(() => {
            const prev = cachedValue;
            isValid = false;
            const next = compute();
            if (!Object.is(prev, next)) {
              for (const listener of listeners) {
                listener(next);
              }
            }
          })
        );
      }
    }
  };

  return {
    get() {
      ensureSubscribed();
      if (!isValid) compute();
      return cachedValue;
    },
    subscribe(listener) {
      ensureSubscribed();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    invalidate() {
      isValid = false;
    },
  };
}
```

### File: `packages/store/src/core/computed-registry.ts`

```ts
import type { Computed } from './computed';
import type { AnyStore, InferStoreState } from './store';

import { createComputed } from './computed';

// ----------------------------------------
// Types
// ----------------------------------------

export type ComputedDef<State, Registry, T> = ((state: State) => T) | ((state: State, computed: Registry) => T);

export type ComputedDefRecord<State, Registry = {}> = {
  [K: string]: ComputedDef<State, Registry, any>;
};

export type InferComputedRegistry<Defs extends ComputedDefRecord<any, any>> = {
  [K in keyof Defs]: Defs[K] extends ComputedDef<any, any, infer T> ? T : never;
};

export interface ComputedRegistry<Defs extends ComputedDefRecord<any, any>> {
  /** Get a computed value by key */
  get<K extends keyof Defs>(key: K): InferComputedRegistry<Defs>[K];

  /** Get the Computed instance for a key */
  computed<K extends keyof Defs>(key: K): Computed<InferComputedRegistry<Defs>[K]>;

  /** Subscribe to a computed value by key */
  subscribe<K extends keyof Defs>(key: K, listener: (value: InferComputedRegistry<Defs>[K]) => void): () => void;

  /** Get all computed values as a snapshot */
  snapshot(): InferComputedRegistry<Defs>;
}

// ----------------------------------------
// createComputedRegistry
// ----------------------------------------

export function createComputedRegistry<
  S extends AnyStore,
  Defs extends ComputedDefRecord<InferStoreState<S>, InferComputedRegistry<Defs>>,
>(store: S, defs: Defs): ComputedRegistry<Defs> {
  type State = InferStoreState<S>;
  type Registry = InferComputedRegistry<Defs>;

  // Build dependency graph and create computed values
  const computedMap = new Map<keyof Defs, Computed<any>>();

  // Proxy for accessing computed values during definition
  const registryProxy = new Proxy({} as Registry, {
    get(_, key: string) {
      const computed = computedMap.get(key as keyof Defs);
      if (!computed) {
        throw new Error(`Computed "${key}" accessed before definition`);
      }
      return computed.get();
    },
  });

  // Topological sort - defs that don't depend on others first
  // For simplicity, we process in definition order and assume user orders correctly
  // A more robust impl would detect cycles and reorder
  for (const [key, def] of Object.entries(defs)) {
    const selector = def as ComputedDef<State, Registry, any>;

    // Wrap to provide both state and registry
    const computed = createComputed(store, (state) => {
      if (selector.length === 1) {
        return (selector as (s: State) => any)(state);
      }
      return (selector as (s: State, r: Registry) => any)(state, registryProxy);
    });

    computedMap.set(key as keyof Defs, computed);
  }

  return {
    get(key) {
      const computed = computedMap.get(key);
      if (!computed) throw new Error(`Unknown computed: ${String(key)}`);
      return computed.get();
    },

    computed(key) {
      const computed = computedMap.get(key);
      if (!computed) throw new Error(`Unknown computed: ${String(key)}`);
      return computed;
    },

    subscribe(key, listener) {
      const computed = computedMap.get(key);
      if (!computed) throw new Error(`Unknown computed: ${String(key)}`);
      return computed.subscribe(listener);
    },

    snapshot() {
      const result = {} as Registry;
      for (const [key, computed] of computedMap) {
        (result as any)[key] = computed.get();
      }
      return result;
    },
  };
}
```

### File: `packages/store/src/react/hooks/use-computed.ts`

```ts
import type { Computed } from '../../core/computed';

import { useSyncExternalStore } from 'react';

/**
 * Subscribe to a computed value.
 *
 * @example
 * const progressAtom = createComputed(store, s => s.currentTime / s.duration);
 *
 * function ProgressBar() {
 *   const progress = useComputed(progressAtom);
 *   return <div style={{ width: `${progress * 100}%` }} />;
 * }
 */
export function useComputed<T>(computed: Computed<T>): T {
  return useSyncExternalStore(computed.subscribe, computed.get, computed.get);
}

export namespace useComputed {
  export type Result<T> = T;
}
```

### File: `packages/store/src/lit/controllers/computed-controller.ts`

```ts
import type { Computed } from '../../core/computed';
import type { ReactiveController, ReactiveControllerHost } from '@lit/reactive-element';

import { noop } from '@videojs/utils/function';

export type ComputedControllerHost = ReactiveControllerHost & HTMLElement;

/**
 * Subscribes to a computed value and triggers host updates on change.
 *
 * @example
 * const progressAtom = createComputed(store, s => s.currentTime / s.duration);
 *
 * class ProgressBar extends LitElement {
 *   #progress = new ComputedController(this, progressAtom);
 *
 *   render() {
 *     return html`<div style="width: ${this.#progress.value * 100}%"></div>`;
 *   }
 * }
 */
export class ComputedController<T> implements ReactiveController {
  readonly #host: ComputedControllerHost;
  readonly #computed: Computed<T>;

  #value: T;
  #unsubscribe = noop;

  constructor(host: ComputedControllerHost, computed: Computed<T>) {
    this.#host = host;
    this.#computed = computed;
    this.#value = computed.get();
    host.addController(this);
  }

  get value(): T {
    return this.#value;
  }

  hostConnected(): void {
    this.#value = this.#computed.get();
    this.#unsubscribe = this.#computed.subscribe((value) => {
      this.#value = value;
      this.#host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }
}
```

---

## Usage Examples

### Basic Computed Values

```ts
import { createComputed } from '@videojs/store';

// From store state
const progress = createComputed(store, (s) => {
  return s.duration > 0 ? s.currentTime / s.duration : 0;
});

const isBuffering = createComputed(store, (s) => s.waiting && !s.paused);

// Derived from other computed
const showBufferIndicator = createComputed([isBuffering, progress], (buffering, p) => buffering && p > 0.1);

// Read values
console.log(progress.get()); // 0.5
console.log(showBufferIndicator.get()); // true
```

### Registry for Guard Access

```ts
import { createComputedRegistry, createSlice } from '@videojs/store';

// Create registry
const computed = createComputedRegistry(store, {
  progress: (s) => (s.duration > 0 ? s.currentTime / s.duration : 0),
  isBuffering: (s) => s.waiting && !s.paused,
  // Access other computed values
  showBufferIndicator: (s, c) => c.isBuffering && c.progress > 0.1,
  canSeek: (s) => !s.seeking && s.duration > 0,
});

// Use in guards
const timeSlice = createSlice<HTMLVideoElement>()({
  // ...
  request: {
    seek: {
      guard: () => computed.get('canSeek'),
      handler: (time, { target }) => {
        target.currentTime = time;
      },
    },
  },
});
```

### React Usage

```tsx
import { useComputed } from '@videojs/store/react';

// Individual atoms
function ProgressBar() {
  const progress = useComputed(progressAtom);
  return <div style={{ width: `${progress * 100}%` }} />;
}

// From registry
function BufferIndicator() {
  const show = useComputed(computed.computed('showBufferIndicator'));
  if (!show) return null;
  return <Spinner />;
}
```

### Lit Usage

```ts
import { ComputedController } from '@videojs/store/lit';

class ProgressBar extends LitElement {
  #progress = new ComputedController(this, progressAtom);

  render() {
    return html`<div style="width: ${this.#progress.value * 100}%"></div>`;
  }
}
```

### Vanilla JS

```ts
// Subscribe directly
const unsub = progress.subscribe((value) => {
  progressEl.style.width = `${value * 100}%`;
});

// Cleanup
unsub();
```

---

## Comparison with Alternatives

| Aspect               | Derived Slice      | Inline Selector | Computed Layer |
| -------------------- | ------------------ | --------------- | -------------- |
| Memoization          | Yes                | No              | Yes            |
| Derived-from-derived | Via state          | No              | Yes            |
| Guard access         | Yes (state)        | No              | Yes (registry) |
| Bundle impact        | Heavy              | None            | Light          |
| Framework agnostic   | No (part of slice) | Yes             | Yes            |
| Setup cost           | High               | None            | Low            |

---

## Migration Path

### From Inline Selectors

```ts
// Before: Recalculates per subscriber
store.subscribe((s) => s.currentTime / s.duration, updateUI);

// After: Memoized, shared
const progress = createComputed(store, (s) => s.currentTime / s.duration);
progress.subscribe(updateUI);
```

### From Derived Slices (if we had them)

```ts
// Before: Derived slice
const progressSlice = createDerivedSlice([timeSlice], (state) => ({
  progress: state.duration > 0 ? state.currentTime / state.duration : 0,
}));

// After: Computed
const progress = createComputed(store, (s) => (s.duration > 0 ? s.currentTime / s.duration : 0));
```

---

## Files to Create

| File                                                                   | Purpose                                   |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| `packages/store/src/core/computed.ts`                                  | Core `createComputed` and `Computed` type |
| `packages/store/src/core/computed-registry.ts`                         | Registry for guard access                 |
| `packages/store/src/core/tests/computed.test.ts`                       | Core tests                                |
| `packages/store/src/core/tests/computed-registry.test.ts`              | Registry tests                            |
| `packages/store/src/react/hooks/use-computed.ts`                       | React hook                                |
| `packages/store/src/react/hooks/tests/use-computed.test.tsx`           | React hook tests                          |
| `packages/store/src/lit/controllers/computed-controller.ts`            | Lit controller                            |
| `packages/store/src/lit/controllers/tests/computed-controller.test.ts` | Lit controller tests                      |

---

## Open Questions

1. **Lazy vs Eager subscription**: Should computed values subscribe to store immediately or only when first subscriber attaches?
   - Recommendation: Lazy (subscribe on first access) for tree-shaking benefits

2. **Cleanup on zero subscribers**: Should computed unsubscribe from store when all subscribers leave?
   - Recommendation: Optional via config, default to keeping subscription

3. **Equality function**: Should computed values support custom equality?
   - Recommendation: Yes, optional second arg `createComputed(store, selector, equalityFn)`

4. **Registry dependency detection**: Auto-detect dependencies or require explicit ordering?
   - Recommendation: Explicit ordering (simpler, avoids magic)

5. **Store reference**: Should computed hold strong or weak reference to store?
   - Recommendation: Strong reference (computed lifetime tied to store)
