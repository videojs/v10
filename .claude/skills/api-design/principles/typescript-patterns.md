# TypeScript Patterns for Library Authors

How to design APIs with great type inference.

## The Partial Inference Problem

TypeScript infers all generics or none. Libraries need techniques to enable partial inference.

### Currying Pattern (Zustand)

Split creation into two function calls to create separate inference sites:

```ts
// First () binds state type explicitly
// Second () allows middleware types to be inferred
const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
}));
```

**When to use:** When you need to fix one type parameter while inferring others.

### Builder Pattern

Chain methods that progressively narrow types:

```ts
const schema = z.object({
  name: z.string(),
  age: z.number(),
});
// Type is inferred from the chain
type User = z.infer<typeof schema>;
```

### Factory with Generics Bound Once

Capture target/platform type once, let callbacks infer it:

```ts
// Capture Target type once
const slice = createSlice<HTMLVideoElement>()({
  initialState: { volume: 1 },
  getSnapshot: ({ target }) => ({ volume: target.volume }),
  subscribe: ({ target, update }) => {
    target.addEventListener('volumechange', update);
    return () => target.removeEventListener('volumechange', update);
  },
});
```

---

## Parse, Don't Validate

> "Parsers preserve information in the type system; validators throw it away." — Alexis King

```ts
// Validator: Returns boolean, discards knowledge
function isNonEmpty(list: string[]): boolean {
  return list.length > 0;
}
// After check, TypeScript still thinks it might be empty

// Parser: Returns refined type, preserves guarantee
function parseNonEmpty<T>(list: T[]): NonEmptyArray<T> | null {
  return list.length > 0 ? (list as NonEmptyArray<T>) : null;
}
// After parse, TypeScript knows it's non-empty
```

**Why parsing wins:** After parsing, TypeScript remembers the constraint. No redundant checks needed downstream. The type carries the proof.

---

## Eliminate Shotgun Parsing

Validation scattered throughout code signals missing abstraction:

```ts
// Shotgun parsing: validation everywhere
function processUser(data: unknown) {
  if (!data.name) throw new Error('Missing name');
  saveName(data.name);
  // ... 100 lines later ...
  if (!data.email) throw new Error('Missing email'); // Why here?
}

// Parse at boundaries, trust types internally
function processUser(user: User) {
  saveName(user.name); // Type guarantees existence
  saveEmail(user.email); // No defensive checks
}

// Parsing happens at API boundary
const user = userSchema.parse(request.body);
processUser(user);
```

**The principle:** Parse untrusted data at API boundaries. Once parsed, trust the types. No defensive checks in business logic.

---

## Avoid Globals for Type Context

```ts
// Global interface declaration (avoid)
declare global {
  interface AppContext {
    user: User;
  }
}

// Factory carries type context (prefer)
const t = initTRPC.context<{ user: User }>().create();
// All procedures derived from t carry this context type
```

**Why factories win:**

- Can have multiple instances with different types
- No global pollution
- Easy to test with different contexts
- TypeScript tracks types through derivation

---

## Design Types First, Implement Second

> "Without the types and without that being great, there's no point of tRPC." — KATT

**Process:**

1. Design types first in TypeScript Playground
2. Verify inference works as expected
3. Backfill runtime implementation

**Why types-first works:**

- API design flaws surface early
- Impossible states become visible in types
- IDE autocomplete becomes documentation
- "If it compiles, the API contract is correct"

**The test:** Can you write the types for your API in a playground without the implementation? If the types are awkward, the API is awkward.

---

## Export Helper Types

Every library should export helper types so users can derive types:

```ts
// Export these from your library
export type ExtractState<S> = S extends Store<infer T> ? T : never;
export type InferInput<S> = S extends Schema<infer I, any> ? I : never;
export type SnapshotFrom<M> = M extends Machine<infer S> ? S : never;
```

**Rule:** If users need to manually annotate, export a helper type to derive it.

---

## Explicit Context Narrowing

TypeScript's control flow doesn't propagate through function boundaries:

```ts
// Type narrowing lost
const middleware = ({ ctx, next }) => {
  if (!ctx.user) throw new Error('Unauthorized');
  return next(); // ctx.user still User | undefined downstream
};

// Explicit return tells TypeScript
const middleware = ({ ctx, next }) => {
  if (!ctx.user) throw new Error('Unauthorized');
  return next({
    ctx: { ...ctx, user: ctx.user }, // Explicitly non-null
  });
};
```

**Why explicit returns:** TypeScript can't know that throwing guarantees `ctx.user` exists in `next()`. You must explicitly return the narrowed context.

---

## See Also

- [TypeScript Patterns (Consumer View)](../../dx/references/typescript-patterns.md) — evaluating library types
- [Extensibility Patterns](extensibility.md) — middleware and plugin design
