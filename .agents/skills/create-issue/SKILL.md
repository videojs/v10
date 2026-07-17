---
name: create-issue
description: Draft or create a videojs/v10 GitHub issue. Use when asked to file a bug, feature, task, or repository issue.
---

# Create a GitHub issue

## Workflow

1. Gather the observed behavior, expected behavior, motivation, affected surface, reproduction or acceptance criteria, and relevant links.
2. Search open and closed issues for duplicates or useful prior art.
3. Inspect the relevant code or docs when needed to make the issue actionable; do not invent a root cause.
4. Do not add labels or a type prefix. The triage bot owns both so auto-triage has one source of truth.
5. Draft:
   - A concise Title Case title without a type prefix.
   - Context and user impact.
   - Reproduction for bugs, or scope/acceptance criteria for features.
   - Relevant implementation notes only when verified.
6. Show the final draft and obtain confirmation before creating the external issue unless the user explicitly authorized immediate creation.
7. Create it without labels using `gh issue create` or the available GitHub connector and return the URL.

Keep the issue focused on the problem and acceptance boundary. Do not prescribe an unverified implementation.

## Example

Input: “Draft an issue for captions disappearing after a source change.”

Output: A concise title and evidence-backed body with impact, reproduction, expected behavior, and acceptance criteria.
