# State Management Patterns

Patterns for designing and using state management in TypeScript libraries.

## Mental Models

Daishi Kato created Zustand, Jotai, and Valtio with intentionally different architectures because **different problems need different mental models**.

| Model                  | Mental Model                          | Best For                       |
| ---------------------- | ------------------------------------- | ------------------------------ |
| Top-down (Zustand)     | Single store, slice into pieces       | Module state, non-React access |
| Bottom-up (Jotai)      | Composable atoms, build up            | useState replacement           |
| State machine (XState) | Explicit states and transitions       | Complex workflows              |
| Proxy (Valtio)         | Mutable-looking, immutable underneath | Mutable-preferring devs        |

**The principle:** Don't force a mental model. Choose based on how developers naturally think about the domain.

---

## Core Subscription Interface

The minimal interface any framework can consume:

```ts
interface Store<T> {
  get(): T;
  subscribe(callback: (value: T) => void): () => void;
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

## Slice Pattern

Split state by concern, combine at creation time:

```ts
// Each module factory receives (set, get) and returns state slice
const createVolumeSlice = (set, get) => ({
  volume: 1,
  setVolume: (v) => set({ volume: v }),
});

const createPlaybackSlice = (set, get) => ({
  playing: false,
  play: () => set({ playing: true }),
});

// Combine by spreading at creation time
const useStore = create((...a) => ({
  ...createVolumeSlice(...a),
  ...createPlaybackSlice(...a),
}));
```

**Why creation-time composition:**

| Benefit                     | Why                              |
| --------------------------- | -------------------------------- |
| Cross-module access natural | `get`/`set` see entire store     |
| Atomic updates span modules | One `set` updates multiple areas |
| Middleware applies to whole | No per-module confusion          |
| Tree-shaking possible       | Unused modules excluded          |

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

## Selector Pattern

Minimize re-renders with selectors:

```ts
// Subscribes to entire state (causes re-renders)
const state = useStore();

// Subscribes to selected slice (fine-grained)
const volume = useStore((state) => state.volume);
```

**Implementation considerations:**

- Shallow equality by default
- Custom equality function option
- Memoized selector support

---

## Split Stores When Truly Isolated

| Situation                     | Recommendation            | Why                        |
| ----------------------------- | ------------------------- | -------------------------- |
| Totally isolated concerns     | Multiple stores           | Cleaner boundaries         |
| Might ever want cross-updates | Single store with modules | Atomic updates possible    |
| Multiple contexts needed      | Single store              | Simpler provider hierarchy |

**Heuristic:** "When you feel that something is getting difficult to maintain, that's the moment to start splitting."

---

## Cross-Store Access

When stores must communicate, make the relationship explicit:

```ts
interface AppContext {
  userStore: Store<UserState>;
  settingsStore: Store<SettingsState>;
}

function createFeatureStore(context: AppContext) {
  return create((set, get) => ({
    syncWithUser: () => {
      const user = context.userStore.getState();
      set({ userId: user.id });
    },
  }));
}
```

**Why explicit references:**

- Coordination goes through typed interface
- TypeScript catches mismatches
- No hidden global state
- Easy to test with mock stores

---

## Derived State Patterns

### Selector-Based

Compute derived state at subscription time:

```ts
store.subscribe(
  (state) => state.items.reduce((sum, item) => sum + item.price, 0),
  (totalPrice) => updateUI(totalPrice)
);
```

### Computed Atoms

Define derived state as a dependency graph:

```ts
const itemsAtom = atom([]);
const totalPriceAtom = atom((get) => get(itemsAtom).reduce((sum, item) => sum + item.price, 0));
```

| Pattern            | Use When                            |
| ------------------ | ----------------------------------- |
| Selectors          | Derived data varies by consumer     |
| Computed atoms     | Derived data shared across app      |
| Memoized selectors | Expensive computation needs caching |

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

## State Initialization

### Lazy Initialization

Defer expensive work until needed:

```ts
createStore((set) => ({
  data: null,
  initialize: async () => {
    const data = await fetchExpensiveData();
    set({ data });
  },
}));
```

### Hydration Support

Allow external state injection (SSR, persistence):

```ts
createStore((set) => ({
  data: null,
  hydrate: (serverState) => set(serverState),
}));

// Client: store.getState().hydrate(window.__INITIAL_STATE__)
```

### Reset Pattern

Return to known initial state:

```ts
const initialState = { count: 0, items: [] };

createStore((set) => ({
  ...initialState,
  reset: () => set(initialState),
}));
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

## Proxy-Based Reactivity (Valtio)

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

## Presets as Transparent Collections

Make presets visible and extensible:

```ts
// Good: Preset is just an array, visible and extensible
const websitePreset = [analyticsModule, cachingModule, loggingModule];

createStore({ modules: websitePreset });
createStore({ modules: [...websitePreset, customModule] });

// Bad: Preset hides internals
createStore({ preset: 'website' }); // What's in it?
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

## See Also

- [Principles](principles.md) — composition and extensibility
- [Extensibility](extensibility.md) — middleware patterns
- [Libraries](libraries.md) — reference implementations
