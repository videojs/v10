# Foundational Principles

Core philosophy underlying all good TypeScript library design.

## Emergent Extensibility Beats Explicit Extension Systems

> "Middleware in Zustand is not a built-in feature—there's no special logic for it in the library. Instead, it's a capability that **naturally emerges** from how `createStore` is designed." — Daishi Kato

**The principle:** Design core APIs that naturally enable extension rather than bolting on plugin infrastructure. The best extension points don't look like extension points—they look like well-designed APIs.

**What enables emergent extensibility:**

- Higher-order functions enable interception
- Closures preserve configuration context
- Mutable API objects allow downstream interception
- Curried signatures enable TypeScript inference

**Why this matters:** Well-designed APIs enable middleware patterns with zero middleware-specific code. The core exposes primitives (state getter, setter, subscription) that middleware can wrap without special hooks.

> **Example:** Zustand's middleware works by wrapping the state creator function—no plugin registration needed.

**Red flag:** Explicit plugin registration (`registerPlugin()`, `use()`) with hooks, events, and lifecycle callbacks when simpler function composition would suffice.

---

## Composition Over Configuration

Why `create(devtools(persist(immer(fn))))` beats `create({ middlewares: [logger, persist] })`:

| Aspect         | Composition           | Configuration             |
| -------------- | --------------------- | ------------------------- |
| Runtime cost   | Zero overhead         | Array iteration, dispatch |
| Type inference | Flows naturally       | Requires annotations      |
| Ordering       | Explicit in structure | Hidden, needs docs        |

**Why composition wins:**

- No abstraction overhead—each middleware is just a function call during creation
- TypeScript infers through nested calls; config objects need explicit types
- The nesting structure _is_ the ordering—no ambiguity

**When configuration wins:** When ordering doesn't matter, when non-developers configure (JSON/YAML), or when options are numerous.

---

## The Onion Model for Middleware

Two orderings coexist in middleware systems:

- **Creation-time (outer → inner):** `devtools` executes first, then `persist`, then `immer`
- **Runtime (inner → outer):** `immer` transforms first, `persist` saves second, `devtools` logs last

**The ordering principle:** Place transformative middleware innermost, observational middleware outermost.

| Layer     | Purpose               | Examples                 |
| --------- | --------------------- | ------------------------ |
| Outermost | Observation/debugging | devtools, logger         |
| Middle    | Business logic        | rate limiting, analytics |
| Innermost | State transformation  | immer, normalization     |

**Why this matters:** Zustand docs warn that devtools should wrap outermost because "devtools mutates setState and adds a type parameter on it, which could get lost if other middlewares also mutate setState before devtools."

---

## Solve Complexity Once in the Library

**The principle:** Every consumer shouldn't solve the same problems. If your library requires boilerplate for common cases, the abstraction is at the wrong level.

**Manifestations:**

- **Parse at boundaries:** Zod/tRPC validate at API edges, then trust types internally
- **Coordinate async in core:** TanStack Query handles race conditions, caching, revalidation
- **Sensible defaults:** SWR's stale-while-revalidate works without configuration

**Why this matters:** When every consumer writes the same try/catch, the same loading state, the same cache invalidation—the library has failed to absorb that complexity.

---

## See Also

- [Extensibility Patterns](extensibility.md) — plugin and middleware architecture
- [Adapter Patterns](adapter-patterns.md) — framework-agnostic design
