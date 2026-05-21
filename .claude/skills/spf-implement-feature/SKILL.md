---
name: spf-implement-feature
description: >-
  Implement a feature documented in the SPF feature registry. Consumes a
  feature doc at internal/design/spf/features/<name>.md and produces the
  engine-side code: new behaviors, updates to existing behaviors, media-layer
  / network-layer primitives, and tests. The implementation analog of
  /spf-document-feature (which produces the doc; this consumes it). Walks
  through resolving the doc's open questions before coding, maps phases to
  discrete chunks, applies the SPF conventions catalog, routes to downstream
  skills (/spf-create-behavior, /spf-update-behavior, /refactor-behavior) per
  chunk shape, and updates the feature doc's Status / Implementation surface
  / Verification sections as code lands. Triggers: "implement feature",
  "implement SPF feature", "build feature", "code feature", "scope feature
  implementation", "implement <feature-name>".
---

# Implement an SPF Feature

Take a feature documented at `internal/design/spf/features/<name>.md` and
produce the engine-side code that satisfies its Phase 1 (and optionally Phase
2 / Phase 3) scope. The canonical failure mode without this discipline is
jumping from "implement audio-abr" to writing code — producing implementation
that doesn't match the doc's grounding, drifts beyond the agreed phase scope,
misses the conventions catalog, or skips the doc-update cascade that keeps
the feature registry current as code lands.

Steps 1–2 are the load-bearing setup. Skipping them produces implementations
that look superficially correct but anchor on the wrong scope, miss the doc's
open questions, or fail to coordinate with cross-cutting concerns. Steps 3–7
only make sense once the feature, sources, and intent are named. Step 8 (doc
update as living artifact) is where the registry stays in sync with code.

## Usage

```
/spf-implement-feature [<feature-name>]
```

The arg is the feature doc's filename (without extension), e.g.
`audio-abr`. The skill reads the feature doc as its source of truth.

## Doc-as-starting-point principle

The feature doc is the **starting point for planning, not a hardened
specification**. This principle is load-bearing throughout the skill —
explicit because both directions of failure are real:

- **Silent override** (covered by `Feature-doc-grounding drift` failure
  mode) — implementation diverges from the doc without surfacing the
  divergence; the doc becomes stale silently.
- **Rigid following** (covered by `Treating feature doc as hardened spec`
  failure mode) — implementation refuses to revise the doc when new
  questions surface or drift is discovered; the doc becomes a misleading
  constraint.

Acknowledge the doc's `definition` depth explicitly when planning:

- **`coarse`** — feature sketched, many open questions. Implementation
  fills in significant detail; revisions to the doc are expected
  throughout. Planning is substantial.
- **`technical`** — scope and constraints articulated; specifics still
  open. Implementation maps to constraints; moderate planning + revision.
- **`sketched`** — implementation surface populated. Implementation
  primarily verifies; revisions for drift only.

Discipline:

- **Every doc revision is explicit and surfaced** to the user during the
  implementation pass. Never silent.
- **Step 8 consolidates** the cumulative doc update reflecting all
  revisions made during implementation — it's not the *only* revision
  point, just the cumulative one.
- **Open questions are markers**, not absent specs — the implementation
  resolves them through experience or explicitly defers them.

## Reference docs

Primary:

- `internal/design/spf/features/<name>.md` — **source of truth** for what
  to implement. Read end-to-end before scoping.
- `internal/design/spf/conventions/*.md` — when to reach for which primitive
  (behaviors, signals, reactors, actors, config). Applied throughout
  implementation.
- `internal/design/spf/evaluation-axes.md` — A–E axes the implementation is
  scored against. Cleanup pass and feature work share the same axes.
- `packages/spf/docs/hls-engine.md` — current HLS engine composition
  walkthrough; the baseline the implementation extends.
- `packages/spf/src/CLAUDE.md` — source layout + dependency rules.

Secondary:

- `internal/design/spf/use-cases/<name>.md` — if implementing for a
  use-case-specific path (variant composition).
- `internal/decisions/*.md` — past tactical decisions constraining shape.
- `internal/design/spf/architecture.md`, `primitives.md`, `signals.md` —
  implementation-level "how it works."
- Existing similar behaviors / actors as templates (e.g.,
  `switchVideoQuality` as a template for `switchAudioQuality` when
  implementing audio-abr).

Downstream skills routed-to:

- `.claude/skills/spf-create-behavior/SKILL.md` — new behaviors.
- `.claude/skills/spf-update-behavior/SKILL.md` — existing behaviors whose
  purpose is changing.
- `.claude/skills/refactor-behavior/SKILL.md` — existing behaviors whose
  purpose is preserved but implementation improves.
- `.claude/skills/split-behavior/SKILL.md`, `.claude/skills/merge-behaviors/SKILL.md`
  — structural changes.
- *(future)* media-layer / network-layer skills for `packages/spf/src/media/`
  and `packages/spf/src/network/` changes.

## Failure-mode catalog (seeded; grows with use)

- **Skipping disambiguation** — invoking with a name or description that
  ambiguously maps to (i) an existing feature, (ii) a different feature,
  (iii) a use case, (iv) cluster-E policy, (v) something not yet
  documented. Step 1's disambiguation must resolve before gathering
  sources or planning. Proceeding-with-assumption is the canonical
  failure shape. Worked example: invocation "implement resolution
  capping" — could be (i) the `rendition-selection-caps` feature (the
  right route; cluster-E selection policy), (ii) a use-case composition
  shape (incorrect — composition vs runtime config), or (iii) something
  else entirely. The disambiguation discipline catches it. Another
  worked example: invocation "implement audio-only" maps to the
  `audio-only-mode-override` use case (which absorbed what was
  previously framed as a separate `audio-only-composition` feature);
  the disambiguation is between use case and cluster-E policy, not
  between feature framings.

- **Routing-out failure** — Step 1's disambiguation should route
  confidently. The failure mode is "ambiguity discovered but not
  resolved" — silently picking one interpretation when the user could
  have meant another (especially: a request that's actually a use case
  routed-here as a feature, or vice versa). Always surface and confirm.

- **Treating feature doc as hardened spec** — refusing to revise the
  doc when implementation reveals new questions, refines framing, or
  surfaces drift. Inverse failure of silent-override (see
  `Feature-doc-grounding drift`). The right discipline is explicit,
  user-surfaced revision per the *Doc-as-starting-point principle*
  section above.

- **Skipping the open-questions discussion** — feature docs at coarse depth
  have unresolved open questions that block implementation. Resolving them
  silently via the edit loses the user's design intent. Always discuss
  before coding. Worked example: audio-abr's "Audio caps" open question
  needs resolution before Phase 1 — does the implementation honor a max-
  audio-bitrate cap as a constraint+filter, or is it deferred to Phase 2?

- **Implementing beyond the agreed phase scope** — feature docs have
  multiple phases. The skill must explicitly scope to one or a subset, not
  "implement the whole feature." Worked example: audio-abr Phase 1 is
  "BandwidthState reuse + switchAudioQuality behavior parallel to
  switchVideoQuality"; landing Phase 2 (multi-signal extensions) at the
  same time is scope creep.

- **Conventions catalog under-application** — SPF conventions (behaviors,
  signals, reactors, actors, config) all apply during implementation.
  Failing to consult them produces code that "works" but doesn't match
  patterns, requiring later refactor.

- **Feature-doc-grounding drift** — implementing something that doesn't
  match what the feature doc said. Either the doc is wrong (update it) or
  the implementation is wrong (fix it). Don't silently diverge — the doc
  is the spec, and divergence either way invalidates it.

- **Cross-cutting impact under-checked** — the doc's *Likely cross-cutting
  impact* section flags decisions the implementation forces elsewhere.
  Skip → cascading-impact misses. Worked example: implementing audio-abr
  without verifying `bandwidthState` multi-writer characterization (audio
  samples + video samples both writing) misses the EWMA-mixed-source
  concern the doc flags.

- **Multi-writer slot mishandling** — adding a writer to a slot another
  behavior already writes requires multi-writer characterization (per
  `conventions/signals.md`). Default-merge or default-overwrite without
  coordination is a bug.

- **Test-after-the-fact implementation** — TDD discipline per chunk: test
  → implement → verify. Implementation-first produces tests that pass by
  construction.

- **Composing into wrong engine factory** — variant-specific behaviors
  compose into the variant factory (per `use-cases/`); the default factory
  stays clean. Cross-ref to use-cases/README composition discipline. If a
  use case has a Case-2-only behavior, it doesn't belong in
  `createSimpleHlsEngine`.

- **Status / Implementation-surface update skipped** — feature doc
  transitions from coarse → sketched as code lands. The doc must be
  updated as part of the implementation; deferring means future agents
  see stale status. Step 8 enforces.

- **Downstream skill missing — silent inline implementation** — when a
  chunk hits a "Yes" row in the downstream-skill-needed table (new
  behavior, non-trivial behavior update), and the downstream skill
  doesn't exist yet, the failure mode is to silently apply discipline
  ad-hoc. Step 6 explicitly surfaces this: branch on (i) defer chunk
  pending downstream skill, (ii) build the downstream skill inline now,
  (iii) apply discipline ad-hoc with explicit "extract later" flag.

## Steps (do these in order; do not skip)

### Step 1 — Identify the feature + disambiguate the request

The load-bearing setup step. **Disambiguation comes first** — before
gathering sources or planning, confirm what the user actually wants.

**1a. Identify the candidate.**

- If the user passed a name → verify
  `internal/design/spf/features/<name>.md` exists.
- If the user passed a description (no name) → parse for candidates,
  match against existing feature docs.
- If multiple candidates match → surface options to the user.

**1b. Verify the candidate is actually a feature.**

Apply the discriminator from `features/clusters.md` and the use-cases
boundary:

- **Source-shape correctness or engine capability?** If yes → feature
  (Case-1), stay here.
- **Delivery-mode choice / variant assembly?** If yes → this is a
  **use-case composition** (Case-2) → route to `/spf-implement-use-case`.
- **Runtime policy tuning without composition change?** If yes → still
  a feature (cluster-E policy), but the implementation shape is
  config/middle-pattern, not composition; stay here.
- **Ambiguous between Case-1 and Case-2?** Same vocabulary often appears
  on both sides (audio-only, video-only, live). Surface to user; don't
  pick silently.

**1c. Route the request appropriately.**

- **Stays here** — confirmed feature, doc exists. Proceed to 1d.
- **No doc exists for the candidate** → route to `/spf-document-feature`
  to produce the doc; return here once doc lands.
- **It's actually a use case, doc exists** → route to
  `/spf-implement-use-case`.
- **It's actually a use case, no doc exists** → route to
  `/spf-document-use-case` first, then `/spf-implement-use-case`.
- **Ambiguous between options** → surface to user; do not pick silently.

**1d. Gather sources.** (Once routing is confirmed and we're staying here.)

Triangulate from every available source:

- **The user's invocation message.** Feature name? Phase scope target?
  Specific concerns?
- **The feature doc itself.** Read end-to-end. Pay attention to: Status
  block (what's already there?), Phases of complexity (what scope is
  available?), Open questions (what blocks implementation?), Likely
  cross-cutting impact (what will the implementation force elsewhere?),
  Implementation surface / What's not implemented (where in code?).
  Note the doc's `definition` depth and `status` per the *Doc-as-
  starting-point principle* above.
- **Constituent feature docs.** Per the use-cases/README.md framing,
  features may compose into use cases. If implementing for a use case,
  read the use-case doc to understand the composition target.
- **Similar implementations as templates.** Identify analog behaviors
  in the codebase. Worked example: implementing `switchAudioQuality`
  benefits massively from reading `switchVideoQuality` first — same
  shape, audio-axis.
- **Conventions catalog.** Skim `conventions/*.md` for relevance signals.
- **Recent ADRs.** Check `internal/decisions/` for tactical decisions
  that constrain the implementation shape.

**Stop and report back to the user** with:

1. The feature name and the agreed phase scope (Phase 1? subset of
   Phase 1's rows? multiple phases?).
2. Sources consulted (with links).
3. Feature doc status — what's already there vs what needs implementing.
4. Likely template implementations (similar behaviors / actors / helpers).
5. Open questions blocking implementation (going into Step 2's
   discussion).
6. **Recommended phase scope** for this implementation pass.

### Step 2 — Discuss to resolve open questions

An **explicit conversational stage** — not optional, not implicit. After
Step 1's report:

- **Walk through the feature doc's Open questions section.** Which need
  to resolve *before* coding? Which can stay open as known-unknowns?
- **Confirm phase scope.** Phase 1 only? Phase 1 + Phase 2 subset?
  Specific phase rows? The implementation must scope to a concrete chunk
  list.
- **Confirm composition mechanism per chunk** — (i) subtractive (no new
  code), (ii) config-driven (existing behavior gains a knob), (iii)
  new behavior (route to `/spf-create-behavior`), (iv) behavior update
  with purpose change (route to `/spf-update-behavior`), (v) behavior
  refactor with preserved purpose (route to `/refactor-behavior`), (vi)
  media-layer / network-layer change (handle inline or defer per the
  downstream-skill-missing branch).
- **Resolve open questions the implementation needs.** Per the
  pre-deciding-things failure mode, only resolve what the implementation
  forces; leave the rest as open questions in the doc.

**Use `AskUserQuestion`** for clear-cut choices (phase scope,
composition mechanism per chunk, open-question resolutions).

### Step 3 — Map phases to implementation chunks

Per the agreed scope, decompose into discrete chunks. Each chunk is:

- **Small enough to TDD individually** — one test (or small test set), one
  implementation file change, one composition wiring tweak.
- **Categorized by composition mechanism** — drives Step 6's routing.
- **Sequenced for least-risk order** — primitives before behaviors;
  behaviors before composition wiring; composition wiring before
  integration tests.

**Output of this step.** A chunk list per the table shape:

| Chunk | Mechanism | Downstream skill | Test target |
|---|---|---|---|
| Add bandwidthState audio sampling | Update existing | `/spf-update-behavior` (setupAudioBufferActors) | `setup-buffer-actors.test.ts` audio sampling assertion |
| Create switchAudioQuality behavior | New behavior | `/spf-create-behavior` | `switch-audio-quality.test.ts` (new) |
| Wire switchAudioQuality into composition | Composition | None | `engine.test.ts` composition assertion |

### Step 4 — Apply cross-cutting concern checks

Run the failure-mode catalog and the feature doc's *Likely cross-cutting
impact* section against the chunk list. Each check fires when its signals
are present:

- **Conventions catalog application** — per chunk, which conventions
  apply? (behaviors.md for behavior creation/update; signals.md for slot
  map design + multi-writer; reactors.md for FSM-driven behaviors;
  actors.md for actor creation/consumption; config.md for config surface).
- **Multi-writer characterization** — for any slot the implementation
  writes that another behavior already writes, three-axis check per
  `conventions/signals.md`.
- **Per-type vs uniform-across-tracks** — per `conventions/behaviors.md`,
  ensure per-type chunks follow the sibling-behaviors-plus-shared-helper
  pattern; uniform chunks compose against the aggregating resource.
- **Composition-variant logic** — variant-specific chunks go in variant
  factories, not the default factory.
- **MSE codec-change implications** — per `/spf-document-feature`'s
  catalog, if the chunk touches buffer behavior and codecs change,
  surface the `changeType()` vs `flushBuffer` question explicitly.

### Step 5 — TDD plan

For each chunk, name:

- **The test** — file path, test name, what it asserts.
- **The implementation target** — file path, behavior/actor/helper name.
- **The composition wiring change** — if any.
- **Acceptance criterion** — what does "done" look like for this chunk?

This output drives Step 6's per-chunk implementation loop.

**The TDD plan is the seed of the feature doc's *Verification*
section.** Step 8 persists each chunk's test (file path + test name +
assertion summary) into the feature doc — the TDD plan does not live
only in chat. Name tests with assertion summaries suitable for the
doc from the start, so Step 8 is a transcription pass rather than a
re-articulation.

### Step 6 — Implement (test-first per chunk; route to downstream skills)

Iterate per chunk:

1. **Write the test first.** Run it failing.
2. **Branch by mechanism:**
   - **Subtractive / composition wiring** — handle inline.
   - **Config-driven** — handle inline.
   - **New behavior** — route to `/spf-create-behavior` for this chunk.
   - **Behavior update (purpose changing)** — route to `/spf-update-behavior`.
   - **Behavior refactor (purpose preserved)** — route to `/refactor-behavior`.
   - **Structural (split/merge)** — route via `/refactor-behavior`'s
     decomposition check.
   - **Media-layer / network-layer** — handle inline for now; future
     skills will own these.
3. **Run the test passing.**
4. **Run composition tests** to verify no regression.

**Downstream skill missing — explicit handling.** When a chunk routes to
a downstream skill that doesn't exist yet (or is only a stub):

- **Defer this chunk** pending the downstream skill's full development —
  if the chunk isn't load-bearing for the implementation goal.
- **Build the downstream skill inline now** — pause the implementation,
  invoke `/create-skill` to build the missing discipline, resume the
  implementation after the new skill lands.
- **Apply discipline ad-hoc with "extract later" flag** — implement the
  chunk with explicit awareness that the discipline isn't yet codified;
  flag in commit message and surface for skill extraction later.

The user makes the call. Don't apply ad-hoc discipline silently.

### Step 7 — Final-shape audit (per chunk + cumulative)

After each chunk:

- **Test passes? Composition tests pass?**
- **Conventions adherence?** Per-chunk check against the relevant
  conventions docs.
- **No scope creep?** Did the chunk stay within the agreed scope?

Cumulative audit after all chunks:

- **Feature-doc grounding** — does the implementation match what the
  doc said? Document drift surfaces here.
- **Cross-cutting impacts honored?** — every entry in the doc's
  *Likely cross-cutting impact* section either addressed or explicitly
  deferred?
- **No silent ad-hoc downstream discipline?** — if any chunk went the
  "apply discipline ad-hoc" path in Step 6, the extraction TODO is
  flagged.

### Step 8 — Update feature doc as living artifact

The feature doc transitions from `coarse` → `sketched` (or `technical` →
`sketched`) as code lands. Required updates:

- **Frontmatter `status`** — `implemented` once all phases land;
  `partial` if any phase landed but others haven't. **Update
  `definition` per the rule below.**
- **Status block** — reflect the implementation state, naming what
  shipped and what remains.
- **Phases of complexity** — phase rows that are now implemented may
  promote to *implemented*; partially-implemented rows note the partial
  state.
- **What's not implemented** — shrink to reflect what's now done.
- **Implementation surface (required once any phase implementation
  lands)** — populated with actual file paths, behavior names, state
  slots, helpers. See `audio-playback.md` for the canonical shape.
- **Verification (required once any phase implementation lands)** —
  **this is the persisted TDD artifact.** The Step 5 TDD plan lives
  here in the doc, not just in chat. Each chunk's test gets a line:
  test file path → test name → assertion summary. Add *Sandbox*
  entries where demos exist; add *Out of scope / deferred* sub-list
  for verification gaps (sandbox follow-ups, E2E coverage deferred
  elsewhere).
- **Open questions** — resolved-through-implementation entries moved
  to a *Resolved during Phase N implementation* sub-section (kept for
  traceability); new open questions surfaced by implementation
  experience added.
- **Related features** — if implementation revealed new cross-feature
  dependencies, add cross-refs.

**`definition` advancement rule.** Advance per the *highest*
implementation depth across all phases:

- Any phase's *Implementation surface + Verification* sections
  populated with concrete exports / file paths / test names →
  `sketched`.
- Phases all still scope-and-constraints-only, no implementation →
  leave at `technical`.
- Phases still broadly sketched, many open questions → leave at
  `coarse`.

A feature with Phase 1 implemented but other phases still broadly
sketched is `sketched` at the doc level — populated surface trumps
unimplemented phases (which surface in *Phases of complexity* as
not-yet-landed rows, not in the doc's overall depth).

This is **not optional** — the doc-as-living-artifact discipline is
load-bearing for the registry staying current. Per the *Status update
skipped* failure-mode entry.

### Step 9 — Commit (with user confirmation)

After Step 7 audit is clean and Step 8 doc update lands:

1. **Audit working-tree state.** `git status -s`. Surface any
   pre-existing uncommitted work outside the implementation scope.
2. **Propose a commit structure.** Common shapes:
   - **Per-chunk commits** — one commit per chunk + a final doc-update
     commit. Highest atomicity; clearest review trail.
   - **Per-phase commits** — chunks bundled by phase; one commit per
     phase + doc update. Cleaner when chunks within a phase are tightly
     coupled.
   - **Single feature-implementation commit + doc-update commit** —
     small features (audio-abr per its doc) may fit one commit.
   - **All-in-one** — small enough that splitting adds no value.
3. **Ask the user to confirm via `AskUserQuestion`.**
4. **On confirmation, run the commits.** Use `feat(spf)` for behavior-
   adding work; `refactor(spf)` for behavior-refactoring chunks;
   `docs(spf)` for the feature-doc update; conventional-commit scopes
   per the `git` skill.
5. **On decline or skip, stop.** The user owns the commit boundary.

## Output format

Propose Steps 1–5 outputs as a structured report before writing any code:

1. **Feature identification** (Step 1's report — feature, scope target,
   sources, template implementations)
2. **Ambiguities + open questions to resolve** (Step 2)
3. **Chunk decomposition** (Step 3 — chunk list with mechanism + downstream
   skill routing)
4. **Cross-cutting concerns** (Step 4)
5. **TDD plan** (Step 5 — per-chunk test + implementation targets)

After user confirmation, proceed to Step 6 per-chunk loop. Surface Steps
7–9 outputs after implementation.

## Why this order

Same shape as `/spf-document-feature` and `/spf-document-use-case`. Steps
1–2 force framing before mechanical work. Step 3 commits to a concrete
chunk list; Step 4 runs cross-cutting checks while context is fresh; Step
5 commits to TDD targets. Step 6 produces the artifact; Step 7 audits.
Step 8 keeps the registry current. Step 9 hands the commit boundary to
the user.

The novel discipline compared to the document-* skills is the **chunk
decomposition + per-chunk downstream-skill routing** at Steps 3–6 —
implementation work is inherently more granular than documentation work,
and the chunk-level discipline is what keeps it from sprawling.

## Why a discussion stage (not implicit)

The open-questions-skipped failure mode is the canonical example: feature
docs at coarse depth have unresolved design questions that block
implementation. Resolving them silently via the edit loses the user's
design intent. Step 2's explicit conversational stage forces resolution
in the open, with the user making the call.

## When this is the wrong skill

- **You want to document a feature (not yet implemented)** →
  `/spf-document-feature`.
- **You want to implement a use-case composition (not a single feature)** →
  *(future)* `/spf-implement-use-case`. For now, this skill can be invoked
  per-constituent-feature of a use case.
- **You want to refactor an existing behavior without feature scope** →
  `/refactor-behavior`.
- **You want to split or merge behaviors** → `/refactor-behavior`'s
  decomposition check.
- **You want to write an architectural design doc** → `design` skill.
- **You want to write an RFC** → `rfc` skill.

## How the failure-mode catalog grows

Same pattern as other SPF skills: when a new failure mode surfaces during
use (most likely during Step 6 per-chunk implementation or Step 7 audit):

1. Add an entry to the *Failure-mode catalog* section above with the risk
   pattern and a worked-example citation.
2. If the failure-mode is downstream-skill-shaped (a recurring need
   surfaces in `spf-create-behavior` / `spf-update-behavior`), the
   downstream skill's catalog grows too.
3. If the failure-mode is doc-shape-shaped (the feature doc template /
   conventions don't capture something), `/spf-document-feature`'s
   catalog or the conventions docs grow.

This skill is **new**; the catalog is expected to grow significantly as
the first real implementations exercise it. The seeded entries capture
patterns identified at skill-creation time from cross-skill failure-mode
analysis — they're starting points, not endpoints.
