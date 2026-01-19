# Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint.

## Format

```
type(scope): lowercase description
```

- **type**: Category of change (required)
- **scope**: Package or area affected (required)
- **description**: Short summary in lowercase (required)

## Types

| Type       | Use for                                      |
| ---------- | -------------------------------------------- |
| `feat`     | New feature                                  |
| `fix`      | Bug fix                                      |
| `chore`    | Maintenance (deps, configs, no prod changes) |
| `docs`     | Documentation only                           |
| `refactor` | Code change that doesn't fix or add features |
| `perf`     | Performance improvement                      |
| `test`     | Adding or updating tests                     |
| `ci`       | CI/CD changes                                |
| `build`    | Build system changes                         |
| `style`    | Code style (formatting, semicolons, etc.)    |

## Breaking Changes

Use `!` suffix on type for breaking changes:

```
feat(core)!: remove deprecated API
refactor(store)!: rename slice methods
```

The `!` signals breaking changes in the changelog.

## Examples

```
feat(html): add volume slider component
fix(store): prevent race condition in queue
chore(root): bump vitest to v3
docs(core): document request lifecycle
refactor(utils): simplify event listener cleanup
test(html): add slider interaction tests
```

## WIP Commits

Commits starting with `wip` (case-insensitive) bypass commitlint validation. Use sparingly for work-in-progress that will be squashed.

## Authoritative Source

See `commitlint.config.js` for the enforced scope list.
