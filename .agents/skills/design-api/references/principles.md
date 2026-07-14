# Core Principles

Foundational principles for designing TypeScript library APIs with great developer experience.

## Emergent Extensibility

> "Middleware in Zustand is not a built-in feature—there's no special logic for it in the library. Instead, it's a capability that **naturally emerges** from how `createStore` is designed." — Daishi Kato

Design core APIs that naturally enable extension rather than bolting on plugin infrastructure. The best extension points don't look like extension points—they look like well-designed APIs.

**What enables emergent extensibility:**

- Higher-order functions enable interception
- Closures preserve configuration context
- Mutable API objects allow downstream interception
- Curried signatures enable TypeScript inference

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

## The Onion Model

Two orderings coexist in middleware systems:

- **Creation-time (outer → inner):** `devtools` executes first, then `persist`, then `immer`
- **Runtime (inner → outer):** `immer` transforms first, `persist` saves second, `devtools` logs last

**The ordering principle:** Place transformative middleware innermost, observational middleware outermost.

| Layer     | Purpose               | Examples                 |
| --------- | --------------------- | ------------------------ |
| Outermost | Observation/debugging | devtools, logger         |
| Middle    | Business logic        | rate limiting, analytics |
| Innermost | State transformation  | immer, normalization     |

---

## TypeScript-First (Inference-First)

Users write less, get more. Types flow from usage.

```ts
// Great: types just work
const store = createStore({ count: 0 });
// State type is inferred as { count: number }

// Poor: requires explicit annotation
const store = createStore<{ count: number }>({ count: 0 });
```

**What to look for:**

- Can you use the API without explicit generics?
- Do return types narrow based on input?
- Are helper types exported for extracting types when needed?

> "It's really a TypeScript-first-designed API. I don't do anything in tRPC that can't be typed well." — KATT

---

## Config Objects Over Positional Args

Config objects scale and self-document. Positional args don't.

```ts
// Great: clear what each value means
createSlider({ min: 0, max: 100, vertical: true });

// Poor: what does `true` mean?
createSlider(0, 100, true);
```

TanStack Query v5 reduced TypeScript types by **80%** (125 → 25 lines) by eliminating function overloads in favor of config objects.

**The decision framework:**

| Situation                          | Pattern       | Why               |
| ---------------------------------- | ------------- | ----------------- |
| 1-2 required params, clear meaning | Direct args   | Minimal, obvious  |
| 3+ params or many optionals        | Config object | Named, extensible |
| Complex multi-step construction    | Builder       | Type accumulation |

---

## Flat Returns for Independent Values

Return structure should reflect usage patterns, not implementation details.

| Situation                                   | Pattern            | Why                |
| ------------------------------------------- | ------------------ | ------------------ |
| Properties independent, used separately     | Flat object        | Direct destructure |
| Properties form cohesive unit               | Namespaced         | Semantic grouping  |
| Performance requires selective subscription | Namespaced + Proxy | Lazy evaluation    |

**Rule of two:** Tuples for exactly 2 values (`[count, setCount]`), objects for 3+.

---

## Smart Defaults + Escape Hatches

Simplest call "just works"; power is opt-in.

```ts
// Works out of box
useQuery({ queryKey: ['todos'], queryFn: fetchTodos });

// Explicit escape hatch when needed
useQuery({ queryKey: ['todos'], queryFn: fetchTodos, staleTime: Infinity });
```

**The three-layer pattern:**

1. **Convention layer:** Works without configuration
2. **Configuration layer:** Explicit but simple overrides
3. **Escape hatch layer:** Full programmatic control

**Critical:** Each layer composes with ones above. Using an escape hatch shouldn't require reimplementing defaults.

---

## Progressive Disclosure

> "The complexity of the call site should grow with the complexity of the use case." — Apple SwiftUI team

| Level                   | Complexity | What Users See |
| ----------------------- | ---------- | -------------- |
| Zero config             | None       | It just works  |
| Options                 | Low        | Tweak behavior |
| Composition             | Medium     | Combine pieces |
| Headless/hooks          | High       | Full control   |
| Framework-agnostic core | Expert     | Build adapters |

**The 80/20 test:** 80% of users should succeed at level 1-2. The remaining 20% have a path to levels 3-5.

---

## Explicit Contracts Over Implicit Requirements

Base UI's evolution shows why explicit beats implicit:

| Generation      | Pattern           | Problem                              |
| --------------- | ----------------- | ------------------------------------ |
| slots/slotProps | Implicit mapping  | TypeScript couldn't maintain types   |
| asChild (Radix) | Clone element     | Silent breakage if ref not forwarded |
| Render props    | Explicit function | Contract is clear, typed             |

```tsx
// Explicit: you see exactly what's required and available
<Switch.Thumb render={(props, state) => <span {...props}>{state.checked ? '✓' : '✗'}</span>} />
```

---

## Minimal API Surface

Fewer concepts. Fewer ways to do the same thing.

```ts
// Great: one obvious way
store.setState({ volume: 0.5 });

// Poor: multiple ways (which to use?)
store.setState({ volume: 0.5 });
store.set('volume', 0.5);
store.volume = 0.5;
```

**What to look for:**

- Is there one clear way to do each task?
- Are similar operations consistent?
- Does the API avoid aliases that do the same thing?

---

## Errors That Help

Errors explain: what happened, why, and how to fix.

```ts
// Great: actionable error
throw new AttachError('already-attached', {
  hint: 'Call store.detach() before attach(), or create a new store.',
});

// Poor: cryptic error
throw new Error('Invalid state');
```

---

## Borrow Platform Patterns

Don't invent paradigms. Use familiar names and behaviors:

- DOM events: `addEventListener`, `removeEventListener`
- Fetch-style options objects
- Abort/cancellation: `AbortController` and `signal`
- Async iteration for streams
- `subscribe/unsubscribe` patterns

---

## Controlled + Uncontrolled Support

Support both patterns with consistent naming:

```tsx
// Uncontrolled - library manages state
<Dialog defaultOpen>...</Dialog>

// Controlled - consumer manages state
<Dialog open={isOpen} onOpenChange={setIsOpen}>...</Dialog>
```

**Convention:** `defaultValue`/`value`, `defaultOpen`/`open`, with `onXxxChange` callbacks.

---

## Make Wrong Things Possible But Obvious

**Pit of success principle:** Short names for correct usage, long names for dangerous operations.

| Correct Path | Dangerous Path            |
| ------------ | ------------------------- |
| `render`     | `dangerouslySetInnerHTML` |
| `set`        | `shamefullySendNext`      |
| `usePlayer`  | `preventBaseUIHandler()`  |

---

## Solve Complexity Once

Every consumer shouldn't solve the same problems. If your library requires boilerplate for common cases, the abstraction is at the wrong level.

**Manifestations:**

- **Parse at boundaries:** Zod/tRPC validate at API edges, then trust types internally
- **Coordinate async in core:** TanStack Query handles race conditions, caching, revalidation
- **Sensible defaults:** SWR's stale-while-revalidate works without configuration

---

## See Also

- [TypeScript Patterns](typescript.md) — type inference techniques
- [State Patterns](state.md) — state management design
- [Extensibility](extensibility.md) — middleware and plugin patterns
- [Anti-Patterns](anti-patterns.md) — what to avoid
