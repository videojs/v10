# RFCs

Proposals that need buy-in before proceeding.

## What Belongs Here

RFCs are for proposals that require alignment from others:

- Changes to public API surface
- Product direction decisions
- User-facing developer experience changes
- Significant changes to core architecture

## When to Write an RFC

Write an RFC when:

- Changes public API surface
- Affects product direction
- Affects user-facing developer experience
- Significant changes to core architecture
- Needs buy-in from others

**Use a Design Doc instead** (`internal/design/`) for decisions you own — architectural choices in your area, internal patterns, component specs.

**Skip both for:** Bug fixes, small features, implementation details, documentation updates.

## File Format

RFCs use a YAML frontmatter header for status tracking:

```markdown
---
status: draft
---

# Title

Content...
```

When implemented, add implementation details:

```markdown
---
status: implemented
implemented-in: v10.0.0-alpha.5
implementation-plan: .claude/plans/example.md
---
```

## Status Lifecycle

| Status        | Meaning                            |
| ------------- | ---------------------------------- |
| `draft`       | Under discussion, not yet accepted |
| `accepted`    | Approved for implementation        |
| `implemented` | Code shipped                       |
| `superseded`  | Replaced by another RFC            |

## Directory Structure

```
rfc/
├── README.md           # This file
├── feature-name.md     # Single-file RFC
└── feature-name/       # Multi-file RFC
    ├── index.md        # Overview and quick start
    ├── decisions.md    # Design decisions and rationale
    └── examples.md     # Usage examples
```

## Contributing an RFC

### Branch and PR Workflow

1. **Create branch**: `rfc/feature-name`
2. **PR title while open**: `[RFC] Feature Name`
3. **Squash commit when merged**: `docs(rfc): feature name`

### Example

```bash
git checkout -b rfc/player-api
# ... write RFC ...
git push -u origin rfc/player-api
gh pr create --title "[RFC] Player API"
```

When the RFC is accepted and merged, the squash commit becomes:

```
docs(rfc): player api
```

## See Also

- [Design Docs](/internal/design/README.md) — Decisions you own
- [Plans](/.claude/plans/README.md) — Implementation details
- [CLAUDE.md](/CLAUDE.md#design-documents) — How these relate
