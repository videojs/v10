---
name: write-design-doc
description: Write or update a Video.js architecture, feature, or decision record only when the user explicitly requests that record. Use for compact, non-inferable rationale outside UI component design.
---

# Internal records

Read `internal/design/README.md` and `internal/decisions/README.md`; they define current placement, status, and format.

## Workflow

1. Confirm that the user explicitly requested creation or revision of the record. Do not invoke this skill merely because a design decision exists.
2. Use the requested artifact and path when given; otherwise choose the smallest matching design or decision location.
3. Read the relevant code, tests, history, and existing record. Treat executable sources as current behavior.
4. State the decision directly, then preserve only the important rationale, constraint, or trade-off that cannot be inferred from those sources.
5. Link source, tests, or related records instead of copying APIs, schemas, state flow, file inventories, or mechanics.
6. Include alternatives or consequences only when they materially explain the choice. Omit empty headings and speculative detail.

Keep the result to a few paragraphs when possible. Do not create adjacent records, split one record into several, or turn it into an RFC without a separate explicit request.

## Example

Input: “Record why source selection belongs in the core player.”

Output: A compact decision and the non-inferable reason it should survive outside the code, with source links where useful.
