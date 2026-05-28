---
name: spf-implement-use-case
description: >-
  Implement a use-case composition documented in the SPF use-case-composition
  registry. Consumes a use-case doc at internal/design/spf/use-cases/<name>.md
  and produces the engine-side code: a variant engine factory, a parallel
  adapter, composition wiring, use-case-specific behaviors (if any), and
  tests. The implementation analog of /spf-document-use-case (which produces
  the doc; this consumes it). Walks through disambiguation + routing (verify
  the request is actually a use case, check constituent-feature implementation
  status), resolves the doc's open questions with the user, maps phases to
  chunks, routes to downstream skills (/spf-implement-feature for
  unimplemented constituents, /spf-create-behavior, /spf-update-behavior,
  /spf-refactor-behavior), and updates both the use-case doc and constituent
  feature docs as code lands. Treats the use-case doc as a starting point for
  planning, not a hardened specification. Triggers: "implement use case",
  "implement SPF use case", "implement use-case composition", "build use
  case", "implement audio-only-mode-override", "implement <use-case-name>".
---

# Implement an SPF Use-Case Composition

Take a use-case composition documented at
`internal/design/spf/use-cases/<name>.md` and produce the engine-side code
that satisfies its Phase 1 (and optionally Phase 2 / Phase 3) scope —
typically a variant engine factory + parallel adapter, composition wiring
that subtracts/adds/swaps behaviors per the four-mechanism taxonomy, and any
use-case-specific behaviors that don't promote to standalone features.

The canonical failure modes without this discipline are:

- **Skipping disambiguation** — proceeding with an interpretation of "implement
  X" when X could be a feature, a use case, or undocumented entirely.
- **Treating the use-case doc as a hardened spec** — refusing to revise the
  doc when implementation reveals new questions or drift; *or* the inverse,
  silently overriding the doc with implementation choices.
- **Assuming constituent features are implemented** — building a use case on
  top of feature capabilities that don't actually exist in code yet.

Steps 1–2 are the load-bearing setup. Step 1 (disambiguation + routing) is
the most novel discipline — Steps 2–9 mostly parallel `/spf-implement-feature`
with use-case-specific content.

## Usage

```
/spf-implement-use-case [<use-case-name-or-description>]
```

The arg is optional. The skill can be invoked with a use-case-doc name (e.g.,
`audio-only-mode-override`) or a description of what the user wants. Step 1
routes appropriately.

## Reference docs

Primary:

- `internal/design/spf/use-cases/<name>.md` — **starting point** for planning
  (not a hardened spec; see *Doc-as-starting-point principle* below). Read
  end-to-end before scoping.
- `internal/design/spf/use-cases/README.md` — doc-type spec; the four-
  mechanism composition taxonomy + decomposition rubric + cross-link
  discipline + Implementation note (Path-A vs Path-B for behavior
  customization).
- `internal/design/spf/conventions/*.md` — when to reach for which primitive.
- `internal/design/spf/evaluation-axes.md` — axes the implementation is
  scored against.
- `packages/spf/docs/hls-engine.md` — current HLS engine composition; the
  baseline the variant subtracts from / adds to.
- `packages/spf/src/CLAUDE.md` — source layout + dependency rules.
- Constituent feature docs (the use case's *Constituent features* section
  enumerates them).

Secondary:

- Existing engine factory + adapter as templates (`createSimpleHlsEngine`
  and `SimpleHlsMediaElement` — the canonical pair the variant parallels).
- `internal/decisions/*.md` — past tactical decisions.

Downstream skills routed-to:

- `.claude/skills/spf-implement-feature/SKILL.md` — **new**: when a
  constituent feature is not yet implemented and the use case needs it.
- `.claude/skills/spf-create-behavior/SKILL.md` — use-case-specific
  behaviors that don't promote to features (per use-cases/README cross-link
  discipline).
- `.claude/skills/spf-update-behavior/SKILL.md` — existing behaviors whose
  purpose changes for the variant.
- `.claude/skills/spf-refactor-behavior/SKILL.md` — existing behaviors with
  preserved purpose, improved implementation.
- `.claude/skills/spf-document-use-case/SKILL.md` — invoked when Step 1
  routing concludes the candidate isn't yet documented as a use case.
- `.claude/skills/spf-document-feature/SKILL.md` — invoked when Step 1
  routing concludes the candidate is a feature, not a use case (and isn't
  yet documented as such).
- *(future)* media-layer / network-layer skills.

## Doc-as-starting-point principle

The use-case doc is the **starting point for planning, not a hardened
specification**. This principle is load-bearing throughout the skill —
explicit because both directions of failure are real:

- **Silent override** (covered by `Use-case-doc-grounding drift` failure
  mode) — implementation diverges from the doc without surfacing the
  divergence; the doc becomes stale silently.
- **Rigid following** (covered by `Treating use-case doc as hardened spec`
  failure mode) — implementation refuses to revise the doc when new
  questions surface or drift is discovered; the doc becomes a misleading
  constraint.

Acknowledge the doc's `definition` depth explicitly when planning:

- **`coarse`** — variant shape sketched, many open questions. Implementation
  will fill in significant detail; revisions to the doc are expected
  throughout. Planning is substantial.
- **`technical`** — scope and constraints articulated; specifics still open.
  Implementation maps to constraints; moderate planning + revision.
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

## Failure-mode catalog (seeded; grows with use)

1. **Skipping disambiguation** — invoking with a name or description that
   ambiguously maps to (i) an existing use case, (ii) a different use case,
   (iii) a feature, (iv) something not yet documented. Step 1's
   disambiguation must resolve before gathering sources or planning.
   Proceeding-with-assumption is the canonical failure shape. Worked
   examples: invocation "implement resolution capping" — routes to
   `/spf-implement-feature` on `rendition-selection-caps` (cluster-E
   policy), not here. Invocation "implement audio-only" maps to the
   `audio-only-mode-override` use case (which absorbed what was
   previously framed as a separate `audio-only-composition` feature);
   the disambiguation between feature and use-case framings is
   resolved by the consolidated doc.

2. **Routing-out failure** — Step 1's disambiguation should route
   confidently. The failure mode is "ambiguity discovered but not
   resolved" — silently picking one interpretation when the user could
   have meant another. Always surface and confirm.

3. **Treating use-case doc as hardened spec** — refusing to revise the
   doc when implementation reveals new questions, refines framing, or
   surfaces drift. Inverse failure of silent-override. The right
   discipline is explicit, user-surfaced revision.

4. **Use-case-doc-grounding drift** (silent override direction) —
   implementation diverges from the doc without surfacing the divergence.
   Either the doc is wrong (revise it) or the implementation is wrong
   (fix it). Don't silently diverge.

5. **Constituent-feature implementation status unchecked** — assuming
   feature X is implemented when it isn't; the use case ships against
   assumed capabilities that don't exist. Step 1's gathering must
   verify each constituent feature's implementation status (frontmatter
   `status`, code-grounding via the feature doc's `Implementation
   surface` section).

6. **Shared-factory-with-Case-1-sibling miscoordination** — when a use
   case has a Case-1 feature sibling and both want the engine variant
   factory, building it twice or building it without coordinating
   produces drift. **Resolved pattern (since 2026-05-21):** when both
   cases ship the *same* engine factory, the Case-1 feature doc
   consolidates into the use-case doc with a *Variant-decision signal
   source* section covering both paths (`audio-only-mode-override` is
   the canonical example). The skill must surface this when a Case-1
   sibling exists in the source material — recommend consolidation
   when the factory is shared, separate docs only when the factories
   differ.

7. **Adapter shape proliferation un-flagged** — each use-case adapter
   multiplies the surface. The use-cases/README cross-cutting note
   flags this as a registry-level concern; implementations should
   track it explicitly per pass.

8. **Phase scope creep** — use-case docs have 3 phases (Basic /
   Features-relevant / Optimizations). The implementation must scope
   to one phase or a subset, not "implement the whole use case."

9. **Composing variant-specific behaviors into default factory** —
   variant-specific behaviors go in the variant factory, not the
   default `createSimpleHlsEngine`. Same failure mode as
   `/spf-implement-feature`'s catalog, but more pointed here: the
   *whole point* of a use-case implementation is the variant assembly,
   so misrouting at the factory level is the canonical first-pass bug.

10. **Multi-writer slot mishandling** — adding a writer to a slot
    another behavior writes requires multi-writer characterization per
    `conventions/signals.md`. Same as `/spf-implement-feature`.

11. **Conventions catalog under-application** — SPF conventions
    (behaviors, signals, reactors, actors, config) all apply during
    implementation. Failing to consult them produces code that "works"
    but doesn't match patterns.

12. **Use-case-specific behavior promoted to feature unnecessarily** —
    a variant-decision-glue behavior, composition-wiring behavior, or
    single-scenario tuning gets a feature doc when it should live in
    the use-case doc's *Composition specifics → Behaviors added*
    section. Apply the "earns its place" rubric per use-cases/README
    cross-link discipline.

13. **Test-after-the-fact implementation** — TDD discipline per chunk:
    test → implement → verify. Implementation-first produces tests
    that pass by construction.

14. **Status update skipped — both doc-types** — use-case doc *and*
    constituent feature docs need status updates as code lands. The
    constituent feature docs' "Use cases that compose this feature"
    entries may gain implementation-status notes (e.g., "Phase 1
    constituent — implementation in progress as part of
    audio-only-mode-override"). Step 8 enforces.

15. **Downstream skill missing — silent inline implementation** — when
    a chunk hits a downstream-skill gap (especially:
    `/spf-implement-feature` for an unimplemented constituent), the
    failure mode is to silently apply discipline ad-hoc. Step 6
    explicitly surfaces this: branch on (i) defer chunk pending
    downstream skill, (ii) implement the constituent feature first via
    the downstream skill, (iii) bundle the constituent implementation
    into this use-case pass with explicit user confirmation.

16. **SPF adapter stranded at engine layer** — the implementation pass
    lands the engine variant + SPF adapter and stops there. The variant
    is reachable via `@videojs/spf/hls` but **not consumable through
    the existing player surface** (the `packages/html` custom elements
    + `packages/react` components + sandbox demos that real consumers
    actually use). The canonical failure shape: ship a "Phase 1
    complete" SPF adapter that customers can't actually instantiate
    via their normal `<simple-x-video>` / `<SimpleXVideo>` flow. Step
    2's *implementation-scope extensions* question makes the player-
    package layers explicit opt-ins; the failure is forgetting to ask
    or defaulting to "engine + adapter only" without surfacing the
    gap. Step 8's *Out of scope / deferred* sub-list must record every
    non-landed extension so the surface gap stays visible. Worked
    example: `audio-only-mode-override` Phase 1 (2026-05-21) landed
    only the SPF layer — the discovery of this failure mode was the
    feedback that drove this entry.

## Steps (do these in order; do not skip)

### Step 1 — Identify the use case + disambiguate the request

The load-bearing setup step. **Disambiguation comes first** — before
gathering sources or planning, confirm what the user actually wants.

**1a. Identify the candidate.**

- If the user passed a name → verify
  `internal/design/spf/use-cases/<name>.md` exists.
- If the user passed a description (no name) → parse for candidates,
  match against existing use-case docs.
- If multiple candidates match → surface options to the user.

**1b. Verify the candidate is actually a use case.**

Apply the use-cases/README discriminator + 4-criterion rubric:

- **Composition mechanisms?** If everything works as runtime config on
  always-on behaviors (no behaviors subtracted/added/swapped/defaulted
  at composition time) → it's a **cluster-E policy feature** → route
  to `/spf-implement-feature` on the relevant feature doc.
- **Delivery scenario?** If the concern is source-shape correctness
  (engine handles a kind of source) rather than delivery-mode choice
  (compose differently for a consumer scenario) → it's a **Case-1
  feature** → route to `/spf-implement-feature` on the relevant
  feature doc.
- **Constituent features?** If the candidate has no real composition
  assembly — it's a single capability the engine gains — → it's
  likely a **feature**, route to `/spf-implement-feature`.
- **Customer/consumer scenario?** If the request is "tune the engine
  differently for X" without a delivery scenario → likely **cluster-E
  policy** → `/spf-implement-feature`.

**1c. Route the request appropriately.**

- **Stays here** — confirmed use case, doc exists. Proceed to 1d.
- **No doc exists for the candidate** → route to `/spf-document-use-case`
  to produce the doc; return here once doc lands.
- **It's actually a feature, no doc exists** → route to
  `/spf-document-feature` first, then `/spf-implement-feature`.
- **It's actually a feature, doc exists** → route directly to
  `/spf-implement-feature`.
- **Ambiguous between options** → surface to user; do not pick silently.

**1d. Gather sources.** (Once routing is confirmed and we're staying here.)

- The use-case doc itself — read end-to-end. Note `definition` depth
  and `status` (see *Doc-as-starting-point principle* above).
- **Constituent features (load-bearing).** For each one listed in the
  use-case doc's *Constituent features* section, **check
  implementation status** by reading the feature doc's frontmatter
  `status` and its `Implementation surface` section. Categorize each:
  - **Implemented** — variant assembly can compose it as-is.
  - **Partially implemented** — variant may need to compose what
    exists and defer the rest.
  - **Documented but unimplemented** — branches in Step 2 (defer use
    case / implement constituent first / bundle into this pass).
  - **Not documented** — route to `/spf-document-feature` first.
- Direct Case-1 sibling feature doc (if applicable) — check whether
  shared engine factory work is in scope.
- Related use cases (the doc's *Related use cases* section) — note
  shared constituent features for adapter-shape-proliferation
  awareness.
- Conventions catalog skim for relevance signals.
- Existing engine factory + adapter as templates.
- Recent ADRs (`internal/decisions/`).

**Stop and report back to the user** with:

1. The use-case name and the doc's current `status` + `definition`
   depth.
2. Sources consulted (with links).
3. **Constituent-feature implementation status** — categorized per
   the four states above.
4. **Recommended scope for this implementation pass** — including
   whether to defer due to unimplemented constituents, implement
   constituents first, or bundle into this pass.
5. Open questions blocking implementation (going into Step 2's
   discussion).

### Step 2 — Discuss to resolve open questions + confirm scope strategy

An **explicit conversational stage** — not optional, not implicit.
After Step 1's report:

- **Walk through the use-case doc's Open questions section.**
  Classify each: must-resolve-before-code vs can-stay-open.
- **Confirm phase scope.** Phase 1? Phase 1 + 2 subset? Specific
  phase rows?
- **Confirm composition mechanism per chunk** — per the use-case doc's
  *Composition specifics* breakdown: subtractive / additive /
  alternative-impl / alternative-default-config. Often more than one
  in combination.
- **Confirm constituent-feature readiness strategy.** Per Step 1's
  categorization, decide for each unimplemented constituent:
  - **Defer the use case** until constituent lands separately.
  - **Implement the constituent first** via `/spf-implement-feature`
    in a separate pass (this skill pauses, downstream skill runs,
    this skill resumes).
  - **Bundle constituent implementation** into this use-case pass
    (the implementation work covers both the constituent feature
    chunks and the variant assembly chunks; the doc updates cover
    both docs).
- **Confirm shared-factory-with-Case-1-sibling coordination** if
  applicable. Pattern: if the source material distinguishes a Case-1
  source-shape concern from the Case-2 delivery-mode concern but both
  ship the *same* engine factory, recommend consolidating into one
  use-case doc with a *Variant-decision signal source* section
  covering both paths (`audio-only-mode-override` is the canonical
  example — that consolidation landed 2026-05-21 absorbing what was
  previously a separate `audio-only-composition` feature doc).
- **Confirm implementation-scope extensions.** The engine variant +
  adapter pair in `packages/spf` is the *minimum* implementation
  surface — but a variant adapter that stops at the SPF layer is
  effectively unconsumable through the existing player surface. Ask
  the user (multi-select `AskUserQuestion`) which downstream layers
  to bundle into this pass:
  - **Core media wrapper** — `packages/core/src/dom/media/<key>/`
    (~5 LOC; applies the SPF mixin to `HTMLVideoElementHost`). The
    minimum bridge between the SPF adapter and the player packages.
    Worked example: `simple-hls/index.ts` →
    `class SimpleHlsMedia extends SimpleHlsMediaMixin(HTMLVideoElementHost) {}`.
  - **HTML custom element** — `packages/html/src/media/<key>-video/`
    (~5 LOC; wraps the core media in `CustomMediaElement` +
    `MediaAttachMixin`) + `packages/html/src/define/media/<key>-video.ts`
    + `packages/html/src/cdn/media/<key>-video.ts` for the CDN entry.
    Worked example: `simple-hls-video/index.ts` →
    `class SimpleHlsVideo extends MediaAttachMixin(CustomMediaElement('video', SimpleHlsMedia)) {}`.
  - **React component** — `packages/react/src/media/<key>-video/`
    (~37 LOC; React adapter exposing props matching the HTML
    surface). Pairs with the HTML custom element.
  - **Sandbox demo(s)** — `apps/sandbox/templates/html-<key>-video/`
    and/or `apps/sandbox/templates/react-<key>-video/` (~50–80 LOC
    each). **Write to `templates/`, not `src/`.** Per the sandbox
    README, `apps/sandbox/src/*` is gitignored — `pnpm dev:sandbox`
    mirrors `templates/` into `src/` on startup, leaving local edits
    in `src/` untouched. Useful for manual verification + developer
    onboarding. Required prereqs: HTML or React component, depending
    on which sandbox is included.
  - **E2E tests** — `apps/e2e/apps/vite/src/pages/html-<key>-video-*.{html,ts}`
    fixture pages + `apps/e2e/tests/...` Playwright spec.
    **Lean: defer by default.** Use E2E for behaviors that have
    documented reliability concerns ([[project-e2e-renderer-reliability]])
    or that exercise cross-browser invariants the unit tests
    can't reach. For most Phase 1 use-case lands, the engine-level
    integration tests + sandbox manual verification suffice;
    E2E coverage follows once behavior stabilizes.

  Defaults: none. The user explicitly opts in to each layer per
  pass. Each opt-in becomes its own chunk in Step 3.

- **Surface expected doc revisions.** Walking through the Open
  questions + phase scope often reveals "we'll need to update the
  doc to reflect X" — flag these explicitly so they're not silent.
- **Resolve the open questions the implementation needs.** Per the
  pre-deciding-things failure mode, only resolve what the
  implementation forces; leave the rest as open questions in the
  doc.

**Use `AskUserQuestion`** for clear-cut choices (phase scope,
constituent-readiness strategy, composition mechanism per chunk,
implementation-scope extensions).

### Step 3 — Map phases to implementation chunks

Per the agreed scope, decompose into discrete chunks. Chunk shapes
typical for use-case implementations:

**Core SPF layer (always present):**

- **Engine variant factory creation** (new) — typically the first chunk;
  parallels `createSimpleHlsEngine` shape with the composition mechanism
  applied (subtract / add / swap / configure).
- **Adapter creation** (new) — parallels `SimpleHlsMediaElement` /
  `SimpleHlsMediaMixin`; uses `shareSignals` unchanged.
- **Constituent feature implementation chunks** (if bundling per Step
  2) — route to `/spf-implement-feature`.
- **Use-case-specific behavior creation** (if any) — route to
  `/spf-create-behavior`.
- **Existing behavior updates** (if any) — route to
  `/spf-update-behavior` or `/spf-refactor-behavior`.
- **Engine-level test scaffolding** — engine integration tests for
  the variant; per-behavior tests for any new use-case-specific
  behaviors.
- **Composition wiring** — ties the variant factory into the adapter
  and exposes via `packages/spf/src/playback/engines/hls/index.ts`.

**Implementation-scope-extension layers (opt-in per Step 2):**

- **Core media wrapper** — `packages/core/src/dom/media/<key>/index.ts`
  applying the SPF mixin to `HTMLVideoElementHost` (or audio host for
  audio-only variants). Inline implementation; ~5 LOC.
- **HTML custom element + define entry + CDN entry** —
  `packages/html/src/media/<key>-video/index.ts`,
  `packages/html/src/define/media/<key>-video.ts`,
  `packages/html/src/cdn/media/<key>-video.ts`. Inline implementation;
  ~5 LOC + boilerplate.
- **React component** — `packages/react/src/media/<key>-video/index.tsx`
  exposing the props surface; ~37 LOC. Inline implementation.
- **Sandbox demo(s)** — `apps/sandbox/templates/{html,react}-<key>-video/`
  (each ~50–80 LOC). **Write to `templates/`, not `src/`** (which is
  gitignored — see sandbox README). Inline implementation; one chunk
  per surface (html / react / both).
- **E2E coverage** — fixture pages under
  `apps/e2e/apps/vite/src/pages/` + Playwright spec under
  `apps/e2e/tests/`. Inline implementation. Often the largest
  opt-in chunk; defer by default per the Step 2 lean.

**Output of this step.** A chunk list with mechanism + downstream-skill
routing per chunk + which layer it lands in. Same table shape as
`/spf-implement-feature`, with a *Layer* column added when opt-in
extensions are in scope.

### Step 4 — Apply cross-cutting concern checks

Run the failure-mode catalog and the use-case doc's *Likely cross-cutting
impact* section against the chunk list. Specific to use-case work:

- **Shared-factory-with-Case-1-sibling coordination.** If a Case-1 sibling
  exists, the engine variant factory work likely belongs to both — confirm
  ownership and avoid double-implementation.
- **Adapter shape proliferation.** Flag per the use-cases/README cross-
  cutting concern; track adapter-surface growth at the registry level.
- **Composition-mechanism mix verification.** Per the doc's *Composition
  specifics*, ensure all four mechanism buckets are considered (even if
  empty for this use case).
- **Constituent feature cluster patterns.** Cluster patterns apply
  transitively through constituents — a constituent feature's cluster
  patterns (gating, multi-writer, per-type, etc.) transfer to the use
  case that composes it.
- **MSE invariants.** Specific Firefox `mozHasAudio` and similar
  cross-type invariants flagged in `mse-mms-pipeline` — variant
  implementations may exercise these in new ways (e.g., subtractive-audio
  composition under Firefox).

### Step 5 — TDD plan

For each chunk, name:

- The test — file path, test name, what it asserts.
- The implementation target — file path, factory/behavior/adapter name.
- The composition wiring change — if any.
- Acceptance criterion — what does "done" look like?

For use-case implementations, integration tests at the engine level are
typically more load-bearing than for feature implementations — the
variant assembly is the primary product, not just the individual
behaviors. Plan for `engine.test.ts`-style coverage that exercises the
variant end-to-end against a representative source.

**The TDD plan is the seed of the use-case doc's *Verification*
section.** Step 8 persists each chunk's test (file path + test name +
assertion summary) into the use-case doc — the TDD plan does not live
only in chat. Name tests with assertion summaries suitable for the doc
from the start, so Step 8 is a transcription pass rather than a
re-articulation.

### Step 6 — Implement (test-first per chunk; route to downstream skills)

Iterate per chunk:

1. **Write the test first.** Run it failing.
2. **Branch by mechanism:**
   - **Subtractive composition / wiring** — handle inline.
   - **Config-driven** — handle inline.
   - **Engine variant factory creation** — handle inline (typically; the
     factory shape parallels `createSimpleHlsEngine`).
   - **Adapter creation** — handle inline (typically; the adapter shape
     parallels `SimpleHlsMediaElement` + `SimpleHlsMediaMixin`).
   - **New use-case-specific behavior** → route to `/spf-create-behavior`.
   - **Behavior update (purpose changing)** → route to
     `/spf-update-behavior`.
   - **Behavior refactor (purpose preserved)** → route to
     `/spf-refactor-behavior`.
   - **Unimplemented constituent feature** → route to
     `/spf-implement-feature` (per Step 2's readiness strategy).
   - **Structural (split/merge)** → route via `/spf-refactor-behavior`.
   - **Media-layer / network-layer** — handle inline for now; future
     skills will own these.
3. **Run the test passing.**
4. **Run composition tests** (`engine.test.ts` for the variant) to
   verify no regression.
5. **Surface any doc revisions** discovered during the chunk —
   propose to user, get confirmation, update doc.

**Downstream skill missing — explicit handling.** Same as
`/spf-implement-feature`: defer / build downstream skill inline /
apply ad-hoc with extract-later flag. User makes the call.

### Step 7 — Final-shape audit (per chunk + cumulative)

Per chunk: test passes? Conventions adherence? No scope creep?

Cumulative audit after all chunks:

- **Use-case-doc grounding** — does the implementation match what the
  doc said? Surface any final drift; resolve via explicit doc update
  in Step 8.
- **Cross-cutting impacts honored?**
- **Constituent feature docs status reflects reality?** — if
  constituent features were partially implemented as part of this
  pass, their docs need updates too (Step 8).
- **Variant assembly verified end-to-end?** — integration test
  exercises the variant against a representative source.

### Step 8 — Update use-case doc + cascade to constituent feature docs

Doc updates for **both** the use-case doc and its constituent feature
docs (cascade):

**Use-case doc updates:**

- Frontmatter `status` — `implemented` once all phases land;
  `partial` if any phase landed but others haven't; `draft` only
  if nothing has shipped. **Update `definition` per the rule below.**
- *Status* block — reflect implementation state, naming the
  factory(ies) and adapter(s) that shipped and what remains.
- *Phases of complexity* — phase rows that landed get an
  *(implemented)* marker; rows partially-implemented note partial
  state with a pointer to which sub-row landed.
- *Composition specifics* — populated with actual factory/adapter
  names, behavior subtraction/addition lists, configuration
  changes (e.g., `initialState` seed dropped). **Subtract / add
  lists must match the actual composed behavior list**, not the
  pre-implementation prediction — fix any drift from
  Step 1's report here.
- *Constituent features* — per-feature relationship notes get
  concretized with actual file paths if relevant.
- *Customer-policy surface* — populated with actual adapter API.
- *Variant-decision signal source* — populated with actual
  composition (typically: adapter-upfront, confirmed).
- *Open questions* — resolved entries moved to a new *Resolved
  during Phase N implementation* sub-section (kept for
  traceability); new entries surfaced by implementation added.
- **NEW section once any phase implementation lands:
  *Implementation surface*** — required when implementation
  surface is populated. Mirror feature-doc shape (see
  `audio-playback.md` for the canonical example) and extend
  per opt-in extensions landed in this pass:
  - *Engine factory* table (Export / File / Purpose) —
    always present.
  - *Adapter* table (Export / File / Purpose) — always present.
  - *Composed behaviors* paragraph — always present.
  - *Core media wrapper* table — if the core wrapper layer
    landed (`packages/core/...`).
  - *HTML custom element* table — if the HTML element layer
    landed (`packages/html/...`).
  - *React component* table — if the React layer landed
    (`packages/react/...`).
  - Public re-export entry points for each layer that landed.
  - Each opt-in extension that did *not* land in this pass
    is noted in the *Out of scope / deferred* section so the
    surface gap is visible.
- **NEW section once any phase implementation lands:
  *Verification*** — required when implementation surface is
  populated. **This is the persisted TDD artifact** — the Step 5
  TDD plan lives here in the doc, not just in chat. Mirror
  feature-doc shape (see `audio-playback.md` for the canonical
  example), with structure per opt-in extensions landed:
  - *Unit tests* bullet list (one entry per test file → test
    name → assertion summary) — engine + adapter coverage,
    always present.
  - *Component tests* sub-list — if HTML / React component
    tests landed.
  - *Sandbox* entry naming the sandbox app directory(ies) — if
    sandbox demo(s) landed.
  - *E2E tests* entry naming fixture pages + Playwright spec
    paths — if E2E coverage landed.
  - *Out of scope / deferred* sub-list for verification gaps
    (sandbox follow-up, E2E coverage deferred elsewhere, etc.).
    Each non-landed opt-in extension from Step 2 appears here
    explicitly — the deferral is the artifact.
- *See also* — add test paths, sandbox demo paths if applicable.

**`definition` advancement rule.** The depth scale per the
use-cases/README is `coarse → technical → sketched`. Advance per
the *highest* implementation depth across all phases:

- Any phase's *Implementation surface + Verification* sections
  populated with concrete exports/file paths/test names →
  `sketched`.
- Phases all still scope-and-constraints-only, no implementation
  → leave at `technical`.
- Phases still broadly sketched, many open questions → leave at
  `coarse`.

A use case with Phase 1 implemented but Phases 2 and 3 still
broadly sketched is `sketched` at the doc level — the populated
surface trumps the unimplemented phases (which surface in
*Phases of complexity* as not-yet-landed rows, not in the doc's
overall depth).

**Constituent feature doc cascade:**

- *Use cases that compose this feature* entries — update to reflect
  implementation status. Worked example shape: `"audio-only-mode-
  override (partial — Phase 1 landed)"` rather than the
  pre-implementation `"audio-only-mode-override (coarse)"`.
- If a constituent feature was partially implemented as part of this
  pass (per Step 2's bundling strategy), the feature doc gets its
  own update too — same shape as if `/spf-implement-feature` had run.

**Doc revisions are explicit.** Per the doc-as-starting-point
principle, every revision is proposed to the user before applying.

### Step 9 — Commit (with user confirmation)

After Step 7 audit is clean and Step 8 doc updates land:

1. **Audit working-tree state.** `git status -s`. Surface any
   pre-existing uncommitted work outside the implementation scope.
2. **Propose commit structure.** Common shapes for use-case
   implementations:
   - **Per-chunk commits + doc-update commit + cascade commit** —
     highest atomicity; clearest review trail.
   - **Variant-factory commit + adapter commit + doc-update commit
     + cascade commit** — natural boundaries for a Phase 1 pass.
   - **Bundled: feature-implementation commit + use-case-
     implementation commit + cascade commit** — when this pass also
     implemented constituent features per Step 2's bundling.
   - **Single feature-implementation commit + doc-update commit** —
     for small Phase 1 use cases.
3. **Ask the user to confirm via `AskUserQuestion`.**
4. **On confirmation, run the commits.** Use `feat(spf)` for
   variant-factory + adapter creation; `refactor(spf)` for behavior
   refactors; `docs(spf)` for the doc updates; conventional-commit
   scopes per the `git` skill.
5. **On decline or skip, stop.** The user owns the commit boundary.

## Output format

Propose Steps 1–5 outputs as a structured report before writing any
code:

1. **Use-case identification + disambiguation report** (Step 1 — use
   case name, doc status/definition, sources, constituent-feature
   readiness, routing decision)
2. **Ambiguities + open questions to resolve** (Step 2)
3. **Chunk decomposition** (Step 3 — chunk list with mechanism +
   downstream skill routing)
4. **Cross-cutting concerns** (Step 4)
5. **TDD plan** (Step 5 — per-chunk test + implementation targets)

After user confirmation, proceed to Step 6 per-chunk loop. Surface
Steps 7–9 outputs after implementation.

## Why this order

Step 1 (disambiguation + routing) is the novel discipline compared to
`/spf-implement-feature`. Implementation work on a use case can route
to a feature implementation, a doc creation, or stay here — getting
that routing right at the start prevents wrong-skill work.

Step 2 (constituent-feature readiness strategy) is also novel — use
cases compose features, and the readiness state of constituent
features determines whether the use-case implementation can proceed
straightforwardly or needs to bundle constituent work.

Steps 3–7 mostly parallel `/spf-implement-feature`'s chunk-decomposition
+ TDD + audit shape, with use-case-specific details.

Step 8 (doc update + constituent cascade) is heavier than
`/spf-implement-feature`'s Step 8 because of the bidirectional
cross-link discipline: both the use-case doc and the constituent
feature docs need updates.

## Why a discussion stage (not implicit)

The open-questions + constituent-readiness + shared-factory-coordination
mix is the canonical decision space for use-case implementations. The
explicit conversational stage forces the right resolutions in the open,
with the user making the calls. Implicit decisions in this space produce
the worst failure modes (assuming constituent X is implemented when it
isn't; building a factory twice; silent doc drift).

## When this is the wrong skill

- **You want to implement a feature** → `/spf-implement-feature`. Use
  cases compose features; if your invocation is really about a single
  capability the engine gains, the feature implementation skill is the
  right tool.
- **You want to document a use case (not yet documented)** →
  `/spf-document-use-case`. Implementation requires a starting-point
  doc.
- **You want to refactor an existing behavior without feature/use-case
  scope** → `/spf-refactor-behavior`.
- **You want to split or merge behaviors** → `/spf-refactor-behavior`'s
  decomposition check.
- **You want to write an architectural design doc** → `design` skill.
- **You want to write an RFC** → `rfc` skill.

## How the failure-mode catalog grows

Same pattern as other SPF skills: when a new failure mode surfaces during
use (most likely during Step 6 per-chunk implementation, Step 7 audit,
or Step 8 cascade), add an entry with a worked-example citation.

This skill is **new**; the seeded entries capture patterns identified at
skill-creation time from cross-skill failure-mode analysis. Expect the
catalog to grow significantly as the first real use-case implementations
exercise it — particularly around the constituent-feature readiness
strategy and the shared-factory coordination cases.
