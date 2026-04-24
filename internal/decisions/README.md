# Decisions

ADR-style records of single tactical decisions.

## What Belongs Here

A decision doc captures **one specific choice**: what was decided, why, and what was ruled out. Keep them short and focused — usually one page.

Write one when:

- You picked one approach over another and want the reasoning on record.
- A decision depends on or supersedes an earlier one (link across docs).
- You want future contributors to understand why the code is the way it is.

## Decisions vs Design Docs

Use a **design doc** (`internal/design/`) when you're specifying architecture, a feature, or a subsystem — forward-looking, often longer, status ranges from `draft` → `decided` → `implemented` → `superseded`.

Use a **decision doc** here when you're recording a single trade-off within that work — short, always `status: decided`.

A design doc often spawns several decision docs as implementation choices get made.

## Format

```markdown
---
status: decided
date: 2026-01-27
---

# Title

## Decision

What you decided. Be direct.

## Context

Why this came up. What problem triggered the decision. Link related decisions.

## Alternatives Considered

- **Option A** — Why not chosen
- **Option B** — Why not chosen

## Rationale

Why this choice wins. Keep concise.
```

## File Naming

Lowercase with hyphens, name after the subject of the decision:

```
captions.md
gestures-as-components.md
provider-attach.md
```

## See Also

- [Design Docs](/internal/design/README.md) — Architecture specs and feature designs
- [RFCs](/rfc/README.md) — Proposals needing buy-in
- [Plans](/.claude/plans/) — Implementation notes
- [CLAUDE.md](/CLAUDE.md#design-documents) — How these relate
