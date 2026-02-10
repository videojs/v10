---
name: spf-implement
description: >-
  Implement SPF GitHub issues using TDD workflow with human approval gates.
  Use when implementing P1-P17 (Pure/Isolated), O1-O13 (Orchestration), or F1-F18 (Features).
  Triggers: "implement #NNN", "work on P1", "start issue 391".
---

# SPF Implementation Workflow

Test-Driven Development workflow for implementing Stream Processing Framework issues with human approval at each phase.

## When to Use

Use this skill when implementing any SPF GitHub issue from the work breakdown:
- **Pure/Isolated** (P1-P17) - Parsers, algorithms, utilities
- **Orchestration** (O1-O13) - State management, coordination
- **Features** (F1-F18) - End-to-end features
- **Testing** (T1-T10) - Testing infrastructure

## Workflow Overview

```
Phase 0: SETUP     → Create branch, set issue to "In progress"
Phase 1: RED       → Write failing tests
Phase 2: GREEN     → Implement (tests + typecheck + lint)
Phase 3: REFACTOR  → Clean up if needed
Phase 4: UPDATE    → Commit, squash merge to Epic branch, delete feature branch
→ Human verifies and pushes Epic branch
```

## Prerequisites

Before starting:
1. Identify the GitHub issue number (e.g., #391 for P1)
2. Understand issue dependencies (check `.claude/spf-breakdown/dependencies.md`)
3. Check if blocked by other issues
4. Reference spike code in `.archive/spf-xstate-poc/` if applicable
5. Understand branch hierarchy (see Branch Strategy below)

## Branch Strategy

**Hierarchy:**
```
main
  └─ feat/spf-v1-foundation (SPF base branch)
      ├─ feat/spf-wave-1-epic-384 (Epic #384)
      │   ├─ feat/spf-p1-issue-391 (sub-issue)
      │   └─ feat/spf-p2-issue-392 (sub-issue)
      ├─ feat/spf-wave-2-epic-385 (Epic #385)
      └─ ... (other epics)
```

**Merge Flow:**
- Sub-issue branch → squash merge to Epic branch (local)
- Epic branch → squash merge to SPF base branch (local)
- SPF base branch → squash merge to main (local)

**Branch Naming:**
- Epic: `feat/spf-wave-N-epic-XXX`
- Sub-issue: `feat/spf-<id>-issue-XXX` (e.g., `feat/spf-p1-issue-391`)

**Base Branch:** Always `feat/spf-v1-foundation` (created from main)

## Phase 0: SETUP - Branch & Issue Preparation

### Steps:

1. **Check current branch** - Should be on SPF base or Epic branch
2. **Determine parent branch:**
   - For Epic issues (#384-387): Parent is `feat/spf-v1-foundation`
   - For sub-issues: Parent is Epic branch (e.g., `feat/spf-wave-1-epic-384`)
3. **Check if parent Epic branch exists:**
   - If implementing sub-issue and Epic branch doesn't exist, create it:
     ```bash
     git checkout feat/spf-v1-foundation
     git checkout -b feat/spf-wave-N-epic-XXX
     ```
4. **Create sub-issue branch:**
   ```bash
   git checkout <parent-epic-branch>
   git checkout -b feat/spf-<id>-issue-XXX
   ```
5. **Update GitHub issue status to "In progress":**
   ```bash
   # Get project item ID
   ITEM_ID=$(gh api graphql -f query='query {
     repository(owner: "videojs", name: "v10") {
       issue(number: XXX) {
         projectItems(first: 1) {
           nodes { id }
         }
       }
     }
   }' --jq '.data.repository.issue.projectItems.nodes[0].id')

   # Set status to "In progress"
   gh project item-edit --id "$ITEM_ID" \
     --project-id PVT_kwDOADIolc4BHP_1 \
     --field-id PVTSSF_lADOADIolc4BHP_1zg4DzzY \
     --single-select-option-id 47fc9ee4
   ```

### Output:
- On correct feature branch
- GitHub issue status → "In progress"

---

## Phase 1: RED - Write Failing Tests

### Steps:

1. **Read the GitHub issue** to understand acceptance criteria
2. **Reference spike code** (if applicable):
   - Check `.claude/spf-spike-reference.md` for file mapping
   - Read spike implementation in `.archive/spf-xstate-poc/`
   - Read spike tests for test patterns
3. **Create test file** in appropriate location:
   - Pure functions: `packages/spf/src/<module>/tests/<name>.test.ts`
   - Features: Same pattern
4. **Write comprehensive tests** covering:
   - All acceptance criteria from GitHub issue
   - Happy path scenarios
   - Edge cases (empty input, errors, etc.)
   - Integration scenarios (if applicable)
5. **Run tests** - should FAIL (no implementation yet)

### Output:
- Test file created
- Tests fail (RED) as expected

### Human Gate 🚦
**STOP and show tests to user for review before proceeding.**

Questions to ask:
- Do these tests cover the right behaviors?
- Any test cases missing?
- Are assertions clear and correct?
- Ready to proceed to implementation?

---

## Phase 2: GREEN - Implement to Pass Tests

### Steps:

1. **Reference spike implementation** (if applicable):
   - Read `.archive/spf-xstate-poc/` code
   - Extract patterns and algorithms
   - DO NOT copy wholesale - rebuild cleanly
2. **Create implementation file(s)**:
   - Follow module structure from O10
   - Use CMAF-HAM type model (composition with `Ham & Base & AddressableObject`)
   - Follow CLAUDE.md conventions (naming, patterns, etc.)
3. **Implement to make tests pass**
4. **Update all.ts exports:**
   - Add new types and functions to `packages/spf/src/all.ts`
   - Organize by feature area (State, Events, Reactive, Features, etc.)
   - Keep alphabetical within sections
5. **Run quality checks in order:**
   ```bash
   # 1. Run tests
   pnpm test <test-file>

   # 2. Run typecheck
   npx tsc --noEmit

   # 3. Run lint
   pnpm lint:fix:file <files>

   # 4. Measure bundle size
   pnpm -F @videojs/spf size:all

   # 5. Re-run tests (verify still passing)
   pnpm test <test-file>
   ```
6. **Verify architecture**:
   - Follows CMAF-HAM model (type composition)
   - Follows CLAUDE.md conventions
   - No obvious code smells

### Output:
- Implementation complete
- All tests passing (GREEN)
- TypeScript clean
- Lint clean
- all.ts updated with new exports
- Bundle size measured
- Architecture verified

### Human Gate 🚦
**STOP and show implementation to user for review.**

Questions to ask:
- Does the implementation look clean?
- Any architectural concerns?
- Any refactoring needed?
- Ready to proceed?

---

## Phase 3: REFACTOR - Clean Up (Optional)

### Steps:

1. **Review for refactoring opportunities**:
   - Code duplication?
   - Complex logic that could be simplified?
   - Better abstractions available?
   - Performance improvements?
2. **Refactor if needed** (keep it minimal for V1)
3. **Re-run quality checks**:
   ```bash
   pnpm test <test-file>
   npx tsc --noEmit
   pnpm lint:fix:file <files>
   ```

### When to Skip:
- Code is already clean
- No obvious improvements
- Time-constrained (V1 deadline)

### Output:
- Cleaner code (if refactored)
- All checks still passing

---

## Phase 4: UPDATE - Complete Issue & Merge Locally

### Steps:

1. **Commit the implementation:**
   ```bash
   git add src/
   git commit -m "feat(spf): implement <feature> (<issue-id>)

   [Description of implementation]

   [Key details]

   Implements #<number>

   Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"
   ```

2. **Squash merge to Epic branch:**
   ```bash
   # Switch to Epic branch
   git checkout <parent-epic-branch>

   # Squash merge feature branch
   git merge --squash <feature-branch>

   # Commit the squashed changes
   git commit -m "feat(spf): <feature-name> (<issue-id>)

   [Summary]

   Implements #<number>

   Co-Authored-By: Claude Sonnet 4.5 (1M context) <noreply@anthropic.com>"

   # Delete feature branch
   git branch -d <feature-branch>
   ```

3. **Add comment to GitHub issue** with completion status:
   ```bash
   gh issue comment <number> --repo videojs/v10 --body "
   ## ✅ Implementation Complete

   **Status:** All acceptance criteria met

   ### Completed:
   - ✅ [List acceptance criteria checked off]

   ### Files Created:
   - [List files with brief description]

   ### Quality Checks:
   - ✅ Tests: X/X passing (Y total)
   - ✅ TypeScript: Clean
   - ✅ Lint: Clean

   ### Bundle Size:
   - Minified + Gzipped: X.XX KB (measured via \`pnpm size:all\`)
   - Percentage of 20 KB target: XX.X%
   - Remaining budget: XX.XX KB

   **Merged to Epic branch** \`<parent-epic-branch>\`
   "
   ```

### Output:
- Commit created on feature branch
- Squash merged to Epic branch
- Feature branch deleted locally
- GitHub issue commented

### Human Gate 🚦
**STOP - Verify merge and push when ready.**

User can:
- Review the squashed commit in Epic branch
- Run tests on Epic branch to verify
- Push Epic branch when satisfied: `git push origin <epic-branch>`

**Note:** Issue status stays "In progress" until Epic is merged to main

---

## Quality Checklist

Before each human gate, verify:
- [ ] Tests passing
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Lint clean (`pnpm lint:fix:file`)
- [ ] Follows CMAF-HAM model (if applicable)
- [ ] Follows CLAUDE.md conventions
- [ ] Bundle size reasonable

---

## Tips for Success

### For Pure/Isolated Issues (P1-P17):
- Usually simple and fast (30-60 min each)
- Can do multiple in one session
- Batch commit 3-5 together if desired
- Reference spike code extensively

### For Orchestration Issues (O1-O13):
- More complex, needs design thinking
- Reference `.archive/` patterns heavily
- May need iteration on architecture
- Take time for review

### For Feature Issues (F1-F18):
- End-to-end integration
- Depends on Pure + Orchestration pieces
- More extensive testing needed
- Critical path items need extra care

### Bundle Size Awareness:
- **Measure after each implementation:** `pnpm -F @videojs/spf size:all`
- **Update all.ts** with new exports before measuring
- **Target:** < 20 KB total (minified + gzipped)
- **Track in commits:** Include actual measurements in issue comments
- Use simple implementations where possible
- Avoid heavy dependencies

**Current status:** 3.32 KB used (16.6%), 16.68 KB remaining

---

## Example Session (P1)

**User:** "Let's implement P1"

**Phase 1 (RED):**
- Read issue #391
- Read `.archive/spf-xstate-poc/src/core/hls/parse-multivariant.ts`
- Write tests in `src/core/hls/tests/parse-multivariant.test.ts`
- Tests fail (no implementation)
- **→ Show user, get approval**

**Phase 2 (GREEN):**
- Implement `src/core/hls/parse-multivariant.ts`
- Create helpers (`parse-attributes.ts`, `resolve-url.ts`)
- Create types (`src/core/types/index.ts`)
- Run tests → pass
- Run typecheck → pass
- Run lint → pass
- **→ Show user, get approval**

**Phase 3 (REFACTOR):**
- Review code, looks clean
- Skip refactoring
- **→ Proceed**

**Phase 4 (UPDATE):**
- Comment on #391 with completion status
- Prepare commit message
- Stage files
- **→ User reviews and commits**

---

## Reference Files

- **Work Breakdown:** `.claude/spf-breakdown/all-issues.md` (58 issues)
- **Dependencies:** `.claude/spf-breakdown/dependencies.md` (critical path)
- **Spike Code:** `.archive/spf-xstate-poc/` (pattern reference)
- **Spike Mapping:** `.claude/spf-spike-reference.md` (issue → file)
- **GitHub Issues:** https://github.com/videojs/v10/issues?q=is:issue+label:spf

---

## Rebase Management

### Checking if Rebase Needed

Before starting new work, check if SPF base branch needs rebasing:

```bash
# Fetch latest main
git fetch origin main

# Check if main has moved ahead
git log feat/spf-v1-foundation..origin/main --oneline
```

If commits are shown, SPF base is behind main.

### When to Rebase

**Rebase SPF base (`feat/spf-v1-foundation`) off main:**
- Periodically (daily or every few days)
- Before starting new Epic branches
- When main has significant changes
- **User decides when** - not automated

### How to Rebase (Manual)

```bash
# On SPF base branch
git checkout feat/spf-v1-foundation
git fetch origin main
git rebase origin/main

# If conflicts, resolve and continue
git rebase --continue

# Force push (safe since it's a feature branch)
git push --force-with-lease

# Rebase Epic branches off updated base
git checkout feat/spf-wave-1-epic-384
git rebase feat/spf-v1-foundation
```

**Note:** Rebasing is manual to give user control over timing and conflict resolution.

---

## Branch and Local Merge Management

### Useful Commands

**Check current branch structure:**
```bash
git branch --list "feat/spf-*"
```

**Squash merge feature branch to Epic:**
```bash
git checkout <epic-branch>
git merge --squash <feature-branch>
git commit -m "feat(spf): <description>"
```

**Delete merged feature branch:**
```bash
git branch -d <feature-branch>
```

**Push Epic branch to remote:**
```bash
git push origin <epic-branch>
```

---

## GitHub Issue Status Transitions

**Status flow:**
1. **Start issue** → Set to "In progress" (Phase 0)
2. **Squash merge to Epic** → Stays "In progress" (Phase 4)
3. **Epic merged to SPF base** → Stays "In progress"
4. **SPF base merged to main** → Set to "Done" (manual)

**Why "Done" only after main merge:**
- Work isn't truly complete until in main
- Ensures accurate project tracking
- Prevents premature completion

---

## Project Field IDs (for reference)

```bash
PROJECT_ID="PVT_kwDOADIolc4BHP_1"
STATUS_FIELD_ID="PVTSSF_lADOADIolc4BHP_1zg4DzzY"
STORY_POINTS_FIELD_ID="PVTF_lADOADIolc4BHP_1zg8g5mA"

# Status option IDs
STATUS_BLOCKED="16a80fac"
STATUS_UP_NEXT="e395082b"
STATUS_IN_PROGRESS="47fc9ee4"
STATUS_READY_FOR_REVIEW="f75ad846"
STATUS_DONE="98236657"
```

