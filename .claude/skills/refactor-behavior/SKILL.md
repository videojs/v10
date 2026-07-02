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
- `internal/design/spf/conventions/config.md` — when to push a value
  to config vs bake it in; engine config as single source of truth;
  threading paths; multi-layer source-of-truth principle; decision
  logic with the algorithm.
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

**Per-type structure check.** Before locking the purpose statement,
check whether the work is per-type-structured (video / audio / text).
Signals: the file declares `type FooType = 'video' | 'audio'`, a
`KeyByType` map, or a `for (const type of types)` write loop. If so,
the purpose statement must expose the per-type axis — phrase the
per-type unit as the verb's object ("**per available track type**,
when the selected track of that type resolves, create X for that
type") rather than collapsing it under an atomic-aggregate verb
("atomically create all needed X"). Atomic-aggregate framing hides
the per-type axis under a cross-cutting constraint; Step 6a's per-
type-axis diagnostic is unlikely to recover the axis from body-
iteration sniffs alone if Step 1's framing already collapsed it.
**The per-type axis is a Step-1 concern, not a Step-6 discovery.**

Cross-type constraints (atomicity, ordering, shared-lifecycle) are
secondary in the purpose statement — they describe how the per-type
units interact, not what the behavior does. Demote them to constraint
clauses ("…in one synchronous block") so the per-type axis stays
primary.

If the existing file-level JSDoc uses atomic-aggregate framing on
per-type-structured work, flag the JSDoc itself as a finding — the
prior author likely missed the per-type axis too, and the refactor
should correct the framing as part of its scope.

Worked example: `setup-sourcebuffer.ts`'s current JSDoc opens with
"atomically create all needed `SourceBuffer`s for the current
source" (atomic-aggregate, axis-hiding) despite the file declaring
`MediaTrackType`, `BufferKeyByType`, and a per-type write loop.
Corrected framing: "per available track type, when the selected
track of that type is resolved with codecs, create a `SourceBuffer`
+ actor for that type; do all the `addSourceBuffer` calls in one
synchronous block per the Firefox `mozHasAudio` invariant; on
`mediaSource` detach or destroy, tear down per type." Atomicity
demotes to a constraint clause; the per-type axis surfaces as the
headline; Step 6a's split-candidate trigger then fires from the
purpose statement alone. Per `behaviors.md` → "Per-type structure
diagnostic."

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

**Identity-change check for resources owned in a state.** When a state
owns a resource bound to *upstream identity* (not just presence) — e.g.
a child actor tied 1:1 to an upstream actor's reference, a listener
bound to an element identity — `entry` is the wrong place. State-
exit cleanup only fires when the state transitions away; if the
upstream identity swaps *within* the same state (truthy → different
truthy), `entry` doesn't re-run, and the resource stays bound to the
stale upstream. Use the `effects:`-based cleanup idiom in
`reactors.md` → "Effects-based cleanup for within-state identity
changes": the effect's tracked read on the upstream signal drives
both state-exit cleanup *and* within-state identity-change rebuild.
Worked example: `setupSegmentLoading`'s loader-lifecycle effect in
`load-segments.ts` — destroys and recreates the `SegmentLoaderActor`
when the upstream `xBufferActor` reference is replaced (quality
switch), without transitioning the state machine.

**Helpers with conditional branches around optional state-scoped
work** (`const x = optionEnabled ? doX() : undefined` inside a
shared-helper's `entry`) are a leaky abstraction. The variant should
supply the work; the helper shouldn't carry the conditional. (Specific
composition shape is per-case; what matters is that the helper isn't
parameterized by "is this optional thing on or off?")

**Reactor-owning-an-actor's-lifecycle is a documented shape, not a
boundary violation.** The reactor / actor distinction in
`actor-reactor-factories.md` reads as binary (resource ownership vs.
observe-and-react), but real reactors often *own* a child actor's
existence — `setupTrackResolution` owns a `ConcurrentRunner`,
`setupSegmentLoading` owns a `SegmentLoaderActor`. The reactor owns
the actor's *lifetime*; the actor still owns its *internal state*.
State-exit cleanup (or effects-based cleanup, per above) destroys
the child actor. This pattern is correct when the child actor's
existence is bound to a reactive condition the parent reactor
monitors.

**Band check — when both light-reactor and simple-effect are
legitimate.** Before locking in the pattern, evaluate the four
criteria in `behaviors.md` → "Where both shapes are legitimate: the
light-reactor / simple-effect band":

1. Single positive state?
2. Source-identity-driven?
3. Re-fire-safe entry work?
4. No undo on state exit (criterion 4a), OR sole-writer effect
   cleanup handles it (criterion 4b)?

If **all four** hold, the case lands in the band. **Default to D —
the simple `effect()` form — unless C factors are load-bearing for
this case.** Per `evaluation-axes.md`'s C vs D tension and the band
intro in `behaviors.md`: A and B are correct either way inside the
band, so the choice sits on C (sibling consistency, structural
naming) vs D (less scaffolding, matches actual complexity). D is the
default tiebreaker; C overrides only when the convention is earning
its keep at this site — many established siblings, named lifecycle
that aids external observers, plausible additional state on the
pressure list.

When C plausibly overrides D, **don't pick silently.** Surface the
choice via `AskUserQuestion` with the trade-off summary and an
explicit C-earn-its-keep check. When C clearly doesn't override —
file-name kinship alone with no other reactor signals — proceed with
the effect form and note it as a D-priority call.

**D-priority diagnostic — the easy in-band case.** If the work is
`create() → destroy()` for a single resource, this behavior is the
**sole writer** of the lifecycle slots, no async, no per-state
continuous reactivity → criterion 4b applies and the simple
`effect()` form is strongly preferred. The effect's natural cleanup
return handles destroy + slot clear structurally. Treat sibling
pattern-matching as a C-signal that needs to earn its keep: verify
the adjacent `setup*` reactors carry genuine A/B weight (async +
cancellation, multi-state, transition + state-driven split) before
letting their file-name kinship pull you to the heavier shape —
`setupTextTrackActors` (effect, D-priority) sitting alongside
`setupMediaSource` (reactor for async + abort-on-state-exit) is the
worked example.

On any one criterion failing, the pattern is prescribed by the
bullets above — pick it and proceed. The most common disqualifier is
criterion 4's multi-writer clause: a slot with multiple writers that
needs explicit clear-on-unload requires the reactor's structural
state-exit cleanup (`select-tracks` is the canonical example).

### Step 5 — Convention checks

Before writing the refactor:

- Setup-shape helper signature (`({ state, config }) => cleanup`)?
- **Pure-helper inverse-layering audit.** Scan top-level functions in
  the behavior file. For each, check imports: no `core/` deps + only
  `media/` or `network/` deps → candidate for extraction. Includes
  helpers freshly visible from a recent refactor (e.g., a function
  the prior layout had hidden inside a complex closure). Audit
  encompasses *the whole file*, not just helpers introduced during
  this refactor — sometimes the right home for a helper only becomes
  visible after a structural change clarifies its role. Worked
  examples surfaced during the SPF behavior sweep: `fetchStream` +
  `createTrackedFetch` (load-segments → `network/fetch.ts`),
  `segmentStartFor` (load-segments → `media/buffer/forward-buffer.ts`),
  `hasCodecs` (setup-sourcebuffer → `media/utils/tracks.ts`). Per
  `behaviors.md` → "Pure helpers don't belong in behaviors."
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
  body is composing at the wrong level for one of two reasons —
  *which* reason depends on the downstream consumer interface:
  - **Downstream consumers operate uniformly** → compose against the
    aggregating resource (e.g., `mediaSource.sourceBuffers`,
    `mediaElement.textTracks`). The per-type slots stay reserved for
    behaviors that genuinely vary per type. Per `behaviors.md` →
    "Inverse: behaviors that operate uniformly across tracks."
  - **Downstream consumers operate per-type** → this isn't an
    in-place fix; this is a **split candidate**. Defer the resolution
    to Step 6a — recommend `/split-behavior` rather than rewriting
    the slot map here.

  Diagnostic: would an audio-only or video-only engine be able to
  compose this behavior without wiring no-op slots? (Both paths
  answer "yes" — the difference is whether the fix is in-place
  aggregate composition or a per-type split.)
- **Config audit — hardcoded values that should be threaded.** Scan
  the behavior body for module-level constants referenced inline
  (`DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration`,
  `DEFAULT_QUALITY_CONFIG.safetyMargin`, etc.) and for magic-number
  literals. For each, run the diagnostic from `config.md` → "When to
  make something config": *who would override this, and why?* If the
  answer names a plausible engine variant (low-latency live, VOD
  bandwidth-tuning, audio-only, test stub) → thread from engine
  config through the variant + helper / actor. If the answer is
  "no one — it's internal correctness" → it's implementation detail;
  leave hardcoded or extract to a shared constant (e.g.
  `SEGMENT_TIME_EPSILON`), don't thread.

  **Multi-layer source-of-truth check.** Once you've named a tunable,
  audit *every other consumer of the same value*: other behaviors,
  actor factories, lower-layer functions. If any of them also default
  from the module constant independently, both consumers must thread
  from the same engine source — independent defaulting from the
  module constant is a latent bug where engine overrides reach one
  layer but not the others. Per `config.md` → "The multi-layer
  source-of-truth principle." Worked example surfaced during the SPF
  config sweep: `bufferDuration` was used by the load-segments
  dispatcher AND the segment-loader actor's `getSegmentsToLoad` /
  `calculateForwardFlushPoint`; both now thread from
  `config.forwardBuffer?.bufferDuration` instead of independently
  reading the module constant.

  **Decision-logic-with-the-algorithm check.** If the behavior
  branches on an algorithm's output using values the algorithm could
  read from its config, push the decision INTO the algorithm rather
  than post-processing in the caller. The caller's job becomes "ask
  the algorithm; apply the answer." Per `config.md` → "Decision
  logic with the algorithm, not the caller." Worked example:
  `selectQuality` now owns upgrade-margin gating given `currentTrack`,
  collapsing the quality-switching dispatcher from 3 branches to one
  `set-if-different`.

### Step 6 — Decomposition check

Having stated the purpose: **should this behavior still exist as-is?**
Two questions, asked symmetrically: should it *merge* with another
behavior, and should it *split* into per-type variants. The most common
miss on a blind ask is the split — Step 6 used to lead with merge, so
this step now runs split first.

#### 6a — Split candidate?

A blind refactor on a per-type-friendly behavior commonly ships an
in-place tightening when the right answer was per-type split with a
shared setup-shape helper. The miss happens because the body's uniform
iteration over a `KeyByType` map looks superficially like the
"uniform-across-tracks" foil (which prescribes aggregate composition,
not split). The distinguishing signals below pull split apart from
uniform-aggregate.

**Diagnostic — three split-candidate triggers. Any one firing is enough
to recommend `/split-behavior` as the follow-up.**

- **Explicit per-type axis declared inline.** A `type FooType =
  'video' | 'audio'`, a `KeyByType` map, a `for (const type of types)`
  write loop. The axis being declared inline is itself a sniff that
  per-type specialization was already in mind when the merged form was
  written — the merged form usually exists because of a *perceived
  cross-type constraint*. Don't pre-decide the constraint here; surface
  it as the invariant `/split-behavior`'s cross-boundary audit will
  evaluate.
- **Sibling precedents at the same engine layer.** If per-type-
  specialized siblings already exist (`resolveVideoTrack`/`Audio`/
  `Text`, `loadVideoSegments`/`AudioSegments`, `selectVideoTrack`/
  `Audio`/`TextTrack`) with shared setup-shape helpers
  (`setupTrackResolution`, `setupSegmentLoading`), a same-shape
  behavior should follow the precedent unless a cross-type constraint
  actively forbids it. Sibling precedent here is C-axis weight
  earning its keep across many call sites.
- **Per-type consumers downstream.** If the slots this behavior
  writes are consumed per-type by `*Video*` / `*Audio*` siblings
  (e.g., `loadVideoSegments` reads `videoBufferActor`,
  `loadAudioSegments` reads `audioBufferActor`), the per-type
  interface is the destination shape; per-type writers fit it
  naturally. This is what distinguishes split-candidate from the
  uniform-across-tracks foil — the foil applies when consumers
  iterate `mediaSource.sourceBuffers` or similar aggregates, not when
  consumers consume per-type slots.

**If any trigger fires**: recommend `/split-behavior` as the follow-up
(don't perform the split inline, and don't pre-decide the cross-
boundary constraint — that's the skill's audit step). Per `behaviors.md`
"Per-type specialization" (destination shape for per-type splits) and
"Sniffs that say 'split'" (the pre-existing slot-map-cluster sniffs).

**Anti-rationalization check**: a perceived cross-type constraint
(atomicity, ordering, shared lifecycle) is not a reason to foreclose
the split inline — it's the *invariant the audit will evaluate*. The
audit's possible outcomes include "split is fine, the invariant
survives" and "keep merged, the invariant doesn't survive cleanly."
Pre-deciding short-circuits the skill's value.

#### 6b — Merge candidate?

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

(The split path is handled in 6a above. Recommend `/split-behavior` if
any of the three triggers fire there.)

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
  distinguish), check the downstream consumer interface:
  - **Consumers uniform** → compose against the aggregating resource
    (`mediaSource.sourceBuffers`, `mediaElement.textTracks`) instead.
    Per `behaviors.md` → "Inverse: behaviors that operate uniformly
    across tracks."
  - **Consumers per-type** → this is a split candidate, not a
    post-refactor in-place fix. Step 6a should have caught it
    pre-edit; surface it now if it didn't (the refactor's output is
    a re-entry point for the decomposition question, not a place to
    paper over a missed split).

  This is invisible to the exhaustiveness check — both keys *are*
  used; the smell is that they're used identically.
- **Naming sibling-consistent?** → if per-type-specialized siblings
  exist (`loadVideoSegments`, `loadAudioSegments`), the new/renamed
  behavior should match (`loadTextTrackSegments`). Per `behaviors.md`
  → "Naming" → "Name by the unit-of-work this behavior triggers."
- **Specialization helper parameterized by typed key?** → when the
  refactor produces a `setup*` helper (`setupTrackResolution`,
  `setupSegmentLoading`, `setupSourceBuffer`), it should parameterize
  by typed key: variants pass `state` / `context` through directly
  and supply the key as `config` (`selectedKey` in
  `setupTrackResolution`, `selectedKey` + `actorKey` in
  `setupSegmentLoading`, `selectedKey` + `bufferKey` + `actorKey` in
  `setupSourceBuffer`). The antipattern is aliasing the per-type
  slots to abstract names (`buffer`, `actor`) in the helper signature
  and having variants remap into the aliases at the call site — this
  loses per-type intent at the call site and inverts the
  helper-declares / caller-binds relationship. Per `behaviors.md` →
  "Parameterization shape: parameterize by typed key."
- **Behavior name domain-prefixed?** → if the bare verb could
  plausibly act on more than one similarly-shaped target, prefix it
  with the target. Refactors are the right time to fix this since
  the rename ripples through engine composition, imports, and tests
  — surfacing it post-refactor is more costly. Per `behaviors.md` →
  "Naming" → "Domain-prefix behavior names."
- **New inline module-level config references in the diff?** → if
  the refactor introduced or kept a `DEFAULT_*_CONFIG.x` reference
  in the body where the same value is also consulted elsewhere (other
  behaviors, actor factories, lower-layer functions), thread it from
  engine config so every consumer agrees on overrides. The pre-
  refactor audit (Step 5's config check) catches existing instances;
  this second pass catches ones the refactor diff itself introduced
  — a new helper that references the module constant, a new state's
  entry that defaults inline. Per `config.md` → "Multi-layer source-
  of-truth principle."

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
