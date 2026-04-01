## Directory Structure

```
internal/design/feature-name/
├── index.md          # Problem, API surface, state, behavior
└── decisions.md      # Only when decisions are raised and debated
```

`decisions.md` is **optional**. Don't scaffold it upfront — add it when real trade-offs are discussed and alternatives are weighed. Let the code and implementation speak for themselves.

Architecture and implementation details belong in `.claude/plans/`, not here.

---

## index.md

```markdown
---
status: draft
---

# Feature Name

One-sentence summary.

## Problem

Two or three paragraphs establishing the pain point.

What's the current state? Why is it insufficient?
What happens if we don't solve this?

## Quick Start

### React

\`\`\`tsx
// Minimal working example
\`\`\`

### HTML

\`\`\`ts
// Same concept, different platform
\`\`\`

## API Surface

### createFeature / Primary Entry Point

\`\`\`ts
// Primary factory or entry point
\`\`\`

### Returns

\`\`\`ts
const {
  // What you get back
} = createFeature(config);
\`\`\`

### Core Types

\`\`\`ts
// Only the types users interact with directly
\`\`\`

## State & Store

### Slice Definition

What state does this feature introduce?

\`\`\`ts
// State shape
interface FeatureState {
  // ...
}
\`\`\`

### Dependencies

- What other features/slices does this depend on?

### Side Effects

- What happens on connect/disconnect?
- Any subscriptions or observers?

## Behavior

How it works at a high level. No implementation details.

- What triggers updates
- What side effects occur
- Error handling approach

## Prior Art

- **HTMLMediaElement** — [what the native platform provides]
- **Player libraries** — [edge cases, feature requirements, context from Media Chrome, Vidstack, Video.js v8, Plyr]

## Open Questions

- Unresolved items
```

---

## decisions.md (optional)

Only create this file when decisions are actually debated — alternatives weighed, trade-offs discussed.

```markdown
# Design Decisions

Rationale behind Feature Name choices.

## Decision Title

**Decision:** What we chose.

**Alternatives:**

- Alternative A — why rejected
- Alternative B — why rejected

**Rationale:** Why this choice wins. Keep concise.

## Another Decision

**Decision:** What we chose.

**Alternatives:**

- Option A — trade-off
- Option B — trade-off

**Rationale:** Brief explanation.

## Open Questions

### Question 1

Context and options being considered.
```
