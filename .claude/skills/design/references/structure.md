# Design Doc Structure

When to use single-file vs multi-file Design Docs.

## Decision Tree

```
Is this a single concept with straightforward trade-offs?
├─ Yes → Single file
└─ No → Multi-file (index.md + optional decisions.md)
```

## Single File

**Use when:**

- One concept, one decision
- Trade-offs fit in one page
- Reader can absorb in one sitting

**Structure:** See [`templates/feature-single.md`](../templates/feature-single.md) for the full template.

**Example:** A new utility function, a small API addition, an internal pattern.

## Multi-File

**Use when:**

- Multiple related concepts that benefit from separate pages
- The API surface doc is long enough that decisions would overwhelm it

**Structure:**

```
internal/design/feature-name/
├── index.md          # Problem, API surface, state, accessibility
└── decisions.md      # Only when decisions are raised and debated
```

**`index.md`** is the design doc. It covers the API surface — what users interact with, what state it needs, and how accessibility works. Think of it as a proto-user-facing doc.

**`decisions.md`** is optional. Only create it when real debates happen — alternatives are weighed, trade-offs are discussed. Don't scaffold it upfront. Let the code and implementation speak for themselves.

**What about architecture?** Internal structure, data flow, and implementation details belong in `.claude/plans/` as implementation plans, not design docs. Design docs focus on the "what" and "why" of the API surface, not the "how" of internals.

**Example:** A compound UI component, a multi-part feature with store integration.

## index.md Contents

The entry point and primary document:

1. **Frontmatter** — Status, date
2. **Problem** — What pain exists
3. **Solution overview** — High-level approach
4. **Quick Start** — Minimal working example
5. **API Surface** — Props, data attributes, CSS custom properties, events
6. **State & Store** — Features/slices required, state shape
7. **Accessibility** — ARIA, keyboard, focus management
8. **Open Questions** — Unresolved items

For components, the API surface section can highlight important part-specific details inline — no need for a separate parts file.

## Splitting Guidance

**Signs you need multi-file:**

- Several decisions were debated and deserve documented rationale
- The API surface doc alone is comprehensive; decisions would double it

**Signs to keep as single file:**

- Everything fits in one readable page
- Splitting would create tiny files
- No significant decisions were debated

## File Naming

| File           | Purpose                                     |
| -------------- | ------------------------------------------- |
| `index.md`     | API surface, state, accessibility           |
| `decisions.md` | Rationale for debated decisions (optional)   |

Use lowercase with hyphens. Match existing patterns in `internal/design/`.

## Cross-Linking

When using `decisions.md`, link from the main doc:

```markdown
See [decisions.md](decisions.md#decision-title) for rationale.
```

Use section anchors for precise links. Keep links relative.
