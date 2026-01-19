# Review Templates

Issue format and report templates for accessibility reviews.

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.ts:42`
**Why:** Impact on users
**WCAG:** Criterion violated (e.g., 2.1.1 Keyboard)
**Fix:** Concrete suggestion

<!-- Before -->

<button><svg>...</svg></button>

<!-- After -->

<button aria-label="Close"><svg>...</svg></button>
```

## Severity Levels

| Level      | Meaning                                | Examples                                                         |
| ---------- | -------------------------------------- | ---------------------------------------------------------------- |
| `CRITICAL` | Blocks assistive technology users      | Missing accessible name, keyboard trap, no focus indicator       |
| `MAJOR`    | Significant barrier, workarounds exist | Poor focus contrast, missing live region, touch target too small |
| `MINOR`    | Suboptimal but functional              | Verbose label, missing description, skipped heading level        |
| `NIT`      | Enhancement opportunity                | Could use aria-describedby, label could be shorter               |

---

## Issue Examples

### CRITICAL — Missing accessible name

```markdown
### [CRITICAL] Icon button has no accessible name

**What:** Button contains only an SVG icon with no text alternative
**Where:** `src/ui/controls/close-button.ts:15`
**Why:** Screen readers announce "button" with no indication of purpose
**WCAG:** 4.1.2 Name, Role, Value
**Fix:** Add aria-label

<!-- Before -->
<button class="close-btn">
  <svg>...</svg>
</button>

<!-- After -->
<button class="close-btn" aria-label="Close">
  <svg aria-hidden="true">...</svg>
</button>
```

### MAJOR — Missing keyboard handler

```markdown
### [MAJOR] Custom control only responds to click

**What:** Slider thumb has onClick but no keyboard support
**Where:** `src/ui/slider/thumb.ts:23`
**Why:** Keyboard users cannot adjust volume
**WCAG:** 2.1.1 Keyboard
**Fix:** Add keydown handler for arrow keys

<!-- Before -->
<div role="slider" onClick={handleClick}>

<!-- After -->
<div role="slider" onClick={handleClick} onKeyDown={handleKeyDown}>
```

### MINOR — Verbose label

```markdown
### [MINOR] Button label is unnecessarily verbose

**What:** Label includes redundant information
**Where:** `src/ui/controls/play-button.ts:8`
**Why:** Screen reader users hear repetitive content
**WCAG:** 2.4.6 Headings and Labels
**Fix:** Shorten to essential information

<!-- Before -->

aria-label="Click this button to play the video"

<!-- After -->

aria-label="Play"
```

---

## Report Template

```markdown
# Accessibility Review: [filename or component]

## Score: X/100

| Severity | Count | Points |
| -------- | ----- | ------ |
| Critical | X     | -X     |
| Major    | X     | -X     |
| Minor    | X     | -X     |
| Nit      | X     | -X     |

## Critical Issues

[List all CRITICAL issues using full format above]

---

## Major Issues

[List all MAJOR issues using full format above]

---

## Minor Issues

| Severity | Location     | Issue               | WCAG  | Fix             |
| -------- | ------------ | ------------------- | ----- | --------------- |
| MINOR    | `file.ts:12` | Verbose label       | 2.4.6 | Shorten         |
| NIT      | `file.ts:34` | Missing describedby | 1.3.1 | Add description |

---

## Good Patterns Found

- [What's working well]
- [Worth preserving]

---

## Summary

[2-3 paragraph assessment: overall accessibility posture, priority fixes, recommendations]

---

## Recommendations

### Before Release

1. [Critical fixes]

### Next Release

1. [Major improvements]

### Future

1. [Minor enhancements]
```

---

## PR Review Template

For reviewing accessibility changes in pull requests:

```markdown
# PR Accessibility Review: #[number]

## Changed Files

| File               | Type          | Review      |
| ------------------ | ------------- | ----------- |
| `src/ui/menu.ts`   | New component | Full review |
| `src/ui/button.ts` | Modified      | Diff review |

## New Components

### src/ui/menu.ts

[Full review using standard template]

## Modified Components

### src/ui/button.ts

**Changed:** Lines 45-60

[Review of changed accessibility surface only]

## Checklist

- [ ] New interactive elements have accessible names
- [ ] Keyboard navigation works correctly
- [ ] Focus management handles new UI flows
- [ ] ARIA attributes reflect component state
- [ ] Live regions announce dynamic changes
- [ ] No new accessibility regressions
```

---

## Console Output Format

For quick terminal-based reviews:

```
═══════════════════════════════════════════════════
A11Y REVIEW: [filename]
═══════════════════════════════════════════════════

CRITICAL (X issues)
───────────────────
[A11Y] Line X: Issue title
  code snippet
  Fix: recommended fix
  WCAG: criterion

MAJOR (X issues)
───────────────────
[A11Y] Line X: Issue title
  code snippet
  Fix: recommended fix
  WCAG: criterion

MINOR (X issues)
───────────────────
[A11Y] Line X: Issue title
  code snippet
  Fix: recommended fix
  WCAG: criterion

═══════════════════════════════════════════════════
SUMMARY: X critical, X major, X minor
Score: X/100
═══════════════════════════════════════════════════
```
