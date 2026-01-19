---
name: dx
description: >-
  Developer experience knowledge base for TypeScript library consumers and DX review.
  Use when discussing DX patterns, TypeScript ergonomics, evaluating library usability,
  or reviewing external API surface. For DX review, load review/workflow.md.
  Triggers: "how does this feel", "review DX", "check ergonomics", "is this easy to use".
---

# DX Skill

Knowledge base for developer experience when **using** TypeScript libraries.

**Goal**: Libraries should feel **obvious**, **fast**, **safe**, and **composable** — with great defaults and great escape hatches.

## What This Skill Provides

- Core DX principles with examples
- TypeScript patterns to look for (consumer perspective)
- State management patterns (how to use Zustand, Jotai, etc.)
- Reference libraries and URLs
- Anti-patterns to avoid
- Practitioner heuristics

## Reference Files

| File                                | Contents                                                  |
| ----------------------------------- | --------------------------------------------------------- |
| `references/principles.md`          | Core DX principles with examples                          |
| `references/voices.md`              | Practitioner heuristics, perspectives, and reference URLs |
| `references/typescript-patterns.md` | What to look for in type inference                        |
| `references/state-patterns.md`      | State management library patterns                         |
| `references/anti-patterns.md`       | Common anti-patterns                                      |
| `references/libraries.md`           | Reference libraries and key patterns                      |

## Loading by Domain

| Domain           | Load                         |
| ---------------- | ---------------------------- |
| Any DX work      | `principles.md`, `voices.md` |
| State management | `state-patterns.md`          |
| TypeScript/types | `typescript-patterns.md`     |
| Comparisons      | `libraries.md`, `voices.md`  |

## Review

For reviewing external API surface against DX principles, load `review/workflow.md`.

| File                                       | Contents                            |
| ------------------------------------------ | ----------------------------------- |
| [review/workflow.md](review/workflow.md)   | Review process and checklists       |
| [review/agents.md](review/agents.md)       | Sub-agent prompts                   |
| [review/templates.md](review/templates.md) | Issue format, merge report template |
| [review/checklist.md](review/checklist.md) | Quick single-agent checklist        |

## Related Skills

| Need                   | Use                |
| ---------------------- | ------------------ |
| Designing APIs         | `api-design` skill |
| Building UI components | `component` skill  |
| Accessibility          | `aria` skill       |

## Quick Reference

### What Great DX Minimizes

- Time-to-first-success
- Cognitive load
- Footguns and unclear failure modes
- Upgrade pain

### What Great DX Maximizes

- Speed of iteration
- Clear mental models
- Predictable outcomes
- Editor + TypeScript ergonomics
- Safe adoption and upgrades

### Conflict Resolution

When principles conflict, prioritize:

1. **Correctness** — wrong behavior > verbose API
2. **Type Safety** — inference failures > extra generics
3. **Simplicity** — fewer concepts > fewer keystrokes
4. **Consistency** — match existing codebase patterns
5. **Bundle Size** — tree-shaking matters, but not at DX cost
