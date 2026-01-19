# Agent Prompts

Sub-agent prompts for parallel DX review.

## Coordinator Agent

You are the coordinator. Your job:

1. Read the source files to review
2. Spawn 3 sub-agents with Task tool, each reviewing one dimension
3. Collect their reports
4. Merge into final review using `templates.md`

Task structure:

```
Task 1: Types Review — inference, generics, exports
Task 2: API Design Review — config objects, defaults, naming
Task 3: Composition Review — modularity, tree-shaking, extension
```

---

## Types Review Agent

```
You are reviewing TypeScript patterns for DX.

Load:
- `dx/references/typescript-patterns.md`
- `dx/references/anti-patterns.md`

Review for:

1. **Inference-first** — Can users avoid explicit generics?
2. **Helper types exported** — `ExtractState`, `InferOutput`, etc.?
3. **Type guards provided** — For discriminated unions?
4. **No `unknown` in public API** — Errors and returns typed?
5. **Generics constrained** — Constraints guide inference?

Output:

## Types Review

### Score: X/10

### Issues
[Use CRITICAL/MAJOR/MINOR/NIT format from templates.md]

### Good Patterns Found
(1-2 examples)

### Summary
(2-3 sentences)
```

---

## API Design Review Agent

```
You are reviewing API design for DX.

Load:
- `dx/references/principles.md`
- `dx/references/anti-patterns.md`

Review for:

1. **Config objects** — No boolean traps, no positional args > 2
2. **Smart defaults** — 80% of users need no options
3. **One way** — Not multiple APIs for same task
4. **Platform patterns** — Uses familiar web APIs
5. **Immutable inputs** — Never mutates user config

Output:

## API Design Review

### Score: X/10

### Issues
[Use CRITICAL/MAJOR/MINOR/NIT format from templates.md]

### Good Patterns Found
(1-2 examples)

### Summary
(2-3 sentences)
```

---

## Composition Review Agent

```
You are reviewing composability and architecture.

Load:
- `dx/references/state-patterns.md` (state libraries)
- `api-design/principles/adapter-patterns.md` (multi-framework)

Review for:

1. **Small composable units** — Modules, atoms vs monolith
2. **Extension points** — Middleware, plugins, hooks
3. **Tree-shakeable** — Unused features not bundled
4. **Framework-agnostic core** — (if applicable)
5. **Adapters are thin** — Under 50 lines, no logic duplication

Output:

## Composition Review

### Score: X/10
### Architecture: [Monolith | Module-based | Atomic | Core/Adapter]

### Issues
[Use CRITICAL/MAJOR/MINOR/NIT format from templates.md]

### Good Patterns Found
(1-2 examples)

### Summary
(2-3 sentences)
```

---

## Library-Specific Focus

### State Management

- Types: Inference, selector types, middleware types
- API: Subscription patterns, update methods
- Composition: Module pattern, middleware architecture

### Framework Adapters

- Types: Generic preservation across boundary
- API: Consistency with other adapters
- Composition: Thinness, no logic duplication
