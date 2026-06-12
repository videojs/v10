---
name: spf-update-behavior
description: >-
  Update an existing SPF behavior whose purpose is changing or expanding.
  Distinct from /refactor-behavior, which preserves purpose — this skill
  handles cases where the behavior gains new responsibility (new state slot
  to react to, new lifecycle phase, new constraint, new code path). Carries
  /refactor-behavior's purpose-first discipline applied to the *purpose
  change*. Triggers: "update behavior", "extend behavior", "modify behavior",
  "change behavior purpose", "expand behavior responsibility".
---

# Update an SPF Behavior

Modify an existing SPF behavior whose purpose is **changing or expanding**.
The canonical failure mode without this discipline is treating
purpose-changes as refactors — applying `/refactor-behavior`'s
preserve-purpose lens to a change that's actually adding responsibility. The
discipline distinction matters because:

- **Refactor:** behavior X stays X, but improved (cleaner code, better
  patterns, smaller surface).
- **Update:** behavior X gains new responsibility — reacts to a new slot,
  owns a new lifecycle phase, applies a new constraint. The behavior's
  *contract* changes.

This skill is a **stub** scoped for use by `/spf-implement-feature`. Failure-
mode catalog grows from real use.

## Usage

```
/spf-update-behavior <behavior-name>
```

Typically invoked from `/spf-implement-feature`'s Step 6 when a feature
implementation requires extending an existing behavior. Can be invoked
directly when the user has identified the behavior to update.

## Reference docs

- The existing behavior file and its tests (required reading)
- `internal/design/spf/conventions/behaviors.md` — convention catalog the
  update must continue to satisfy
- `internal/design/spf/conventions/signals.md` — multi-writer characterization
  when adding writers to a slot another behavior writes
- `.claude/skills/refactor-behavior/SKILL.md` — the purpose-first discipline
  shape this skill mirrors (applied to *purpose change* instead of
  *preserved purpose*)
- The feature doc driving the update (if invoked from
  `/spf-implement-feature`) — Step 1 grounds the update in the doc's phase
  row or "What's not implemented" entry

## Failure-mode catalog (seeded; grows with use)

- **Purpose-change articulation skipped.** The most common failure mode:
  the user invokes the skill saying "add bandwidth sampling to
  setupAudioBufferActors" without naming what's actually changing about
  the behavior's contract. Articulating the change forces clarity:
  *"setupAudioBufferActors gains responsibility for bandwidth-sampling on
  audio fetches, which it didn't have before — same composition position,
  same lifecycle, but now writes `bandwidthState` from audio samples in
  addition to creating buffer actors."*

- **Slot map evolution without multi-writer characterization.** If the
  update adds a writer to a slot another behavior already writes, the
  multi-writer characterization from `conventions/signals.md` must be done
  explicitly. Default-merge or silent-overwrite is a bug — typically
  surfaces as race conditions or last-write-wins ordering bugs.

- **Cleanup pattern preservation/migration mishandled.** Existing cleanup
  contracts (what gets torn down, when, in what order) must be honored or
  explicitly migrated. Adding a new resource without adding cleanup is the
  canonical leak shape; reorganizing cleanup without preserving order is
  the canonical lifecycle bug.

- **Conflating with refactor-behavior territory.** If the purpose isn't
  actually changing — the behavior's contract stays the same, just the
  implementation improves — route to `/refactor-behavior`. The discipline
  for purpose-preservation vs purpose-evolution differs; using the wrong
  skill produces drift in either direction (refactor-as-update bloats the
  behavior; update-as-refactor silently changes contracts).

## Steps (do these in order)

### Step 1 — Articulate the purpose change

The load-bearing setup step. Before any code:

- **What is the behavior's current purpose?** Read the existing behavior,
  read `conventions/behaviors.md` for context. Articulate in plain
  language.
- **What's changing?** New responsibility, new state slot to react to, new
  lifecycle phase, new constraint? Name the specific change.
- **What's *not* changing?** Surface the parts of the contract that are
  preserved — slot positions, composition placement, cleanup ordering,
  observable interface.
- **Why is this an *update*, not a *refactor*?** If the answer is "the
  behavior does the same thing, just differently," **stop and route to
  `/refactor-behavior`**.

**Stop and report to user** with the purpose-change articulation. The user
confirms before proceeding.

### Step 2 — Identify slot map / interface changes

- **New slots read?** Add to `stateKeys` / `contextKeys`. Per
  `conventions/signals.md`, narrow is better.
- **New slots written?** Multi-writer characterization required.
  Three-axis check: decision domain, trigger, cost. Document the
  coordination strategy with the existing writer(s).
- **Slots removed?** If the update removes a read or write, verify no
  downstream behavior depends on it.
- **Interface change?** If the behavior's external contract changes (e.g.,
  it now emits an event it didn't before), document the contract change
  explicitly.

### Step 3 — Apply conventions to the change

- **Cleanup pattern.** Per project convention (named-cleanup-collection +
  wrapper, not AbortController for SPF). If adding a new resource that
  needs cleanup, slot into the existing cleanup pattern.
- **Per-type behavior?** If the update touches a per-type behavior, apply
  per-type discipline (sibling behaviors + shared helper) per
  `conventions/behaviors.md`.
- **Composition-variant logic.** If the new responsibility is variant-
  specific (live-only, audio-only-only), the answer is *not* to add a
  runtime conditional inside the always-on behavior. Either split the
  behavior into per-variant siblings or compose a new behavior into the
  variant factory.

### Step 4 — Implement (TDD)

1. **Update the test first.** Add an assertion for the new behavior, or
   write a new test case for the new responsibility.
2. **Run the test failing.**
3. **Update the behavior** to satisfy the new test while preserving
   existing tests' assertions.
4. **Run all tests passing** (the existing tests + the new one).
5. **Run composition tests** to verify no regression on the behavior's
   downstream consumers.

### Step 5 — Final-shape audit + commit

Per parent skill (`/spf-implement-feature`), commits are typically batched
at the feature-implementation level. If invoked standalone, propose a
per-update commit shape.

Audit checklist:
- **Purpose change reflected** — does the implementation match the Step 1
  articulation?
- **Multi-writer coordination clean** — if a new writer was added, is the
  coordination documented and tested?
- **Cleanup preserved or migrated** — no leaks introduced; cleanup order
  preserved or explicitly changed?
- **Existing tests still passing** — preserved-contract tests must still
  hold
- **Conventions adherence**

## When this is the wrong skill

- **Behavior's purpose stays the same, just code improves** → `/refactor-behavior`
- **Creating a new behavior** → `/spf-create-behavior`
- **Major restructuring (split or merge)** → `/refactor-behavior` (which
  may route to `/split-behavior` or `/merge-behaviors`)
- **Pure config-driven change with no behavior code change** → handle in
  the feature implementation directly; no behavior-update needed

## How the failure-mode catalog grows

Same pattern as other SPF skills: when a new failure mode surfaces, add an
entry with a worked-example citation. This skill is a stub; the catalog
will likely expand significantly as the first real implementations exercise
it.

## Open framing question

The boundary between `/spf-update-behavior` and `/refactor-behavior`-with-
extension is genuinely open. Per `project_spf_implementation_skills_next`
memory: *"`spf-update-behavior` OR non-trivial updates to `spf-refactor-
behavior` — when an existing behavior needs a feature-implementation change
that isn't a pure refactor. Open which framing — extend refactor-behavior
or add a new skill."*

This skill ships as a separate skill (rather than a refactor-behavior
extension) because the **purposes differ** — refactor preserves; update
changes. If usage reveals the discipline is mostly shared, the skills may
later merge. For now, the separation is intentional: route by
purpose-preserved vs purpose-changed, and let the failure-mode catalogs
diverge based on what each skill actually catches.
