# Feature RFC Template

For APIs, architecture, patterns, and extensibility decisions.

## When to Use

- New public APIs
- Architectural changes affecting multiple packages
- Cross-cutting patterns
- Extensibility mechanisms

## Single-File Template

For straightforward proposals with one concept.

````markdown
---
status: draft
---

# Feature Name

One-sentence summary of what this enables.

## Problem

What pain exists. Be specific about the current state and why it's insufficient.

**Example:**

```
Users want X, but currently they must Y.
This causes Z problems: [list specific issues]
```

## Solution

High-level approach. One paragraph max.

## Quick Start

Minimal working example. Show the feature in use.

```ts
// The simplest possible example that demonstrates value
```

## API

### Function/Component Name

```ts
// Signature
function featureName(config: Config): Result;
```

| Parameter | Type     | Description        |
| --------- | -------- | ------------------ |
| `config`  | `Config` | What this controls |

**Returns:** What comes back and what to do with it.

### Types

```ts
interface Config {
  // ...
}
```

## Behavior

How it works at a high level. No implementation details.

- What triggers updates
- What side effects occur
- Error handling approach

## Trade-offs

| Gain        | Cost            |
| ----------- | --------------- |
| What we get | What we give up |

## Open Questions

Unresolved decisions that need input.

- Question 1?
- Question 2?
````

## Multi-File Template

For complex proposals with 3+ distinct concepts.

### Directory Structure

```
rfc/feature-name/
├── index.md          # Overview, problem, quick start, surface API
├── architecture.md   # How it works internally
├── decisions.md      # Design decisions and rationale
└── examples.md       # Extended usage examples
```

### index.md

````markdown
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

### Platform 1 (e.g., React)

```tsx
// Minimal working example
```

### Platform 2 (e.g., HTML/Lit)

```ts
// Same concept, different platform
```

## Surface API

### createFeature

```ts
// Primary factory or entry point
```

### Returns

```ts
const {
  // What you get back
} = createFeature(config);
```

### Core Types

```ts
// Only the types users interact with directly
```

## Related Docs

- [decisions.md](decisions.md) — Why these choices
- [architecture.md](architecture.md) — How it works internally
- [examples.md](examples.md) — More usage examples
````

### architecture.md

````markdown
# Architecture

Internal structure of Feature Name.

## Overview

```
ASCII diagram showing key components and data flow
```

One-paragraph summary of the architecture.

## Component 1

### Purpose

What this component does.

### Interface

```ts
interface Component1 {
  // ...
}
```

### Behavior

How it works. Keep high-level.

## Component 2

(Same structure)

## Data Flow

How information moves through the system.

```
Diagram or numbered steps
```

## Constraints

- Architectural limitations
- Invariants that must hold
- Performance considerations
````

### decisions.md

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

### Question 2

(Same structure)
```

### examples.md

````markdown
# Examples

Usage examples for Feature Name.

## Basic Usage

### Scenario 1

```ts
// Example with comments explaining what's happening
```

### Scenario 2

```ts
// Another example
```

## Advanced Usage

### Custom Configuration

```ts
// Example with non-default options
```

### Integration with Other Features

```ts
// How this works alongside other APIs
```

## Platform-Specific

### React

```tsx
// React-specific patterns
```

### HTML/Lit

```ts
// Lit-specific patterns
```
````

## Tips

1. **Start with index.md** — Problem and quick start first
2. **Add files as needed** — Don't create empty architecture.md
3. **Link between files** — "See [decisions.md](decisions.md) for rationale"
4. **Keep examples minimal** — Just enough to show the concept
5. **Tables for structured info** — Parameters, returns, options

## Reference

See `rfc/player-api/` for a complete multi-file example.
