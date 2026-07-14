---
name: maintain-agent-docs
description: Maintain repository agent guidance. Use for AGENTS.md, CLAUDE.md compatibility, skill drift, duplicated instructions, or context budgets.
---

# Agent documentation

Keep agent guidance as a routing and correction layer over project sources, not a second documentation system.

## Placement

- Put durable, broadly applicable repository facts in the nearest `AGENTS.md`.
- Keep each `CLAUDE.md` as `@AGENTS.md` unless Claude-only behavior is genuinely required.
- Put an explicit, repeatable vertical workflow in a skill.
- Keep checked-in skills as direct children of top-level `skills/`; treat `.agents/skills/`, `.claude/skills/`, and `.opencode/skills/` as generated directory aliases.
- Put conditional detail in a directly linked skill reference.
- Put rules that can be mechanically checked in code, tests, lint, hooks, or `build/scripts/check-workspace.mjs`.
- Put architecture rationale in `internal/design/`, `internal/decisions/`, or `rfc/`.

## Process

1. Identify the repeated failure or new fact and the executable source that proves it.
2. Search existing agent docs and skills for overlap or contradiction.
3. Prefer updating a source pointer or validator over copying code, schemas, commands, or examples.
4. Remove obsolete guidance in the same change.
5. Keep skill frontmatter portable: `name` and a precise `description` only.
6. Run `pnpm check:workspace` and review the reported context budgets.

Do not add generic software advice the model already knows. Add a rule only when an agent would plausibly get this repository wrong without it.

## Example

Input: “Remove duplicated setup instructions from agent guidance.”

Output: Smaller routing docs that point to executable sources, corrected aliases, passing validators, and an updated context-budget report.
