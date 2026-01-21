# Single-File Feature Template

For straightforward proposals with one concept.

See `references/features.md` for general guidance.

---

```markdown
---
status: draft
---

# Feature Name

One-sentence summary of what this enables.

## Problem

What pain exists. Be specific about the current state and why it's insufficient.

## Solution

High-level approach. One paragraph max.

## Quick Start

Minimal working example. Show the feature in use.

\`\`\`ts
// The simplest possible example that demonstrates value
\`\`\`

## API

### Function/Component Name

\`\`\`ts
function featureName(config: Config): Result;
\`\`\`

| Parameter | Type     | Description        |
| --------- | -------- | ------------------ |
| `config`  | `Config` | What this controls |

**Returns:** What comes back and what to do with it.

### Types

\`\`\`ts
interface Config {
// ...
}
\`\`\`

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

- Question 1?
- Question 2?
```
