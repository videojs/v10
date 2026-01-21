# RFC Structure

When to use single-file vs multi-file RFCs.

## Decision Tree

```
Is this a single concept with straightforward trade-offs?
├─ Yes → Single file
└─ No → Are there 3+ distinct topics that deserve separate pages?
         ├─ Yes → Multi-file
         └─ No → Single file with clear sections
```

## Single File

**Use when:**

- One concept, one proposal
- Trade-offs fit in one page
- Reader can absorb in one sitting

**Structure:**

```markdown
---
status: draft
---

# Feature Name

One-sentence summary.

## Problem

What pain exists.

## Solution

How we solve it.

## Quick Start

Show it working (code example).

## API

Surface area — what users interact with.

## Trade-offs

What we gain, what we lose.

## Open Questions

Unresolved decisions.
```

**Example:** A new utility function, a small API addition.

## Multi-File

**Use when:**

- 3+ distinct concepts that deserve separate pages
- Different audiences need different sections
- Complex architecture with multiple layers

**Structure:**

```
rfc/feature-name/
├── index.md          # Overview, problem, solution, quick start
├── architecture.md   # How it works internally
├── decisions.md      # Design decisions and rationale
└── examples.md       # Extended usage examples
```

**Add files as needed:**

- `primitives.md` — Library author API (if different from user API)
- `migration.md` — Breaking changes and migration path
- `alternatives.md` — Rejected approaches (if many)

**Example:** Player API (two stores, multiple features, hooks + controllers).

## index.md Contents

The entry point for multi-file RFCs:

1. **Frontmatter** — Status, links to implementation
2. **Contents table** — Links to all files with one-line descriptions
3. **Problem** — What pain exists
4. **Solution overview** — High-level approach
5. **Quick Start** — Minimal working example
6. **Surface API** — What users interact with
7. **Links** — Point to details in other files

Keep `index.md` focused on "what" — save "why" for `decisions.md` and "how" for `architecture.md`.

## Splitting Guidance

**Signs you need to split:**

- Scrolling past content to find what you need
- Mixing "how to use" with "how it works"
- Different readers need different sections
- Rationale sections are longer than the API they explain

**Signs to keep together:**

- Everything fits on one screen
- Splitting would create tiny files
- Cross-references would outnumber content

## File Naming

| File              | Purpose                              |
| ----------------- | ------------------------------------ |
| `index.md`        | Entry point, overview                |
| `architecture.md` | Internals, diagrams                  |
| `decisions.md`    | Rationale, alternatives considered   |
| `examples.md`     | Usage examples beyond quick start    |
| `primitives.md`   | Library author API                   |
| `migration.md`    | Breaking changes, upgrade path       |
| `alternatives.md` | Rejected approaches (rare)           |

Use lowercase with hyphens. Match existing patterns in `rfc/`.

## Cross-Linking

In multi-file RFCs, link between files:

```markdown
See [architecture.md](architecture.md) for internal details.

**Rationale:** Covered in [decisions.md](decisions.md#flat-api-shape).
```

Use section anchors for precise links. Keep links relative.
