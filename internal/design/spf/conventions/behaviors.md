---
status: draft
date: 2026-05-07
---

# Behaviors

> **Behaviors are the unit of composition in SPF — almost all functionality lives in one.** A Behavior may be "simple" (using only signals from core) or "primitive-augmented" (reaching for a Reactor, Actor, Task + Runner, or other primitive under its setup). The questions this doc answers are *how much primitive infrastructure does this behavior need*, *should this be one behavior or several*, and *what does it look like when a behavior wants refactoring* — not "should this be a behavior at all," because it almost always should.
>
> For how Behaviors and the primitives they use work under the hood see [`../primitives.md`](../primitives.md), [`../architecture.md`](../architecture.md), [`../actor-reactor-factories.md`](../actor-reactor-factories.md), and [`packages/spf/src/core/composition/create-composition.ts`](../../../../packages/spf/src/core/composition/create-composition.ts).

## Behaviors are the universal unit

Engines are composed from a list of Behaviors. Anything that contributes to playback — DOM bindings, MSE/SourceBuffer orchestration, ABR, segment loading, track selection, end-of-stream detection — is encapsulated in (at least) one Behavior. Actors, Reactors, Tasks, and other primitives live **inside** behaviors as implementation tools, not alongside them at the composition layer.

The right shape question is not "Behavior vs Actor" but "Behavior with what underneath?"

## Simple vs primitive-augmented behaviors

A **simple** behavior reaches only for `signal` / `computed` / `effect` from `core/signals`. The body is effect-shaped and stateless beyond what the composition's signal map already gives it. Simple doesn't mean *single-effect* — a behavior can compose two `effect()`s in one setup and still be "simple" by this definition (see [Multi-effect behaviors](#multi-effect-behaviors)). `syncPreload` is the canonical example: two effects bidirectionally syncing `state.preload` and the host media element's `preload` property, with dedup and asymmetric `peek`/`get` reads.

A **primitive-augmented** behavior pulls in additional infrastructure under its setup — instantiating an Actor, registering a Reactor, queueing Tasks against a Runner, or capturing references that span multiple effects. `loadVideoSegments` is at the far end of this spectrum: it composes a `SegmentLoaderActor`, a `SourceBufferActor`, bandwidth-state signals, and a `ChunkedStreamIterable`-backed fetch pipeline.

Decision criterion: **the shape of the work, not its importance.** A trivial-feeling behavior can warrant an Actor (ownership of a stateful resource is the deciding factor), and an important-feeling behavior can be a handful of `effect()` lines (`syncPreload` is load-bearing despite being a two-effect simple behavior).

The set of primitives below describes **today's** options. SPF's primitive set isn't closed — when a behavior's shape doesn't fit either simple or any existing primitive, the right answer may be to surface a missing primitive rather than force-fit. See [Sniffs that say "no good fit yet"](#sniffs-that-say-no-good-fit-yet).

### Sniffs that say "reach past simple"

SPF has four primitive shapes a behavior can reach for under its setup. Pick by the shape of the work, not by importance:

- **Task + Runner** — discrete async work units with status, cancellation, and scheduling.
- **`createTransitionActor`** — reducer-shaped Actor: `(context, message) => context`, side effects allowed in the reducer. The simplest Actor shape; correct when the unit processes messages serially over a context but has no per-state behavior.
- **`createMachineActor`** — finite-state-machine Actor with per-state effects and entry handlers. Correct when the unit owns a resource *and* its behavior varies by state (e.g. MediaSource lifecycle: `idle` → `attaching` → `open` → `tearing-down`).
- **`createMachineReactor`** — finite-state-machine Reactor with reactive state derivation, per-state effects, and entry handlers. Correct when the work is *observe-and-react* (no resource ownership), with behavior gated on a derived state.

See [`../actor-reactor-factories.md`](../actor-reactor-factories.md) and [`../primitives.md`](../primitives.md) for the factory shapes and underlying implementation.

| Sniff | Reach for |
| ----- | --------- |
| Multi-step async work with status, cancellation, or scheduling | **Task + Runner** |
| Stateful unit that owns a resource and processes messages serially — no FSM, just a reducer over context | **`createTransitionActor`** |
| Stateful unit with per-state behavior (entry handlers, distinct effects per state, valid-transition rules) | **`createMachineActor`** |
| "Observe signal, dispatch message to actor" repeated several times — translation only | A Reactor; reach for **`createMachineReactor`** when the dispatch depends on a derived state |
| Hand-rolled FSM in the behavior body (nested `effect`s + flag-shaped `computed` signals like `canSetup` / `shouldSetup` / `isXing`) | **`createMachineReactor`** if observe-and-react; **`createMachineActor`** if the work owns a resource and processes messages |
| Body manually serializes work via flags (`isLoading`, `pending`, `inFlight`) | **`createTransitionActor`** — Actor message handling already serializes; the flag is reinventing the queue |

When the body is short, signal-only, and effect-shaped, simple is correct. Reaching for a Reactor when an `effect` would do is overkill on **D — Simplicity** without buying anything.

## One behavior or several

The decomposition question. The default leans toward **split until merging is required** — narrow slot maps are how `defineBehavior` exhaustiveness pulls its weight, and small behaviors compose more flexibly across engine variants (axis A — Reusability).

### Sniffs that say "split"

- `stateKeys` / `contextKeys` cluster into two disjoint groups touched by disjoint code paths in the body.
- The cleanup function has two unrelated halves (one tearing down a subscription, another disposing a resource).
- Two concerns happen to be wired together but don't share state — one reads a slot, another writes a different slot, and the only connection is "we set them up at the same time."
- The body has multiple lifecycle phases with different cleanup timing.
- Some keys in `stateKeys` / `contextKeys` are read only by some code paths in the body, never together.

### Sniffs that say "merge"

- Two behaviors share most of their slot map and always run together.
- One behavior is only meaningful when ordered immediately after another.
- Both are setting up against the same Actor and have to coordinate handoff through context to do it.
- Splitting required introducing a new "coordination" slot whose only purpose is bridging the two.

### Anti-pattern: split-by-domain instead of split-by-shape

A behavior named *after a domain concept* ("everything about audio") is often a merged version of three real behaviors (track selection, segment loading, sync). Conversely, a behavior named *after a small mechanical task* ("update the duration when buffered ranges change") is more likely to stay correctly sized. The split that matters is the slot-map split, not the conceptual one.

## Multi-effect behaviors

Most simple behaviors are a single `effect()`. The decomposition section above defaults to splitting before merging — but neither split nor merge fits a third shape: **multiple directions of dataflow over the same slot surface**, where each direction is shaped as its own continuous effect.

`syncPreload` is the canonical case: state.preload ↔ mediaElement.preload, one effect per direction. Splitting into two behaviors would mean both touch the same two slots and have to coordinate; merging into a single effect would conflate read-reactivity and write-reactivity (one wants `peek`, the other wants `get` — see hazards below).

### When to reach for it

- More than one direction of dataflow across the same slot surface (read-side and write-side, or two writes from different signal triggers that would be hard to express in one body).
- Each direction has a clean dependency set you wouldn't combine into one effect even if you could (one direction wants to react to a signal the other shouldn't subscribe to).
- The directions share cleanup lifecycle and slot ownership — splitting would require coordination through context.

### Hazards (and how `syncPreload` addresses each)

- **Creation-order dependency.** When two effects share a dependency signal, they run in registration order. This is load-bearing if the directions resolve a conflict on the shared change. Order the `effect()` calls deliberately and **document the invariant inline** so a future reorder is a flagged regression. `syncPreload` puts read before write to get "most-recent-wins on attach."
- **Echo loops.** A's write triggers B which writes back triggering A. Mitigate with **dedup before every write**: `if (target === current) return`. The dedup is also a brake against transitive triggers downstream (e.g., `resolvePresentation` reading `state.preload`).
- **Asymmetric reactivity** — one direction subscribes (`get`), the other reads-without-subscribing (`peek`). The peek-side effect is the one that should *only* react to upstream changes, not to its own / its partner's writes. Easy to "fix" the peek into a get and silently break the invariant — annotate inline.
- **Resolution-rule obligation.** When two effects fire on the same signal change, the first-to-write claims the slot. Spell out the *semantic* resolution rule (most-recent-wins, state-canonical, DOM-canonical, etc.) in the file-level JSDoc — not as an emergent property of effect order. The order is the *mechanism*; the rule is the contract.

### Not a Reactor

Bidirectional sync via two effects *looks* state-machine-y but has no states. The deciding factor is whether there are distinct states with per-state cleanup (cf. [`reactors.md`](reactors.md)). Two-effect simple behaviors don't qualify — leave them as `effect()`s.

## How to write a behavior — code sniffs

When you're inside a behavior body and something feels off, the question is usually one of:

1. *Is this behavior fighting its shape?* (refactor in place)
2. *Should this reach for a primitive underneath?* (augment with an existing primitive)
3. *Is this two behaviors pretending to be one?* (split)
4. *Is the right primitive missing?* (no good fit yet — surface a gap, hold the sniff visibly)

The sniffs below map to those answers. The fourth bucket is the most easily mistaken for one of the others — it's worth being explicit when an existing primitive is being stretched past its fit.

### Sniffs that say "fix in place"

- Lots of `if (signal.get() === undefined) return` guards at the top of an `effect`. Either the slot annotation is wrong (`Signal` should be `ReadonlySignal` from a writer that hasn't fired yet, suggesting the consumer should treat the value as eventually-arriving), or the guard is really a Reactor *predicate* — see "fight the shape" below.
- Imperative wiring of multiple subscriptions that all want to be torn down together. Reach for an `AbortController` (see CLAUDE.md "Cleanup Pattern") rather than tracking individual unsubscribes.
- Repeated `.get()` on the same signal across an `effect` body. Lift to a `computed` once and read the computed — clearer dependency, easier to reason about.

### Sniffs that say "augment with a primitive"

- Setup body grows past ~50 lines of imperative effect code. Almost always a Reactor or Actor wants to live underneath.
- The behavior creates a resource (SourceBuffer, MediaSource, fetch reader) that has its own lifecycle and needs disposing in cleanup. Move resource ownership to an Actor whose lifecycle the behavior orchestrates.
- The behavior captures **long-lived references** it didn't get from context. Those references want to be in context, written by another behavior or via `shareSignals`. A behavior that creates *and stashes* a reference is doing two jobs.
- Body branches on `config.type` at runtime. Split into per-type specializations (see [Per-type specialization](#per-type-specialization)).

### Sniffs that say "fight the shape"

This bucket is for cases where an existing primitive is the right answer and the body just isn't using it.

- Nested `effect` calls where the inner `effect` is gated by a flag the outer set up. Almost always wants a `createMachineReactor` (or a `createMachineActor` if the work also owns a resource).
- Hand-rolled FSM via flag-shaped `computed` signals (`canSetup`, `shouldSetup`, `isAttached`, `isTearingDown`) feeding a single `effect`. Same conversion targets as above — the FSM shape *is* what the machine factories provide.
- Imperative `addEventListener` plumbing for events that should drive a signal. Wire the events into a context-held signal (often via another behavior), then react to the signal.
- Subscribe/unsubscribe bookkeeping inside the body that an Actor or Reactor's lifecycle would handle.
- Reaching for a raw Actor (or hand-rolled message-and-context bookkeeping) when the work fits one of the factories. Use `createTransitionActor` or `createMachineActor`; the raw Actor primitive is below the convention layer.

### Sniffs that say "no good fit yet"

This bucket is for cases where neither simple nor any existing primitive fits cleanly — and forcing the work into the closest existing primitive degrades it. The honest answer is to surface the gap.

**Before declaring this bucket, check the factory inventory.** It's easy to write off a sniff as "no good fit" while overlooking an existing primitive — the case in `setup-mediasource.ts:63` (a comment about needing "Reactors with internal finite state") was almost certainly written before `createMachineReactor` shipped, and is now better classified as a fight-the-shape sniff. When you suspect a gap, name the existing primitives you considered and *why* each is a stretch, not just "doesn't quite fit."

Genuine signals that you're really in this bucket (not just unfamiliar with the inventory):

- A primitive-augmented behavior whose body is mostly *coordinating between* multiple primitives (an Actor's lifecycle gated on a Task's status gated on a signal), where the coordination logic itself is the bulk of the body. The coordination shape may want a name and a primitive of its own.
- A pattern that recurs across multiple Behaviors but isn't quite the same as any existing primitive — three Behaviors all hand-rolling the same scaffold with minor variations is a signal the scaffold wants extracting. Could be a helper or factory; sometimes a new primitive.
- A piece of the work doesn't fit *anywhere* in the existing primitive set — the body genuinely needs something not covered by signals, Tasks, the Actor factories, or the Reactor factory.

What to do when you've confirmed the gap:

- **Hold the sniff visibly in code.** A `// NOTE` or `// TODO` comment naming the missing primitive (or the conjectured shape of one) is more useful than a clean-looking force-fit, because it prevents the next reader from "fixing" the misshapen wiring without addressing the actual gap.
- **Surface the gap up the stack.** Add an entry to the cleanup plan or a relevant design doc (`internal/design/spf/`), or open an RFC if the missing primitive affects the public composition surface. Don't let the sniff live only in code.
- **Don't force-fit.** Reaching for the closest existing primitive when the shape genuinely doesn't fit costs **D** + **C** (more elaborate than the problem requires *and* a pattern violation that future readers will have to either decode or undo).
- **Convert when the primitive lands.** When a missing primitive is added, the held sniffs become migration targets — they're already self-documenting.

### Worked example: where `setup-mediasource.ts` falls today

- Augmented (it owns lifecycle of a MediaSource it creates), so not a simple behavior.
- Currently a single behavior — splitting would create two halves that have to coordinate through a new "ms ready" slot, which the merge-sniffs argue against.
- Has a fight-the-shape sniff: the `canSetup` / `shouldSetup` / nested-effect pattern is a hand-rolled FSM. The file's own comments hint at two refactor candidates — `createMachineActor` (treating MediaSource as a resource the Actor owns) or `createMachineReactor` (if the work is observe-and-react). Both already provide internal finite state. The older "if/when Reactors have internal finite state" comment likely predates `createMachineReactor` and should be reconciled when the cleanup is executed; the deciding factor between machine-Actor and machine-Reactor is whether MediaSource ownership belongs in this behavior or a longer-lived unit.

**Counterpoint** already shipped: `setupTrackResolution` in `packages/spf/src/playback/behaviors/resolve-track.ts` (commit series ending at `f707b0e9`) followed the same fight-the-shape sniff to a `createMachineReactor` migration with `entry: () => () => runner.abortAll()` for source-change cancellation. See the current file for the worked example of source-identity states + the entry-returns-state-exit-cleanup idiom; see [`reactors.md`](reactors.md) for the convention guidance.

The example is illustrative and may decay — read the code first when applying these sniffs to it.

## Refactoring an existing behavior

Refactoring a behavior is a different exercise from writing one fresh. The trap: starting from the code and working inward — "what does this do? what's wrong with it? how do I fix it?" — produces refactors that improve the code but miss the *purpose*. Skipping the purpose step is the canonical failure.

Use this sequence:

### 1. Articulate the purpose

In one sentence: what is this behavior **for**? Not what it does — the goal of having it.

If the file has a [top-level JSDoc](#file-level-jsdoc) articulating purpose, start there. If not, that's itself a finding (and a doc gap to fix as part of the refactor). If you can't state the purpose without reading the body in detail, the behavior's responsibility is unclear; that's a finding too.

**Purpose-statement verb diagnostic.** The verbs and timing markers in the purpose statement already foreshadow where the behavior lives in a reactor — and how much architectural weight it carries:

| Verb shape | Reactor location | Complexity weight |
| --- | --- | --- |
| "pick X on Y", "clear X on Z", "set X when W" | `entry` + cleanup | Light |
| "continuously adjust X based on Y", "track Y", "sync X to Y" | `effects:` | Heavy (state-driven) |
| "adjust X based on Y, gated by Z, resetting on W" | `effects:` + `entry` reset + state-exit cancel | Heaviest |

This matters for single refactors (a "continuously … gated by … resetting on …" purpose tells you you're in `createMachineReactor` territory before you read the body) and is load-bearing for [merges](#merging-two-behaviors--extra-discipline) where the heavier verb shape identifies the constrained side.

### 2. List the business rules

Given the stated purpose, what are the implicit rules the behavior should satisfy?

- What should it do on **initial load** (first time the relevant inputs are available)?
- What should it do on **source unload / reset** (inputs become unavailable)?
- What should it do on **internal updates** (inputs change but identity preserved)?
- What should it do on **external writes** to the slots it owns?
- Are there **per-type / per-variant** rules?
- What's **out of scope** — what other behaviors should handle?

### 3. Gap analysis

Compare current code to those rules. Where does it fall short?

- **Implicit gaps** — rules the purpose implies but the code doesn't enforce. (Most common; the load-bearing finding.)
- **Explicit gaps** — flagged in the assessment, in TODOs, in code comments.
- **Process gaps** — closure-mutable state, defense-in-depth without an articulated failure mode, fight-the-shape sniffs.

### 4. Pattern selection

Pick from the documented patterns:

- Continuous reactivity → `effect()`.
- Distinct states with per-state continuous behavior → [`createMachineReactor`](reactors.md) with `effects`.
- One-shot work on state transitions → `createMachineReactor` with `entry`. If the work has a cleanup that should fire on state exit, return it from the same `entry` rather than expressing it as the next state's `entry` — the entry-returns-cleanup form covers the destroy path that the next-state's-entry form silently misses. See [`reactors.md` → Bind cleanup to its setup](reactors.md#bind-cleanup-to-its-setup-not-to-the-next-states-entry).
- Stateful resource ownership with serial work → `createMachineActor` or `createTransitionActor`.
- Source-driven async work needing cancellation → reactor with [source-identity states](reactors.md#source-identity-states-for-source-driven-work) + abort-on-state-exit.

The [transition-driven vs state-driven distinction](reactors.md#transition-driven-vs-state-driven-work) is the most-commonly-missed one for behaviors with FSM shape — using `effects` for transition-driven work produces spurious re-runs.

For the lightest verb shape ("set X when Y resolves"), pattern selection isn't always decisive — see [Where both shapes are legitimate](#where-both-shapes-are-legitimate-the-light-reactor--simple-effect-band) below. Run the band check before locking in `effect()` vs `createMachineReactor` with `entry`.

### 5. Convention checks

Before writing the refactor, run through:

- Setup-shape helper signature?
- [Pure helpers extracted to `media/` or `network/`](#pure-helpers-dont-belong-in-behaviors)?
- File placement (DOM-free vs DOM-bound)?
- [Naming](#naming) (descriptive verb, no `*Behavior` suffix; helpers `setup*`, factories `make*`)?
- [File-level JSDoc](#file-level-jsdoc) articulating purpose?

### 6. Decomposition check

Having stated the purpose: **should this behavior still exist as-is?**

If the purpose overlaps with another behavior's purpose — both writing the same slot, both reacting to the same source-identity transitions — the multi-writer arrangement may be a symptom of a single purpose split across two behaviors.

**Diagnostic — do the writers share a decision-making domain?**

- **Same domain → likely split-symptom; consider merging.** Multiple writers that read the *same inputs* and choose among the *same options* are aspects of one concern. Example: `selectVideoTrack` (default on load) and `quality-switching` (ABR over bandwidth) both decide what to write to `selectedVideoTrackId` based on presentation + bandwidth + config. They're two aspects of one "manage video track selection" concern; merging dissolves the multi-writer arrangement.
- **Different domains → legitimate multi-writer; keep separate.** Writers that reflect *genuinely different inputs* (config-driven default vs DOM-driven user action; intent vs derived default; programmatic vs network-event-driven) belong in separate behaviors. Example: `selectTextTrack` (config-driven default) and `sync-text-tracks` (DOM `change`-event-driven) both write `selectedTextTrackId` but reflect different sources of truth.

Make this decision *after* the refactor proposal lands so the simpler shape is what you're evaluating, not the current shape. The decomposition merge often slots cleanly into the larger refactor of the *other* writer — e.g., `selectVideoTrack` would naturally merge into a refactored `quality-switching` rather than land as a standalone change.

### Where both shapes are legitimate: the light-reactor / simple-effect band

For the lightest verb shape — "set X when Y resolves," with no follow-on continuous reactivity — both a single-positive-state `createMachineReactor` and a guarded `effect()` are legitimate. The trade-offs are real and don't generally favor one over the other; the choice is judgment-laden and local. Outside this band, the pattern is prescribed by [Step 4](#4-pattern-selection); the band is the narrow case where both forms genuinely apply.

The band applies when **all four** of these hold. If any one fails, the pattern is prescribed (typically reactor for state-machine cases, effect for non-state-machine cases) — there's no choice to surface.

1. **Single positive state.** One resolved/active condition; no per-state effects to distinguish.
2. **Source-identity-driven.** The work is bounded by a source signal's lifecycle (typically `state.presentation`).
3. **Re-fire-safe entry work.** The entry is idempotent on re-fire — an `if (already done) return` guard at the top is a natural no-op against internal source updates, not a fight-the-shape sniff.
4. **No undo semantic on state exit.** The written value either lives inside an object that gets replaced wholesale on source change (e.g., a field of `state.presentation` itself), or the slot is re-initialized by another behavior on the new source. If the slot needs an explicit clear-on-unload (e.g., a top-level slot like `selectedTrackId` whose stale value would block downstream work), the band does not apply — expressing the clear in a simple effect requires closure-mutable transition state (anti-pattern), so the reactor is the answer.

Trade-offs when all four hold:

| Reactor (single-positive-state) wins on | Simple effect wins on |
| --- | --- |
| Sibling consistency with other reactor-using behaviors in the same engine | Cognitive overhead — matches the actual complexity of the work |
| State-exit and destroy paths are structural and named | Less boilerplate — no `deriveState` / `derivedStateSignal` / `monitor` scaffolding for one positive state |
| Future headroom if a second positive state emerges | Reads as appropriately light when the work stays single-state |
| Self-documenting lifecycle (state names *are* the contract) | No fight-the-shape risk if the work stays this simple |

Pick by local factors: sibling count and consistency in the engine, expected headroom, and how heavy the behavior reads at the call site.

**Worked examples**:

- `calculate-presentation-duration` — **in the band**. Lives as a simple effect because duration is written *into* the presentation object itself; a new source's presentation arrives with `duration === undefined` and no explicit clear is needed (criterion 4 holds).
- `select-tracks` — **outside the band**. Lives as a reactor because `selectedTrackId` is a top-level slot that survives presentation replacement; a stale id blocks the new source's `resolve-track`, so explicit clear-on-unload is required (criterion 4 fails).

Both behaviors share verb-shape "set X when Y resolves" and look superficially identical against the diagnostic in [Step 1](#1-articulate-the-purpose) — the band check is what distinguishes them.

### Cleaned-shape sketch

When projecting what a behavior should look like post-refactor — especially across two sides for [merge analysis](#merging-two-behaviors--extra-discipline) — use this structured format. The template makes shapes directly comparable and forces explicit answers to questions the unstructured "Proposed changes" prose tends to skim:

```text
- States:                            [list, or 'n/a' for non-FSM]
- entry work:                        [what runs once on state entry]
- effects: (continuous reactivity):  ['none' if not state-driven]
- State-exit cleanup:                [what runs on state exit / behavior destroy]
- Source-reset concerns:             ['none' or describe the reset contract]
- Private temporal state:            ['none' or describe what + where it lives]
```

For single-behavior refactors the sketch is optional — "Proposed changes" prose usually carries the same content. For merges the sketch is **required for both sides** so the [complexity inventory](#complexity-inventory-which-side-is-more-constrained) and merge direction have a comparable artifact to operate on.

A sketch is not a refactor commitment. If a side already conforms to current conventions, sketch from its current code; only project a cleaned shape when the side's gap analysis turned up real issues.

### Merging two behaviors — extra discipline

> This section is the canonical reference for the merge workflow. The [`merge-behaviors`](../../../.claude/skills/merge-behaviors/SKILL.md) skill operationalizes it; either reach for that skill or follow the steps below directly.

When the decomposition check says merge, the refactor is **two separate analyses combined**, not one:

1. **Per-side standalone analysis.** For each side, run Steps 1–4 of the refactoring sequence (purpose, business rules, gap analysis, pattern selection) *as if it were a standalone refactor*. Produce a [cleaned-shape sketch](#cleaned-shape-sketch) per side in the structured format. **A side that already conforms to current conventions doesn't need refactoring** — sketch from its current code. Only project a cleaned shape when the gap analysis finds real issues; don't steer toward refactors that aren't warranted.
2. **Identify the constrained side** via the [complexity inventory](#complexity-inventory-which-side-is-more-constrained).
3. **Declare merge direction explicitly.** "Building from \<constrained side\>'s reactor; folding \<simpler side\> into \<where\>." Pause for user confirmation before combining — direction is the load-bearing call and the natural place for human judgment to override the inventory.
4. **Combine.** The constrained side's reactor is the host; the simpler side's `entry`/cleanup folds into the host's `entry`/cleanup; the constrained side's `effects:` ride along.

Skipping per-side analysis and going straight to "combine the existing bodies" produces a relocated mess: each side's anti-patterns survive into the merged form (closure-state, fight-the-shape sniffs, defense-in-depth that has lost its rationale, etc.). **Merge is not relocation.**

#### Complexity inventory: which side is more constrained?

Count "yes" answers per side. The side with more is the constrained one — build the merged shape from there. Bias toward "yes": under-counting an item that's there is the failure mode (the simpler-side declaration arrives a sentence later either way; the inverse mistake leads you to extend the simpler shape outward, which produces conditional branches and afterthought integrations).

| Inventory item | Yes if … |
| --- | --- |
| Multiple states / sub-states | the cleaned shape needs more than a single `resolved`/`unresolved` split |
| `effects:` needed (continuous reactivity) | work has to re-fire on signal changes within a state |
| Source-reset semantics | per-source state must reset on URL change / behavior destroy |
| Per-source temporal state | timers, gates, accumulators, "last X at" comparisons |
| Conditional / gating logic on the writes | downgrade-immediate / upgrade-gated / threshold-based decisions |
| Hand-rolled FSM-shape sniffs in the current code | latent architectural weight even if expressed as a flat effect today |
| Defense-in-depth or short-circuit guards beyond input validation | implies a failure mode worth explicit state-machine expression |

**Common failure mode**: anchoring on the current *merged-helper parameter count* rather than the *cleaned standalone shape*. The merged helper's parameters reflect every input from both sides; the per-side cleaned-shape sketch is what shows architectural weight. The complexity inventory operates on the sketches, not on the merged file.

**Build from the more constrained side.** Use the constrained side's cleaned shape as the starting structure for the merged shape; the simpler input fits as a special case (often a no-op or default) within it. Building the other direction (extending the simpler shape outward to host the complex case) tends to produce conditional branches and afterthought integrations — the leaky-abstraction sniff in [`reactors.md`](reactors.md).

## Source-reset handling (playback-engine behaviors)

Behaviors composed into a playback engine almost always have an implicit dependency on a current source — typically `state.presentation`. Source reset (URL change, presentation cleared, behavior destroyed mid-stream) is a first-class concern: every playback-engine behavior should be designed with explicit semantics for it.

Three categories of source-dependence, each with its own reset contract:

### 1. Async work tied to a source

The behavior schedules tasks (fetches, parses, transforms) whose result is meaningful only for the source they were scheduled against.

**Reset contract**: cancel in-flight work; do not let it commit.

**Pattern**: `createMachineReactor` with source-identity states; `entry: () => () => runner.abortAll()` on the active state. See [`reactors.md`](reactors.md) → "Source-identity states for source-driven work." `setupTrackResolution` in `packages/spf/src/playback/behaviors/resolve-track.ts` is the canonical worked example.

**Hazard**: the spec-defined fetch signal abort cancels in-flight body reads, so tasks awaiting fetch completion fail-fast on signal abort. Behaviors that bypass the signal (e.g., manual `addEventListener('updateend')` plumbing) need explicit teardown in the same cleanup.

### 2. State derived from a source

The behavior holds derived state (closure flags, computed projections, accumulated counters) computed against the current source.

**Reset contract**: reset the derived state when the source changes.

**Pattern**: don't carry derived state in closure-mutable variables; either compute it via `computed` (auto-tracks the source signal) or scope it to a state-machine state so it's freshly initialized on each entry. Closure-mutable state (`let lastUpgradeTime`, `let hasEnded`) survives source resets and produces stale answers.

**Hazard**: the easy bug. `quality-switching`'s closure-state flags, `end-of-stream`'s `hasEnded`, `update-duration`'s `running` flag are all instances surfaced by the assessment as candidates for this category.

### 3. Resources owned per source

The behavior creates a resource (MediaSource, SourceBuffer, Actor, listener) whose lifecycle is bound to the source.

**Reset contract**: dispose the resource when the source changes; create fresh on the new source.

**Pattern**: state-machine state-exit cleanup or behavior-level cleanup. For MediaSource-shaped resources where the lifecycle has multiple states (idle / attaching / open / tearing-down), `createMachineActor` is often the right primitive — the resource owns its own state machine.

**Hazard**: mid-flight teardown vs. late commits. If the resource is being torn down while in-flight work referencing it is completing, the work must short-circuit. `setup-mediasource`'s nested-effect-via-flags pattern is an instance.

### Source-reset checklist

When designing or reviewing a playback-engine behavior:

- What does this behavior depend on from the source?
- On `set source → unset → set new`: does the behavior recover correctly? (Common URL-change path.)
- On `set source → set new` directly (no unset intermediate): is this assumed not to occur, or is there defense in depth?
- On `behavior destroyed mid-async`: is teardown clean? Does in-flight work bail or leak?
- Is any state that should reset on source change carried in closure variables instead of state-machine state or signal-derived computed?

The cleanup pass should re-audit each behavior through this lens; the symptom-level findings in the assessment (closure flags, manual cleanup, hand-rolled FSMs) cluster around source-reset gaps.

## Behavior shape

Always construct via `defineBehavior` rather than building the behavior object literal manually. `defineBehavior` enforces single-behavior key/param consistency: declared `stateKeys` must equal `keyof S` inferred from the setup's state-param type. Drift between the declared keys and the body's reads/writes becomes a type error at the definition site.

```ts
export const syncPreload = defineBehavior({
  stateKeys: ['preload', 'presentation'],
  contextKeys: ['mediaElement'],
  setup: syncPreloadSetup,
});
```

The narrow exception is `makeShareSignals` (and any future zero-key behavior factory): empty key arrays trip the `defineBehavior` exhaustiveness check, so a `Behavior<>` literal is correct there. If you find yourself reaching for the literal form for any other reason, pause — there's probably a missing key declaration.

### Setup-param typing (read/write intent)

Type the `setup` deps with `Signal<T>` for slots the body **writes** and `ReadonlySignal<T>` for slots the body only **reads**. This is a real contract enforced by the type system — `Signal<T>` permits `.set()`, `ReadonlySignal<T>` does not. See [`signals.md`](signals.md) for the broader treatment.

```ts
function syncPreloadSetup({
  state,
  context,
}: {
  state: { preload: Signal<State['preload']> };          // body writes
  context: { mediaElement: ReadonlySignal<...> };        // body only reads
}): () => void { ... }
```

### Narrow the slice with `Pick`

When a behavior touches only a few keys of a wider state shape (`PresentationState`, `EngineContext`, etc.), narrow the slice with `Pick` rather than typing against the wide shape. This makes the read/write contract visible at the definition and lets `defineBehavior`'s exhaustiveness check do its job.

```ts
type State = Pick<PresentationState, 'preload'>;
```

### Cleanup contract

Return one of:

- `() => void` — most common; an unsubscribe-style cleanup (often the return value of `effect(...)`).
- `void` — when the behavior only registers handlers that are owned by something with its own lifecycle.
- `{ destroy(): void | Promise<void> }` — when cleanup is multi-step or async.

Use `AbortController` internally when there are multiple cleanups to coordinate (see CLAUDE.md "Cleanup Pattern"). If a behavior owns an Actor, the cleanup should call the Actor's `destroy()` (or equivalent) — leaving an Actor running past its parent behavior's teardown is a leak.

## Per-type specialization

When a behavior's logic varies by media type (video / audio / text), prefer **separate exports per type** over a single behavior with a `config.type` discriminant.

```ts
// good — narrow per-type keys, no runtime discriminant, dead code drops out
export const selectVideoTrack = defineBehavior({ ... });
export const selectAudioTrack = defineBehavior({ ... });
export const selectTextTrack = defineBehavior({ ... });
```

Engines opt into specific tracks (e.g. an audio-only engine uses `selectAudioTrack` only). This wins on **A — Reusability** (engines aren't forced to carry video logic), **C — Patternability** (call sites read the same shape regardless of type), and **E — Size** (unused specializations tree-shake out).

The runtime cost is shared body code. Three modules currently share via a typed helper (`resolve-track`'s `setupTrackResolution`, `select-tracks`'s now-fully-inlined bodies, `load-segments`'s `setupSegmentLoading`); the trade-off is documented in `.claude/plans/spf/discrete-signals-and-behavior-objects.md` under "Code-reuse compromise" and is a pending follow-up — see [Helpers and behavior factories](#helpers-and-behavior-factories) below.

## Helpers and behavior factories

Decomposition tools used *within* the Behavior shape, not alternatives to it. **This section is expected to iterate** as the cleanup pass surfaces real cases. Three forms are recognized.

### Inline helper

A function operating on already-resolved values, called from inside a Behavior body. Has no setup/cleanup of its own; the Behavior owns its lifecycle. Lives near its caller (same file, or a sibling module if shared across a small group).

When to extract an inline helper:

- A piece of pure logic in a Behavior body is reused by another Behavior in the same module (or sibling).
- A computation that's pure given its inputs and is verbose enough to obscure the surrounding `effect` / `computed` body.
- The same predicate or projection appears in two `computed` definitions.

When **not** to extract an inline helper:

- The code is used only once and reads naturally inline.
- The helper needs to read or write composition signals. That's a setup-shape helper (see below), not an inline helper.

### Setup-shape helper

A function whose signature matches `Behavior.setup` — `({ state, context, config }) => cleanup` — called from inside a behavior's setup. Operates on signals (state/context), owns its own setup/cleanup contract, and bakes per-type or per-export parameterization into `config` at the call site (each per-type export adapts the call inline).

`setupTrackResolution` (in `resolve-track.ts`, commit `54707e59`) is the canonical example: three per-type behaviors (`resolveVideoTrack`, `resolveAudioTrack`, `resolveTextTrack`) each call it from their `defineBehavior` setup, supplying their per-type config (`selectedKey`, `findTrackToResolve`) inline.

When to use a setup-shape helper:

- The orchestration shape repeats across 2+ Behaviors with per-type parameterization (selected key, finder fn, type discriminant).
- The reuse is at the composition layer (touches signals), but each per-type export should keep its own `defineBehavior` declaration — for visibility of `stateKeys` at the call site, for the exhaustiveness check to run per export, or because each export has its own JSDoc / test boundary.
- You want a uniform "helpers shaped like setup" convention reproducible across many shared helpers without each becoming a wrapper around `defineBehavior`.

When **not** to use a setup-shape helper:

- The reuse is pure logic over already-resolved values — that's an inline helper.
- The lightest call sites are the priority and you're willing to hide `defineBehavior` inside a wrapper — that's a behavior factory.

Trade-off: per-export call sites carry the `defineBehavior` boilerplate plus an inline `config` object (~3 extra lines per export vs. a factory). Acceptable when the shape uniformity is reproducible across many helpers and you want each export's slot intent legible at the export site.

### Behavior factory

A function that *returns* a Behavior, parameterized by the type/keys/config the caller cares about. The product is a Behavior; the factory captures the parameterization. `makeShareSignals<S, C>()` is the canonical example.

When to use a behavior factory:

- The same Behavior shape applies to multiple keys, and you want the lightest call sites — each export is a single-line factory invocation, no `defineBehavior` boilerplate per export.
- A Behavior is parameterized by something that varies *across compositions but is fixed within one* — pass it via factory args rather than via runtime `config`, so each composition gets a Behavior with the parameterization baked in (and dead branches drop out).
- The `stateKeys`/`contextKeys` themselves are parameterized in a way the factory can express but a setup-shape helper can't (e.g. `makeShareSignals` declares zero keys regardless of `S`/`C`).

When **not** to use a behavior factory:

- The shape is reproducible without wrapping `defineBehavior` — a setup-shape helper is lighter.
- `config` already does the job. A factory parameter that ends up rebroadcast as `config` adds a layer for no gain.
- When parameters vary at runtime within a single composition. That's `config`'s domain, not the factory's.

### Inline helper, setup-shape helper, factory, or another behavior?

The decision pivots on *what's shared*, *what's parameterized*, and *whether you want each export to keep its own `defineBehavior` declaration*.

| Shared shape | Parameterized over | Reach for |
| ------------ | ------------------ | --------- |
| Inline computation, used by one Behavior body | (nothing — inline) | Inline code |
| Pure logic over already-resolved values, shared by 2+ Behaviors | Their inputs | **Inline helper** |
| Setup orchestration over signals, shared by 2+ Behaviors with per-type config; keep `defineBehavior` per export | Per-type config (passed via `config`) | **Setup-shape helper** |
| Same as above, but lightest call sites preferred over per-export `defineBehavior` visibility | Slot-map types (`S`, `C`, …) or per-type opts | **Behavior factory** |
| Behavior shape shared, but slot intent or set of touched keys varies per type | Per-type structure | **Per-type specialization** (separate exports), often combined with a setup-shape helper or factory |
| Same problem solved twice in two unrelated places | (none — coincidence) | Leave as two |

The "abstracted helpers should look like Behaviors" goal is satisfiable through either the setup-shape helper or the behavior factory pattern. Pick by which trade-off you want: setup-shape preserves per-export `defineBehavior` (and its exhaustiveness check) at the cost of slightly verbose call sites; factory hides `defineBehavior` for lighter call sites at the cost of an extra wrapping layer. The follow-up on `select-tracks` and `load-segments` is to apply this distinction case by case (per `54707e59`, `resolve-track` adopted the setup-shape helper form).

## File placement

Per [`packages/spf/src/CLAUDE.md`](../../../../packages/spf/src/CLAUDE.md):

- DOM-free Behaviors live in `playback/behaviors/` (e.g. `select-tracks.ts`, `quality-switching.ts`).
- DOM-bound Behaviors live in `playback/behaviors/dom/` (e.g. `setup-mediasource.ts`, `load-segments.ts`).

The split is enforced by tsconfig `lib` settings — a non-DOM behavior that imports `HTMLMediaElement` will fail typecheck, not just lint. If a Behavior currently lives outside `dom/` but reaches into DOM types, that's a placement bug, not a style nit.

Actor factories the Behaviors instantiate live alongside in `playback/actors/` (or `playback/actors/dom/`). Cross-imports between sibling Behaviors and Actors are expected; reaching across `media/`, `network/`, or `core/` follows the dependency rules in CLAUDE.md.

### Pure helpers don't belong in behaviors

If a top-level function in a behavior module has no `core/` dependency (no signals, effects, or reactors), it probably doesn't belong in `playback/behaviors/`. Move it to `media/` (or `network/`, or `@videojs/utils` if generically useful).

This is the inverse of the smell already documented in [`packages/spf/src/CLAUDE.md`](../../../../packages/spf/src/CLAUDE.md) (a primitive that reaches into `core/`). Same layering principle, opposite direction.

Rule of thumb when reviewing a behavior file: scan the top-level helpers. If any are pure data-manipulation / lookup / format-handling code with no reactive concerns, they should move out.

Concrete instance: `findTrack` and `updateTrackInPresentation` lived in `resolve-track.ts` until commit `a9ef69ba`; both operate purely on HAM-shaped types from `media/types` and were extracted to `media/utils/tracks.ts`.

### File-level JSDoc

Every behavior file should open with a top-level JSDoc / module comment articulating the behavior's *purpose* — what the module is for, not what it does. Example:

```ts
/**
 * **Default track selection on src load.** When a presentation is resolved,
 * sets `selectedTrackId` to a per-type-picker default if no selection
 * already exists. Unselects on src unload.
 */
```

Per-export JSDoc (already conventional) describes individual exports; the file-level comment names the *module's* purpose so reviewers and refactors can evaluate against it. The first step of [Refactoring an existing behavior](#refactoring-an-existing-behavior) starts here — if the file-level purpose is missing or misaligned with the body, that's a finding before any code change.

## Naming

- Behaviors are named as **descriptive verbs**: `syncPreload`, `selectVideoTrack`, `loadVideoSegments`, `endOfStream`. No `*Behavior` suffix.
- Files match the exported name in kebab-case: `sync-preload.ts` exports `syncPreload`.
- Per-type specializations co-locate in one module: `select-tracks.ts` exports `selectVideoTrack` / `selectAudioTrack` / `selectTextTrack`.
- Behavior factories are named `make*`: `makeShareSignals`. The factory's product is a Behavior; the prefix distinguishes the factory from a Behavior export.
- Setup-shape helpers are named `setup*`: `setupTrackResolution`. The shape is a `Behavior.setup`-style function called from inside a per-type behavior's setup.
- **Name by the unit-of-work this behavior triggers, not by its downstream observable.** When per-type-specialized behaviors exist (video / audio / text), the names must match the work they share — sibling consistency is load-bearing. `loadVideoSegments` triggers segment fetches; segments produce frames downstream, but we don't call it `loadVideoFrames`. Same for audio (`loadAudioSegments`, not `loadAudioSamples`) and text (`loadTextTrackSegments`, not `loadTextTrackCues`). A name that breaks the sibling pattern is a sniff that the author was thinking about a different layer than the convention assumes.
- **Domain-prefix slot / context keys when a same-shape sibling can exist** in the engine's composition. `segmentLoaderActor` reads as generic when there's only one in scope, but the moment a sibling appears — text-track segment loader, audio segment loader — the unqualified name becomes ambiguous. Prefer `videoSegmentLoaderActor` / `textTrackSegmentLoaderActor` even if only one exists today; the rename later is non-trivial because the slot leaks through behavior signatures and engine state types.

## Testing

Tests live in `tests/` next to the source (`packages/spf/src/playback/behaviors/tests/sync-preload.test.ts`). The vitest project assignment is automatic by path:

- `playback/behaviors/**/*.test.ts` (non-DOM) → `behaviors` project (Node).
- `playback/behaviors/dom/**/*.test.ts` (DOM) → `dom` project (Chromium).

Use `describe('<exact exported name>', ...)`. For per-type specializations, prefer one `describe` per export rather than a single shared `describe` block — call sites read the same shape regardless of type, and tests should too.

When a Behavior is augmented with an Actor, the Actor's own tests live in `playback/actors/tests/`. The Behavior's tests should cover the wiring (slot reads/writes, cleanup ordering, lifecycle); they shouldn't re-test the Actor's internals.

## Anti-patterns

- **Building behavior objects without `defineBehavior`** outside the `makeShareSignals` exception. Drops the exhaustiveness check and lets `stateKeys` / body drift.
- **Typing setup deps against the full state/context shape** instead of `Pick`'d slices. Hides the read/write contract; makes wide-to-narrow casts necessary inside the body.
- **Runtime `config.type` discriminants** for per-media-type behaviors. Costs all three of A/C/E for a small body-reuse gain.
- **Behaviors that mutate slots they didn't declare** in `stateKeys` / `contextKeys`. The type system stops most of this, but mutating a slot via a captured ref obtained from `shareSignals`-style channels can still slip past — convention: write to your own declared slots only, even when a wider ref is in scope.
- **Reaching for a Reactor or Actor when a simple behavior would do.** The dual of the augment-sniffs above. If the body is short, signal-only, and effect-shaped, leave it.
- **Force-fitting a "no good fit" sniff into the closest existing primitive** to make the body look conventional. Hold the sniff visibly with a comment and surface the gap; a clean-looking force-fit hides the real signal.
- **Declaring "no good fit yet" without naming what you considered.** The factory inventory has grown; what looked like a gap a year ago may have a real primitive now. Name the candidates you ruled out and why before flagging a missing primitive.
- **Reaching for the raw Actor primitive when one of the factories (`createTransitionActor`, `createMachineActor`) fits.** The factories are the convention layer; the raw Actor is below it.
- **Behaviors that own an Actor without disposing it in cleanup.** Always a leak; usually a sign the Actor's lifecycle should be expressed through context (so cleanup ordering is explicit) rather than captured locally.
- **Splitting by domain rather than by shape.** A "video" Behavior that's really three Behaviors (selection, loading, sync) glued together is harder to reuse in audio-only contexts than three small Behaviors with overlapping slot maps.
- **Defense-in-depth checks without an articulated failure mode.** Every guard added "just in case" should name the specific thing it protects against. When the architecture changes, revisit the guard — it may have become unreachable. Carrying unreachable guards is technical debt that obscures the real safety properties of the surrounding code. (Concrete instance from this branch: a commit-time presentation id check in `setupTrackResolution` that became redundant once the reactor's state-exit abort + spec-compliant fetch signal propagation handled the same race; removed in commit `5456d9db`.)
- **Closure-mutable state that should reset on source change.** See "Source-reset handling" — closure variables survive source resets. Express the state in a `createMachineReactor` state or a signal-derived `computed` so reset happens structurally.
- **Merging without refactoring** — combining two behaviors by relocating their bodies into one file/helper without first running purpose-first analysis on each. Symptom: the merged behavior's body looks suspiciously like its inputs glued together; each side's anti-patterns (closure-state, hand-rolled FSMs, leaky abstractions, conditional branches around optional work) survive into the merge. See [Merging two behaviors — extra discipline](#merging-two-behaviors--extra-discipline).
- **Building a merged behavior from the simpler side outward.** When merging behaviors of unequal architectural weight, extending the simpler shape outward to host the more constrained one produces conditional branches and afterthought integrations in the lifecycle helper. Build from the more constrained side; the simpler case fits as a special case within that shape.
