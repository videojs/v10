# Design Docs

Decisions you own — documented for posterity.

## What Belongs Here

Design Docs are **decisions you own**. Write one when:

- Making architectural decisions in your area
- Choosing between implementation approaches
- Introducing design patterns others will follow
- Documenting internal APIs or component specs

## When to Use RFC Instead

Use an RFC (`rfc/`) when:

- Changes public API surface
- Affects product direction
- Affects user-facing developer experience
- Significant changes to core architecture
- Hard to reverse once shipped

**Rule of thumb:** If you need someone else's approval, it's an RFC. If you're documenting your own decision, it's a Design Doc.

## Format

```markdown
---
status: decided
date: 2025-01-27
---

# Title

## Decision

What you decided. Be direct.

## Context

Why this came up. What problem triggered the decision.

## Alternatives Considered

- **Option A** — Why not chosen
- **Option B** — Why not chosen

## Rationale

Why this choice wins. Keep concise.
```

## Status Values

| Status | Meaning |
|--------|---------|
| `draft` | Thinking through it, not final |
| `decided` | Decision made, documented |
| `superseded` | Replaced by another design doc |

## File Naming

Use lowercase with hyphens:

```
queue-design.md
hook-naming.md
skin-theming.md
```

## See Also

- [RFCs](/rfc/README.md) — Proposals needing buy-in
- [Plans](/.claude/plans/README.md) — Implementation details
- [CLAUDE.md](/CLAUDE.md#design-documents) — How these relate
