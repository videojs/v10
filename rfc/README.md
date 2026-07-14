# RFCs

RFCs record proposals that require wider alignment: public APIs, product direction, user-facing developer experience, or significant and hard-to-reverse architecture.

Use `internal/design/` for architecture or feature decisions owned within one area, and `internal/decisions/` for one tactical choice. Skip a record for routine implementation details.

## Lifecycle

| Status | Meaning |
| --- | --- |
| `draft` | Under discussion |
| `accepted` | Approved for implementation |
| `implemented` | Shipped; retained as historical rationale |
| `superseded` | Replaced; links its successor |

During discussion, an RFC should explain:

- the concrete problem and affected users;
- realistic customer salience;
- materially different options and their reversibility;
- the recommendation and tradeoffs;
- the final decision after review.

Use one `rfc/<name>.md` file by default. Split a draft only when reviewers cannot navigate it effectively as one document.

## After implementation

Collapse an implemented RFC to one historical document. Preserve the problem, decisions, alternatives, feedback that changed the result, and lasting consequences. Remove API inventories, examples, file trees, implementation phases, and behavior now defined by code and tests.

Point to current source, tests, package documentation, and any narrower decision records instead of copying them. Delete temporary implementation-plan links once their durable rationale has been extracted.

## Minimal shape

```markdown
---
status: draft
---

# Title

## Problem

## Customer salience

## Options considered

## Recommendation

## Final decision
```

Use `write-rfc` when drafting or revising an RFC. See [internal design records](../internal/design/README.md) and [AGENTS.md](../AGENTS.md#design-records) for routing.
