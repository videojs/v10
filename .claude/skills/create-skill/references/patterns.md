# Skill Patterns

Complete examples of each skill type.

## Knowledge Skill Example

Based on `component` skill — domain expertise with review capability.

```markdown
---
name: component
description: >-
  Build accessible, headless UI components with modern architecture patterns.
  Use when creating component libraries, design systems, or reusable UI primitives.
  Handles compound components, state management, accessibility, styling hooks.
  Includes HTML (controllers, ReactiveElement) and React (hooks, context) patterns.
---

# Component Architecture Patterns

Build accessible, headless UI components using proven patterns.

**Primary sources:**
- [Base UI Handbook](https://base-ui.com/react/handbook/overview)
- [Ark UI](https://ark-ui.com/)

---

## Core Principles

1. **Headless over styled** — Separate behavior from presentation
2. **Compound over monolithic** — Small composable parts
3. **Accessible by default** — ARIA, keyboard, focus built-in

---

## Pattern 1: Compound Components

**What:** Components as related parts sharing state through context.

**Why:** Declarative, independently styleable, maps to ARIA roles.

---

## Reference Files

| File | Contents |
|------|----------|
| [html.md](references/html.md) | HTML controllers, mixins |
| [react.md](references/react.md) | React hooks, context |
| [props.md](references/props.md) | Prop naming conventions |

## Review

For component reviews, load `review/workflow.md`.

## Related Skills

| Need | Use |
|------|-----|
| Accessibility | `aria` skill |
| API design | `api` skill |
```

**Key characteristics:**

- Rich description with multiple trigger phrases
- Quick reference section with core principles
- Reference table for detailed content
- Review section linking to workflow
- Related skills for cross-domain work

---

## Workflow Skill Example

Based on `git` skill — conventions and processes.

```markdown
---
name: git
description: >-
  Git workflow conventions for Video.js 10. Commit messages, PR descriptions,
  branch naming, and scope inference. Triggers: "commit", "push", "create PR",
  "conventional commit", "branch name".
context: fork
---

# Git

Git workflow conventions for Video.js 10.

## Reference Material

| Task | Load |
|------|------|
| Writing commits | `references/commit.md` |
| Inferring scope | `references/scope.md` |
| Creating PRs | `references/pr.md` |
| Naming branches | `references/branch.md` |

## Quick Reference

**Commit:** `type(scope): lowercase description`

**Branch:** `type/short-description`

**PR Title:** Same as commit

## Process

1. Create branch following naming convention
2. Make changes
3. Commit with conventional message
4. Push and create PR
```

**Key characteristics:**

- `context: fork` for isolated execution
- Reference table organized by task
- Quick reference with condensed conventions
- Simple linear process

---

## Command Skill Example

Based on `commit-pr` skill — automated multi-step task.

```markdown
---
name: commit-pr
description: >-
  Commit all changes and create or update a PR following project conventions.
  Triggers: "commit and pr", "push changes", "create pull request".
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read, question, mcp__github__*
context: fork
---

# Commit & PR

Stage all changes, create a conventional commit, and open a pull request.

## Usage

\`\`\`
/commit-pr [refs]
\`\`\`

- `refs` (optional): Issue/PR references (e.g., `#123`, `fixes #456`)

## Arguments

$ARGUMENTS

## Conventions

Load the `git` skill for commit and PR conventions.

## Your Tasks

### Step 1: Load Conventions

Load the `git` skill.

### Step 2: Analyze Changes

1. Run `git status`
2. Run `git diff --staged` and `git diff`
3. Read files if needed for context

### Step 3: Determine Commit Type and Scope

Based on changes and `git` skill conventions.

### Step 4: Create Commit

1. Stage: `git add -A`
2. Commit: `git commit -m "type(scope): description"`

### Step 5: Push and Create/Update PR

1. Push: `git push -u origin HEAD`
2. Check for existing PR
3. Create or update as needed

### Step 6: Report

Output PR URL and status.

## Important

- Always stage ALL changes
- Check for existing PR before creating
- Follow PR description principles
```

**Key characteristics:**

- `allowed-tools` restricts to git/GitHub tools
- `context: fork` for isolated execution
- `$ARGUMENTS` placeholder for user input
- Step-by-step "Your Tasks" section
- Loads other skills for domain knowledge
- "Important" section with constraints

---

## Review Workflow Pattern

Structure for skills with review capability:

```
skill/
└── review/
    ├── workflow.md      # Main entry point
    ├── checklist.md     # Quick checklist
    ├── templates.md     # Output formats
    └── agents.md        # Sub-agent prompts (optional)
```

### workflow.md Template

```markdown
# Skill Review Workflow

Review X for quality and correctness.

## When to Use

- Before merging PRs that touch X
- When auditing existing X
- When requested by user

## Process

### Single-Agent Review

1. Load checklist from `checklist.md`
2. Review against each item
3. Output issues using format from `templates.md`

### Multi-Agent Review (Large Scope)

1. Load agent prompts from `agents.md`
2. Spawn agents for each domain
3. Merge findings
4. Output consolidated report

## Severity Levels

| Level | Description |
|-------|-------------|
| Critical | Must fix before merge |
| Warning | Should fix, may defer |
| Note | Suggestion for improvement |
```

### checklist.md Template

```markdown
# Skill Review Checklist

Quick checklist for single-agent review.

## Category A

- [ ] Check item 1
- [ ] Check item 2

## Category B

- [ ] Check item 3
- [ ] Check item 4
```
