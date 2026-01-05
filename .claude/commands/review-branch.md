---
allowed-tools: Bash(git:*), Glob, Grep, Read, mcp__github__*
description: Review changes in the current Git branch and suggest improvements
---

# Branch Review

Inspect the changes made in this Git branch. Identify any possible issues
and suggest improvements. Do not write code. Explain the problems clearly
and propose a brief plan for addressing them.

## Usage

```
/review-branch [issue]
```

- `issue` (optional): GitHub issue number or URL for additional context

### Examples

```
/review-branch
/review-branch 123
/review-branch https://github.com/videojs/v10/issues/123
```

## Source Issue (optional)

$ARGUMENTS

If an issue number or URL was provided above, fetch the issue details using GitHub tools to get additional context.

## Your Tasks

You are an experienced software developer with expertise in code review.

Review the change history between the current branch and its base branch. Analyze all relevant code for possible issues, including but not limited to:

- Code quality and readability
- Code style that matches or mimics the rest of the codebase
- Potential bugs or logical errors
- Edge cases that may not be handled
- Performance considerations
- Security vulnerabilities
- Backwards compatibility (if applicable)
- Test coverage and effectiveness

For test coverage, consider if the changes are in an area of the codebase that is testable. If so, check if there are appropriate tests added or modified. Consider if the code itself should be modified to be more testable.

Think deeply about the implications of the changes here and proposed.

**ONLY CREATE A SUMMARY. DO NOT WRITE ANY CODE.**
