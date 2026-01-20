# Pull Requests

Conventions for PR titles and descriptions.

## PR Title

Same as commit message format:

```
type(scope): lowercase description
```

**Exceptions:**

| Prefix       | Use for                              |
| ------------ | ------------------------------------ |
| `[RFC]`      | Request for comments / proposals     |
| `Discovery:` | Exploration / research / prototyping |

**Note:** RFC PRs use `[RFC] Title` format while open. When merged, the squash commit uses `docs(rfc): title`.

## PR Body Template

```markdown
Refs #123
Closes #456

## Summary

[1-3 sentences: what changed and why]

## Changes

[Bullet points of meaningful changes — describe behavior, NOT file list]

<details>
<summary>Implementation details</summary>

[Only if complex: architecture decisions, tradeoffs, notable patterns]

</details>

## Testing

[How to verify: manual steps, test commands, or "covered by existing tests"]
```

## Issue Linking

| Keyword  | Effect                              |
| -------- | ----------------------------------- |
| `Refs`   | Links to related issue (stays open) |
| `Closes` | Closes issue when PR merges         |
| `Fixes`  | Closes issue when PR merges         |

Place issue references at the top of the body, before Summary.

## Description Principles

1. **Progressive disclosure** — summary visible, details collapsed
2. **Why over what** — explain motivation, not mechanics
3. **Human-readable** — no file lists or auto-generated noise
4. **Concise** — reviewers should understand in 30 seconds

## What NOT to Include

- File lists (reviewers see the diff)
- Auto-generated changelogs
- Excessive implementation details (use `<details>` if needed)
- Screenshots unless UI change (prefer before/after if included)

## Examples

### Feature PR

```markdown
Closes #42

## Summary

Add volume slider component with keyboard support and ARIA labels.

## Changes

- Volume slider with drag and click interactions
- Keyboard control: arrow keys adjust by 5%, Page Up/Down by 10%
- Muted state toggle via slider or M key
- ARIA: `slider` role with proper labeling

## Testing

1. `pnpm -F @videojs/html test`
2. Manual: drag slider, use keyboard, verify screen reader announces changes
```

### Bug Fix PR

```markdown
Fixes #89

## Summary

Fix race condition where rapid play/pause could leave player in inconsistent state.

## Changes

- Queue play/pause requests to prevent overlapping operations
- Add guard against redundant state transitions

## Testing

Covered by new test in `media-slice.test.ts`. Manual: rapidly click play/pause.
```
