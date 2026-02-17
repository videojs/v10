# Docs Review Workflow

Review documentation for writing quality, structure, and code example correctness.

## Process

```
┌─────────────────────────────────────────────────────────────┐
│                      Coordinator                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐  ┌─────────┐  ┌─────────┐
   │  Voice  │  │Structure│  │  Code   │
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

- Single page: `site/src/content/docs/concepts/foo.mdx`
- Package README: `packages/core/README.md`
- PR diff: changed documentation files

### 2. Fork Reviews

Spawn 3 sub-agents. See [agents.md](agents.md) for prompts.

| Agent     | Focus                               | References                      |
| --------- | ----------------------------------- | ------------------------------- |
| Voice     | Tone, clarity, filler, hedging      | `references/writing-style.md`   |
| Structure | Doc type, template, layout, linking | SKILL.md + relevant template    |
| Code      | Examples, imports, output, markdown | `patterns/code-examples.md`     |

### 3. Merge Report

Combine findings using template in [templates.md](templates.md).

## Quick Review

For fast reviews without forking, use [checklist.md](checklist.md).

## Severity Levels

| Level      | Meaning                        | Action     |
| ---------- | ------------------------------ | ---------- |
| `CRITICAL` | Broken example, wrong info     | Must fix   |
| `MAJOR`    | Missing section, unclear prose | Should fix |
| `MINOR`    | Suboptimal wording or layout   | Consider   |
| `NIT`      | Polish, phrasing preference    | Optional   |

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.mdx:42`
**Why:** Impact on readers
**Fix:** Concrete suggestion

// Before
problematic text or code

// After
improved text or code
```

## References

| File                         | Contents                      |
| ---------------------------- | ----------------------------- |
| [agents.md](agents.md)       | Sub-agent prompts             |
| [templates.md](templates.md) | Issue format, report template |
| [checklist.md](checklist.md) | Quick single-agent checklist  |
