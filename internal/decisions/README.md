# Internal decisions

Compact records of single tactical decisions.

## Creation is intentional

Create or materially expand a decision record only when a maintainer explicitly asks for one. Agents must not infer that implementation, review, refactoring, planning, or choosing between approaches requires a record.

When requested, record **one specific choice** and only the rationale, constraint, or trade-off that cannot be inferred from code and tests. A few paragraphs should usually be enough.

Do not copy APIs, schemas, state flow, file inventories, or implementation mechanics. Mention alternatives only when they were actually considered and explain an otherwise non-obvious choice.

## Decisions vs Design Docs

Use a **design doc** (`internal/design/`) when the explicit request concerns architecture, a feature, or a subsystem.

Use a **decision doc** here when the explicit request concerns one settled tactical choice. Do not create additional decision records as implementation choices arise unless separately requested.

## Format

```markdown
---
status: decided
date: 2026-01-27
---

# Title

## Decision

One to three direct sentences.

## Why

Only the non-inferable constraint, trade-off, or rationale worth preserving.
```

Add alternatives, consequences, or source links only when they materially explain the decision. Omit empty sections.

## Layout

| Area | Decisions |
| --- | --- |
| `player/` | Provider, container, media discovery, and player composition |
| `spf/` | Stream-processing ownership and coordination |
| `store/` | State-management contracts |
| `ui/` | Components, gestures, captions, and interaction |

Put an explicitly requested record in the narrowest existing area. Add an area only when several requested decisions belong together.

## File naming

Lowercase with hyphens, name after the subject of the decision:

```
ui/captions.md
ui/gestures-as-components.md
player/provider-attach.md
```

## See Also

- [Design Docs](/internal/design/README.md) — Architecture specs and feature designs
- [RFCs](/rfc/README.md) — Proposals needing buy-in
- [Plans](/.agents/plans/README.md) — Temporary implementation notes
- [AGENTS.md](/AGENTS.md#design-records) — Agent routing for design records
