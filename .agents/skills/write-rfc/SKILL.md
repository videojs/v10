---
name: write-rfc
description: Draft or revise a Video.js RFC. Use for public APIs, product direction, user-facing DX, shared architecture, or hard-to-reverse proposals needing buy-in.
---

# RFC

Read `rfc/README.md` for the current lifecycle and format. Use an internal design or decision record when the author owns the choice and no wider agreement is needed.

## Workflow

1. Verify that an RFC is warranted; skip it for local implementation details, ordinary bugs, or already-approved work.
2. Read current code, existing RFCs/design records, related issues, and relevant user evidence.
3. Define the problem, affected users, constraints, goals, and explicit non-goals.
4. Present the proposed direction at the level needed for agreement, not a line-by-line implementation plan.
5. Compare credible alternatives and make costs, compatibility, migration, and unresolved questions explicit.
6. Define how success will be evaluated and what happens after acceptance.
7. Keep status `draft` until the repository's approval process changes it.

Make public API and DX tradeoffs explicit when central. Keep implementation detail in a later design record or plan.

## Example

Input: “Draft an RFC for a new plugin extension model.”

Output: A draft proposal with user evidence, goals, non-goals, compatibility and migration costs, credible alternatives, open questions, and success measures.
