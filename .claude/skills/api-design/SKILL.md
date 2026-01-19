---
name: api-design
description: >-
  Principles for designing TypeScript library APIs and reviewing internal architecture.
  Use when designing new APIs, evaluating architecture decisions, or reviewing existing code.
  Covers extensibility, progressive disclosure, type safety, adapters, and composition.
  For architecture review, load review/workflow.md.
  Triggers: "design API", "review architecture", "is this extensible", "middleware design".
---

# API Design

Principles for designing TypeScript library APIs.

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

### Extensibility

- **Pipeline architecture** — Null-propagation enables deferral to next handler
- **Builder chains** — Return new typed objects, terminators end chains
- **Framework-agnostic core** — Thin adapters over shared logic

### TypeScript

- **Parse at boundaries** — Trust types internally after validation
- **Explicit context narrowing** — Return narrowed context from middleware
- **Design types first** — API design flaws surface early in type design

## Anti-Patterns

| Anti-Pattern                | Why It Fails                            |
| --------------------------- | --------------------------------------- |
| Function overloads          | Poor errors, autocomplete confusion     |
| Runtime plugin registration | Loses type safety, implicit ordering    |
| Positional parameters (3+)  | Order confusion, breaking changes       |
| Implicit contracts          | Silent breakage when requirements unmet |
| Per-module middleware       | Unexpected interactions                 |
| Shotgun parsing             | Validation scattered, not at boundaries |

## Principles (load on demand)

| File                                                                           | Covers                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| [principles/foundational.md](./principles/foundational.md)                     | Emergent extensibility, composition, onion model |
| [principles/api-surface.md](./principles/api-surface.md)                       | Parameters, returns, type inference              |
| [principles/progressive-disclosure.md](./principles/progressive-disclosure.md) | Layering, escape hatches, explicit contracts     |
| [principles/state-architecture.md](./principles/state-architecture.md)         | Stores, atoms, state composition patterns        |
| [principles/extensibility.md](./principles/extensibility.md)                   | Pipelines, builders, lifecycles                  |
| [principles/adapter-patterns.md](./principles/adapter-patterns.md)             | Framework-agnostic cores, thin adapters          |
| [principles/typescript-patterns.md](./principles/typescript-patterns.md)       | Type inference techniques for library authors    |

## Review

For reviewing internal architecture against these principles, load `review/workflow.md`.

| File                                       | Content                               |
| ------------------------------------------ | ------------------------------------- |
| [review/workflow.md](review/workflow.md)   | Review process and checklists         |
| [review/agents.md](review/agents.md)       | Sub-agent prompts for parallel review |
| [review/templates.md](review/templates.md) | Merge report template                 |
| [review/example.md](review/example.md)     | Complete example review               |

## Related Skills

| Need                   | Use               |
| ---------------------- | ----------------- |
| Consumer DX evaluation | `dx` skill        |
| Building UI components | `component` skill |
| Accessibility patterns | `aria` skill      |
