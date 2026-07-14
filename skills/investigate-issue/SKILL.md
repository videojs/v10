---
name: investigate-issue
description: Investigate GitHub issues without changing code. Use when asked to analyze, diagnose, scope, or produce an evidence-backed implementation plan.
---

# GitHub issue analysis

Do not implement the fix.

1. Fetch every referenced issue, comments, labels, and linked PRs or discussions.
2. Restate the observable problem, constraints, and acceptance criteria; identify missing or conflicting information.
3. Inspect the relevant code, tests, history, and nearest `AGENTS.md` before forming a root-cause hypothesis.
4. Apply domain-specific constraints only when the affected code or acceptance criteria make them material.
5. Distinguish verified cause, likely inference, and open question.
6. Produce a sequenced plan with files/surfaces, behavior changes, tests, compatibility risks, and documentation impact.
7. Link the source issues and relevant repository evidence.

When multiple issues overlap, explain the dependency or shared root and propose an order that keeps each change reviewable.

## Example

Input: “Investigate why the player stalls after switching live sources.”

Output: A verified problem statement, evidence-ranked root-cause analysis, open questions, and a sequenced implementation plan without code changes.
