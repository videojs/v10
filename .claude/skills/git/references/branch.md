# Branch Naming

Conventions for naming feature and fix branches.

## Format

```
type/short-description
```

- **type**: Same as commit type (`feat`, `fix`, `chore`, etc.)
- **short-description**: Kebab-case summary (2-4 words)

## Examples

| Branch                      | Purpose                          |
| --------------------------- | -------------------------------- |
| `feat/volume-slider`        | New volume slider component      |
| `feat/media-queries`        | Add media query support          |
| `fix/slider-drag-edge`      | Fix edge case in slider dragging |
| `fix/race-condition-queue`  | Fix race condition in queue      |
| `refactor/store-cleanup`    | Clean up store internals         |
| `chore/bump-deps`           | Dependency updates               |
| `docs/readme-examples`      | Update README examples           |
| `test/slider-keyboard`      | Add keyboard tests for slider    |
| `rfc/request-api`           | RFC for new request API design   |
| `design/queue-design`       | Design doc for queue architecture|
| `plan/store-simplification` | Planning store architecture      |

## Guidelines

1. **Keep it short** — branch names appear in many places
2. **Be descriptive** — should hint at the change
3. **Use kebab-case** — lowercase with hyphens
4. **Match commit type** — branch type should match eventual commit type

## Special Branches

| Branch     | Purpose                            |
| ---------- | ---------------------------------- |
| `main`     | Primary branch                     |
| `rfc/*`    | Request for comments / proposals   |
| `design/*` | Design docs (decisions you own) |
| `plan/*`   | Planning and discovery work        |

## Issue-Linked Branches

When working on a specific issue, you may include the issue number:

```
feat/42-volume-slider
fix/89-race-condition
```

This is optional but helps traceability.
