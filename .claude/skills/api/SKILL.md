---
name: api
description: >-
  API design and developer experience for TypeScript libraries. Use when designing
  APIs, reviewing architecture, evaluating DX, or checking ergonomics. Covers
  extensibility, progressive disclosure, type inference, state patterns, and
  composition. For review, load review/workflow.md.
  Triggers: "design API", "review API", "check DX", "is this ergonomic",
  "review architecture", "middleware design", "how does this feel".
---

# API Design & Developer Experience

Principles for designing TypeScript library APIs and evaluating developer experience.

**Goal**: APIs should feel **obvious**, **fast**, **safe**, and **composable** — with great defaults and great escape hatches.

## Quick Reference

### Foundational

- **Emergent extensibility** — Best extension points look like well-designed APIs, not plugin systems
- **Composition over configuration** — `devtools(persist(fn))` beats `{ middlewares: [] }`
- **Onion model** — Transformative middleware innermost, observational outermost

### API Surface

- **Config objects** for 3+ parameters (no overloads)
- **Flat returns** for independent values, namespaced for cohesive units
- **Rule of two** — Tuples for 2 values, objects for 3+
- **Inference over annotation** — If users annotate, types aren't flowing

### Progressive Disclosure

- **Complexity grows with use case** — Zero-config → Options → Composition → Headless → Core
- **Escape hatches compose** — Don't require reimplementing defaults
- **Explicit contracts** — Render props over implicit requirements

### Developer Experience

- **Time-to-first-success** — Minimize time from install to working code
- **Cognitive load** — Fewer concepts > fewer keystrokes
- **Predictable outcomes** — Match user mental models
- **Editor ergonomics** — TypeScript inference should just work

### Conflict Resolution

When principles conflict, prioritize:

1. **Correctness** — wrong behavior > verbose API
2. **Type Safety** — inference failures > extra generics
3. **Simplicity** — fewer concepts > fewer keystrokes
4. **Consistency** — match existing codebase patterns
5. **Bundle Size** — tree-shaking matters, but not at DX cost

## Anti-Patterns

| Anti-Pattern                | Why It Fails                            |
| --------------------------- | --------------------------------------- |
| Function overloads          | Poor errors, autocomplete confusion     |
| Runtime plugin registration | Loses type safety, implicit ordering    |
| Positional parameters (3+)  | Order confusion, breaking changes       |
| Implicit contracts          | Silent breakage when requirements unmet |
| Per-module middleware       | Unexpected interactions                 |
| Shotgun parsing             | Validation scattered, not at boundaries |
| Boolean traps               | `fn(true, false)` — what do these mean? |
| Multiple competing APIs     | Confusing — which method to use?        |

## Reference Files

| File                                                       | Contents                                    |
| ---------------------------------------------------------- | ------------------------------------------- |
| [references/principles.md](references/principles.md)       | Core design and DX principles               |
| [references/typescript.md](references/typescript.md)       | Type inference patterns (author + consumer) |
| [references/state.md](references/state.md)                 | State management patterns and architecture  |
| [references/extensibility.md](references/extensibility.md) | Pipelines, builders, adapters, lifecycles   |
| [references/anti-patterns.md](references/anti-patterns.md) | Common mistakes to avoid                    |
| [references/libraries.md](references/libraries.md)         | Reference libraries and their patterns      |
| [references/voices.md](references/voices.md)               | Practitioner heuristics and reference URLs  |

## Loading by Domain

| Domain              | Load                        |
| ------------------- | --------------------------- |
| General API work    | `principles.md`             |
| TypeScript/types    | `typescript.md`             |
| State management    | `state.md`                  |
| Middleware/plugins  | `extensibility.md`          |
| Avoiding mistakes   | `anti-patterns.md`          |
| Library comparisons | `libraries.md`, `voices.md` |

## Review

For reviewing APIs and architecture, load `review/workflow.md`.

| File                                       | Contents                      |
| ------------------------------------------ | ----------------------------- |
| [review/workflow.md](review/workflow.md)   | Review process and checklists |
| [review/agents.md](review/agents.md)       | Sub-agent prompts             |
| [review/templates.md](review/templates.md) | Issue format, report template |
| [review/checklist.md](review/checklist.md) | Quick single-agent checklist  |
| [review/example.md](review/example.md)     | Complete example review       |

## Related Skills

| Need                   | Use               |
| ---------------------- | ----------------- |
| Building UI components | `component` skill |
| Accessibility patterns | `aria` skill      |
| Documentation          | `docs` skill |
