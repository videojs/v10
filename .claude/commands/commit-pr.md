---
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read, question, mcp__github__*, skill
description: Commit all changes and create or update a PR following project conventions
---

# Commit & PR

Stage all changes, create a conventional commit, and open a pull request (or push to an existing one).

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

Load the `git` skill for:

- Commit message format (`references/commit.md`)
- Scope inference (`references/scope.md`)
- PR title and body template (`references/pr.md`)

## Your Tasks

### Step 1: Load Conventions

Load the `git` skill to understand commit and PR conventions.

### Step 2: Analyze Changes

1. Run `git status` to identify changed files
2. Run `git diff --staged` and `git diff` to understand what changed
3. Read modified files if needed for context

### Step 3: Determine Commit Type and Scope

Based on the changes and `git` skill conventions:

- **Type**: What kind of change? (feat/fix/chore/refactor/docs/test/etc)
- **Scope**: Which package or area? (infer from file paths per `references/scope.md`)
- **Breaking**: Does it break existing behavior? (use `!` suffix)

### Step 4: Create Commit

1. Stage all changes: `git add -A`
2. Create commit with conventional message:
   ```bash
   git commit -m "type(scope): description"
   ```

### Step 5: Push and Create/Update PR

1. Push branch to remote: `git push -u origin HEAD`

2. Check if a PR already exists for this branch:

   ```bash
   gh pr list --head "$(git branch --show-current)" --json number,url,title,body --jq '.[0]'
   ```

3. **If PR exists**:
   - Ask the user if they want to update the PR description (use the `question` tool)
   - **If yes**: Generate new body based on all commits in the PR, then update:
     ```bash
     gh pr edit <number> --body "new body"
     ```
     Note: Only update the body, never the title.
   - **If no**: Skip — the push already updated the PR code

4. **If no PR exists**: Create one using `gh pr create`:

   ```bash
   gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
   ## Summary

   ...
   EOF
   )"
   ```

   Follow the PR body template from `references/pr.md`.

### Step 6: Report

- **Existing PR (no update)**: "Pushed to PR #123: <url>"
- **Existing PR (updated)**: "Updated PR #123: <url>"
- **New PR**: "Created PR #123: <url>"

## Important

- Always stage ALL changes with `git add -A`
- Always check for existing PR before creating — avoid duplicate PRs
- Prefer `gh` CLI for GitHub operations; fallback to MCP tools if `gh` unavailable
- Follow PR description principles: why over what, concise, no file lists
