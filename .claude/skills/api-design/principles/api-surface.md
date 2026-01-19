# API Surface Principles

How to structure parameters, returns, and function signatures.

## Single Object Parameters Eliminate Overloads

TanStack Query v5 reduced TypeScript types by **80%** (125 → 25 lines) by eliminating function overloads in favor of a single config object.

**Why overloads fail:**
- TypeScript errors become cryptic ("none of the 5 overloads match")
- Autocomplete can't determine intended overload
- Each optional parameter multiplies overload count

> "If something is hard for a compiler to figure out, it's also hard for humans to understand." — TkDodo

**The decision framework:**

| Situation | Pattern | Why |
|-----------|---------|-----|
| 1-2 required params, clear meaning | Direct arguments | Minimal, obvious |
| 3+ params or many optionals | Config object | Named, extensible |
| Complex multi-step construction | Builder pattern | Type accumulation |

**Why config objects win at scale:**
- Named parameters are self-documenting
- Order independence prevents mistakes
- Adding options doesn't break existing calls
- Better autocomplete and error messages

---

## Flat Returns for Independent Values

**The principle:** Return structure should reflect usage patterns, not implementation details.

| Situation | Pattern | Why |
|-----------|---------|-----|
| Properties independent, used separately | Flat object | Direct destructuring |
| Properties form cohesive unit | Namespaced | Semantic grouping |
| Performance requires selective subscription | Namespaced + Proxy | Lazy evaluation |

**Why React Hook Form namespaces `formState`:** It's Proxy-based—accessing `isDirty` doesn't trigger computation for `errors`. The grouping serves optimization, not just organization.

**Why TanStack Query is flat:** `{ data, error, isLoading, refetch }` are often used independently. Nesting would add noise without benefit.

---

## The Rule of Two for Returns

**Tuples for exactly two values:**
```typescript
const [count, setCount] = useState(0)
```
- Mirrors familiar useState pattern
- Enables easy renaming
- Clear positional semantics

**Objects for three or more:**
```typescript
const { data, error, isLoading } = useQuery(...)
```
- Self-documenting property names
- No positional confusion
- Extensible without breaking changes

**Why tuples fail at 3+:**
- Positional confusion: "Is error position 2 or 3?"
- Can't skip values: `const [, , isLoading]` is ugly
- Breaking changes when adding fields

---

## Types as Contracts, Inference Over Annotation

```typescript
// ❌ Excessive annotation signals API problem
const result: QueryResult<User, Error> = useQuery<User, Error>({
  queryKey: ['user', id],
  queryFn: (): Promise<User> => fetchUser(id)
})

// ✅ Inference handles it
const { data } = useQuery({
  queryKey: ['user', id],
  queryFn: () => fetchUser(id)  // Return type infers User
})
```

**The principle:** If consumers must annotate extensively, types aren't flowing through the API correctly.

**Why this matters:** Excessive type annotations indicate either:
- Generic parameters aren't inferring from arguments
- Return types aren't narrowing properly
- The API shape fights TypeScript's inference

> "It's really a TypeScript-first-designed API. I don't do anything in tRPC that can't be typed well." — KATT
