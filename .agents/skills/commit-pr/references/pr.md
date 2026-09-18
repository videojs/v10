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

## Visual Evidence

[Only for observable changes to skin or site visual elements: paired, annotated before/after screenshots; affected interaction states; and a short video when motion or interaction cannot be judged from still images]

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

## Visual Evidence

Include a `Visual Evidence` section only when a PR changes observable skin or site visual elements. Do not require it for non-visual changes, even when they touch skin or site files.

- Show paired before/after screenshots at matching viewport, theme, content, and UI state so the comparison is trustworthy.
- Mark each changed region with a clear outline, box, arrow, or concise callout. Keep the underlying UI visible and use the same markings in the before and after images when practical.
- Capture every interaction state affected by the change, such as hover, focus, active, expanded, disabled, loading, or responsive states. Omit unaffected states.
- Add a short video when the change involves animation, transitions, timing, responsive reflow, or a multi-step interaction that static screenshots cannot demonstrate clearly.
- Label assets and place them beside the claim they support rather than presenting an unexplained gallery.

## What NOT to Include

- File lists (reviewers see the diff)
- Auto-generated changelogs
- Excessive implementation details (use `<details>` if needed)
- Visual evidence for changes that do not alter skin or site visual elements

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

- Add guard to debounce rapid play/pause calls
- Prevent redundant state transitions

## Testing

Covered by new test in `media-feature.test.ts`. Manual: rapidly click play/pause.
```
