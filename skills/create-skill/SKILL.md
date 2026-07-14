---
name: create-skill
description: Create or restructure a repository skill. Use for repeatable agent workflows, portable metadata, resource layout, or context-budget cleanup.
---

# Create a skill

Create a skill only when a repeatable vertical workflow needs instructions beyond what code, tests, existing docs, and general model capability already provide.

## Workflow

1. Collect concrete trigger and non-trigger examples.
2. Check existing skills for overlap; extend or consolidate before adding another metadata entry.
3. Choose one coherent job and a globally unique, verb-first kebab-case name.
4. Create `skills/<name>/SKILL.md` with only portable frontmatter:

   ```yaml
   ---
   name: <name>
   description: <what it does and when to use it>
   ---
   ```

5. Put only essential procedure, project-specific gotchas, inputs/outputs, one compact example, and validation in `SKILL.md`.
6. Add a `references/` file only for conditional detail and link it directly with an explicit read condition. Add a tested script only for repeated deterministic work.
7. Do not tell a skill to load a sibling skill. Give related skills precise, overlapping descriptions so hosts can compose them from the task.
8. Run `pnpm link:aliases` to refresh compatibility directory links.
9. Update `AGENTS.md` only when its compact routing index needs the skill.
10. Run `pnpm check:workspace`.

Read `references/principles.md` for scope/context decisions, `references/structure.md` for non-trivial resource layout, and `references/patterns.md` only when the workflow needs an established pattern. Do not load them by default.

Create another skill only when it has an independent trigger and useful standalone workflow. Keep supporting knowledge as a reference. Do not add auxiliary changelogs, duplicated project docs, generic tutorials, or variants that belong in one parameterized workflow.

## Example

Input: “Create a repeatable workflow for reviewing package export changes.”

Output: One focused `skills/review-package-exports/` skill with a precise trigger, compact procedure, example result, and validation loop.
