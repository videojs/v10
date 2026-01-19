# Docs Review Workflow

Review documentation against Video.js standards.

## Process

```
┌─────────────────────────────────────────────┐
│              Coordinator                     │
└──────────────────┬──────────────────────────┘
     ┌─────────────┼─────────────┬─────────────┐
     ▼             ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Tone   │  │Structure│  │  Code   │  │   AI    │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
     └─────────────┴─────────────┴─────────────┘
                      ▼
              ┌─────────────┐
              │   Merge     │
              └─────────────┘
```

### 1. Gather Context

Load the file(s) to review.

### 2. Fork Reviews

Spawn 4 sub-agents. See [agents.md](agents.md) for prompts.

| Agent         | Reviews                           | Loads                                   |
| ------------- | --------------------------------- | --------------------------------------- |
| **Tone**      | Directness, hedging, active voice | `../examples/tone-samples.md`           |
| **Structure** | Doc type, progressive disclosure  | `../patterns/progressive-disclosure.md` |
| **Code**      | Imports, runnable, props tables   | `../patterns/code-examples.md`          |
| **AI**        | Self-contained, clean markdown    | `../patterns/ai-readiness.md`           |

### 3. Merge Report

Combine findings using [merge-template.md](merge-template.md).

## Quick Review (No Fork)

For fast single-agent reviews:

- [ ] No filler words (basically, simply, just)
- [ ] No hedging (might, could, perhaps)
- [ ] Active voice
- [ ] Code before explanation
- [ ] All imports shown
- [ ] Examples are runnable
- [ ] Has See Also section
- [ ] Matches doc type template

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.md` line 42
**Why:** Impact on readers
**Fix:** Concrete suggestion

<!-- Before -->

In order to create a player...

<!-- After -->

Create a player:
```

## Severity Levels

| Level      | Use for                                          |
| ---------- | ------------------------------------------------ |
| `CRITICAL` | Blocks understanding — wrong API, broken example |
| `MAJOR`    | Hurts quality — wall of text, missing See Also   |
| `MINOR`    | Polish — filler words, passive voice             |
| `NIT`      | Suggestions — could be shorter                   |

## References

| File                                   | Content                         |
| -------------------------------------- | ------------------------------- |
| [agents.md](agents.md)                 | Full prompts for each sub-agent |
| [issue-format.md](issue-format.md)     | Issue format with examples      |
| [merge-template.md](merge-template.md) | Final report template           |
