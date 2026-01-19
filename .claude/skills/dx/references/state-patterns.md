# State Management Patterns

Patterns from Zustand, Jotai, Nanostores, TanStack Store, Valtio, XState, and Legend State.

## Core Subscription Interface

The minimal interface any framework can consume:

```ts
interface Store<T> {
  get(): T;
  subscribe(listener: (value: T) => void): () => void;
}
```

This enables framework adapters to be ~10 lines using `useSyncExternalStore` (React), `shallowRef` (Vue), or `createSignal` (Solid).

---

## Middleware as Higher-Order Functions

Middleware wraps the state creator, not the store:

```ts
// Zustand pattern
create(
  devtools(
    persist(
      immer((set) => ({ count: 0 })),
      { name: 'store' }
    )
  )
);
```

**Benefits:**

- Composable in any order
- Type-safe (each middleware can modify types)
- Tree-shakeable (unused middleware not bundled)

---

## Atomic Composition (Jotai Pattern)

Build complex state from simple atoms:

```ts
const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2);
const asyncAtom = atom(async (get) => fetch(`/api/${get(countAtom)}`));
```

**Benefits:**

- Fine-grained subscriptions
- Derived state is automatic
- Async handled uniformly

---

## Slice Pattern

Split state by concern:

```ts
// Define slices independently
const createVolumeSlice = (set) => ({
  volume: 1,
  setVolume: (v) => set({ volume: v }),
});

const createPlaybackSlice = (set) => ({
  playing: false,
  play: () => set({ playing: true }),
});

// Combine
const useStore = create((...a) => ({
  ...createVolumeSlice(...a),
  ...createPlaybackSlice(...a),
}));
```

---

## Selector Pattern

Minimize re-renders with selectors:

```ts
// ❌ subscribes to entire state
const state = useStore();

// ✅ subscribes to selected slice
const volume = useStore((state) => state.volume);
```

**Implementation considerations:**

- Shallow equality by default
- Custom equality function option
- Memoized selector support

---

## Optimistic Updates

For responsive UI during async operations:

```ts
async function updateVolume(newVolume: number) {
  const previous = store.getState().volume;

  // Optimistic update
  store.setState({ volume: newVolume });

  try {
    await api.setVolume(newVolume);
  } catch {
    // Rollback on failure
    store.setState({ volume: previous });
  }
}
```

---

## Actor Model (XState Pattern)

State machines with spawned child actors:

```ts
const parentMachine = setup({
  actors: {
    child: childMachine,
    fetcher: fromPromise(async ({ input }) => fetch(input.url)),
  },
}).createMachine({
  invoke: {
    src: 'fetcher',
    input: { url: '/api/data' },
    onDone: { target: 'success', actions: assign({ data: ({ event }) => event.output }) },
    onError: 'failure',
  },
});
```

**Benefits:**

- Explicit state transitions
- Visualizable
- Comprehensive error handling

---

## Proxy-Based Reactivity (Valtio Pattern)

Mutate naturally, get automatic tracking:

```ts
const state = proxy({ count: 0, nested: { value: 1 } });

// Mutations work directly
state.count++;
state.nested.value = 2;

// Subscribe to changes
subscribe(state, () => console.log('changed'));

// React hook tracks accessed properties
const snap = useSnapshot(state);
```

**Trade-offs:**

- Simpler mental model
- Proxies can obscure types
- Deep reactivity automatic but sometimes unwanted

---

## Fine-Grained Reactivity (Legend State Pattern)

Element-level updates, not component-level:

```tsx
// Renders once, updates element directly
<Memo>{() => state.count.get()}</Memo>

// Efficient list rendering
<For each={items}>{(item) => <Item item={item} />}</For>
```

---

## Request State Pattern

Standardized shape for async operations:

```ts
type RequestState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: T; timestamp: number }
  | { status: 'error'; error: E; timestamp: number };
```

Helper functions:

```ts
function isLoading(state: RequestState<unknown>): boolean;
function isSuccess<T>(state: RequestState<T>): state is SuccessState<T>;
function isError<E>(state: RequestState<unknown, E>): state is ErrorState<E>;
```

---

## Dev Tools Integration

Patterns for debugging support:

```ts
// Named stores for devtools
const useStore = create(
  devtools(
    (set) => ({ ... }),
    { name: 'MediaStore' }
  )
)

// Action names
set({ volume: 0.5 }, false, 'setVolume')

// Time-travel support via snapshots
const snapshot = store.getState()
store.setState(previousSnapshot)
```

---

## Red Flags

See `anti-patterns.md` for state management anti-patterns.

---

## See Also

- [State Architecture (Design View)](../../api-design/principles/state-architecture.md) — designing state APIs
- [Anti-Patterns](anti-patterns.md) — state management mistakes
- [Libraries Reference](libraries.md) — library-specific patterns
