# DX Review Workflow

Review external API surface for developer experience.

## Process

```
┌─────────────────────────────────────────────────────────────┐
│                      Coordinator                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Types  │  │   API   │  │ Compose │
   └─────────┘  └─────────┘  └─────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
                      ▼
              ┌─────────────┐
              │   Merge     │
              └─────────────┘
```

### 1. Gather Context

- Single file: `path/to/api.ts`
- Package: `packages/core/src/`
- PR diff: changed API surface

### 2. Fork Reviews

Spawn 3 sub-agents. See [agents.md](agents.md) for prompts.

| Agent       | Focus                            | References                             |
| ----------- | -------------------------------- | -------------------------------------- |
| Types       | Inference, generics, exports     | `../references/typescript-patterns.md` |
| API Design  | Config objects, defaults, naming | `../references/principles.md`          |
| Composition | Modularity, tree-shaking         | `../references/state-patterns.md`      |

### 3. Merge Report

Combine findings using template in [templates.md](templates.md).

## Quick Review

For fast reviews without forking, use [checklist.md](checklist.md).

## Severity Levels

| Level      | Meaning                    | Action     |
| ---------- | -------------------------- | ---------- |
| `CRITICAL` | Breaks inference, unusable | Must fix   |
| `MAJOR`    | Violates core principles   | Should fix |
| `MINOR`    | Suboptimal but workable    | Consider   |
| `NIT`      | Enhancement opportunity    | Optional   |

## References

| File                         | Contents                            |
| ---------------------------- | ----------------------------------- |
| [agents.md](agents.md)       | Sub-agent prompts                   |
| [templates.md](templates.md) | Issue format, merge report template |
| [checklist.md](checklist.md) | Quick single-agent checklist        |
