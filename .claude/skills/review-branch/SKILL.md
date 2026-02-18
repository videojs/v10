---
name: review-branch
description: >-
  Review changes in the current Git branch and suggest improvements.
  Triggers: "review branch", "review changes", "code review".
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read, mcp__github__*
agent: plan
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

### Step 1: Gather Change Context

1. Run `git diff --name-only $(git merge-base HEAD main)...HEAD` to list changed files
2. Run `git diff $(git merge-base HEAD main)...HEAD` to see the full diff
3. If an issue was provided, fetch its details for context

### Step 2: Categorize Changes

Categorize the changed files to determine which review criteria apply:

| File Pattern                                   | Category      | Skills              |
| ---------------------------------------------- | ------------- | ------------------- |
| `packages/*/src/**/*.ts` (non-test)            | API/Code      | `api`               |
| `packages/html/**`, `packages/react/**` (UI)   | UI Components | `component`, `aria` |
| `site/**/*.md`, `**/README.md`, `**/CLAUDE.md` | Documentation | `docs`               |
| `site/**/reference/*.mdx`                      | API Reference | `api-reference`      |
| `packages/*/src/**/*.test.ts`                  | Tests         | General review      |
| `.claude/**`                                   | Agent Config  | General review      |
| Config files (`.json`, `.config.*`)            | Configuration | General review      |

**Report detected categories** before proceeding:

> Detected changes: [API/Code], [Documentation], [UI Components], etc.

### Step 3: Load Skills (Optional)

For deeper domain-specific review, load the relevant skill:

| Category      | Load Skill  | For Deeper Review              |
| ------------- | ----------- | ------------------------------ |
| API/Code      | `api`       | `api/review/workflow.md`       |
| UI Components | `component` | `component/review/workflow.md` |
| UI Components | `aria`      | `aria/review/workflow.md`      |
| Documentation | `docs` | `docs/review/workflow.md` |

Skip this step for quick reviews using the inline checklists below.

### Step 4: Apply Skill-Based Review

Based on detected categories, load the relevant skill's review checklist:

| Category      | Load Checklist                     |
| ------------- | ---------------------------------- |
| API/Code      | `api/review/checklist.md`          |
| UI Components | `component/review/checklist.md`    |
| Accessibility | `aria/review/checklist.md`         |
| Documentation | `docs/review/workflow.md`    |

For test changes, apply these checks:

- [ ] Tests follow `act → assert` pattern
- [ ] Test file named `<module>.test.ts`
- [ ] `describe()` uses exact exported name
- [ ] Uses `vi.fn()` for mocks
- [ ] Tests live in `tests/` directory next to implementation

### Step 5: General Code Review

In addition to skill-based checks, review for:

- **Code quality and readability** — matches codebase style
- **Potential bugs or logical errors**
- **Edge cases that may not be handled**
- **Performance considerations** — 60fps for UI, no unnecessary re-renders
- **Security vulnerabilities**
- **Backwards compatibility** (if applicable)
- **Test coverage** — are changes adequately tested?

### Step 6: Produce Summary

Structure your review as:

```markdown
## Change Summary

[1-2 sentences describing what changed]

## Detected Categories

- [x] API/Code changes
- [ ] UI Component changes
- [x] Documentation changes
- [ ] Test changes

## Findings

### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.ts:42`
**Why:** Impact on users/developers
**Fix:** Concrete suggestion

### [SEVERITY] Another issue...

## Recommendations

[Prioritized list of suggested improvements]
```

**Severity Levels:**

| Level      | Meaning                                    | Action                |
| ---------- | ------------------------------------------ | --------------------- |
| `CRITICAL` | Breaks functionality, type safety, or a11y | Must fix before merge |
| `MAJOR`    | Violates core principles, hurts DX         | Should fix            |
| `MINOR`    | Suboptimal but workable                    | Consider fixing       |
| `NIT`      | Polish, style preferences                  | Optional              |

Think deeply about the implications of the changes here and proposed.

**ONLY CREATE A SUMMARY. DO NOT WRITE ANY CODE.**
