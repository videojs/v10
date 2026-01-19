# Review Templates

Issue format and report templates for component reviews.

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.ts:42`
**Why:** Impact on users/developers
**Pattern:** Which pattern violated
**Fix:** Concrete suggestion

// Before
problematic()

// After
improved()
```

## Severity Levels

| Level      | Meaning                      | Examples                                                   |
| ---------- | ---------------------------- | ---------------------------------------------------------- |
| `CRITICAL` | Breaks users, blocks release | Wrong state model, missing controlled support, memory leak |
| `MAJOR`    | Significant DX issue         | Boolean trap, inconsistent naming, missing data attributes |
| `MINOR`    | Improvement opportunity      | Verbose API, missing CSS variable, could use prop getter   |
| `NIT`      | Polish, optional             | Naming consistency, minor ergonomics                       |

---

## Issue Examples

### CRITICAL — Missing controlled support

```markdown
### [CRITICAL] Component only supports uncontrolled state

**What:** No `value` prop, only `defaultValue`
**Where:** `src/ui/slider/slider.ts:15`
**Why:** Cannot integrate with external state management
**Pattern:** Controlled & Uncontrolled State (SKILL.md Pattern 2)
**Fix:** Add controlled state support

// Before
interface SliderProps {
defaultValue?: number;
onChange?: (value: number) => void;
}

// After
interface SliderProps {
value?: number;
defaultValue?: number;
onValueChange?: (value: number, details: ChangeDetails) => void;
}
```

### MAJOR — Boolean trap

```markdown
### [MAJOR] Boolean parameter with unclear meaning

**What:** Positional boolean in component API
**Where:** `src/ui/menu/menu.ts:8`
**Why:** `<Menu modal>` — what does `modal` mean at call site?
**Pattern:** Props conventions (references/props.md)
**Fix:** Use explicit prop name or config object

// Before

<Menu modal>

// After

<Menu modal={{ closeOnOutsideClick: true, trapFocus: true }}>
// Or just document the boolean clearly if simple enough
```

### MAJOR — Missing data attributes

```markdown
### [MAJOR] State not exposed via data attributes

**What:** Open state only available via JavaScript
**Where:** `src/ui/dialog/dialog.ts:23`
**Why:** Cannot style based on state without JS; breaks CSS-only patterns
**Pattern:** State via Data Attributes (SKILL.md Pattern 4)
**Fix:** Add data-open/data-closed attributes

// Before

<div class="dialog" style={open ? 'display: block' : 'display: none'}>

// After

<div class="dialog" data-open={open ? '' : undefined} data-closed={!open ? '' : undefined}>
```

### MINOR — Inconsistent handler naming

```markdown
### [MINOR] Change handler doesn't follow convention

**What:** Uses `onChange` instead of `onValueChange`
**Where:** `src/ui/slider/slider.ts:12`
**Why:** Inconsistent with other components in library
**Pattern:** Props conventions (references/props.md)
**Fix:** Rename to follow convention

// Before
onChange?: (value: number) => void;

// After
onValueChange?: (value: number, details: ChangeDetails) => void;
```

---

## Report Template

```markdown
# Component Review: [component name]

## Overall Score: X/10

| Dimension    | Score | Critical | Major | Minor |
| ------------ | ----- | -------- | ----- | ----- |
| Architecture | X/10  | X        | X     | X     |
| State        | X/10  | X        | X     | X     |
| Props & API  | X/10  | X        | X     | X     |
| Styling      | X/10  | X        | X     | X     |

## Critical Issues

[List all CRITICAL issues using full format above]

---

## Major Issues

[List all MAJOR issues using full format above]

---

## Minor Issues

| Severity | Location     | Issue                | Pattern | Fix          |
| -------- | ------------ | -------------------- | ------- | ------------ |
| MINOR    | `file.ts:12` | Inconsistent naming  | Props   | Rename       |
| NIT      | `file.ts:34` | Missing CSS variable | Styling | Add variable |

---

## Good Patterns Found

- [What's working well]
- [Worth preserving]

---

## Accessibility

[Reference aria skill review or note if not yet run]

Load `aria` skill for full accessibility review.

---

## Summary

[2-3 paragraph assessment: architecture quality, API consistency, priority fixes]

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

For reviewing component changes in pull requests:

```markdown
# PR Component Review: #[number]

## Changed Components

| Component          | Type     | Review      |
| ------------------ | -------- | ----------- |
| `src/ui/menu.ts`   | New      | Full review |
| `src/ui/button.ts` | Modified | Diff review |

## New Components

### src/ui/menu.ts

[Full review using standard template]

## Modified Components

### src/ui/button.ts

**Changed:** Lines 45-60

[Review of changed API surface only]

## Checklist

- [ ] Compound component structure correct
- [ ] Controlled/uncontrolled state supported
- [ ] Change handlers include details object
- [ ] Data attributes expose state
- [ ] CSS variables documented
- [ ] No new anti-patterns introduced
- [ ] Accessibility review completed (aria skill)
```
