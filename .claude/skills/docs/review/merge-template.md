# Merge Report Template

Template for combining sub-agent reports into final review.

## Template

```markdown
# Documentation Review: [filename]

## Overall Score: X/10

| Dimension | Score | Issues |
|-----------|-------|--------|
| Tone | X/10 | X critical, X major, X minor |
| Structure | X/10 | X critical, X major, X minor |
| Code | X/10 | X critical, X major, X minor |
| AI Readiness | X/10 | X critical, X major, X minor |

## Critical Issues

[List all CRITICAL issues from all agents using standard format]

---

## Major Issues

[List all MAJOR issues from all agents using standard format]

---

## Minor Issues

[Condense into table]

| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|
| MINOR | Line 12 | Filler word "simply" | Delete |
| MINOR | Line 34 | Passive voice | Use active |
| NIT | Line 56 | Could add framework tabs | Optional |

---

## Good Patterns Found

- [Quote or describe what's working well]
- [Another good example]

---

## Summary

[2-3 paragraph overall assessment: what's good, what needs work, priority order for fixes]

---

<details>
<summary>Full Tone Review</summary>

[Complete tone review output]

</details>

<details>
<summary>Full Structure Review</summary>

[Complete structure review output]

</details>

<details>
<summary>Full Code Review</summary>

[Complete code review output]

</details>

<details>
<summary>Full AI Readiness Review</summary>

[Complete AI readiness review output]

</details>
```

## PR Review Template

For reviewing documentation changes in pull requests:

```markdown
# PR Documentation Review: #[number]

## Changed Files

| File | Status | Review |
|------|--------|--------|
| `docs/api/new-feature.md` | New | Full review |
| `docs/guides/getting-started.md` | Modified | Diff review |

## New Documentation

### docs/api/new-feature.md

[Full review using standard template]

## Modified Documentation

### docs/guides/getting-started.md

**Changed sections:** Lines 45-60

[Review of changed sections only]

## Checklist

- [ ] New features documented
- [ ] Breaking changes in migration guide
- [ ] Examples updated and runnable
- [ ] Types/props documented
- [ ] See Also sections updated
```
