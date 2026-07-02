---
name: split-behavior
description: >-
  Split one SPF behavior into N with axis-declared, constraints-audited
  discipline. Forces explicit axis declaration (per-type horizontal vs.
  per-concern vertical) and a cross-boundary constraint audit before
  the split lands — avoids the failure mode where an apparent
  per-type-friendly behavior ships a split that quietly drops a
  cross-type ordering invariant the merged code was enforcing. Use after
  /refactor-behavior's decomposition check has concluded "split," or
  when you've already noticed a behavior wants splitting. Triggers:
  "split this behavior", "split into per-type", "extract per-type
  behaviors", "convert to per-type variants", "split behavior".
---

# Split one SPF Behavior into N

A split has two failure modes:

1. **Mis-declared axis.** Treating an apparent per-type split as
   per-concern (or vice versa) anchors the rest of the analysis on the
   wrong shape and produces a messy result.
2. **Dropped cross-boundary constraint.** The merged code was enforcing
   an invariant (often implicit — a sync-block ordering, a guard that
   protected against a transient state, an atomic-publish gate) that
   the split silently breaks. Latent races, not typecheck failures.

This skill enforces axis declaration *before* per-side analysis (so the
shape is right) and a cross-boundary constraint audit *before* code
(so nothing implicit gets dropped on the floor).

## Usage

```
/split-behavior <file>
```

Where `<file>` is the single behavior file you're splitting. The skill
asks which axis (per-type vs. per-concern) and which post-split units
you're targeting.

## Reference docs

The canonical references — read them first:

- [`internal/design/spf/conventions/behaviors.md`](../../../internal/design/spf/conventions/behaviors.md)
  — especially:
  - **Per-type specialization** — the destination shape for per-type
    splits (per-type exports + setup-shape helper). This skill
    operationalizes the *refactor moment*; that section codifies the
    end-state convention.
  - **Sniffs that say "split"** — the pre-existing decomposition
    sniffs. The skill's Step 3 (per-side analysis) leans on these.
  - **Cleaned-shape sketch** — the structured format each post-split
    unit uses.
  - **Refactoring an existing behavior** → Step 1 — the
    purpose-verb diagnostic.
- [`internal/design/spf/conventions/reactors.md`](../../../internal/design/spf/conventions/reactors.md)
  — transition-driven vs state-driven, leaky-abstraction sniff (helpers
  with conditional branches around optional state-scoped work — the
  setup-shape helper for a per-type split must not carry per-variant
  conditionals).
- [`.claude/skills/refactor-behavior/SKILL.md`](../refactor-behavior/SKILL.md)
  — the per-side analysis (Steps 1–4) is borrowed from here.

## When to use this skill vs. /refactor-behavior, /merge-behaviors

| Situation | Skill |
| --- | --- |
| Cleaning up a single behavior file (same shape, same boundaries) | `/refactor-behavior` |
| `/refactor-behavior`'s decomposition check concludes "this should split" | `/split-behavior` |
| Splitting one behavior into per-type variants (video/audio/text) | `/split-behavior` (per-type axis) |
| Splitting one behavior into per-concern behaviors (two disjoint slot clusters) | `/split-behavior` (per-concern axis) |
| Merging two behaviors into one | `/merge-behaviors` |

## Steps (do these in order; do not skip)

### Step 1 — Identify input

State the file being split (absolute or workspace-relative path).
Confirm with the user if it's not obvious.

### Step 2 — Articulate the current behavior's purpose

In one sentence: what is this behavior **for**? Same as
[`refactor-behavior`](../refactor-behavior/SKILL.md) Step 1.

The purpose establishes the basis for evaluating the split. If the
purpose is one coherent thing that doesn't decompose into a per-type
or per-concern shape, that's a finding ("the split doesn't earn its
keep — keep as-is or apply `/refactor-behavior` instead").

Pull from the file-level JSDoc if present; if not, that's a doc gap
to flag.

### Step 3 — Declare the split axis

Two axes — declare which:

- **Per-type (horizontal).** Same concern applied across media types
  (video / audio / text). Body iterates types, applies the same
  operation each (with type-specific parameters). Destination shape:
  per-type exports + shared setup-shape helper, per `behaviors.md` →
  "Per-type specialization." Worked sibling examples: `select-tracks`,
  `resolve-track`, `load-segments`.
- **Per-concern (vertical).** Two disjoint concerns happen to be
  wired together. `stateKeys` / `contextKeys` cluster into two groups
  touched by disjoint code paths. Destination shape: two separate
  behaviors with their own `defineBehavior`, each with narrow keys.
  The pre-existing decomposition sniffs in `behaviors.md` → "Sniffs
  that say 'split'" describe this axis.

**Diagnostic — which axis applies:**

- Body has a `for (const type of types)` loop where the loop body is
  the same operation in each iteration → **per-type**.
- Two slot clusters (`videoBuffer` + `videoBufferActor` cluster vs.
  some other cluster) touched by disjoint code paths → **per-concern**.
- Both apply (e.g., a per-type behavior also has a buffer-vs-actor
  concern split inside) → **split per-type first**, then re-evaluate.
  Per-type extraction often dissolves what looked like a per-concern
  split.

**Pause for user confirmation on the axis.** This is the load-bearing
call. Mis-declaring it poisons the rest of the analysis; the user may
have context the diagnostic doesn't capture.

### Step 4 — Per-side cleaned-shape sketch

For each post-split unit, produce a cleaned-shape sketch using the
[cleaned-shape sketch template](../../../internal/design/spf/conventions/behaviors.md#cleaned-shape-sketch):

```text
- States:
- entry work:
- effects: (continuous reactivity):
- State-exit cleanup:
- Source-reset concerns:
- Private temporal state:
```

For **per-type** splits, produce one sketch per variant (video / audio /
text). The shape of each variant will be near-identical aside from the
per-type parameters — that's the point; the shared shape is what the
setup-shape helper captures.

For **per-concern** splits, produce one sketch per concern. The sketches
should look genuinely different (different slot writes, different
lifecycle, different cleanup); if they look near-identical, the axis
may be wrong.

**Don't refactor pre-emptively.** Sketches describe what each
post-split unit *would* look like extracted from the current code, not
a projected refactored version. If a unit's sketch reveals real issues
(closure-mutable state, fight-the-shape sniffs), note them as
follow-up `/refactor-behavior` candidates *for that variant after the
split lands* — don't bundle the refactor into the split.

### Step 5 — Cross-boundary constraint audit (load-bearing)

This is the discipline that distinguishes `/split-behavior` from the
pre-existing decomposition guidance. Skipping it is how splits ship
latent races.

**Find candidate constraints.** Scan the merged code for any of:

- Comments referencing ordering (`no await between X calls`, `sync
  block`, `before any Y`, `must complete before`).
- Explicit guards immediately before context writes (`if (already…)
  return;` placed defensively).
- Browser-bug workarounds with named ordering requirements (`Firefox
  mozHasAudio`, `Safari requires X before Y`, etc.).
- Atomicity gates (`set context once so subscribers see all`).
- "Once X has happened" preconditions that imply temporal ordering.
- `peek` reads positioned to suppress re-fire — often implying a
  constraint about when re-fire is safe.

For each constraint surfaced, write three lines:

1. **State the constraint.** One sentence, the rule. Example: *"All
   `addSourceBuffer` calls must complete before any `appendBuffer`
   call (Firefox `mozHasAudio` bug)."*
2. **Cite the merged-code enforcement.** Where in the current code
   does the constraint live, and what's the mechanism? Example:
   *"Single sync block in `entry`: 'no await between addSourceBuffer
   calls — then set context once.'"*
3. **Walk through how the split preserves it.** One of three valid
   classifications:
   - **Structural** — signal-batching, composition order, framework
     semantics, or another existing mechanism already gives the
     ordering. Cite the specific mechanism. Example: *"Both per-type
     reactors are downstream of the same `mediaSource` write; both
     re-evaluate on the same microtask flush; both `addSourceBuffer`
     calls fire before any further microtask. `loadSegments` →
     `appendBuffer` is ≥ 3 microtask boundaries + network I/O away."*
   - **Shared signal / handoff** — a coordinating slot or computed
     signal explicitly carries the ordering. Cite the slot.
   - **Invariant invalid post-refactor** — the constraint is no longer
     applicable after the split for a concrete reason (e.g., the
     downstream consumer it was protecting was removed). Archive the
     reasoning.

**If none of the three classifications apply for any surfaced
constraint, the split introduces a regression.** Pause and reconsider
the axis, the per-side shape, or whether the split should happen at
all.

> This discipline is plausibly extractable into its own
> `/audit-constraints` skill once it has additional call sites
> (greenfield behaviors, global audits, post-refactor verification).
> For now it lives inline here.

### Step 6 — Destination shape / shared helper

Based on the axis:

- **Per-type.** Identify the setup-shape helper signature
  (`({ state, context, config }) => cleanup` or `Reactor<...>`).
  What does each variant pass in via `config` / inline call-site? What
  stays in the helper? Per `behaviors.md` → "Setup-shape helper" +
  "Naming." Worked sibling: `setupTrackResolution` in
  `resolve-track.ts`.

  **Leaky-abstraction check** — the helper must not be parameterized
  by "is this optional thing on or off?" Per `reactors.md`:
  *"Helpers with conditional branches around optional state-scoped
  work (`const x = optionEnabled ? doX() : undefined` inside the
  helper's `entry`)"* — the variant should supply the work; the helper
  shouldn't carry the conditional. If the helper is starting to grow
  `if (typeIsAudio) … else …` branches, the variants want the
  variant-specific work to live in the variants themselves, with the
  helper consuming a uniform input.

- **Per-concern.** Confirm each concern lands as its own
  `defineBehavior` export with its own narrow `stateKeys` /
  `contextKeys`. No shared helper; the concerns are genuinely
  independent.

### Step 7 — Convention checks

Same as `/refactor-behavior` Step 5 applied to each post-split unit
independently:

- File placement (DOM-free vs. DOM-bound) per unit.
- Naming per `behaviors.md` → "Naming":
  - Per-type variants: `<verb><Type><Noun>` matching sibling
    convention (`selectVideoTrack` / `selectAudioTrack`,
    `loadVideoSegments` / `loadAudioSegments`).
  - Setup-shape helper: `setup<Concept>` (no per-type qualifier — the
    helper is type-agnostic).
- Per-unit `stateKeys` / `contextKeys` narrowed to what that unit
  actually reads/writes. Per-type variants typically narrow the
  per-type selected ids and per-type slot pairs to just the relevant
  type.
- File-level JSDoc on each new file articulating the unit's purpose.
- Domain-prefix on the behavior name (if the bare verb could
  plausibly act on more than one similarly-shaped target).

### Step 8 — Decomposition note + stop for confirmation

After the split, look at each post-split unit:

- Does any unit *still* have decomposition concerns (further
  splitting, latent merging, multi-writer arrangement on a slot)?
  Note as follow-up — don't act in the same change.
- Did the split introduce a new multi-writer arrangement (e.g., two
  per-type variants writing the same shared slot)? If so, that's a
  sniff that the split axis may be wrong.

Propose the changes; do not write code until the user confirms.

## Output format

Propose changes in this order. Use markdown headers for each numbered
section.

1. **Input** (the file being split)
2. **Current purpose** (1 sentence)
3. **Split axis declaration** — per-type or per-concern, with the
   diagnostic evidence. *Stop here for user confirmation.*
4. **Per-side cleaned-shape sketches** — one per post-split unit, in
   the template format
5. **Cross-boundary constraint audit** — explicit list of constraints
   surfaced from the merged code, each with the three-line treatment
   (state / cite / classify). *If any constraint can't be classified,
   stop and reconsider.*
6. **Destination shape** — for per-type: helper signature + variants;
   for per-concern: two `defineBehavior` declarations
7. **Convention checks** (per unit)
8. **Decomposition note** (post-split, any residual concerns)

## Why this order

Three failure modes the order prevents:

- **Anchoring on the merged file's shape** rather than the per-side
  cleaned shapes. Step 4 forces per-side sketches *first*, before any
  combination work happens.
- **Mis-declaring the axis** (per-type vs. per-concern) and inheriting
  the wrong shape into per-side analysis. Step 3 makes the axis
  explicit and pauses for confirmation — the user can override the
  diagnostic based on context.
- **Dropping a cross-boundary constraint silently** — the canonical
  failure mode for splits. Step 5's audit forces every implicit
  invariant in the merged code to be either preserved (with explicit
  classification) or declared invalid (with reasoning). If neither,
  the skill stops.

A side benefit: the per-side sketches double as the design for each
post-split unit's standalone refactor (if the user later opts to land
the split as separate `/refactor-behavior` runs on each variant).
