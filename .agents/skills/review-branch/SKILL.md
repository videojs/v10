---
name: review-branch
description: Review the current branch without editing code. Use for PR-style findings, regressions, merge-base comparison, or pre-merge risk assessment.
---

# Branch review

Review the branch as a whole; do not implement fixes.

1. Determine the intended base and inspect the merge-base diff, commit history, and working tree separately.
2. Fetch a linked issue or PR when supplied and derive the acceptance boundary.
3. Read changed code in context, including callers, tests, exports, and relevant configuration.
4. Check whether the change is a good citizen of the whole codebase and documentation: follow established ownership, naming, architecture, public contracts, and nearby patterns rather than judging the diff in isolation.
5. Apply only the domain constraints and review criteria that the changed surface requires.
6. Prioritize correctness, regressions, security, accessibility, public compatibility, and missing tests. Avoid style findings already enforced by tools.
7. Validate suspected findings with a targeted command or source trace when practical.

Lead with findings ordered by severity. For each, include the file/line, concrete failure mode, evidence, and smallest correction. Then summarize the change and residual test gaps. Say explicitly when no actionable findings remain.

## Example

Input: “Review this branch against main.”

Output: Severity-ordered actionable findings with locations and evidence, followed by a concise change summary and residual test gaps.
