# Repository skill patterns

## Focused workflow

Use one small `SKILL.md` when the task has a stable sequence and little conditional detail, such as issue creation or agent-guidance maintenance.

## Domain workflow with references

Keep the default procedure in `SKILL.md` and route optional concerns to named references. Examples: API design, UI component construction, and accessible UI implementation.

## Composable implementation and review

Use separate skills when implementation and audit are independently requested. Each owns a standalone workflow and output contract. Their descriptions may overlap so the host composes them automatically when a task needs both, but neither instructs the agent to load its sibling.

## Output with a stable scaffold

Keep a template only when the artifact has a repository-defined shape that code does not generate, such as a design record or RFC.

Avoid skills that only select a persona, mirror a documentation tree, or require loading several sibling skills for every invocation.
