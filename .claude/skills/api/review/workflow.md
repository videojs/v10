# API Review Workflow

Review APIs and architecture for design quality and developer experience.

## Process

```
┌─────────────────────────────────────────────────────────────┐
│                      Coordinator                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┬─────────────┐
        ▼             ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Types  │  │   API   │  │ Extend  │  │ Disclose│
   └─────────┘  └─────────┘  └─────────┘  └─────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
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

Spawn 4 sub-agents. See [agents.md](agents.md) for prompts.

| Agent         | Focus                            | References                    |
| ------------- | -------------------------------- | ----------------------------- |
| Types         | Inference, generics, exports     | `references/typescript.md`    |
| API Surface   | Config objects, defaults, naming | `references/principles.md`    |
| Extensibility | Middleware, builders, adapters   | `references/extensibility.md` |
| Disclosure    | Layering, escape hatches         | `references/principles.md`    |

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

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.ts:42`
**Why:** Impact on developers
**Principle:** Which principle violated
**Fix:** Concrete suggestion

// Before
problematic()

// After
improved()
```

## References

| File                         | Contents                      |
| ---------------------------- | ----------------------------- |
| [agents.md](agents.md)       | Sub-agent prompts             |
| [templates.md](templates.md) | Issue format, report template |
| [checklist.md](checklist.md) | Quick single-agent checklist  |
| [example.md](example.md)     | Complete example review       |
