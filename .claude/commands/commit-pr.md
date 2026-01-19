---
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read, mcp__github__*
description: Commit all changes and create a PR following project conventions
---

# Commit & PR

Stage all changes, create a conventional commit, and open a pull request.

## Usage

```
/commit-pr [refs]
```

- `refs` (optional): Issue/PR references (e.g., `#123`, `fixes #456`, `closes #789`)

### Examples

```
/commit-pr
/commit-pr #123
/commit-pr fixes #456
/commit-pr #123 closes #456
```

## Arguments

$ARGUMENTS

## Conventions

### Commit Message Format

Follow commitlint with conventional commits:

```
type(scope): lowercase description
```

**Types**: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`, `style`

**Scopes**: See `commitlint.config.js`

**Breaking changes**: Use `!` suffix (e.g., `feat(core)!: remove deprecated API`)

### Scope Inference

Infer scope from changed file paths:
- `packages/core/` → `core`
- `packages/store/` → `store`
- `packages/utils/` → `utils`
- `packages/html/` → `html`
- `packages/react/` → `react`
- `packages/react-native/` → `react-native`
- `site/` → `site`
- `.claude/` → `claude`
- `.github/workflows/` → `ci`
- `examples/` → `examples`
- Root config files → `root`

When multiple packages changed, use the most significant one or `packages` for broad changes.

### PR Title

Same as commit message, except:
- RFC proposals → `RFC: Title`
- Discovery/exploration → `Discovery: Title`

### PR Body Template

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

### PR Description Principles

1. **Progressive disclosure** — summary visible, details collapsed
2. **Why over what** — explain motivation, not mechanics
3. **Human-readable** — no file lists or auto-generated noise
4. **Issue linking** — `Refs` for related, `Closes` for resolved
5. **Concise** — reviewers should understand in 30 seconds

## Your Tasks

You are committing changes and creating a pull request.

### Step 1: Analyze Changes

1. Run `git status` to identify changed files
2. Run `git diff --staged` and `git diff` to understand what changed
3. Read modified files if needed for context

### Step 2: Determine Commit Type and Scope

Based on the changes:
- **Type**: What kind of change? (feat/fix/chore/refactor/docs/test/etc)
- **Scope**: Which package or area? (infer from file paths)
- **Breaking**: Does it break existing behavior? (use `!` suffix)

### Step 3: Create Commit

1. Stage all changes: `git add -A`
2. Create commit with conventional message:
   ```bash
   git commit -m "type(scope): description"
   ```

### Step 4: Push and Create PR

1. Push branch to remote: `git push -u origin HEAD`
2. Create PR using `gh pr create` (preferred) or fallback to `mcp__github__create_pull_request`:

   ```bash
   gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
   ## Summary

   ...
   EOF
   )"
   ```

   - **Title**: Same as commit message (or RFC/Discovery prefix if applicable)
   - **Body**: Follow the template above
   - Include any issue refs from arguments in the body

### Step 5: Report

Return the PR URL to the user.

## Important

- Always stage ALL changes with `git add -A`
- Prefer `gh` CLI for GitHub operations; fallback to MCP tools if `gh` unavailable
- Never list files in the PR body — describe meaningful behavior changes
- Keep the summary to 1-3 sentences
- Use `<details>` for implementation notes only when genuinely complex
- Link issues: `Refs` for related context, `Closes` for issues this PR resolves
