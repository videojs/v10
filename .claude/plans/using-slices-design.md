# Using Slices Design

Slice-aware state access for primitives.

## Background

### What is a Slice?

A slice is a unit of state + behavior for a specific concern:

```ts
const volumeSlice = createSlice<HTMLMediaElement>()({
  initialState: { volume: 1, muted: false, volumeAvailability: 'unsupported' },
  getSnapshot: ({ target }) => ({ volume: target.volume, muted: target.muted, ... }),
  subscribe: ({ target, update, signal }) => listen(target, 'volumechange', update, { signal }),
  request: {
    changeVolume: (volume, { target }) => { target.volume = volume; },
    toggleMute: (_, { target }) => { target.muted = !target.muted; },
  },
});
```

Stores are composed of slices. Slices are optional — users include what they need.

### Missing Slice vs Unavailable Capability

Two different concepts:

| Concept                    | Meaning                                      | Detection                              | Cause                                    |
| -------------------------- | -------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| **Missing slice**          | Store wasn't configured with this slice      | `useSlice()` returns `undefined`       | Developer didn't include slice in config |
| **Unavailable capability** | Slice exists but platform doesn't support it | `volumeAvailability === 'unsupported'` | Platform limitation (e.g., iOS volume)   |

**Missing slice** is a composition/configuration issue. The primitive requires a slice that wasn't added to the store.

**Unavailable capability** is a platform limitation. The slice is configured, but the underlying media/platform can't perform the action (see `slice-availability.md`).

### Primitives Require Slices

UI primitives (PlayButton, VolumeSlider) need specific slices:

- VolumeSlider needs `volumeSlice`
- PlayButton needs `playbackSlice`
- TimeDisplay needs `timeSlice`

When a slice is missing, `useSlice` returns `undefined`. The primitive decides how to handle it — typically throwing `StoreError('MISSING_SLICE')`.

---

## API

### React

**Base hook** (explicit store):

```ts
import { useSlice } from '@videojs/store/react';

const volume = useSlice(store, volumeSlice, (ctx) => ctx.state.volume);
// Returns: number | undefined
```

**Factory-bound hook** (store from context):

```ts
const { useSlice } = createStore({ slices: [volumeSlice, playbackSlice] });

const volume = useSlice(volumeSlice, (ctx) => ctx.state.volume);
// Returns: number | undefined
```

### Lit

**Base controller** (explicit store):

```ts
import { SliceController } from '@videojs/store/lit';

#volume = new SliceController(this, store, volumeSlice, ctx => ctx.state.volume);
// this.#volume.value: number | undefined
```

**Factory-bound controller** (store from context):

```ts
const { SliceController } = createStore({ slices: [volumeSlice] });

#volume = new SliceController(this, volumeSlice, ctx => ctx.state.volume);
// this.#volume.value: number | undefined
```

### Selector

Always required. Receives slice context, returns selected value:

```ts
interface SliceContext<S extends AnySlice> {
  state: InferSliceState<S>;
  request: ResolveSliceRequestHandlers<S>;
}

// Select state
const volume = useSlice(volumeSlice, (ctx) => ctx.state.volume);

// Select request
const changeVolume = useSlice(volumeSlice, (ctx) => ctx.request.changeVolume);

// Derived values
const isSilent = useSlice(volumeSlice, (ctx) => ctx.state.muted || ctx.state.volume === 0);
```

### Subscription

Always subscribes when selector returns state (not a function). Request handlers are stable references — subscription is effectively a no-op for them.

---

## Usage in Primitives

```tsx
function VolumeSlider() {
  const volume = useSlice(volumeSlice, (ctx) => ctx.state.volume);
  const availability = useSlice(volumeSlice, (ctx) => ctx.state.volumeAvailability);
  const changeVolume = useSlice(volumeSlice, (ctx) => ctx.request.changeVolume);

  // 1. Slice not in store (composition error)
  if (volume === undefined) {
    throw new StoreError('MISSING_SLICE', 'VolumeSlider requires volumeSlice');
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
  #volume = new SliceController(this, volumeSlice, (ctx) => ctx.state.volume);
  #availability = new SliceController(this, volumeSlice, (ctx) => ctx.state.volumeAvailability);
  #changeVolume = new SliceController(this, volumeSlice, (ctx) => ctx.request.changeVolume);

  render() {
    const volume = this.#volume.value;
    const availability = this.#availability.value;

    if (volume === undefined) {
      throw new StoreError('MISSING_SLICE', 'VolumeSlider requires volumeSlice');
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

### Store: hasSlice

```ts
class Store {
  #sliceIds: Set<symbol>;

  constructor(config) {
    this.#sliceIds = new Set(config.slices.map((s) => s.id));
  }

  hasSlice(slice: AnySlice): boolean {
    return this.#sliceIds.has(slice.id);
  }
}
```

### React: useSlice

```ts
function useSlice<S extends AnySlice, R>(
  store: AnyStore,
  slice: S,
  selector: (ctx: SliceContext<S>) => R
): R | undefined {
  // Check slice presence
  if (!store.hasSlice(slice)) return undefined;

  // Build context
  const ctx: SliceContext<S> = {
    state: store.state,
    request: store.request,
  };

  const selected = selector(ctx);

  // Subscribe if not a function (state vs request)
  if (typeof selected !== 'function') {
    return useSyncExternalStore(
      (cb) => store.subscribe((state) => selector({ state, request: store.request }), cb),
      () => selector(ctx)
    );
  }

  return selected;
}
```

### Lit: SliceController

```ts
class SliceController<S extends AnySlice, R> implements ReactiveController {
  #host: ReactiveControllerHost & HTMLElement;
  #accessor: StoreAccessor;
  #slice: S;
  #selector: (ctx: SliceContext<S>) => R;
  #value: R | undefined;
  #unsubscribe = noop;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    source: StoreSource,
    slice: S,
    selector: (ctx: SliceContext<S>) => R
  ) {
    this.#host = host;
    this.#slice = slice;
    this.#selector = selector;
    this.#accessor = new StoreAccessor(host, source, (store) => this.#connect(store));
    host.addController(this);
  }

  get value(): R | undefined {
    return this.#value;
  }

  hostConnected(): void {
    this.#accessor.hostConnected();
  }

  hostDisconnected(): void {
    this.#unsubscribe();
    this.#unsubscribe = noop;
  }

  #connect(store: AnyStore): void {
    if (!store.hasSlice(this.#slice)) {
      this.#value = undefined;
      return;
    }

    const ctx: SliceContext<S> = { state: store.state, request: store.request };
    this.#value = this.#selector(ctx);

    // Subscribe if not a function
    if (typeof this.#value !== 'function') {
      this.#unsubscribe = store.subscribe((state) => {
        const newCtx = { state, request: store.request };
        this.#value = this.#selector(newCtx);
        this.#host.requestUpdate();
      });
    }
  }
}
```

---

## Files to Create/Modify

- `packages/store/src/core/store.ts` — add `hasSlice` method
- `packages/store/src/core/errors.ts` — add `MISSING_SLICE` error code
- `packages/store/src/react/hooks/use-slice.ts` — base hook
- `packages/store/src/react/create-store.tsx` — factory-bound hook
- `packages/store/src/lit/controllers/slice-controller.ts` — base controller
- `packages/store/src/lit/create-store.ts` — factory-bound controller
- Tests for each
