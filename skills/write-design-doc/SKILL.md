---
name: write-design-doc
description: Write or update a Video.js design or decision record. Use for owned architecture, feature designs, component specifications, or durable rationale.
---

# Design records

Read `internal/design/README.md` and `internal/decisions/README.md`; they define current placement, status, and format.

## Workflow

1. Decide whether the work is an architecture/feature design, a single tactical decision, an RFC, or only an implementation plan.
2. Read the relevant code, tests, existing records, and history. Treat code as current behavior and records as rationale.
3. State the problem and constraints before the chosen design.
4. Record the decision, alternatives actually considered, tradeoffs, and consequences. Use code only where it clarifies a contract.
5. Link the implementation surface and related records.
6. Remove speculative detail that the code will express better or that has not been decided.

Use a template in `templates/` only when it matches the artifact. Load `references/structure.md` for a complex document, `references/components.md` for UI component design, or `references/features.md` for multi-part features.

Keep the document useful after implementation: preserve why, constraints, and rejected alternatives; let code and tests own mechanics.

## Example

Input: “Record why source selection belongs in the core player.”

Output: A durable design or decision record covering context, constraints, choice, credible alternatives, consequences, and implementation links.
