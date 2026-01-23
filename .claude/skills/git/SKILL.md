---
name: git
description: >-
  Git workflow conventions for Video.js 10. Commit messages, PR descriptions,
  branch naming, and scope inference. Triggers: "commit", "push", "create PR",
  "conventional commit", "branch name", "open pull request".
context: fork
---

# Git

Git workflow conventions for Video.js 10.

## Reference Material

| Task                  | Load                   |
| --------------------- | ---------------------- |
| Writing commits       | `references/commit.md` |
| Inferring scope       | `references/scope.md`  |
| Creating/updating PRs | `references/pr.md`     |
| Naming branches       | `references/branch.md` |

## Quick Reference

**Commit:** `type(scope): lowercase description`

**Branch:** `type/short-description`

**PR Title:** Same as commit (or `RFC:` / `Discovery:` prefix)

## Process

1. Create branch following naming convention
2. Make changes
3. Commit with conventional message
4. Push and create PR with proper description

For the `/commit-pr` command, all steps after branching are automated.
