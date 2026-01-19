# Architecture Review Workflow

Review internal architecture against design principles.

## Process

1. **Gather** — Identify target: file, module, RFC, or PR diff
2. **Fork** — Spawn 4 parallel agents (API Surface, Type Safety, Extensibility, Disclosure)
3. **Merge** — Combine into prioritized report

Load principles on demand from `../principles/{topic}.md`.

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

## Severity Levels

| Level      | Meaning                    | Action     |
| ---------- | -------------------------- | ---------- |
| `CRITICAL` | Breaks inference, unusable | Must fix   |
| `MAJOR`    | Violates core principles   | Should fix |
| `MINOR`    | Suboptimal but workable    | Consider   |
| `NIT`      | Enhancement opportunity    | Optional   |

## Quick Checklist

### API Surface

- [ ] Config objects for 3+ params
- [ ] No function overloads
- [ ] Flat returns for independent values
- [ ] Types infer without annotation

### Type Safety

- [ ] Parsing at boundaries only
- [ ] Generics infer from arguments
- [ ] Context narrowing explicit

### Extensibility

- [ ] Extension through composition
- [ ] Middleware ordering explicit
- [ ] Init/destroy lifecycle
- [ ] Framework-agnostic core

### Progressive Disclosure

- [ ] Zero-config default works
- [ ] Escape hatches compose
- [ ] Contracts explicit

## References

| File                         | Content                               |
| ---------------------------- | ------------------------------------- |
| [agents.md](agents.md)       | Sub-agent prompts for parallel review |
| [templates.md](templates.md) | Merge report template                 |
| [example.md](example.md)     | Complete example review               |
