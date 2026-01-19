# Extensibility Principles

How to design plugins, middleware, builders, and extension points.

## Pipeline Architecture with Null-Propagation

Vite's hook lifecycle demonstrates the Unix philosophy for builds:

| Hook        | Responsibility        | Returns                     |
| ----------- | --------------------- | --------------------------- |
| `resolveId` | Where is it?          | Path or `null` to defer     |
| `load`      | What is it?           | Content or `null` to defer  |
| `transform` | How should it change? | Modified or `null` to defer |

**Why pipelines work:**

- Each hook has one responsibility
- Plugins cooperate by returning `null` to defer to next handler
- Specialized plugins handle specific cases; general plugins provide fallbacks

**The null-propagation pattern:** When a handler returns `null`, the system tries the next handler. This enables composable chains without configuration.

**Why this beats event systems:**

- Clear ordering (first non-null wins)
- Easy to reason about (just check your case, return null otherwise)
- No event listener management
- Type-safe (return type is clear)

---

## Type Accumulation Through Builder Chains

tRPC's pattern for type-safe extensibility:

```typescript
const protectedProcedure = procedure
  .use(isAuthed)           // Returns ProcedureBuilder<{ctx: {user: User}}>
  .input(z.object({...}))  // Returns ProcedureBuilder<{ctx: ..., input: ...}>
  .query(...)              // Terminates chain with concrete type
```

**Three critical decisions that make this work:**

**1. Root object injection over globals.**

```typescript
// ❌ Global interface declaration
declare global {
  interface AppContext {
    user: User;
  }
}

// ✅ Factory carries type context
const t = initTRPC.context<{ user: User }>().create();
```

Why: Can have multiple instances with different types. KATT: "It feels like an anti-pattern to use a global."

**2. Each method returns new object.**
Builder methods return new instances with updated generics—never mutate. This lets TypeScript track accumulated types through the chain.

**3. Terminator methods end chains.**
`.query()`, `.mutation()` return concrete types that can't be extended. The chain has a clear end.

---

## Explicit Context Narrowing in Middleware

TypeScript's control flow doesn't propagate through function boundaries:

```typescript
// ❌ Type narrowing lost
const middleware = ({ ctx, next }) => {
  if (!ctx.user) throw new Error('Unauthorized');
  return next(); // ctx.user still User | undefined downstream
};

// ✅ Explicit return tells TypeScript
const middleware = ({ ctx, next }) => {
  if (!ctx.user) throw new Error('Unauthorized');
  return next({
    ctx: { ...ctx, user: ctx.user }, // Explicitly non-null
  });
};
```

**Why explicit returns:** TypeScript can't know that throwing guarantees `ctx.user` exists in `next()`. You must explicitly return the narrowed context.

---

## Dependencies in Types, Not Runtime

Effect-TS's `Effect<Success, Error, Requirements>` encodes dependencies in types:

```typescript
type GetUser = Effect<User, MissingUser | DatabaseError, DatabaseService>;
```

**Why compile-time dependencies:**

- Wiring errors caught before code runs
- IDE shows what's missing
- No "service not registered" runtime surprises
- Easy to mock in tests (just provide the type)

**The tradeoff:** More complex types, steeper learning curve. Worth it for infrastructure-heavy code; overkill for simple apps.

---

## Init-Destroy Lifecycle for Resources

```typescript
const myPlugin = () => {
  let server; // Closure holds reference
  return {
    configureServer(_server) {
      server = _server;
    },
    buildEnd() {
      /* cleanup using server */
    },
  };
};
```

**Why explicit lifecycles:**

- Video elements need `.pause()` and source cleanup
- Audio contexts need `.close()`
- WebRTC connections need graceful shutdown
- Event listeners need removal

**The pattern:** Acquire resources in init, release in destroy. Effect-TS guarantees cleanup even on errors.

---

## Framework-Agnostic Core with Thin Adapters

| Library        | Core        | Adapters                            |
| -------------- | ----------- | ----------------------------------- |
| Zustand        | Vanilla JS  | `zustand/react`                     |
| TanStack Query | Query logic | `@tanstack/react-query`, vue, solid |
| Vite           | Bundler     | `@vitejs/plugin-vue`, react, svelte |

**Why this pattern works:**

- Core logic tested once, not per-framework
- Community adds frameworks without core team
- Bugs fixed in core benefit all adapters
- Smaller adapters are easier to maintain

**The test:** Can your core run in Node with no framework? If not, you've leaked framework concerns into core logic.

---

## See Also

- [Adapter Patterns](adapter-patterns.md) — framework adapter implementation details
- [Foundational Principles](foundational.md) — emergent extensibility
