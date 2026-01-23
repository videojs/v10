# Extensibility Patterns

How to design plugins, middleware, builders, and framework adapters.

## Pipeline Architecture

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
- Easy to reason about (check your case, return null otherwise)
- No event listener management
- Type-safe (return type is clear)

---

## Type Accumulation Through Builder Chains

tRPC's pattern for type-safe extensibility:

```ts
const protectedProcedure = procedure
  .use(isAuthed)           // Returns ProcedureBuilder<{ctx: {user: User}}>
  .input(z.object({...}))  // Returns ProcedureBuilder<{ctx: ..., input: ...}>
  .query(...)              // Terminates chain with concrete type
```

**Three critical decisions:**

**1. Root object injection over globals.**

```ts
// Global interface declaration (avoid)
declare global {
  interface AppContext {
    user: User;
  }
}

// Factory carries type context (prefer)
const t = initTRPC.context<{ user: User }>().create();
```

**2. Each method returns new object.** Builder methods return new instances with updated generics—never mutate. This lets TypeScript track accumulated types through the chain.

**3. Terminator methods end chains.** `.query()`, `.mutation()` return concrete types that can't be extended. The chain has a clear end.

---

## Dependencies in Types, Not Runtime

Effect-TS's `Effect<Success, Error, Requirements>` encodes dependencies in types:

```ts
type GetUser = Effect<User, MissingUser | DatabaseError, DatabaseService>;
```

**Why compile-time dependencies:**

- Wiring errors caught before code runs
- IDE shows what's missing
- No "service not registered" runtime surprises
- Easy to mock in tests

**The tradeoff:** More complex types, steeper learning curve. Worth it for infrastructure-heavy code.

---

## Init-Destroy Lifecycle

```ts
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

**The pattern:** Acquire resources in init, release in destroy.

---

## Framework-Agnostic Core

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

**The test:** Can your core run in Node with no framework? If not, you've leaked framework concerns.

---

## Adapter Architecture

### Pattern 1: Vanilla Core with Hooks

**Used by:** Zustand, Nanostores, TanStack Store

```
@lib/store/
├── core/           ← Runtime-agnostic logic
├── react/          ← React hooks
├── vue/            ← Vue composables
└── solid/          ← Solid primitives
```

**Core exposes minimal interface:**

```ts
interface Store<T> {
  get(): T;
  set(value: T | ((prev: T) => T)): void;
  subscribe(callback: (value: T) => void): () => void;
}
```

**Adapter responsibilities:**

- Subscribe to core store on mount
- Trigger framework re-render on state change
- Clean up subscription on unmount
- Support selectors for partial subscription

### Pattern 2: State Machine Core

**Used by:** Zag.js, XState

- Logic encoded as pure state + transitions (no framework code)
- `connect()` function translates machine state → UI props
- Normalizer handles framework event naming (`onClick` vs `on:click`)

### Pattern 3: Separated State + Behavior

**Used by:** React Aria + React Stately

| Layer          | Scope             | Example                               |
| -------------- | ----------------- | ------------------------------------- |
| State hooks    | Platform-agnostic | `useToggleState()` — manages boolean  |
| Behavior hooks | DOM-specific      | `useCheckbox()` — adds ARIA, keyboard |
| Component      | Composes both     | `<Checkbox />`                        |

**Why this separation:**

- State hooks portable to React Native (no DOM)
- Behavior hooks encapsulate web accessibility patterns
- Clear testing boundary

---

## Prop Normalization

Handle framework-specific attribute naming:

```ts
// Core returns canonical props
{ onClick: handler, className: 'foo' }

// Normalizer transforms per framework
normalize.vue(props)   // → { 'on:click': handler, class: 'foo' }
normalize.solid(props) // → { onClick: handler, class: 'foo' }
```

---

## SSR / Hydration Safety

**Rules:**

1. No `window`, `document`, `navigator` at module scope
2. Lazy DOM access inside functions
3. Provide server snapshot for initial render
4. Support `forceMount` for SSR-first render

```ts
// Breaks SSR
const width = window.innerWidth;

// Lazy access (safe)
function getWidth() {
  return typeof window === 'undefined' ? 0 : window.innerWidth;
}
```

---

## Testing Adapters

**What to test:**

- Adapter subscribes on mount
- Adapter unsubscribes on unmount
- State changes trigger re-render
- Selectors prevent unnecessary re-renders
- SSR: No errors during server render

---

## See Also

- [Principles](principles.md) — emergent extensibility
- [State Patterns](state.md) — state composition
- [TypeScript](typescript.md) — builder type accumulation
