---
status: draft
---

# Feature Accessor Design

## Problem

1. **Optional feature composition** — Stores are composed of features at runtime.

   ```ts
   const store = createPlayer(volumeFeature, timeFeature); // no playbackFeature
   ```

2. **Primitive UI components** — Primitives need specific features, but features are composed outside their scope.

   ```ts
   function PlayButton() {
     // playbackFeature may not be in store — how to access?
   }
   ```

3. **Cross-feature access** — Features need to read or react to other features' state.

   ```ts
   subscribe: ({ target, signal }) => {
     // need playbackFeature.state.paused — how?
   };
   ```

4. **Fine-grained subscriptions** — Components should only re-render when the specific state they use changes.

---

## Solution

### FeatureAccessor

Typed, scoped lens into a feature's state and requests:

```ts
interface FeatureAccessor<F extends AnyFeature> {
  /** Initial state from feature definition. */
  readonly initialState: InferFeatureState<F>;

  /** Live reactive state (typed to feature's keys). */
  readonly state: Reactive<InferFeatureState<F>>;

  /** Request handlers (typed to feature's requests). */
  readonly request: ResolveFeatureRequestHandlers<F>;

  /** State keys owned by this feature. */
  readonly keys: (keyof InferFeatureState<F>)[];
}
```

### External Access: `store.features.get(feature)`

Returns a `FeatureAccessor` — or `undefined` if feature isn't in store.

```ts
const volume = store.features.get(volumeFeature);
if (!volume) throw new StoreError('MISSING_FEATURE');

volume.state.volume; // live reactive state
volume.request.changeVolume(0.5); // invoke request
```

### Internal Access: `features.get(feature)`

Available in `subscribe` and `request` contexts for cross-feature access.

```ts
subscribe: ({ features, signal }) => {
  const playback = features.get(playbackFeature);
  playback?.subscribe(() => {}, { signal });
},

request: {
  changeVolume: (vol, { features }) => {
    const time = features.get(timeFeature)?.state.currentTime;
  },
},
```

---

## Framework Bindings

### Core Primitive: `track()` with `with`

The `track()` function creates access-tracking proxies for fine-grained subscriptions. It accepts a `with` option to extend the tracked result with additional properties (like request handlers) that aren't tracked for changes:

```ts
const tracker = track(accessor.state, { with: accessor.request });
// tracker.tracked has both state properties and request methods
// Only state access is tracked; requests are pass-through
```

This enables flattened access where components see `{ volume, muted, changeVolume, toggleMute }` as a single object, but only re-render when accessed state changes.

### React: `useFeature`

```tsx
function VolumeSlider() {
  const volume = useFeature(volumeFeature);
  if (!volume) throw new StoreError('MISSING_FEATURE');

  // Destructure state and requests together
  const { volume: level, changeVolume } = volume;

  return <Slider value={level} onChange={changeVolume} />;
}
```

The hook uses `track()` with `with` internally — accessing `level` subscribes to `volume` state changes; accessing `changeVolume` doesn't trigger subscriptions.

### Lit: `SnapshotController` with `with`

```ts
class VolumeSlider extends LitElement {
  #volume = new SnapshotController(this, accessor.state, {
    with: accessor.request,
  });

  render() {
    const { volume, changeVolume } = this.#volume.value;
    return html`<vjs-slider value=${volume} @change=${this.#onChange}></vjs-slider>`;
  }

  #onChange = (e: CustomEvent) => changeVolume(e.detail);
}
```

---

## Handling Missing Features

### Required Features

Feature is necessary for functionality — throw if missing.

```ts
function PlayButton() {
  const playback = useFeature(playbackFeature);
  if (!playback) throw new StoreError('MISSING_FEATURE');
  return <button onClick={playback.play} />;
}
```

### Optional Features

Feature enhances functionality — graceful no-op if missing.

```ts
function TimeSlider() {
  const time = useFeature(timeFeature);
  if (!time) throw new StoreError('MISSING_FEATURE');

  const playback = useFeature(playbackFeature); // optional enhancement
  const onDragStart = () => playback?.pause();
  const onDragEnd = () => playback?.play();

  return <Slider onDragStart={onDragStart} onDragEnd={onDragEnd} />;
}
```

---

## Related: Unavailable Capability

See [feature-availability-design.md](./feature-availability-design.md).

Missing feature and unavailable capability are different:

| Concept                | Cause               | Detection                         |
| ---------------------- | ------------------- | --------------------------------- |
| Missing feature        | Composition error   | `features.get()` → `undefined`    |
| Unavailable capability | Platform limitation | `*Availability === 'unsupported'` |

```ts
const volume = useFeature(volumeFeature);
if (!volume) throw new StoreError('MISSING_FEATURE'); // composition error
if (volume.volumeAvailability === 'unsupported') return null; // platform limitation
```

---

## Cross-Feature Access

Features can access other features via `features.get()` in `subscribe` and `request` handlers.

**Note:** `getSnapshot` remains pure — no cross-feature access.

### In subscribe

```ts
const volumeFeature = createFeature<HTMLMediaElement>()({
  initialState: { volume: 1 },

  subscribe: ({ target, update, signal, features }) => {
    features.get(playbackFeature)?.subscribe(
      (state) => {
        if (state.paused) update();
      },
      { signal }
    );
  },
});
```

### In request handlers

```ts
const volumeFeature = createFeature<HTMLMediaElement>()({
  request: {
    changeVolume: (volume, { target, features }) => {
      const time = features.get(timeFeature);
      console.log('Current time:', time?.state.currentTime);
      target.volume = volume;
    },
  },
});
```

### Considerations

| Issue                 | Mitigation                                    |
| --------------------- | --------------------------------------------- |
| Circular dependencies | Future `requires` system with cycle detection |
| Infinite update loops | State equality checks prevent loops           |
| Memory leaks          | Always pass `{ signal }` for cleanup          |
| Implicit coupling     | Future `requires` system, documentation       |

---

## Design Rationale

### Why `with` instead of separate state/request access?

Flattening state and requests into a single object:

1. **Ergonomic** — Destructure everything in one place
2. **Familiar** — Matches patterns like Zustand where state and actions live together
3. **Type-safe** — Single typed object, no juggling multiple accessors

The `with` option on `track()` keeps the implementation simple — one proxy that checks extended properties first, then falls through to tracked state.

### Why return `undefined` for missing features?

Returning `undefined` (vs throwing) lets components handle missing features gracefully:

- **Required features** — Component throws with clear error
- **Optional features** — Component uses optional chaining

This matches the `getFeature()` pattern in other libraries and keeps the API consistent.

### Why `keys` on FeatureAccessor?

Enables `subscribeKeys()` optimization when the caller knows exactly which keys to watch, avoiding access-tracking overhead. Useful for controllers that subscribe once on connect.
