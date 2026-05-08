---
name: merge-behaviors
description: >-
  Merge two SPF behaviors into one with cleaned-shape-first discipline.
  Forces per-side standalone analysis and an explicit complexity-driven
  direction declaration before any combining happens — avoids the
  "relocated mess" failure mode where the merge anchors on the current
  merged-file shape rather than the cleaned per-side shapes. Use after
  /refactor-behavior's decomposition check has concluded "merge," or to
  redo a merge that landed without the discipline. Triggers: "merge
  behaviors", "merge these behaviors", "combine behaviors", "redo merge",
  "merge X into Y".
---

# Merge two SPF Behaviors

A merge is **two analyses combined**, not one. The canonical failure
mode is starting from the merged file (or from the simpler side) and
extending outward to host the more complex case — producing leaky
abstractions, conditional branches inside shared helpers, and
relocated-but-not-refactored bodies.

This skill enforces the inverse: per-side cleaned-shape sketches first,
direction declared from a complexity inventory, then combine.

## Usage

```
/merge-behaviors <file-a> <file-b>
```

Or for a redo case (a merge that already landed without this discipline):

```
/merge-behaviors <merged-file>
```

For the redo case, identify the pre-merge inputs from git history (the
commit that performed the merge has both pre-merge files in its parent
tree).

## Reference docs

The canonical references — read them first:

- [`internal/design/spf/conventions/behaviors.md`](../../../internal/design/spf/conventions/behaviors.md)
  — especially:
  - **Cleaned-shape sketch** — the structured format both sides must use.
  - **Merging two behaviors — extra discipline** — the workflow this
    skill operationalizes.
  - **Complexity inventory: which side is more constrained?** — the
    checklist.
  - **Refactoring an existing behavior** → Step 1 — the purpose-verb
    diagnostic.
- [`internal/design/spf/conventions/reactors.md`](../../../internal/design/spf/conventions/reactors.md)
  — transition-driven vs state-driven, source-identity states,
  entry-returns-cleanup idiom, leaky-abstraction sniff (helpers with
  conditional branches around optional state-scoped work).
- [`internal/design/spf/conventions/signals.md`](../../../internal/design/spf/conventions/signals.md)
  — multi-writer slots, decomposition check.
- [`.claude/skills/refactor-behavior/SKILL.md`](../refactor-behavior/SKILL.md)
  — the per-side analysis (Steps 1–4) is borrowed from here.

## When to use this skill vs. /refactor-behavior

| Situation | Skill |
| --- | --- |
| Cleaning up a single behavior file | `/refactor-behavior` |
| Decomposition check (Step 6 of `/refactor-behavior`) concludes "this should merge with X" | `/merge-behaviors` |
| A merge already landed without per-side analysis (suspected "relocated mess") | `/merge-behaviors` |
| Splitting one behavior into two | `/refactor-behavior` (or open a design discussion first) |

## Steps (do these in order; do not skip)

### Step 1 — Identify inputs

State the two pre-merge files (paths or, for a redo case, git ref +
filename pairs). If you're redoing a merge, identify the commit that
performed the merge and pull the pre-merge files from its parent tree.

Confirm with the user before proceeding if the inputs aren't obvious.

### Step 2 — Per-side standalone analysis

For **each side independently**, run Steps 1–4 of `/refactor-behavior`:

1. Articulate the purpose (1 sentence). Apply the **purpose-verb
   diagnostic** from `behaviors.md` Step 1 — note whether the verbs are
   one-shot, continuous, or "continuous + gated + reset on X."
2. List business rules.
3. Gap analysis (lightweight — just enough to know whether real issues
   exist).
4. Pattern selection.

The per-side analysis is exactly what `/refactor-behavior` does up to
Step 4; you're running it twice in parallel.

**Don't refactor pre-emptively.** If a side's gap analysis is empty or
trivial — the current code already conforms to current conventions —
record that finding and move on. The next step (cleaned-shape sketch)
takes the current shape, not a projected cleaner one. Only when the
gap analysis turned up real issues do you project a cleaned shape; in
that case, recommend (don't perform) `/refactor-behavior` on that side
as an optional standalone exercise the user may opt into.

### Step 3 — Cleaned-shape sketch per side

Produce a sketch per side using the **cleaned-shape sketch template** in
[`behaviors.md`](../../../internal/design/spf/conventions/behaviors.md#cleaned-shape-sketch):

```text
- States:
- entry work:
- effects: (continuous reactivity):
- State-exit cleanup:
- Source-reset concerns:
- Private temporal state:
```

Both sketches must use the same structured format so they're directly
comparable.

If a side already conforms (Step 2 found no issues), the sketch
describes the current shape. If the side needed projecting, the sketch
is the projected post-refactor shape — and the proposal should note
that landing the standalone refactor first (via `/refactor-behavior`)
is an option the user can choose.

### Step 4 — Complexity inventory + direction declaration

Apply the [complexity inventory](../../../internal/design/spf/conventions/behaviors.md#complexity-inventory-which-side-is-more-constrained)
to the two sketches. Count "yes" answers per side. Bias toward "yes"
— under-counting is the failure mode.

State the direction explicitly:

> **Building from \<constrained side\>'s reactor; folding \<simpler side\>
> into \<where in the constrained reactor\>.**

**Stop and confirm with the user before proceeding.** Direction is the
load-bearing call. The user may override the inventory based on
context the inventory doesn't capture (e.g., "yes the ABR side scores
higher on the inventory but we plan to remove ABR next quarter, so
build around the simpler side"). This is the natural pause point.

### Step 5 — Combined cleaned-shape sketch

Show the merged shape using the same structured format as Step 3. The
combined sketch:

- Inherits states + reactor shape from the constrained side.
- Folds the simpler side's `entry`/cleanup work into the host's
  `entry`/cleanup (often as one extra line in `entry`, often as a
  combined cleanup return).
- Carries the constrained side's `effects:` unchanged.
- Names where private temporal state lives (typically signals scoped
  to the variant's setup, reset in the host's `entry`).

If the merged module has per-type specializations (the typical
`select*Track`-shaped case where some types have `effects:` and others
don't), show one combined sketch per per-type variant — they may differ
in which fields are populated.

### Step 6 — Convention checks + decomposition note

Same as `/refactor-behavior` Steps 5–6:

- Setup-shape helper signature (`({ state, config }) => cleanup`)?
  Helpers parameterized by what *varies between variants* (per-type
  config), not by *whether-an-optional-thing-is-on-or-off* — see the
  leaky-abstraction sniff in `reactors.md`.
- Pure helpers extracted out of `playback/behaviors/`?
- File placement, naming, file-level JSDoc?
- Decomposition note: after the merge, is the writer-count for the
  shared slot now 1? Is there any *other* multi-writer arrangement on
  the same slot that this merge does or doesn't address?

### Step 7 — Stop and confirm before code

Propose the changes; do not write code until the user confirms.

## Output format

Propose changes in this order. Use markdown headers for each numbered
section. Mirror the per-side structure literally — two parallel
sub-sections under Step 2 and Step 3, one combined under Step 5.

1. **Inputs** (the two pre-merge files / git refs)
2. **Per-side standalone analysis** — for each side: purpose, rules,
   gap analysis, pattern selection
3. **Cleaned-shape sketches** — per side, in the template format
4. **Complexity inventory + direction declaration** — explicit
   inventory with counts, then the one-sentence direction statement.
   *Stop here for user confirmation.*
5. **Combined cleaned-shape sketch** (one or several if per-type
   variants)
6. **Proposed changes** (numbered list, each citing conventions docs)
7. **Decomposition note** (writer-count, other multi-writer concerns)

## Why this order

Two failure modes the order prevents:

- **Anchoring on the merged file's current shape** rather than per-side
  cleaned shapes. Steps 2–3 force per-side analysis *first*, before
  anything about combination is contemplated.
- **Inverting "build from the more constrained side"** — extending the
  simpler shape outward to host the more complex one, producing leaky
  abstractions and conditional branches inside helpers. Step 4's
  explicit direction declaration (with the complexity inventory backing
  it) makes the call auditable; the user-confirmation pause makes it
  hard to silently invert.

A side benefit: the per-side cleaned-shape sketches are reusable. If
the user later decides to refactor each side standalone first (split
the merge into two PRs), the sketches *are* the design for those PRs.
