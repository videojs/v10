# useSlice / SliceController

Slice-aware state access for primitives.

## Background

### What is a Slice?

A slice is a unit of state + behavior for a specific concern:

```ts
const volumeSlice = createSlice<HTMLMediaElement>()({
  initialState: { volume: 1, muted: false },
  getSnapshot: ({ target }) => ({ volume: target.volume, muted: target.muted }),
  subscribe: ({ target, update, signal }) => listen(target, 'volumechange', update, { signal }),
  request: {
    changeVolume: (volume, { target }) => {
      target.volume = volume;
    },
    toggleMute: (_, { target }) => {
      target.muted = !target.muted;
    },
  },
});
```

Stores are composed of slices. Slices are optional — users include what they need.

### Primitives Require Slices

UI primitives (PlayButton, VolumeSlider) need specific slices to function:

- VolumeSlider needs `volumeSlice` for state and requests
- PlayButton needs `playbackSlice`
- TimeDisplay needs `timeSlice`

### The Design Question

What happens when a primitive's required slice isn't in the store?

| Approach             | Problem                                                                       |
| -------------------- | ----------------------------------------------------------------------------- |
| Return defaults      | **Dangerous.** User thinks volume works, but nothing happens. Silent failure. |
| Return undefined     | Every access becomes defensive. Loses type narrowing.                         |
| Graceful degradation | Primitives render nothing or fallback. Boilerplate everywhere.                |
| **Error**            | Invalid composition caught early. Clean primitive code.                       |

### Our Decision: Missing Slice = Invalid Composition

If you render VolumeSlider, you need volumeSlice. Period.

- **Compile-time error** for factory-bound hooks (ideal)
- **Runtime error** for standalone hooks (escape hatch)

Primitives don't handle missing slices. Invalid compositions fail loudly.

---

## API Design

### Store Method

```ts
store.hasSlice(slice): boolean
```

Runtime check. Foundation for `useSlice` implementation.

### React

**Base hook** (accepts store directly):

```ts
import { useSlice } from '@videojs/store/react';

const volume = useSlice(store, volumeSlice, (ctx) => ctx.state.volume);
// Returns: number | undefined (undefined if slice missing)
```

**Factory-bound hook** (from createStore):

```ts
const { useSlice } = createStore({ slices: [volumeSlice, playbackSlice] });

const volume = useSlice(volumeSlice, (ctx) => ctx.state.volume);
// Returns: number
// TypeScript ERROR if volumeSlice not in store config
```

### Lit

**Base controller** (accepts store/context):

```ts
import { SliceController } from '@videojs/store/lit';

#volume = new SliceController(this, store, volumeSlice, ctx => ctx.state.volume);
// this.#volume.value: number | undefined
```

**Factory-bound controller** (from createStore):

```ts
const { SliceController } = createStore({ slices: [volumeSlice] });

#volume = new SliceController(this, volumeSlice, ctx => ctx.state.volume);
// this.#volume.value: number
// TypeScript ERROR if volumeSlice not in store config
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
const { volume, muted } = useSlice(volumeSlice, (ctx) => ctx.state);

// Select request
const changeVolume = useSlice(volumeSlice, (ctx) => ctx.request.changeVolume);

// Derived values
const isSilent = useSlice(volumeSlice, (ctx) => ctx.state.muted || ctx.state.volume === 0);
```

If selector returns state (not a function), subscribe to changes.

---

## Type Safety

### Factory-Bound: Compile-Time Validation

```ts
const { useSlice } = createStore({ slices: [playbackSlice] }); // No volumeSlice

useSlice(volumeSlice, (ctx) => ctx.state.volume);
// TS Error: volumeSlice is not in store's slice configuration
```

Implementation: Factory captures `Slices` type parameter. `useSlice` constrains slice arg to `Slices[number]`.

### Standalone: Runtime Fallback

```ts
import { useSlice } from '@videojs/store/react';

const volume = useSlice(dynamicStore, volumeSlice, (ctx) => ctx.state.volume);
// Returns: number | undefined
```

For dynamic stores where compile-time checking isn't possible.

---

## Implementation Notes

### React

```ts
// Base
function useSlice<S extends AnySlice, R>(
  store: AnyStore,
  slice: S,
  selector: (ctx: SliceContext<S>) => R
): R | undefined {
  if (!store.hasSlice(slice)) return undefined;

  const ctx = useMemo(() => ({
    state: /* proxy to store.state filtered by slice */,
    request: /* proxy to store.request filtered by slice */,
  }), [store, slice]);

  const selected = selector(ctx);

  // If selected is not a function, subscribe
  if (typeof selected !== 'function') {
    return useSyncExternalStore(
      cb => store.subscribe(/* selector that maps to selected */, cb),
      () => selector(ctx),
    );
  }

  return selected;
}
```

### Lit

```ts
class SliceController<S extends AnySlice, R> implements ReactiveController {
  #value: R | undefined;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    source: StoreSource,
    slice: S,
    selector: (ctx: SliceContext<S>) => R
  ) {
    // Similar logic: check hasSlice, build context, subscribe if state
  }

  get value(): R | undefined {
    return this.#value;
  }
}
```

### hasSlice Implementation

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

---

## Usage in Primitives

```tsx
// React
function VolumeSlider() {
  const volume = useSlice(volumeSlice, (ctx) => ctx.state.volume);
  const changeVolume = useSlice(volumeSlice, (ctx) => ctx.request.changeVolume);

  return <Slider value={volume} onValueChange={changeVolume} />;
}

// Lit
class VolumeSlider extends LitElement {
  #volume = new SliceController(this, volumeSlice, (ctx) => ctx.state.volume);
  #changeVolume = new SliceController(this, volumeSlice, (ctx) => ctx.request.changeVolume);

  render() {
    return html`<vjs-slider value=${this.#volume.value} @change=${(e) => this.#changeVolume.value(e.detail)} />`;
  }
}
```

No defensive checks. If slice is missing, it's a composition error caught at compile time (factory-bound) or clearly undefined (standalone).

---

## Files to Create/Modify

- `packages/store/src/core/store.ts` — add `hasSlice` method
- `packages/store/src/react/hooks/use-slice.ts` — base hook
- `packages/store/src/react/create-store.tsx` — factory-bound hook
- `packages/store/src/lit/controllers/slice-controller.ts` — base controller
- `packages/store/src/lit/create-store.ts` — factory-bound controller
- Tests for each
