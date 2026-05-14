---
name: refactor-behavior
description: >-
  Refactor an existing SPF behavior using purpose-first discipline. Forces
  articulation of the behavior's purpose and business rules before code
  analysis, then maps to the documented patterns in
  internal/design/spf/conventions/. Triggers: "refactor behavior",
  "refactor this behavior", "clean up behavior", "apply conventions to
  behavior", "review behavior for refactor".
---

# Refactor an SPF Behavior

Refactor an existing behavior file using purpose-first discipline. The
canonical failure mode without this discipline is to start from the code
and work inward — "what does this do? what's wrong with it? how do I fix
it?" — producing refactors that improve the code but miss the *purpose*.

Steps 1–2 are the load-bearing ones. Skipping them produces over-fitted
refactors. Steps 3–6 only make sense once the purpose is named.

## Usage

```
/refactor-behavior <path>
```

`path` (required): the behavior file to refactor, e.g.
`packages/spf/src/playback/behaviors/select-tracks.ts`.

## Reference docs

Read these before proposing changes:

- `internal/design/spf/conventions/behaviors.md` — Refactoring an existing
  behavior, source-reset handling, helpers vs factories, code sniffs,
  anti-patterns.
- `internal/design/spf/conventions/reactors.md` — when to reach for a
  Reactor, transition-driven vs state-driven work, source-identity
  states.
- `internal/design/spf/conventions/signals.md` — `peek`, `equalsById`,
  `update` overloads.
- `packages/spf/src/CLAUDE.md` — source layout and dependency rules
  (the inverse-layering smell for pure helpers).
- `internal/design/spf/evaluation-axes.md` — A/B/C/D/E axes.

## Steps (do these in order; do not skip)

### Step 1 — Articulate the purpose

In one sentence: what is this behavior **for**? Not what it does — the
goal of having it.

Start with the file-level JSDoc/module comment if one exists. If not,
that's itself a finding and a doc gap to fix as part of the refactor.

If you can't articulate the purpose without reading the body in detail,
the behavior's responsibility is unclear — that's a finding too.

**Stop and report back to the user with your purpose statement before
proceeding.** This is the load-bearing step; getting it wrong invalidates
everything downstream. The user may correct your framing.

### Step 2 — List the business rules

Given the stated purpose, what are the implicit rules?

- What should it do on **initial load** (first time the relevant inputs
  are available)?
- What should it do on **source unload / reset** (inputs become
  unavailable)?
- What should it do on **internal updates** (inputs change but identity
  preserved)?
- What should it do on **external writes** to the slots it owns?
- Are there **per-type / per-variant** rules?
- What's **out of scope** — what other behaviors should handle?

### Step 3 — Gap analysis

Compare current code to those rules. Where does it fall short?

Three categories:

- **Implicit gaps** — rules the purpose implies but the code doesn't
  enforce. (Most common; the load-bearing finding.)
- **Explicit gaps** — flagged in the assessment doc, in TODOs, in code
  comments.
- **Process gaps** — closure-mutable state, defense-in-depth without an
  articulated failure mode, fight-the-shape sniffs (per behaviors.md),
  `effect()` inside reactor `entry` (per reactors.md), helpers with
  conditional branches around optional state-scoped work.

**If this refactor is a merge of two behaviors, stop and use
`/merge-behaviors` instead.** A merge is two analyses combined, not
one — the per-side cleaned-shape sketch + complexity-driven direction
declaration that merges need don't fit cleanly inside the
single-behavior workflow. See `behaviors.md` "Merging two behaviors —
extra discipline" and `.claude/skills/merge-behaviors/SKILL.md`.

### Step 4 — Pattern selection

Pick from the documented patterns:

- Continuous reactivity → `effect()`.
- Bidirectional sync between two slots (or a slot and a property) →
  two `effect()`s in one behavior, per `behaviors.md` "Multi-effect
  behaviors." Spell out the resolution rule (most-recent-wins,
  state-canonical, etc.) in the file-level JSDoc; document
  `peek`-vs-`get` inline.
- Distinct states with per-state continuous behavior →
  `createMachineReactor` with `effects`.
- One-shot work on state transitions → `createMachineReactor` with
  `entry`.
- Stateful resource ownership with serial work → `createMachineActor` or
  `createTransitionActor`.
- Source-driven async work needing cancellation → reactor with
  source-identity states + abort-on-state-exit.

The **transition-driven vs state-driven** distinction in `reactors.md`
is the most-commonly-missed call. If you're using `effects` for work
that should fire only on state entry, that's a sniff. Conversely: if
you're calling `effect()` *inside* an `entry` body, that's a sniff —
state-driven work belongs in `effects:`, not invoked manually from
inside `entry`.

**Helpers with conditional branches around optional state-scoped
work** (`const x = optionEnabled ? doX() : undefined` inside a
shared-helper's `entry`) are a leaky abstraction. The variant should
supply the work; the helper shouldn't carry the conditional. (Specific
composition shape is per-case; what matters is that the helper isn't
parameterized by "is this optional thing on or off?")

**Band check — when both light-reactor and simple-effect are
legitimate.** Before locking in the pattern, evaluate the four
criteria in `behaviors.md` → "Where both shapes are legitimate: the
light-reactor / simple-effect band":

1. Single positive state?
2. Source-identity-driven?
3. Re-fire-safe entry work?
4. No undo semantic on state exit?

If **all four** hold, the case lands in the band — both `effect()` and
`createMachineReactor` with `entry` are legitimate, and the choice is
judgment-laden and local. **Don't pick silently.** Surface the choice
to the user via `AskUserQuestion`, presenting both shapes with the
trade-off summary (sibling consistency / structural lifecycle /
future-state headroom on the reactor side; less boilerplate / matches
actual complexity on the effect side). On any one criterion failing,
the pattern is prescribed by the bullets above — pick it and proceed.

The band is narrow by design — most refactors fail at least one
criterion and don't surface a choice. The most common disqualifier is
criterion 4: a slot that needs explicit clear-on-unload requires the
reactor's structural state-exit cleanup (`select-tracks` is the
canonical example).

### Step 5 — Convention checks

Before writing the refactor:

- Setup-shape helper signature (`({ state, config }) => cleanup`)?
- Pure helpers (no `core/` deps) extracted to `media/` or `network/`?
  (See "Pure helpers don't belong in behaviors" in behaviors.md.)
- File placement (DOM-free vs DOM-bound)?
- Naming (descriptive verb, no `*Behavior` suffix; helpers `setup*`,
  factories `make*`)?
- **Behavior name domain-prefixed enough to disambiguate?** If the
  bare verb could plausibly act on more than one similarly-shaped
  target (e.g., "duration" exists on `presentation`, `mediaSource`,
  and the `<video>` element), prefix it with the target. Diagnostic:
  if removing the qualifier would make a future reader ask "which
  X?", the qualifier was load-bearing. Per `behaviors.md` → "Naming"
  → "Domain-prefix behavior names." Worked example: `updateDuration`
  → `updateMediaSourceDuration`.
- File-level JSDoc articulating purpose?
- **`stateKeys` / `contextKeys` composed at the right aggregation
  level?** A behavior that enumerates per-type slot pairs
  (`videoBuffer` + `audioBuffer`, `videoSegmentLoaderActor` +
  `audioSegmentLoaderActor`) but treats them interchangeably in its
  body is composing at the wrong level — it locks the engine to a
  fixed track configuration. Compose against the aggregating resource
  (e.g., `mediaSource.sourceBuffers`). The per-type slots stay
  reserved for behaviors that genuinely vary per type. Per
  `behaviors.md` → "Inverse: behaviors that operate uniformly across
  tracks." Diagnostic: would an audio-only or video-only engine be
  able to compose this behavior without wiring no-op slots?

### Step 6 — Decomposition check

Having stated the purpose: **should this behavior still exist as-is?**

If the purpose overlaps with another behavior's purpose (both writing
the same slot, both reacting to the same source-identity transitions),
the multi-writer arrangement may be a symptom of a single purpose split
across two behaviors.

**Diagnostic — do the writers share a decision-making domain?**

- **Same domain** (same inputs, same options) → likely split-symptom;
  consider merging. Example: a default-on-load behavior and an
  ongoing-adjustment behavior both writing the same selection slot
  based on the same inputs are aspects of one concern.
- **Different domains** (config vs DOM, intent vs derived default,
  programmatic vs network-event-driven) → legitimate multi-writer;
  keep separate.

Note the decomposition as a follow-up question; do not act on it in the
same refactor — make the merge/split decision *after* the refactor
proposal lands so the simpler shape is what's evaluated. The merge
often slots cleanly into the larger refactor of the *other* writer
rather than landing as a standalone change.

**If merge is the answer**: don't perform the merge inline. Recommend
`/merge-behaviors` as the follow-up — it operationalizes the per-side
cleaned-shape sketch + complexity-inventory + direction-declaration
discipline that merges need. Per `behaviors.md` "Merging two behaviors
— extra discipline."

### Step 7 — Final-shape audit (after writing the change)

Re-run the convention checks against the *output*, not just the input.
The pre-refactor audit only catches problems in the starting code;
problems you introduce *during* the refactor (a new helper that should
have been extracted, a new monitor closure that should have been a
`derivedStateSignal`, an action-shaped state name that snuck in) are
invisible to it.

Run through, against the file as it stands post-edit:

- **Any top-level function with no `core/` import?** → relocate to
  `media/`, `network/`, or `@videojs/utils`. The rule applies to new
  helpers introduced during the refactor, not just helpers that lived
  in the file beforehand. Per `behaviors.md` → "Pure helpers don't
  belong in behaviors."
- **Monitor inline or extracted?** → match the sibling pattern. Every
  reactor-using behavior in the codebase uses the `derivedStateSignal`
  form; an inline monitor is correct only for a direct single-signal
  read. Per `reactors.md` → "The `deriveState` + `monitor` convention."
- **State names: action-verb on the positive side?** → rename to
  world-fact. Per `reactors.md` → "State-name convention."
- **Closure-mutable variables that should reset on source change?** →
  restructure into reactor state or `computed`. Per `behaviors.md` →
  "Source-reset handling."
- **`peek` reads inside an `entry` body?** → convert to `.get()`.
  `entry` bodies run auto-untracked, so `peek` and `.get()` are
  functionally identical there — the `peek` adds no behavior and falsely
  implies the choice is load-bearing. A reader can't tell "this peek
  suppresses tracking" from "this peek is dead weight" by inspection;
  standardizing on `.get()` inside entry makes the load-bearing `peek`
  calls (inside `effects:`, `computed`, or other tracked contexts)
  self-documenting. Per `reactors.md` → "Entry bodies are already
  untracked — don't `peek` there."
- **`stateKeys` / `contextKeys` overshoot the body's actual reads/
  writes?** → narrow. The exhaustiveness check catches drift in the
  other direction (declared but unused keys still typecheck); this is
  the convention layer.
- **`stateKeys` / `contextKeys` composed at the right aggregation
  level?** → if a per-type slot pair (`videoBuffer` + `audioBuffer`,
  per-type actors) was introduced or kept during the refactor and the
  body treats the pair interchangeably (uniform iteration, same
  predicate applied to each, forwarded into a helper that doesn't
  distinguish), compose against the aggregating resource
  (`mediaSource.sourceBuffers`, `mediaElement.textTracks`) instead.
  Per `behaviors.md` → "Inverse: behaviors that operate uniformly
  across tracks." This is invisible to the exhaustiveness check —
  both keys *are* used; the smell is that they're used identically.
- **Naming sibling-consistent?** → if per-type-specialized siblings
  exist (`loadVideoSegments`, `loadAudioSegments`), the new/renamed
  behavior should match (`loadTextTrackSegments`). Per `behaviors.md`
  → "Naming" → "Name by the unit-of-work this behavior triggers."
- **Behavior name domain-prefixed?** → if the bare verb could
  plausibly act on more than one similarly-shaped target, prefix it
  with the target. Refactors are the right time to fix this since
  the rename ripples through engine composition, imports, and tests
  — surfacing it post-refactor is more costly. Per `behaviors.md` →
  "Naming" → "Domain-prefix behavior names."

This is a deliberate second pass — the most common refactor failure
mode is satisfying the rules pre-change and missing them post-change
because the diff itself introduced new instances.

### Step 8 — Commit (with user confirmation)

After typecheck / tests / lint pass and Step 7 audit is clean:

1. **Audit the working-tree state.** Run `git status -s`. If there's
   pre-existing uncommitted work on files outside the refactor scope,
   surface it explicitly — the user may want that work committed,
   stashed, or left alone before the refactor lands. **Never commit
   files the user didn't ask you to touch.**

2. **Propose a commit structure.** Map the changes to natural
   boundaries; common shapes:

   - **Single commit** — small, self-contained refactor with no
     spillover. Most refactors land here.
   - **Refactor + rename** — when the refactor surfaces a file/symbol
     rename. The rename is always its own commit; bundling logic +
     rename diffs makes review hard (a rename diff dwarfs everything
     else in a side-by-side view).
   - **Refactor + slot/key rename** — when the refactor surfaces a
     `stateKeys` / `contextKeys` rename that touches sibling behaviors
     and the engine's aggregated context type. Separate from a
     file/symbol rename because the scope is different (behavior
     interface vs file identity).
   - **Refactor + doc/skill updates** — when the refactor surfaces
     genuine convention gaps (rule the conventions doc didn't anticipate,
     skill step that was missing). Doc/skill commits stay separate
     because they have a different review audience (conventions reviewer
     vs code reviewer).
   - **All of the above** — large refactors that surface multiple
     concerns. Land as N separate commits in dependency order:
     refactor → rename → slot rename → doc/skill.

   State the proposal explicitly, naming the files per commit and the
   commit message scope/type prefix (`refactor(spf)`, `docs(spf)`).

3. **Ask the user to confirm via `AskUserQuestion`.** Standard options:

   - "Land all commits as proposed."
   - "Bundle into a single commit."
   - "Skip — I'll handle the commit boundary."
   - Plus the user can free-text a different structure.

   Phrase the question so the user can see the proposal at a glance —
   inline the file list per commit in the option description.

4. **On confirmation, run the commits.** Stage per-commit (no `-A` /
   `git add .`; always name files), use the repo's commit-message
   format (Conventional Commits per the project's `git` skill),
   verify each commit with `git status -s` afterward.

5. **On decline or "skip," stop.** The user owns the commit boundary;
   the skill doesn't.

### Why a confirmation step (not auto-commit)

CLAUDE.md is explicit that commits are an explicit user action. The
confirmation step preserves that contract while still doing the
useful work the skill is positioned to do: *naming the natural commit
boundaries* from the refactor's actual scope. The pattern the user
ends up following (single commit / refactor + rename / etc.) is
predictable enough to recommend but variable enough that the user
should always be the decider — especially when adjacent in-flight
work on the same branch wants to be sequenced around.

## Output format

Propose changes in this order. Use markdown headers for each numbered
section. Do not start writing code until the user confirms:

1. **Purpose** (1 sentence)
2. **Business rules** (numbered list)
3. **Gap analysis** (mapped to rules, with citations)
4. **Proposed changes** (numbered list, each with rationale citing the
   conventions docs)
5. **Decomposition note** (does this behavior still warrant existing
   as-is?)

## Why this order

The canonical failure: jumping to "what does this code do" → "how does
it break" → "how do I fix the break," producing refactors that improve
the code but miss the goal. Steps 1–2 force the right framing before
mechanical analysis. Steps 3–6 only make sense once the purpose is
named. Step 7 catches what the pre-refactor audit can't see — new
helpers, new closures, new state names introduced by the refactor diff
itself. Step 8 closes the loop by proposing the natural commit
structure and asking before running anything, so the user retains the
final say on commit boundaries.
