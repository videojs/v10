# Skill Structure

Complete reference for skill structure and frontmatter.

## Frontmatter Schema

### Required Fields

| Field         | Type   | Description                                                                                                                                       |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | string | Skill identifier. Used with `skill` tool. Kebab-case, lowercase.                                                                                  |
| `description` | string | When to use and trigger phrases. This is the PRIMARY mechanism for skill selection — Claude only sees this before deciding to load. |

### Optional Fields

| Field                      | Type      | Default | Description                                                                                           |
| -------------------------- | --------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `context`                  | `fork`    | —       | Creates isolated sub-agent context. Use for command skills that run autonomously.                     |
| `allowed-tools`            | string    | all     | Restricts available tools. Format: `Tool1, Tool2, Bash(cmd:*)`. Use for command skills.               |
| `agent`                    | `plan`    | —       | Sets agent to plan/research mode. Agent cannot make edits, only read and analyze.                     |
| `disable-model-invocation` | boolean   | false   | Prevents skill from invoking other models. Use for skills that should only provide guidance.          |

### Description Best Practices

```yaml
# ❌ Too brief — won't trigger correctly
description: Component patterns

# ❌ Triggers in body — won't work (body loads AFTER triggering)
description: Component patterns
---
## When to Use
Use this skill when building components...

# ✅ Complete — triggers included
description: >-
  Build accessible, headless UI components with modern architecture patterns.
  Use when creating component libraries, design systems, or reusable UI primitives.
  Handles compound components, state management, accessibility, styling hooks.
  Triggers: "create component", "component architecture", "compound component".
```

## Directory Structure

### Minimal (Command/Simple Workflow)

```
skill-name/
└── SKILL.md
```

Use for: Simple commands, straightforward workflows.

Examples: `commit-pr`, `claude-update`

### With References (Knowledge/Complex Workflow)

```
skill-name/
├── SKILL.md
└── references/
    ├── topic-a.md
    ├── topic-b.md
    └── topic-c.md
```

Use for: Domain expertise, detailed patterns, multiple topics.

Examples: `api`, `component`, `aria`

### With Templates (Output-Focused)

```
skill-name/
├── SKILL.md
├── references/
└── templates/
    ├── output-type-a.md
    ├── output-type-b.md
    └── output-type-c.md
```

Use for: Skills that produce structured outputs (docs, RFCs, etc.).

Examples: `docs`, `rfc`

### With Review Capability

```
skill-name/
├── SKILL.md
├── references/
└── review/
    ├── workflow.md      # Review process, when to use
    ├── checklist.md     # Quick single-agent checklist
    ├── templates.md     # Output formats for issues/reports
    └── agents.md        # Sub-agent prompts (if multi-agent)
```

Use for: Skills that can review existing code/content.

Examples: `api`, `component`, `aria`, `docs`

## SKILL.md Structure

### Knowledge Skill Template

```markdown
---
name: skill-name
description: >-
  Domain description. Use when X, Y, Z.
  Triggers: "phrase1", "phrase2", "phrase3".
---

# Skill Title

Brief overview (1-2 sentences).

## Quick Reference

Most important patterns/rules in condensed form.

## Reference Files

| File | Contents |
|------|----------|
| [references/topic-a.md](references/topic-a.md) | Description |
| [references/topic-b.md](references/topic-b.md) | Description |

## Review

For reviewing X, load `review/workflow.md`.

## Related Skills

| Need | Use |
|------|-----|
| Related domain | `other-skill` skill |
```

### Command Skill Template

```markdown
---
name: skill-name
description: >-
  What command does. Triggers: "phrase1", "phrase2".
allowed-tools: Tool1, Tool2, Bash(cmd:*)
context: fork
---

# Command Name

Brief description of what the command does.

## Usage

\`\`\`
/skill-name [args]
\`\`\`

- `arg` (optional/required): Description

## Arguments

$ARGUMENTS

## Your Tasks

### Step 1: Task Name

Instructions...

### Step 2: Task Name

Instructions...

## Important

- Key constraint 1
- Key constraint 2
```

### Workflow Skill Template

```markdown
---
name: skill-name
description: >-
  Workflow description. Triggers: "phrase1", "phrase2".
context: fork
---

# Workflow Name

Brief overview.

## Reference Material

| Task | Load |
|------|------|
| Task type A | `references/a.md` |
| Task type B | `references/b.md` |

## Quick Reference

Key conventions in condensed form.

## Process

1. Step one
2. Step two
3. Step three
```

## Naming Conventions

| Element          | Convention  | Example              |
| ---------------- | ----------- | -------------------- |
| Skill directory  | kebab-case  | `create-skill/`      |
| Skill name       | kebab-case  | `create-skill`       |
| Reference files  | kebab-case  | `anti-patterns.md`   |
| Template files   | kebab-case  | `component-page.md`  |

## Tool Restriction Patterns

```yaml
# Git and GitHub only
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read, mcp__github__*

# Read-only exploration
allowed-tools: Glob, Grep, Read

# File creation allowed
allowed-tools: Bash(mkdir:*), Glob, Grep, Read, Write, Edit

# With user interaction
allowed-tools: Bash(git:*), Glob, Grep, Read, question
```
