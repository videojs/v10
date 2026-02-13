---
name: claude-update
description: >-
  Update CLAUDE.md and skills when introducing new patterns or conventions.
  Triggers: "update claude", "update skills", "new pattern", "add convention".
context: fork
disable-model-invocation: true
---

# Claude Update

Review any feedback, preferences, suggestions or rules that the user provided during task and 
update AI documentation to incorporate them as appropriate.

## When to Update

- New naming conventions or code patterns
- New anti-patterns discovered during implementation
- Changes to component architecture, accessibility, or API design
- New utilities or shared patterns

## Where to Put It

| Type                          | Location             |
| ----------------------------- | -------------------- |
| Cross-cutting (naming, utils) | CLAUDE.md Code Rules |
| Component patterns            | `component` skill    |
| Accessibility                 | `aria` skill         |
| API design / DX               | `api` skill          |
| Documentation                 | `docs` skill   |

**Decision:** Ask "Who needs this?" — if domain-specific, use a skill.

## After Modifying Skills

Check consistency:

1. `.claude/skills/README.md` — Quick Reference, Skills table
2. `CLAUDE.md` — if skill changes affect repo-wide conventions

## Process

1. Identify what changed (pattern, convention, anti-pattern)
2. Route to correct location (table above)
3. Make the update
4. Run consistency checks (if modifying skills)
