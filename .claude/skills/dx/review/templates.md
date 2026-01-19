# Review Templates

Issue format and merge report templates for DX review.

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.ts:42`
**Why:** Impact on users
**Fix:** Concrete suggestion

// Before
...

// After
...
```

## Severity Levels

| Level | Meaning | Examples |
|-------|---------|----------|
| `CRITICAL` | Breaks users, blocks release | Wrong types, runtime errors, a11y failures |
| `MAJOR` | Significant DX issue | Poor inference, boolean traps, no tree-shaking |
| `MINOR` | Improvement opportunity | Missing type guards, verbose API |
| `NIT` | Polish, optional | Naming consistency, minor ergonomics |

---

## Issue Examples

### CRITICAL — Inference failure

```markdown
### [CRITICAL] Generic forces explicit type annotation

**What:** Users must provide type parameter manually
**Where:** `createStore.ts:15`
**Why:** Inference should flow from usage
**Fix:** Use curried pattern

// Before
const store = createStore<State>({ count: 0 })

// After  
const store = createStore({ count: 0 })
```

### MAJOR — Boolean trap

```markdown
### [MAJOR] Boolean trap in function signature

**What:** Positional boolean with unclear meaning
**Where:** `createSlider.ts:8`
**Why:** `createSlider(0, 100, true)` — what does `true` mean?
**Fix:** Use config object

// Before
function createSlider(min: number, max: number, vertical: boolean)

// After
function createSlider(config: { min: number; max: number; vertical?: boolean })
```

### MINOR — Missing type guard

```markdown
### [MINOR] No type guard for discriminated union

**What:** Users must narrow with string comparison
**Where:** `types.ts:45`
**Why:** Loses type narrowing benefits
**Fix:** Export type guard

// After
export function isPlaying(state: MediaState): state is PlayingState {
  return state.status === 'playing'
}
```

### MAJOR — A11y failure

```markdown
### [MAJOR] No data attributes for state

**What:** Uses inline styles for disabled state
**Where:** `Button.tsx:34`
**Why:** Can't style with CSS, fights theming
**Fix:** Use data-disabled attribute

// Before
<button style={{ opacity: disabled ? 0.5 : 1 }}>

// After
<button data-disabled={disabled || undefined}>
```

---

## Merge Report Template

```markdown
# DX Review: [package/file name]

## Overall Score: X/10

| Dimension | Score | Issues |
|-----------|-------|--------|
| Types | X/10 | X critical, X major, X minor |
| API Design | X/10 | X critical, X major, X minor |
| Composition | X/10 | X critical, X major, X minor |
| Accessibility | X/10 | X critical, X major, X minor |

## Critical Issues

[List all CRITICAL issues]

---

## Major Issues

[List all MAJOR issues]

---

## Minor/Nit Issues

| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|
| MINOR | `store.ts:45` | No type guard | Add `isPlaying()` |
| NIT | `api.ts:12` | Inconsistent naming | Rename |

---

## Good Patterns Found

- [What's working well]

---

## Summary

[2-3 paragraph assessment]

---

## Recommendations

### Before Release
1. [Critical fix]

### Next Release
1. [Major priority]

### Future
1. [Minor priority]

---

<details>
<summary>Full Types Review</summary>
[Complete output]
</details>

<details>
<summary>Full API Design Review</summary>
[Complete output]
</details>

<details>
<summary>Full Composition Review</summary>
[Complete output]
</details>

<details>
<summary>Full Accessibility Review</summary>
[Complete output]
</details>
```

---

## PR Review Template

```markdown
## PR Review: #123

### Breaking Changes
- `createStore` signature changed — [Full review needed]

### New APIs
- `useSelector` hook added — [Review new surface]

### Internal Changes
- Refactored middleware — [Verify public API unchanged]

### Checklist
- [ ] Types still infer correctly
- [ ] No new explicit generics required
- [ ] Defaults documented
- [ ] Breaking changes in changelog
```
