# TypeScript Patterns

What to look for when evaluating TypeScript DX in libraries.

## Helper Types for Runtime Values

Good libraries export utilities for extracting types from runtime values:

```ts
// Zustand
type State = ExtractState<typeof useStore>;

// Jotai
type Value = ExtractAtomValue<typeof myAtom>;

// XState
type Snapshot = SnapshotFrom<typeof machine>;

// Nanostores
type Value = StoreValue<typeof store>;
```

**What to look for:** Does the library export helper types so you can derive types without manual annotation?

---

## Type Guards Over String Checks

```ts
// Poor DX: stringly-typed, no narrowing
if (state.status === 'playing') { ... }

// Good DX: type guard with narrowing
if (isPlaying(state)) {
  state.currentTime // typed as number
}
```

**What to look for:** Does the library provide type guards for discriminated unions?

---

## Discriminated Unions for State

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Narrowing works automatically
if (state.status === 'success') {
  state.data; // typed
}
```

**What to look for:** Does the library use discriminated unions for state that can be narrowed?

---

## Generic Constraints

Good constraints guide inference and provide better errors:

```ts
// Poor DX: accepts anything, unhelpful errors
function createStore<T>(initial: T): Store<T>;

// Good DX: constrained, clear expectations
function createStore<T extends Record<string, unknown>>(initial: T): Store<T>;
```

**What to look for:** Are generics constrained appropriately?

---

## Avoiding `unknown` in Error Types

```ts
// Poor DX: forces casting
catch (error: unknown) {
  if (error instanceof Error) { ... }
}

// Good DX: typed errors
type Result<T, E = never> =
  | { ok: true; value: T }
  | { ok: false; error: E }
```

**What to look for:** Are errors typed? Can you catch specific error types?

---

## Inference Red Flags

| Pattern                             | Problem                       |
| ----------------------------------- | ----------------------------- |
| Frequent explicit generics in usage | Inference not working         |
| `unknown` in public API             | Forces user casting           |
| Deeply nested generics              | Inference often fails         |
| Required type annotations           | Library isn't inference-first |

---

## Testing Type Inference

Use `expectTypeOf` (vitest) or `tsd` to verify inference:

```ts
import { expectTypeOf } from 'vitest';

test('infers state type', () => {
  const store = createStore({ count: 0 });
  expectTypeOf(store.getState()).toEqualTypeOf<{ count: number }>();
});
```

**What to look for:** Does the library test its type inference?

---

## Method Chaining vs Function Composition

| Approach                                | Pros                                | Cons              |
| --------------------------------------- | ----------------------------------- | ----------------- |
| Chaining (`z.string().email()`)         | Reads naturally, great autocomplete | Larger bundle     |
| Composition (`pipe(string(), email())`) | Tree-shakeable                      | Less discoverable |

**Bundle comparison:**

- Zod (chaining): ~15 kB for login form
- Valibot (composition): ~1.4 kB for same form

**What to look for:** Does the approach match your bundle constraints?

---

## See Also

- [TypeScript Patterns (Design View)](../../api-design/principles/typescript-patterns.md) — designing typed APIs
- [Anti-Patterns](anti-patterns.md) — TypeScript DX mistakes
