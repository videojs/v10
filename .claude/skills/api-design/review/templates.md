# Templates

Report templates for API design reviews.

## Merge Report

```markdown
# API Design Review: [target]

## Overall Score: X/10

| Dimension | Score | Critical | Major | Minor |
|-----------|-------|----------|-------|-------|
| API Surface | X/10 | X | X | X |
| Type Safety | X/10 | X | X | X |
| Extensibility | X/10 | X | X | X |
| Progressive Disclosure | X/10 | X | X | X |

## Critical Issues

[All CRITICAL issues, full format]

## Major Issues

[All MAJOR issues, full format]

## Minor Issues

| Location | Issue | Fix |
|----------|-------|-----|
| Line 12 | Positional params | Config object |
| Line 45 | Implicit contract | Render prop |

## Good Patterns Found

- [What's working well]
- [Worth preserving]

## Summary

[2-3 paragraph assessment: strengths, weaknesses, priority order]

---

<details>
<summary>Full API Surface Review</summary>
[Complete output]
</details>

<details>
<summary>Full Type Safety Review</summary>
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

## Issue Examples

### Critical: Types Don't Flow

```markdown
### [CRITICAL] Types require explicit annotation

**What:** Generic doesn't infer from arguments
**Where:** `createStore<T>(config: Config<T>)`
**Why:** Every consumer must annotate—types aren't flowing
**Principle:** Inference over annotation (api-surface.md)
**Fix:** Infer T from config shape

// Before
const store = createStore<UserState>({ initial: user })

// After
const store = createStore({ initial: user })  // T infers
```

### Major: Positional Parameters

```markdown
### [MAJOR] Function uses 5 positional parameters

**What:** `createPlayer(src, autoplay, muted, controls, plugins)`
**Where:** `packages/core/src/create-player.ts:12`
**Why:** Order confusion, breaking changes when adding params
**Principle:** Config objects for 3+ params (api-surface.md)
**Fix:** Use config object

// Before
createPlayer('video.mp4', true, false, defaultControls, [])

// After
createPlayer({
  src: 'video.mp4',
  autoplay: true,
  controls: defaultControls,
})
```

### Major: Runtime Registration

```markdown
### [MAJOR] Runtime plugin registration

**What:** `player.registerPlugin(myPlugin)` pattern
**Where:** `Player.registerPlugin()` method
**Why:** Loses type safety, ordering implicit, can't tree-shake
**Principle:** Emergent extensibility (foundational.md)
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

### Minor: Nesting

```markdown
### [MINOR] Return object could be flatter

**What:** `{ state: { paused }, request: { play } }`
**Where:** `usePlayer()` return type
**Why:** Extra nesting when properties used separately
**Principle:** Flat returns for independent values (api-surface.md)
**Fix:** Evaluate if nesting serves optimization or semantics
```
