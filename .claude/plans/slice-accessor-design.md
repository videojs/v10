# Slice Accessor Design

## Problem

1. **Optional slice composition** — Stores are composed of slices at runtime.

   ```ts
   const store = createPlayer(volumeSlice, timeSlice); // no playbackSlice
   ```

2. **Primitive UI components** — Primitives need specific slices, but slices are composed outside their scope.

   ```ts
   function PlayButton() {
     // playbackSlice may not be in store — how to access?
   }
   ```

3. **Cross-slice access** — Slices need to read or react to other slices' state.

   ```ts
   subscribe: ({ target, signal }) => {
     // need playbackSlice.state.paused — how?
   };
   ```

## Solution

### 1. External Access: `store.getSlice(slice)`

Returns a `SliceAccessor` for typed, scoped access — or `undefined` if slice isn't in store.

```ts
const volume = store.getSlice(volumeSlice);
if (!volume) throw new StoreError('MISSING_SLICE');

volume.state.volume; // live state
volume.request.changeVolume(0.5); // invoke request
volume.subscribe((state) => {}); // scoped subscription
```

### 2. Internal Access: `slices.get(slice)`

Available in `subscribe` and `request` contexts for cross-slice access.

```ts
subscribe: ({ slices, signal }) => {
  slices.get(playbackSlice)?.subscribe(() => {}, { signal });
},

request: {
  changeVolume: (vol, { slices }) => {
    const time = slices.get(timeSlice)?.state.currentTime;
  },
},
```

---

## Handling Missing Slices

### Required Slices

Slice is necessary for functionality — throw if missing.

**UI component:**

```ts
function PlayButton() {
  const playback = store.getSlice(playbackSlice);
  if (!playback) throw new StoreError('MISSING_SLICE');
  return <button onClick={playback.request.play} />;
}
```

**Store slice:**

```ts
request: {
  seekToLive: (_, { slices }) => {
    const time = slices.get(timeSlice);
    if (!time) throw new StoreError('MISSING_SLICE');
    time.request.seek(time.state.duration);
  },
}
```

### Optional Slices

Slice enhances functionality — graceful no-op if missing.

**UI component:**

```ts
function TimeSlider() {
  const time = store.getSlice(timeSlice);
  if (!time) throw new StoreError('MISSING_SLICE');

  const playback = store.getSlice(playbackSlice); // optional
  const onDragStart = () => playback?.request.pause();
  const onDragEnd = () => playback?.request.play();

  return <Slider onDragStart={onDragStart} onDragEnd={onDragEnd} />;
}
```

**Store slice:**

```ts
subscribe: ({ slices, signal }) => {
  slices.get(playbackSlice)?.subscribe(
    (state) => { if (!state.paused) /* unmute */ },
    { signal },
  );
}
```

---

## Related: Unavailable Capability

See [feature-availability-design.md](./feature-availability-design.md).

Missing slice and unavailable capability are different:

| Concept                | Cause               | Detection                         |
| ---------------------- | ------------------- | --------------------------------- |
| Missing slice          | Composition error   | `getSlice()` → `undefined`        |
| Unavailable capability | Platform limitation | `*Availability === 'unsupported'` |

```ts
const volume = store.getSlice(volumeSlice);
if (!volume) throw new StoreError('MISSING_SLICE'); // composition error
if (volume.state.volumeAvailability === 'unsupported') return null; // platform limitation
```

---

## Core API

### SliceAccessor

Provides scoped, live access to a slice's state and requests:

```ts
interface SliceAccessor<S extends AnySlice> {
  /** Initial state from slice definition */
  readonly initialState: InferSliceState<S>;

  /** Live view of store state (typed to slice's keys) */
  readonly state: InferSliceState<S>;

  /** Request handlers (typed to slice's requests) */
  readonly request: ResolveSliceRequestHandlers<S>;

  /** Subscribe to state changes for this slice's keys only */
  subscribe(listener: (state: InferSliceState<S>) => void, options?: { signal?: AbortSignal }): () => void;
}
```

### SliceRegistry

Provides access to slices from within slice callbacks:

```ts
interface SliceRegistry {
  get<S extends AnySlice>(slice: S): SliceAccessor<S> | undefined;
}
```

### Imperative Usage

```ts
const volume = store.getSlice(volumeSlice);

if (!volume) {
  throw new StoreError('MISSING_SLICE', { message: 'volumeSlice required' });
}

// Live state access
console.log(volume.state.volume);
console.log(volume.state.muted);

// Request
volume.request.changeVolume(0.5);

// Subscribe to this slice only
const unsubscribe = volume.subscribe((state) => {
  console.log('Volume changed:', state.volume, state.muted);
});
```

---

## Cross-Slice Access

Slices can access other slices via `slices.get()` in `subscribe` and `request` handlers.

**Note:** `getSnapshot` remains pure — no cross-slice access.

### In subscribe

```ts
const volumeSlice = createSlice<HTMLMediaElement>()({
  initialState: { volume: 1 },

  subscribe: ({ target, update, signal, slices }) => {
    // Subscribe to another slice's state changes
    slices.get(playbackSlice)?.subscribe(
      (state) => {
        if (state.paused) update();
      },
      { signal } // Cleanup when this slice detaches
    );
  },

  // ...
});
```

### In request handlers

```ts
const volumeSlice = createSlice<HTMLMediaElement>()({
  // ...

  request: {
    changeVolume: (volume, { target, slices }) => {
      // Read another slice's state
      const time = slices.get(timeSlice);
      console.log('Current time:', time?.state.currentTime);
      target.volume = volume;
    },
  },
});
```

### Implications

| Issue                 | Severity | Mitigation                                    |
| --------------------- | -------- | --------------------------------------------- |
| Circular dependencies | Medium   | Future `requires` system with cycle detection |
| Infinite update loops | Low      | State equality checks prevent loops           |
| Initialization order  | Low      | Subscribing to state, not events — works fine |
| Memory leaks          | Medium   | Always pass `{ signal }` for cleanup          |
| Testing complexity    | Low      | Handle `undefined`, include deps in tests     |
| Implicit coupling     | Medium   | Future `requires` system, documentation       |

**Important:** Always pass `{ signal }` when subscribing to other slices to ensure cleanup.

---

## React API

### Base hook (explicit store):

```ts
import { useSlice } from '@videojs/store/react';

const volume = useSlice(store, volumeSlice, (accessor) => accessor.state.volume);
// Returns: number | undefined
```

### Factory-bound hook (store from context):

```ts
const { useSlice } = createStore({ slices: [volumeSlice, playbackSlice] });

const volume = useSlice(volumeSlice, (accessor) => accessor.state.volume);
// Returns: number | undefined
```

### Selector

Always required. Receives `SliceAccessor`, returns selected value:

```ts
// Select state
const volume = useSlice(volumeSlice, (accessor) => accessor.state.volume);

// Select request
const changeVolume = useSlice(volumeSlice, (accessor) => accessor.request.changeVolume);

// Derived values
const isSilent = useSlice(volumeSlice, (accessor) => accessor.state.muted || accessor.state.volume === 0);
```

### Subscription

Always subscribes when selector returns state (not a function). Request handlers are stable references — subscription is effectively a no-op for them.

---

## Lit API

### Base controller (explicit store):

```ts
import { SliceController } from '@videojs/store/lit';

#volume = new SliceController(this, store, volumeSlice, (accessor) => accessor.state.volume);
// this.#volume.value: number | undefined
```

### Factory-bound controller (store from context):

```ts
const { SliceController } = createStore({ slices: [volumeSlice] });

#volume = new SliceController(this, volumeSlice, (accessor) => accessor.state.volume);
// this.#volume.value: number | undefined
```

---

## Usage in Primitives

```tsx
function VolumeSlider() {
  const volume = useSlice(volumeSlice, (a) => a.state.volume);
  const availability = useSlice(volumeSlice, (a) => a.state.volumeAvailability);
  const changeVolume = useSlice(volumeSlice, (a) => a.request.changeVolume);

  // 1. Slice not in store (composition error)
  if (volume === undefined) {
    throw new StoreError('MISSING_SLICE', { message: 'VolumeSlider requires volumeSlice' });
  }

  // 2. Platform doesn't support volume (iOS, etc.)
  if (availability === 'unsupported') return null;
  if (availability === 'unavailable') return <Slider disabled />;

  // 3. Ready to use
  return <Slider value={volume} onChange={changeVolume} />;
}
```

```ts
// Lit
class VolumeSlider extends LitElement {
  #volume = new SliceController(this, volumeSlice, (a) => a.state.volume);
  #availability = new SliceController(this, volumeSlice, (a) => a.state.volumeAvailability);
  #changeVolume = new SliceController(this, volumeSlice, (a) => a.request.changeVolume);

  render() {
    const volume = this.#volume.value;
    const availability = this.#availability.value;

    if (volume === undefined) {
      throw new StoreError('MISSING_SLICE', { message: 'VolumeSlider requires volumeSlice' });
    }

    if (availability === 'unsupported') return nothing;
    if (availability === 'unavailable') return html`<vjs-slider disabled></vjs-slider>`;

    return html`<vjs-slider value=${volume} @change=${this.#onChange}></vjs-slider>`;
  }

  #onChange = (e: CustomEvent) => this.#changeVolume.value?.(e.detail);
}
```

---

## Implementation

### Store: getSlice

```ts
class Store<Target, Slices extends AnySlice<Target>[]> {
  readonly #sliceRegistry: Map<symbol, AnySlice<Target>>;
  readonly #sliceAccessors = new Map<symbol, SliceAccessor<AnySlice<Target>>>();
  #slices: Slices;

  constructor(config: StoreConfig<Target, Slices>) {
    // ... existing code
    this.#sliceRegistry = new Map(config.slices.map((s) => [s.id, s]));
    this.#slices = { get: (slice) => this.getSlice(slice) };
  }

  getSlice<S extends AnySlice<Target>>(slice: S): SliceAccessor<S> | undefined {
    if (!this.#sliceRegistry.has(slice.id)) return undefined;

    let accessor = this.#sliceAccessors.get(slice.id);
    if (!accessor) {
      accessor = this.#createSliceAccessor(slice);
      this.#sliceAccessors.set(slice.id, accessor);
    }

    return accessor;
  }

  #createSliceAccessor<S extends AnySlice<Target>>(slice: S): SliceAccessor<S> {
    const stateKeys = Object.keys(slice.initialState);
    const store = this;

    return {
      initialState: slice.initialState,
      get state() {
        return store.state;
      },
      request: store.request,
      subscribe: (listener, options) => {
        const unsubscribe = store.#state.subscribeKeys(stateKeys, () => listener(store.state));

        options?.signal?.addEventListener('abort', unsubscribe);

        return unsubscribe;
      },
    };
  }

  // Pass slices registry to slice.subscribe in attach()
  attach(newTarget: Target): () => void {
    // ...
    for (const slice of this.#slices) {
      const update = this.#createUpdate(slice);
      slice.subscribe({ target: newTarget, update, signal, slices: this.#slices });
    }
    // ...
  }

  // Pass slices registry to request handlers in #execute()
  async #execute(...) {
    // ...
    return config.handler(input, { target, signal, meta, slices: this.#slices });
  }

  destroy(): void {
    // ... existing code
    this.#sliceAccessors.clear();
  }
}
```

### Slice Context Updates

```ts
// SliceSubscribeContext - add slices
interface SliceSubscribeContext<Target, State> {
  target: Target;
  update: SliceUpdate;
  signal: AbortSignal;
  slices: SliceRegistry;
}

// RequestContext - add slices
interface RequestContext<Target> {
  target: Target;
  signal: AbortSignal;
  meta: RequestMeta | null;
  slices: SliceRegistry;
}
```

### React: useSlice

```ts
function useSlice<S extends AnySlice, R>(
  store: AnyStore,
  slice: S,
  selector: (accessor: SliceAccessor<S>) => R
): R | undefined {
  const accessor = store.getSlice(slice);
  if (!accessor) return undefined;

  const selected = selector(accessor);

  // Subscribe if not a function (state vs request)
  if (typeof selected !== 'function') {
    return useSyncExternalStore(
      (cb) => accessor.subscribe(() => cb()),
      () => selector(accessor)
    );
  }

  return selected;
}
```

### Lit: SliceController

```ts
class SliceController<S extends AnySlice, R> implements ReactiveController {
  #host: ReactiveControllerHost & HTMLElement;
  #store: StoreAccessor;
  #slice: S;
  #selector: (accessor: SliceAccessor<S>) => R;
  #value: R | undefined;
  #unsubscribe = noop;

  constructor(host: SliceControllerTarget, source: StoreSource, slice: S, selector: (accessor: SliceAccessor<S>) => R) {
    this.#host = host;
    this.#slice = slice;
    this.#selector = selector;
    this.#store = new StoreAccessor(host, source, (store) => this.#connect(store));
    host.addController(this);
  }

  get value(): R | undefined {
    return this.#value;
  }

  hostConnected(): void {
    this.#store.hostConnected();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }

  #connect(store: AnyStore): void {
    const accessor = store.getSlice(this.#slice);

    if (!accessor) {
      this.#value = undefined;
      return;
    }

    this.#value = this.#selector(accessor);

    // Subscribe if not a function
    if (typeof this.#value !== 'function') {
      this.#unsubscribe = accessor.subscribe(() => {
        this.#value = this.#selector(accessor);
        this.#host.requestUpdate();
      });
    }
  }
}
```

---

## Files to Create/Modify

### Core

- `packages/store/src/core/errors.ts` — add `MISSING_SLICE` error code
- `packages/store/src/core/slice.ts` — update `SliceSubscribeContext` with `slices: SliceRegistry`
- `packages/store/src/core/request.ts` — update `RequestContext` with `slices: SliceRegistry`
- `packages/store/src/core/store.ts` — add `SliceAccessor`, `SliceRegistry`, `getSlice()` method
- `packages/store/src/core/index.ts` — export `SliceAccessor`, `SliceRegistry` types
- `packages/store/src/core/tests/store.test.ts` — add `getSlice` and cross-slice tests

### React (future)

- `packages/store/src/react/hooks/use-slice.ts` — base hook
- `packages/store/src/react/create-store.tsx` — factory-bound hook

### Lit (future)

- `packages/store/src/lit/controllers/slice-controller.ts` — base controller
- `packages/store/src/lit/create-store.ts` — factory-bound controller

### Documentation

- `packages/store/README.md` — document `getSlice`, `SliceAccessor`, cross-slice access patterns

---

## Test Cases

### getSlice

- Returns accessor for included slice
- Returns `undefined` for missing slice
- Returns cached accessor on repeated calls
- `accessor.initialState` matches slice definition
- `accessor.state` is live (reflects current store state)
- `accessor.request` invokes handlers correctly
- `accessor.subscribe` fires on slice key changes
- `accessor.subscribe` ignores other slice key changes
- `accessor.subscribe` cleans up with signal option

### Cross-slice access

- `slices.get()` available in subscribe context
- `slices.get()` available in request handler context
- `slices.get()` returns `undefined` for missing slice
- Cross-slice subscription with signal cleanup works
- Cross-slice state read in request handler works

---

## Implementation Plan

### PR 1: Core — `store.getSlice()` & Cross-Slice Access

**Scope:** `packages/store/src/core/`

**Changes:**

- `errors.ts` — Add `MISSING_SLICE` error code
- `store.ts` — Add `SliceAccessor`, `SliceRegistry` interfaces and `getSlice()` method
- `slice.ts` — Add `slices: SliceRegistry` to `SliceSubscribeContext`
- `request.ts` — Add `slices: SliceRegistry` to `RequestContext`
- `index.ts` — Export new types
- `tests/store.test.ts` — Add `getSlice` and cross-slice tests
- `README.md` — Document `getSlice` and cross-slice patterns

---

### PR 2: Lit — `SliceController`

**Scope:** `packages/store/src/lit/`

**Depends on:** PR 1

**Changes:**

- `controllers/slice-controller.ts` — New controller using `store.getSlice()`
- `controllers/index.ts` — Export
- `create-store.ts` — Factory-bound `SliceController`
- `index.ts` — Export
- Tests

---

### PR 3: React — `useSlice` Hook

**Scope:** `packages/store/src/react/`

**Depends on:** PR 1

**Changes:**

- `hooks/use-slice.ts` — New hook using `store.getSlice()`
- `hooks/index.ts` — Export
- `create-store.tsx` — Factory-bound `useSlice`
- `index.ts` — Export
- Tests

---

### Summary

| PR  | Scope | Dependencies |
| --- | ----- | ------------ |
| 1   | Core  | None         |
| 2   | Lit   | PR 1         |
| 3   | React | PR 1         |

PRs 2 and 3 can be done in parallel after PR 1 merges.
