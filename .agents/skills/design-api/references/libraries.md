# Reference Libraries

Best-in-class libraries and their key patterns. Use as benchmarks when designing or evaluating APIs.

## State Management

### Zustand

**Pattern:** Minimal API, vanilla core, curried generics

```ts
// Currying enables partial inference
const useStore = create<State>()(
  devtools(
    persist(
      (set) => ({
        count: 0,
        inc: () => set((s) => ({ count: s.count + 1 })),
      }),
      { name: 'store' }
    )
  )
);

// Selector for fine-grained subscriptions
const count = useStore((s) => s.count);
```

**Why great:**

- Works without Provider
- Middleware composes via function wrapping
- Selectors prevent over-rendering
- Vanilla core for non-React usage

---

### Jotai

**Pattern:** Atomic primitives, derived state

```ts
const countAtom = atom(0);
const doubledAtom = atom((get) => get(countAtom) * 2);
const asyncAtom = atom(async (get) => fetchData(get(countAtom)));

// Usage
const [count, setCount] = useAtom(countAtom);
const doubled = useAtomValue(doubledAtom);
```

**Why great:**

- `useState` replacement feel
- Derived atoms auto-track dependencies
- Async handled uniformly
- Fine-grained reactivity by default

---

### TanStack Store

**Pattern:** Framework-agnostic core, thin adapters

```ts
// Core (no framework)
const store = new Store({ count: 0 });

// React adapter
const count = useStore(store, (s) => s.count);

// Same API in Vue, Solid, Svelte
```

**Why great:**

- Learn once, use everywhere
- Core is pure TypeScript
- Adapters are trivially thin

---

### XState v5

**Pattern:** Actor model, setup API for types

```ts
const machine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'INC' } | { type: 'DEC' },
  },
  actions: {
    increment: assign({ count: ({ context }) => context.count + 1 }),
  },
}).createMachine({
  context: { count: 0 },
  on: { INC: { actions: 'increment' } },
});
```

**Why great:**

- `setup()` centralizes type definitions
- Visualizable in inspector
- Explicit states prevent impossible transitions
- `assertEvent()` for runtime narrowing

---

## UI Components

### Base UI (MUI)

**Pattern:** `render` prop, hooks-first, data attributes

```tsx
// render prop with state access
<Switch.Thumb
  render={(props, state) => <span {...props}>{state.checked ? <CheckedIcon /> : <UncheckedIcon />}</span>}
/>
```

**Why great:**

- Explicit prop flow via render prop
- State access in render function
- Data attributes for styling
- No default styles to fight

---

### Radix UI

**Pattern:** Compound components, `asChild`, data attributes

```tsx
<Dialog.Root>
  <Dialog.Trigger asChild>
    <Button>Open</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Close />
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Why great:**

- Compound structure is intuitive
- `data-state` enables CSS styling
- CSS variables for animation values
- Built-in focus management

---

### React Aria / React Stately

**Pattern:** Separated state + behavior, mergeProps

```tsx
function Checkbox(props) {
  const state = useToggleState(props); // State logic
  const ref = useRef(null);
  const { inputProps } = useCheckbox(props, state, ref); // DOM behavior
  const { focusProps, isFocusVisible } = useFocusRing();

  return <input {...mergeProps(inputProps, focusProps)} ref={ref} />;
}
```

**Why great:**

- Stately hooks work with React Native
- Aria hooks add web-specific behavior
- `mergeProps` chains handlers correctly
- Maximum accessibility out of box

---

## Validation / Schema

### Zod

**Pattern:** Chainable API, inference-first

```ts
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

type User = z.infer<typeof userSchema>;

const result = userSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.issues);
}
```

**Why great:**

- `z.infer<typeof schema>` for types
- `.safeParse()` returns Result, not throws
- Chainable refinements read naturally
- Excellent error messages

---

## Data Fetching

### TanStack Query

**Pattern:** Smart defaults, stale-while-revalidate

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['todos', userId],
  queryFn: () => fetchTodos(userId),
  staleTime: 5 * 60 * 1000,
});
```

**Why great:**

- `queryKey` for cache identity
- Automatic background refetch
- Optimistic updates via `useMutation`
- Devtools included and excellent

---

## Quick Reference

| Library        | Key Innovation                                         |
| -------------- | ------------------------------------------------------ |
| Zustand        | No Provider, curried inference, middleware composition |
| Jotai          | Atomic primitives, derived state auto-tracking         |
| TanStack Store | Same API across all frameworks                         |
| XState v5      | `setup()` API, visualizable, impossible states         |
| Base UI        | `render` prop with state access                        |
| Radix          | Compound components, data attributes                   |
| React Aria     | Separated state/behavior, accessibility by default     |
| Zod            | `z.infer`, chainable, Result pattern                   |
| TanStack Query | `queryKey`, SWR pattern, devtools                      |

---

## See Also

- [Voices](voices.md) — practitioner perspectives and URLs
- [Principles](principles.md) — design principles these libraries embody
