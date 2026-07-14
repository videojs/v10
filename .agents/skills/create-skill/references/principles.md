# Skill scope and context

## Create a skill when

- The user can ask for the workflow directly.
- The workflow recurs and needs repository-specific judgment or sequencing.
- Code, tests, existing docs, and ordinary agent capability do not already make the right path obvious.

Do not create a skill for a one-off plan, a generic role, a large knowledge dump, or a rule that can be enforced mechanically.

## Split or reference

Create a separate skill when the new unit has its own trigger and can produce a useful result independently. Keep material as a reference when it only supports another workflow.

Implementation and review may be separate skills when users invoke them separately and their procedures differ. Each must stand alone. Give their descriptions enough shared domain language that a host can select both when a task truly needs both; do not make either skill explicitly load the other.

## Token discipline

- Metadata is always-on; every new skill adds discovery cost.
- The skill body should contain only the default path, project-specific corrections, and validation.
- Load conditional detail from one directly named reference.
- Point to executable sources rather than copying commands, schemas, APIs, or architecture.
- Delete stale guidance in the same change.

Match detail to fragility: use exact steps for destructive or order-sensitive work, concise constraints for judgment-heavy work.
