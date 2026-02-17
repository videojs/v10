# Review Templates

Issue format and report templates for documentation reviews.

## Issue Format

```markdown
### [SEVERITY] Issue title

**What:** Brief description
**Where:** `path/to/file.mdx:42`
**Why:** Impact on readers
**Fix:** Concrete suggestion

// Before
problematic text or code

// After
improved text or code
```

## Severity Levels

| Level      | Meaning                        | Examples                                           |
| ---------- | ------------------------------ | -------------------------------------------------- |
| `CRITICAL` | Broken example, wrong info     | Missing import, incorrect API, code won't run      |
| `MAJOR`    | Missing section, unclear prose | No "See also", wrong doc type, wall of text        |
| `MINOR`    | Suboptimal wording or layout   | Filler words, passive voice, could be more concise |
| `NIT`      | Polish, phrasing preference    | Minor rewording, formatting tweak                  |

---

## Issue Examples

### CRITICAL — Broken code example

```markdown
### [CRITICAL] Example missing import

**What:** Code example uses `createPlayer` without importing it
**Where:** `site/src/content/docs/concepts/player.mdx:45`
**Why:** Readers who copy-paste get a ReferenceError
**Fix:** Add import statement

// Before
const player = createPlayer({ src: 'video.mp4' });

// After
import { createPlayer } from '@videojs/html';

const player = createPlayer({ src: 'video.mp4' });
```

### MAJOR — Missing cross-links

```markdown
### [MAJOR] No "See also" section

**What:** Page ends without linking to related concepts
**Where:** `site/src/content/docs/concepts/themes.mdx`
**Why:** Readers can't discover related pages; reduces navigation
**Fix:** Add See also section

// After
## See also

- [Styling](/concepts/styling) — CSS custom properties reference
- [Accessibility](/concepts/accessibility) — Color contrast requirements
```

### MINOR — Filler words

```markdown
### [MINOR] Filler words in explanation

**What:** Paragraph contains "simply", "just", and "basically"
**Where:** `site/src/content/docs/concepts/state.mdx:23`
**Why:** Filler words dilute the message and add no meaning
**Fix:** Remove filler, tighten sentence

// Before
You can simply just call the subscribe method to basically listen for changes.

// After
Call `subscribe` to listen for changes.
```

### NIT — Phrasing

```markdown
### [NIT] Gerund heading

**What:** Heading uses gerund form
**Where:** `site/src/content/docs/how-to/theming.mdx:30`
**Why:** Imperative headings are more direct and scannable
**Fix:** Use imperative form

// Before
## Customizing the controls

// After
## Customize the controls
```

---

## Merge Report Template

```markdown
# Docs Review: [page or file name]

## Overall Score: X/10

| Dimension | Score | Critical | Major | Minor |
| --------- | ----- | -------- | ----- | ----- |
| Voice     | X/10  | X        | X     | X     |
| Structure | X/10  | X        | X     | X     |
| Code      | X/10  | X        | X     | X     |

## Critical Issues

[List all CRITICAL issues, full format]

---

## Major Issues

[List all MAJOR issues, full format]

---

## Minor/Nit Issues

| Severity | Location             | Issue            | Fix                |
| -------- | -------------------- | ---------------- | ------------------ |
| MINOR    | `concepts/foo.mdx:8` | Filler words     | Remove "basically" |
| NIT      | `concepts/foo.mdx:30`| Gerund heading   | Use imperative     |

---

## Good Patterns Found

- [What's working well]
- [Worth preserving]

---

## Summary

[2-3 paragraph assessment: strengths, weaknesses, priority order]

---

<details>
<summary>Full Voice Review</summary>
[Complete output]
</details>

<details>
<summary>Full Structure Review</summary>
[Complete output]
</details>

<details>
<summary>Full Code Review</summary>
[Complete output]
</details>
```
