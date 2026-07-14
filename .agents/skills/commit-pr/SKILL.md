---
name: commit-pr
description: Commit, push, and create or update a Video.js pull request. Use when the user explicitly requests repository publication or PR preparation.
---

# Commit and pull request

Preserve unrelated user changes. Do not stage or rewrite files you cannot attribute to the requested work.

## Workflow

1. Inspect `git status`, staged and unstaged diffs, branch name, and commits since the merge base.
2. Read the relevant reference only when needed:
   - Commit wording: `references/commit.md`
   - Scope selection: `references/scope.md`
   - Branch naming: `references/branch.md`
   - PR title/body: `references/pr.md`
3. Split changes into semantic commits when they represent independently reviewable purposes. Never use `git add .`; stage explicit paths or a reviewed set.
4. Run the checks appropriate to each commit before committing.
5. Use a conventional commit accepted by `commitlint.config.js`; treat that config and recent history as the current source of truth.
6. Push only when requested. Check for an existing PR before creating one.
7. Build the PR description from the complete branch diff, not only the last commit. Explain motivation, behavior, verification, and relevant issue links.
8. Report commit hashes, checks, and the PR URL.

Do not amend, force-push, change an existing PR title, or update an existing PR body without clear user authorization.

## Example

Input: “Commit these skill changes and open a draft PR.”

Output: Intentionally scoped commits, recorded checks, a pushed branch, and the draft PR URL.
