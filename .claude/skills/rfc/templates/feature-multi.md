## Directory Structure

```
rfc/feature-name/
├── index.md          # Overview, problem, quick start, surface API
├── architecture.md   # How it works internally
├── decisions.md      # Design decisions and rationale
└── examples.md       # Extended usage examples
```

---

## index.md

```markdown
---
status: draft
---

# Feature Name

One-sentence summary.

## Contents

| Document                           | Purpose                        |
| ---------------------------------- | ------------------------------ |
| [index.md](index.md)               | Overview, quick start, API     |
| [architecture.md](architecture.md) | Internal structure             |
| [decisions.md](decisions.md)       | Design decisions and rationale |
| [examples.md](examples.md)         | Extended usage examples        |

## Problem

Two or three paragraphs establishing the pain point.

What's the current state? Why is it insufficient?
What happens if we don't solve this?

## Quick Start

### React

\`\`\`tsx
// Minimal working example
\`\`\`

### HTML/Lit

\`\`\`ts
// Same concept, different platform
\`\`\`

## Surface API

### createFeature

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

## Related Docs

- [decisions.md](decisions.md) — Why these choices
- [architecture.md](architecture.md) — How it works internally
- [examples.md](examples.md) — More usage examples
```

---

## architecture.md

```markdown
# Architecture

Internal structure of Feature Name.

## Overview

\`\`\`
ASCII diagram showing key components and data flow
\`\`\`

One-paragraph summary of the architecture.

## Component 1

### Purpose

What this component does.

### Interface

\`\`\`ts
interface Component1 {
// ...
}
\`\`\`

### Behavior

How it works. Keep high-level.

## Component 2

(Same structure)

## Data Flow

How information moves through the system.

## Constraints

- Architectural limitations
- Invariants that must hold
- Performance considerations
```

---

## decisions.md

```markdown
# Design Decisions

Rationale behind Feature Name choices.

## Category 1 (e.g., Naming)

### Decision Title

**Decision:** What we chose.

**Alternatives:**

- Alternative A — why rejected
- Alternative B — why rejected

**Rationale:** Why this choice wins. Keep concise.

## Category 2 (e.g., API Shape)

### Another Decision

**Decision:** What we chose.

**Alternatives:**

- Option A — trade-off
- Option B — trade-off

**Rationale:** Brief explanation.

## Open Questions

### Question 1

Context and options being considered.
```

---

## examples.md

```markdown
# Examples

Usage examples for Feature Name.

## Basic Usage

### Scenario 1

\`\`\`ts
// Example with comments explaining what's happening
\`\`\`

### Scenario 2

\`\`\`ts
// Another example
\`\`\`

## Advanced Usage

### Custom Configuration

\`\`\`ts
// Example with non-default options
\`\`\`

### Integration with Other Features

\`\`\`ts
// How this works alongside other APIs
\`\`\`

## Platform-Specific

### React

\`\`\`tsx
// React-specific patterns
\`\`\`

### HTML/Lit

\`\`\`ts
// Lit-specific patterns
\`\`\`
```
