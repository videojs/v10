---
allowed-tools: Bash(git:*), Bash(gh:*), Glob, Grep, Read, mcp__github__*, skill
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

### Step 1: Gather Change Context

1. Run `git diff --name-only $(git merge-base HEAD main)...HEAD` to list changed files
2. Run `git diff $(git merge-base HEAD main)...HEAD` to see the full diff
3. If an issue was provided, fetch its details for context

### Step 2: Categorize Changes

Categorize the changed files to determine which review criteria apply:

| File Pattern                                   | Category      | Skills              |
| ---------------------------------------------- | ------------- | ------------------- |
| `packages/*/src/**/*.ts` (non-test)            | API/Code      | `dx`, `api-design`  |
| `packages/html/**`, `packages/react/**` (UI)   | UI Components | `component`, `aria` |
| `site/**/*.md`, `**/README.md`, `**/CLAUDE.md` | Documentation | `docs`              |
| `packages/*/src/**/*.test.ts`                  | Tests         | General review      |
| `.claude/**`                                   | Agent Config  | General review      |
| Config files (`.json`, `.config.*`)            | Configuration | General review      |

**Report detected categories** before proceeding:

> Detected changes: [API/Code], [Documentation], [UI Components], etc.

### Step 3: Load Skills (Optional)

For deeper domain-specific review, load the relevant skill using the skill tool:

| Category      | Load Skill   | For Deeper Review               |
| ------------- | ------------ | ------------------------------- |
| API/Code      | `dx`         | `dx/review/workflow.md`         |
| API/Code      | `api-design` | `api-design/review/workflow.md` |
| UI Components | `component`  | References in SKILL.md          |
| UI Components | `aria`       | `aria/references/checklist.md`  |
| Documentation | `docs`       | `docs/review/workflow.md`       |

Skip this step for quick reviews using the inline checklists below.

### Step 4: Apply Skill-Based Review Checklists

Based on detected categories, apply the relevant quick checklists:

---

#### API/Code Changes Checklist (from `dx` and `api-design` skills)

**Types & Inference:**

- [ ] Types infer without manual annotation
- [ ] Generics infer from arguments, not explicit type params
- [ ] No unnecessary `as` casts
- [ ] Explicit context narrowing where needed

**API Surface:**

- [ ] Config objects for 3+ parameters (no long param lists)
- [ ] No function overloads (use config objects instead)
- [ ] Flat returns for independent values
- [ ] Consistent naming with existing codebase

**Composition & Extensibility:**

- [ ] Extension through composition, not inheritance
- [ ] Tree-shakeable exports
- [ ] Framework-agnostic where appropriate

**Patterns:**

- [ ] Uses existing utilities from `@videojs/utils` where applicable
- [ ] Follows Symbol identification pattern for cross-realm objects
- [ ] Subscribe pattern returns unsubscribe function
- [ ] Destroy pattern guards re-entry

---

#### UI Component Changes Checklist (from `component` and `aria` skills)

**Component Architecture:**

- [ ] Compound component pattern where appropriate
- [ ] Render props over implicit requirements
- [ ] Controlled and uncontrolled modes supported
- [ ] Context properly scoped for nesting

**Styling:**

- [ ] Data attributes for state-based styling (`data-*`)
- [ ] CSS variables for customization
- [ ] No inline animation JS (prefer CSS transitions)

**Accessibility:**

- [ ] Proper ARIA roles and attributes
- [ ] Keyboard navigation supported
- [ ] Focus management correct (trap, restore, roving)
- [ ] Screen reader announcements where needed

---

#### Documentation Changes Checklist (from `docs` skill)

**Tone & Style:**

- [ ] No filler words ("basically", "simply", "just", "in order to")
- [ ] No hedging ("might", "could", "perhaps")
- [ ] Active voice, second person ("you")
- [ ] Direct and confident

**Structure:**

- [ ] Code before explanation (show, don't tell first)
- [ ] Progressive disclosure (simple → complex)
- [ ] Matches appropriate doc type (handbook, guide, API ref, component)
- [ ] Has "See Also" section with cross-links

**Code Examples:**

- [ ] All imports shown
- [ ] Examples are runnable/copy-pasteable
- [ ] Includes Do/Don't patterns where helpful

**AI Readiness:**

- [ ] Self-contained (doesn't rely on external context)
- [ ] Clean markdown (no complex HTML)

---

#### Test Changes Checklist

- [ ] Tests follow `act → assert` pattern
- [ ] Test file named `<module>.test.ts`
- [ ] `describe()` uses exact exported name
- [ ] Uses `vi.fn()` for mocks
- [ ] Tests live in `tests/` directory next to implementation

---

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
