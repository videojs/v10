# Anti-Patterns

Common DX anti-patterns to watch for when evaluating or using libraries.

## TypeScript Anti-Patterns

### Forcing Explicit Generics

```ts
// Poor DX: User must annotate
const store = createStore<MyState, MyActions>({ ... })

// Good DX: Infer from usage
const store = createStore({ ... })
type State = typeof store.state
```

### `unknown` in Public API

```ts
// Poor DX: Forces casting everywhere
catch (error: unknown) { ... }
onError: (error: unknown) => void

// Good DX: Typed errors
catch (error: MediaError) { ... }
onError: (error: MediaError) => void
```

### Deep Generic Nesting

```ts
// Poor DX: Inference fails, unreadable
type Store<T extends Record<K, V>, K extends string, V extends Serializable<V>>

// Good DX: Simpler constraints
type Store<T extends Record<string, unknown>>
```

---

## API Usage Anti-Patterns

### Boolean Traps

```ts
// Poor DX: What do these booleans mean?
createPlayer(true, false, true);

// Good DX: Named options
createPlayer({ autoplay: true, muted: false, loop: true });
```

### Multiple Competing APIs

```ts
// Poor DX: Confusing - which to use?
store.set({ volume: 0.5 });
store.setState({ volume: 0.5 });
store.update({ volume: 0.5 });
store.volume = 0.5;

// Good DX: One obvious way
store.setState({ volume: 0.5 });
```

### Implicit Magic Dependencies

```ts
// Poor DX: Where does MediaContext come from?
function useVolume() {
  const { volume } = useContext(MediaContext); // Not obvious this is required
  return volume;
}

// Good DX: Explicit dependency
function useVolume(store: MediaStore) {
  return useSelector(store, (s) => s.volume);
}
```

### Over-Abstraction

```ts
// Poor DX: AbstractFactoryManagerProvider for simple behavior
const factory = new PlayerFactoryManager();
const provider = factory.createProvider();
const player = provider.getInstance();

// Good DX: Direct API
const player = createPlayer();
```

---

## State Management Anti-Patterns

### Mandatory Providers

```tsx
// Poor DX: Boilerplate for every usage
<StoreProvider store={store}>
  <App />
</StoreProvider>

// Good DX: Works without wrapper
const useStore = create((set) => ({ ... }))
// Optional provider for overrides/testing
```

### No Selector Support

```ts
// Poor DX: Subscribes to everything, excessive re-renders
const state = useStore();

// Good DX: Fine-grained subscriptions
const volume = useStore((s) => s.volume);
```

### Sync-Only State

```ts
// Poor DX: Async requires workarounds
store.setState({ loading: true })
const data = await fetch(...)
store.setState({ loading: false, data })

// Good DX: Built-in async support
const dataAtom = atom(async () => fetch(...))
```

---

## Error Handling Anti-Patterns

### Generic Errors

```ts
// Poor DX: No context, not actionable
throw new Error('Invalid state');

// Good DX: Typed, contextual, actionable
throw new MediaError('INVALID_STATE', {
  current: state,
  expected: ['idle', 'ready'],
  hint: 'Call reset() before attempting this operation',
});
```

### Swallowing Errors

```ts
// Poor DX: Silent failure
try {
  await load();
} catch {
  // nothing
}

// Good DX: Explicit handling
try {
  await load();
} catch (error) {
  onError?.(error);
  setState({ error });
}
```

### Inconsistent Async Errors

```ts
// Poor DX: Different patterns
methodA().catch(handler)           // Promise rejection
methodB((err) => { ... })          // Callback
methodC()  // throws? returns error? who knows

// Good DX: Consistent pattern
const result = await methodA()  // Returns Result<T, E>
if (!result.ok) handle(result.error)
```

---

## Packaging Anti-Patterns

### Deep Subpaths

```ts
// Poor DX: Unwieldy imports

// Good DX: Shallow subpaths
import { useStore } from '@lib/react';
import { useStore } from '@lib/react/hooks/store/useStore';
```

### Barrel Export Everything

```ts
// Poor DX: Tree-shaking issues, TS perf hit
export * from './components';
export * from './hooks';
export * from './utils';
// ... 50 more

// Good DX: Explicit exports
export { Button } from './Button';
export { useStore } from './useStore';
```

### Bundled Framework Dependencies

```json
// Poor DX: Bundles React, version conflicts
"dependencies": {
  "react": "^18.0.0"
}

// Good DX: Peer dependency
"peerDependencies": {
  "react": "^17.0.0 || ^18.0.0 || ^19.0.0"
}
```

---

## Documentation Anti-Patterns

### Examples Without Types

```ts
// Poor DX: JavaScript only
const store = createStore({
  count: 0,
  increment() { ... }
})

// Good DX: TypeScript with inference visible
const store = createStore({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
})
// type State = { count: number; increment: () => void }
```

### Missing Error Scenarios

```ts
// Poor DX: Only happy path
const data = await query.fetch()

// Good DX: Shows error handling
const data = await query.fetch()
if (query.error) {
  // Handle specific error types
  if (query.error instanceof NetworkError) { ... }
}
```

---

## See Also

- [Component Anti-Patterns](../../component/references/anti-patterns.md) — UI component mistakes
- [TypeScript Patterns](typescript-patterns.md) — what good DX looks like
- [State Patterns](state-patterns.md) — state management best practices

```

```
