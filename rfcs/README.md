# RFCs

Request for Comments (RFC) documents for Video.js 10 architecture and API design decisions.

## What Belongs Here

RFCs document significant design decisions that benefit from review and discussion:

- Major API changes or new APIs
- Architectural decisions
- Design patterns used across packages
- Breaking changes with migration paths

## When to Write an RFC

Write an RFC when:

- Introducing a new public API surface
- Making architectural changes that affect multiple packages
- Proposing patterns that will be used throughout the codebase
- Changes need input from multiple contributors

Skip the RFC for:

- Bug fixes
- Small features contained to one package
- Implementation details that don't affect public APIs
- Documentation updates

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
rfcs/
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
git checkout -b rfc/slice-accessor-design
# ... write RFC ...
git push -u origin rfc/slice-accessor-design
gh pr create --title "[RFC] Slice Accessor Design"
```

When the RFC is accepted and merged, the squash commit becomes:

```
docs(rfc): slice accessor design
```

## Relationship to Implementation Plans

RFCs focus on **what** and **why** — the design, rationale, and public API.

Implementation details live in `.claude/plans/` — step-by-step plans, code snippets, and AI-agent context for executing the RFC.

An RFC may link to its implementation plan:

```markdown
---
status: implemented
implementation-plan: .claude/plans/feature-name.md
---
```
