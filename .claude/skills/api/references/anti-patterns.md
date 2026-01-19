# Anti-Patterns

Common mistakes to avoid when designing or evaluating TypeScript library APIs.

## API Design Anti-Patterns

### Function Overloads

```ts
// Poor: TypeScript errors become "none of the 5 overloads match"
function create(config: Config): Store;
function create(initialState: State): Store;
function create(initialState: State, options: Options): Store;

// Good: Single config object
function create(config: { initialState?: State; options?: Options }): Store;
```

**Why it fails:** Autocomplete can't determine intended overload. Each optional parameter multiplies overload count.

### Boolean Traps

```ts
// Poor: What do these booleans mean?
createPlayer(true, false, true);

// Good: Named options
createPlayer({ autoplay: true, muted: false, loop: true });
```

### Multiple Competing APIs

```ts
// Poor: Confusing - which to use?
store.set({ volume: 0.5 });
store.setState({ volume: 0.5 });
store.update({ volume: 0.5 });
store.volume = 0.5;

// Good: One obvious way
store.setState({ volume: 0.5 });
```

### Runtime Plugin Registration

```ts
// Poor: Loses type safety, implicit ordering
store.use(middleware1);
store.use(middleware2);

// Good: Composition at creation
create(middleware1(middleware2(fn)));
```

### Implicit Magic Dependencies

```ts
// Poor: Where does MediaContext come from?
function useVolume() {
  const { volume } = useContext(MediaContext); // Not obvious
  return volume;
}

// Good: Explicit dependency
function useVolume(store: MediaStore) {
  return useSelector(store, (s) => s.volume);
}
```

### Over-Abstraction

```ts
// Poor: AbstractFactoryManagerProvider
const factory = new PlayerFactoryManager();
const provider = factory.createProvider();
const player = provider.getInstance();

// Good: Direct API
const player = createPlayer();
```

---

## TypeScript Anti-Patterns

### Forcing Explicit Generics

```ts
// Poor: User must annotate
const store = createStore<MyState, MyActions>({ ... });

// Good: Infer from usage
const store = createStore({ ... });
type State = typeof store.state;
```

### `unknown` in Public API

```ts
// Poor: Forces casting everywhere
onError: (error: unknown) => void

// Good: Typed errors
onError: (error: MediaError) => void
```

### Deep Generic Nesting

```ts
// Poor: Inference fails, unreadable
type Store<T extends Record<K, V>, K extends string, V extends Serializable<V>>

// Good: Simpler constraints
type Store<T extends Record<string, unknown>>
```

### Shotgun Parsing

```ts
// Poor: Validation scattered everywhere
function processUser(data: unknown) {
  if (!data.name) throw new Error('Missing name');
  // ... 100 lines later ...
  if (!data.email) throw new Error('Missing email');
}

// Good: Parse at boundaries, trust types internally
const user = userSchema.parse(request.body);
processUser(user); // Type guarantees fields exist
```

---

## State Management Anti-Patterns

### Mandatory Providers

```tsx
// Poor: Boilerplate for every usage
<StoreProvider store={store}>
  <App />
</StoreProvider>

// Good: Works without wrapper
const useStore = create((set) => ({ ... }));
// Optional provider for overrides/testing
```

### No Selector Support

```ts
// Poor: Subscribes to everything, excessive re-renders
const state = useStore();

// Good: Fine-grained subscriptions
const volume = useStore((s) => s.volume);
```

### Sync-Only State

```ts
// Poor: Async requires workarounds
store.setState({ loading: true });
const data = await fetch(...);
store.setState({ loading: false, data });

// Good: Built-in async support
const dataAtom = atom(async () => fetch(...));
```

### Per-Module Middleware

```ts
// Poor: Unexpected interactions
const volumeSlice = createSlice({
  middleware: [logger], // Don't do this
});

// Good: Middleware at store level
create(
  logger((...a) => ({
    ...volumeSlice(...a),
    ...playbackSlice(...a),
  }))
);
```

---

## Error Handling Anti-Patterns

### Generic Errors

```ts
// Poor: No context, not actionable
throw new Error('Invalid state');

// Good: Typed, contextual, actionable
throw new MediaError('INVALID_STATE', {
  current: state,
  expected: ['idle', 'ready'],
  hint: 'Call reset() before attempting this operation',
});
```

### Swallowing Errors

```ts
// Poor: Silent failure
try {
  await load();
} catch {
  // nothing
}

// Good: Explicit handling
try {
  await load();
} catch (error) {
  onError?.(error);
  setState({ error });
}
```

### Inconsistent Async Errors

```ts
// Poor: Different patterns
methodA().catch(handler);          // Promise rejection
methodB((err) => { ... });         // Callback
methodC();  // throws? returns error? who knows

// Good: Consistent pattern
const result = await methodA();  // Returns Result<T, E>
if (!result.ok) handle(result.error);
```

---

## Packaging Anti-Patterns

### Deep Subpaths

```ts
// Poor: Unwieldy imports

// Good: Shallow subpaths
import { useStore } from '@lib/react';
import { useStore } from '@lib/react/hooks/store/useStore';
```

### Barrel Export Everything

```ts
// Poor: Tree-shaking issues, TS perf hit
export * from './components';
export * from './hooks';
export * from './utils';
// ... 50 more

// Good: Explicit exports
export { Button } from './Button';
export { useStore } from './useStore';
```

### Bundled Framework Dependencies

```json
// Poor: Bundles React, version conflicts
"dependencies": {
  "react": "^18.0.0"
}

// Good: Peer dependency
"peerDependencies": {
  "react": "^17.0.0 || ^18.0.0 || ^19.0.0"
}
```

---

## Documentation Anti-Patterns

### Examples Without Types

```ts
// Poor: JavaScript only
const store = createStore({
  count: 0,
  increment() { ... }
});

// Good: TypeScript with inference visible
const store = createStore({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
});
// type State = { count: number; increment: () => void }
```

### Missing Error Scenarios

```ts
// Poor: Only happy path
const data = await query.fetch();

// Good: Shows error handling
const data = await query.fetch();
if (query.error) {
  if (query.error instanceof NetworkError) { ... }
}
```

---

## Quick Reference

| Anti-Pattern                | Why It Fails                            |
| --------------------------- | --------------------------------------- |
| Function overloads          | Poor errors, autocomplete confusion     |
| Runtime plugin registration | Loses type safety, implicit ordering    |
| Positional parameters (3+)  | Order confusion, breaking changes       |
| Implicit contracts          | Silent breakage when requirements unmet |
| Per-module middleware       | Unexpected interactions                 |
| Shotgun parsing             | Validation scattered, not at boundaries |
| Boolean traps               | `fn(true, false)` — what do these mean? |
| Multiple competing APIs     | Confusing — which method to use?        |
| Deep generic nesting        | Inference fails, unreadable errors      |
| Barrel exports              | Tree-shaking issues, TS performance     |

---

## See Also

- [Principles](principles.md) — what to do instead
- [TypeScript](typescript.md) — type inference patterns
- [Component Anti-Patterns](../../component/references/anti-patterns.md) — UI component mistakes
