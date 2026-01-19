# Review Templates

Issue format and report templates for API reviews.

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.ts:42`
**Why:** Impact on users/developers
**Principle:** Which principle violated
**Fix:** Concrete suggestion

// Before
problematic()

// After
improved()
```

## Severity Levels

| Level      | Meaning                      | Examples                                       |
| ---------- | ---------------------------- | ---------------------------------------------- |
| `CRITICAL` | Breaks users, blocks release | Wrong types, runtime errors, a11y failures     |
| `MAJOR`    | Significant DX issue         | Poor inference, boolean traps, no tree-shaking |
| `MINOR`    | Improvement opportunity      | Missing type guards, verbose API               |
| `NIT`      | Polish, optional             | Naming consistency, minor ergonomics           |

---

## Issue Examples

### CRITICAL — Inference failure

```markdown
### [CRITICAL] Generic forces explicit type annotation

**What:** Users must provide type parameter manually
**Where:** `createStore.ts:15`
**Why:** Inference should flow from usage
**Principle:** Inference over annotation (principles.md)
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
**Principle:** Config objects (principles.md)
**Fix:** Use config object

// Before
function createSlider(min: number, max: number, vertical: boolean)

// After
function createSlider(config: { min: number; max: number; vertical?: boolean })
```

### MAJOR — Runtime registration

```markdown
### [MAJOR] Runtime plugin registration

**What:** `player.registerPlugin(myPlugin)` pattern
**Where:** `Player.registerPlugin()` method
**Why:** Loses type safety, ordering implicit, can't tree-shake
**Principle:** Emergent extensibility (principles.md)
**Fix:** Composition at creation time

// Before
const player = createPlayer(config)
player.registerPlugin(analytics)

// After
const player = createPlayer({
...config,
slices: [analyticsSlice],
})
```

### MINOR — Missing type guard

```markdown
### [MINOR] No type guard for discriminated union

**What:** Users must narrow with string comparison
**Where:** `types.ts:45`
**Why:** Loses type narrowing benefits
**Principle:** Type guards (typescript.md)
**Fix:** Export type guard

// After
export function isPlaying(state: MediaState): state is PlayingState {
return state.status === 'playing'
}
```

---

## Merge Report Template

```markdown
# API Review: [package/file name]

## Overall Score: X/10

| Dimension              | Score | Critical | Major | Minor |
| ---------------------- | ----- | -------- | ----- | ----- |
| Types                  | X/10  | X        | X     | X     |
| API Surface            | X/10  | X        | X     | X     |
| Extensibility          | X/10  | X        | X     | X     |
| Progressive Disclosure | X/10  | X        | X     | X     |

## Critical Issues

[List all CRITICAL issues, full format]

---

## Major Issues

[List all MAJOR issues, full format]

---

## Minor/Nit Issues

| Severity | Location      | Issue               | Fix               |
| -------- | ------------- | ------------------- | ----------------- |
| MINOR    | `store.ts:45` | No type guard       | Add `isPlaying()` |
| NIT      | `api.ts:12`   | Inconsistent naming | Rename            |

---

## Good Patterns Found

- [What's working well]
- [Worth preserving]

---

## Summary

[2-3 paragraph assessment: strengths, weaknesses, priority order]

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
<summary>Full API Surface Review</summary>
[Complete output]
</details>

<details>
<summary>Full Extensibility Review</summary>
[Complete output]
</details>

<details>
<summary>Full Progressive Disclosure Review</summary>
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
