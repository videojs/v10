# Internal design records

These documents preserve architecture, constraints, and rationale that code and tests cannot explain by themselves. Treat implementation and tests as the source of current behavior.

## Choose the smallest durable record

- `internal/design/<area>/`: architecture, subsystem, or feature design owned by the author.
- `internal/decisions/`: one tactical choice and its tradeoffs.
- `rfc/`: a proposal requiring wider approval, especially public API or hard-to-reverse product direction.
- `.agents/plans/`: temporary implementation notes; delete before merge or extract durable rationale here.

Skip a record for ordinary implementation detail, inventories, status logs, or information already clear from source and tests.

## Layout

| Area | Contents |
| --- | --- |
| `element/` | Custom-element architecture |
| `i18n/` | Locale and translation architecture |
| `media/` | Media model architecture |
| `site/` | Documentation-site decisions |
| `spf/` | Streaming framework architecture, conventions, feature registry, and use-case compositions |
| `ui/` | Component and interaction designs |

Put new records in an area directory. Add a new area only when at least two durable records are likely; otherwise use the nearest existing area.

## Status

| Status | Meaning |
| --- | --- |
| `draft` | Proposed or still under active design |
| `decided` | Choice made; implementation may follow |
| `active` | Living convention, index, or registry maintained with the code |
| `partial` | Registry feature or use case is partly implemented |
| `implemented` | Shipped; retained for rationale and stable contracts |
| `superseded` | Replaced; link the successor |
| `reference` | Prior art or research, not a status claim |

## Minimal format

```markdown
---
status: decided
date: YYYY-MM-DD
---

# Title

## Decision

## Context

## Alternatives considered

## Rationale
```

Use a different structure for a living reference or registry, but keep frontmatter and make the document's authority clear.

## Maintenance

- Link current source and tests; do not copy APIs, schemas, or file inventories.
- When implementation lands, collapse the record to durable rationale, constraints, consequences, and source pointers; remove speculative mechanics and current-behavior inventories.
- When a record becomes wrong, update it, mark it superseded with a successor, or delete it if no rationale remains.
- Keep implemented records only when their constraints, alternatives, or tradeoffs still help future changes.

Use `write-design-doc` for a design or decision record and `write-rfc` for wider proposals.
