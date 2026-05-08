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

**If this refactor is a merge of two behaviors, run gap analysis on
each source behavior independently first.** Each side gets its own
purpose, business rules, and gap analysis as a standalone refactor.
Skipping per-side gap analysis means the merge produces a relocated
mess instead of a refactored one — the inputs' anti-patterns survive
into the merged form. See `behaviors.md` "Merging two behaviors —
extra discipline."

### Step 4 — Pattern selection

Pick from the documented patterns:

- Continuous reactivity → `effect()`.
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

### Step 5 — Convention checks

Before writing the refactor:

- Setup-shape helper signature (`({ state, config }) => cleanup`)?
- Pure helpers (no `core/` deps) extracted to `media/` or `network/`?
  (See "Pure helpers don't belong in behaviors" in behaviors.md.)
- File placement (DOM-free vs DOM-bound)?
- Naming (descriptive verb, no `*Behavior` suffix; helpers `setup*`,
  factories `make*`)?
- File-level JSDoc articulating purpose?

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

**If merge is the answer**: identify which source behavior has more
architectural requirements (more states, more lifecycle phases, more
failure modes, more configuration). Build the merged shape from that
side; the simpler input fits as a special case within it. Building
the other direction (extending the simpler shape outward) tends to
produce conditional branches and afterthought integrations. Per
`behaviors.md` "Merging two behaviors — extra discipline."

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
named.
