# State Architecture Principles

How to design state management APIs for libraries.

## State Models Should Match Mental Models

Daishi Kato created Zustand, Jotai, and Valtio with intentionally different architectures because **different problems need different mental models**.

| Model                  | Mental Model                          | Best For                       | Why                               |
| ---------------------- | ------------------------------------- | ------------------------------ | --------------------------------- |
| Top-down (Zustand)     | Single store, slice into pieces       | Module state, non-React access | Familiar Redux-like thinking      |
| Bottom-up (Jotai)      | Composable atoms, build up            | useState replacement           | Automatic dependency tracking     |
| State machine (XState) | Explicit states and transitions       | Complex workflows              | Impossible states unrepresentable |
| Proxy (Valtio)         | Mutable-looking, immutable underneath | Mutable-preferring devs        | Familiar mutation syntax          |

**The principle:** Don't force a mental model. Choose based on how developers naturally think about the domain.

**Why this matters:** Atoms suggest "build up from pieces." Slices suggest "carve from whole." Neither is wrong—they're different ways of thinking. Match the API to the domain's natural mental model.

---

## Composition at Creation Time

Compose state modules when the store is created, not at runtime.

**Pattern:** Each module is a factory that receives store primitives and returns state shape:

```typescript
// Each module factory receives (set, get) and returns state slice
const createBearSlice = (set, get) => ({
  bears: 0,
  eatFish: () => set((s) => ({ fishes: s.fishes - 1 })),
});

const createFishSlice = (set, get) => ({
  fishes: 10,
  repopulate: () => set((s) => ({ fishes: s.fishes + 1 })),
});

// Combine by spreading at creation time
createStore((...args) => ({
  ...createBearSlice(...args),
  ...createFishSlice(...args),
}));
```

**Why creation-time composition:**

| Benefit                     | Why                              |
| --------------------------- | -------------------------------- |
| Cross-module access natural | `get`/`set` see entire store     |
| Atomic updates span modules | One `set` updates multiple areas |
| Middleware applies to whole | No per-module confusion          |
| Tree-shaking possible       | Unused modules excluded          |

**Anti-pattern:** Applying middleware inside individual modules. Keep middleware at the store level to avoid unexpected interactions.

---

## Split Stores When Truly Isolated

| Situation                     | Recommendation            | Why                        |
| ----------------------------- | ------------------------- | -------------------------- |
| Totally isolated concerns     | Multiple stores           | Cleaner boundaries         |
| Might ever want cross-updates | Single store with modules | Atomic updates possible    |
| Multiple contexts needed      | Single store              | Simpler provider hierarchy |

**The practical heuristic:** "When you feel that something is getting difficult to maintain, that's the moment to start splitting."

**Why multiple stores are rare:** If you need coordination between stores, you probably want a single store with modules. Multiple stores should feel like separate applications.

---

## Cross-Store Access Through Explicit References

When stores must communicate, make the relationship explicit:

```typescript
interface AppContext {
  userStore: Store<UserState>;
  settingsStore: Store<SettingsState>;
}

function createFeatureStore(context: AppContext) {
  return create((set, get) => ({
    // Explicit reference to other stores
    syncWithUser: () => {
      const user = context.userStore.getState();
      set({ userId: user.id });
    },
  }));
}
```

**Why explicit references:**

- Coordination goes through typed interface (debuggable, traceable)
- TypeScript catches mismatches at compile time
- No hidden global state or singletons
- Easy to test with mock stores

**Why globals fail:**

- Can't have multiple instances
- Hidden dependencies
- Testing requires global setup/teardown
- Race conditions in SSR

---

## Presets as Transparent Collections

If your library offers preset configurations, make them visible and extensible:

```typescript
// Good: Preset is just an array, visible and extensible
const websitePreset = [analyticsModule, cachingModule, loggingModule];

createStore({ modules: websitePreset });
createStore({ modules: [...websitePreset, customModule] });

// Bad: Preset hides internals
createStore({ preset: 'website' }); // What's in it? How to extend?
```

**The principle:** Users should see what's in a preset, add to it, remove from it, or ignore it entirely. Presets encode best practices without hiding capability.

---

## Derived State Patterns

### Selector-Based

Compute derived state at subscription time:

```typescript
// Subscriber passes selector function
store.subscribe(
  (state) => state.items.reduce((sum, item) => sum + item.price, 0),
  (totalPrice) => updateUI(totalPrice)
);
```

**Key insight:** Selector runs on every state change; only notify if result differs.

### Computed/Derived Atoms

Define derived state as a dependency graph:

```typescript
const itemsAtom = atom([]);
const totalPriceAtom = atom((get) => get(itemsAtom).reduce((sum, item) => sum + item.price, 0));
```

**Key insight:** Automatically tracks dependencies and updates when sources change.

### When to Use Each

| Pattern            | Use When                            |
| ------------------ | ----------------------------------- |
| Selectors          | Derived data varies by consumer     |
| Computed atoms     | Derived data shared across app      |
| Memoized selectors | Expensive computation needs caching |

---

## State Initialization Patterns

### Lazy Initialization

Defer expensive work until actually needed:

```typescript
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

```typescript
createStore((set) => ({
  data: null,
  hydrate: (serverState) => set(serverState),
}));

// Client: store.getState().hydrate(window.__INITIAL_STATE__)
```

### Reset Pattern

Return to known initial state:

```typescript
const initialState = { count: 0, items: [] };

createStore((set) => ({
  ...initialState,
  reset: () => set(initialState),
  resetPartial: (keys) => set(pick(initialState, keys)),
}));
```

---

## See Also

- [State Patterns (Consumer View)](../../dx/references/state-patterns.md) — evaluating state libraries
- [Foundational Principles](foundational.md) — composition and extensibility
