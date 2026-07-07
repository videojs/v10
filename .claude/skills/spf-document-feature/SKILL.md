---
name: spf-document-feature
description: >-
  Produce or update an entry in the SPF feature registry at
  internal/design/spf/features/. Triangulates context from multiple sources
  (Notion, GitHub, pasted writeups, existing feature docs, codebase),
  grounds the feature in the cluster heuristics, applies cross-cutting
  concern checks, drafts the doc at the appropriate definition depth, and
  cascades narrow updates to related feature docs. Triggers: "document
  feature", "register feature", "feature doc", "update feature doc",
  "deepen feature stub", "draft feature registry entry", "new SPF feature".
---

# Document an SPF Feature

Produce or update a feature-registry doc at
`internal/design/spf/features/<name>.md`. The canonical failure mode without
this discipline is jumping from invocation to drafting — producing a doc
that's either pulled from one source (the user's invocation) without
triangulating, ungrounded in code (claiming implementation footprint that
doesn't match what's there), pre-decides things the user wanted to leave
open, misses cross-cluster impacts, or fails to cascade updates to related
feature docs.

Steps 1–2 are the load-bearing ones. Skipping them produces drafts that
look superficially correct but anchor on the wrong scope or definition
depth. Steps 3–7 only make sense once the feature, sources, and intent are
named. Step 8 (cross-doc cascade) is where the registry stays internally
consistent rather than drifting.

## Usage

```
/spf-document-feature [<feature-name-or-description>]
```

The arg is optional. The skill is also invoked after the user pastes
context, links a Notion doc or GitHub issue, or describes a feature in
conversation.

## Reference docs

Read these before drafting:

- `internal/design/spf/features/clusters.md` — cluster + cross-cluster
  pattern heuristics. The skill consults this throughout (steps 1, 3, 4,
  5, 8).
- `internal/design/spf/features/<name>.md` if a doc already exists for the
  feature — required reading for any deepen / update use case.
- `internal/design/spf/features/subtitles.md`,
  `internal/design/spf/features/video-abr.md`,
  `internal/design/spf/features/multi-language-audio.md` — template
  examples at different definition depths (sketched / sketched / coarse).
- `internal/design/spf/text-track-architecture.md` — example of an
  architectural deep-dive doc that feature docs cross-reference. *Not* a
  feature doc; the registry's `See also` sections point at it.
- `internal/design/spf/conventions/*.md` — for cross-cutting concern
  checks (multi-writer slots → `signals.md`; per-type → `behaviors.md`;
  config thresholds → `config.md`).
- `internal/decisions/*.md` — for past tactical decisions that may
  constrain a feature's shape.
- `packages/spf/docs/hls-engine.md` — current HLS engine composition
  walkthrough; useful for grounding implementation-surface claims.

## Failure-mode catalog (grows with use)

Inline checks embedded in the steps below. Each entry cites a real
incident or risk pattern; the catalog grows as new failure modes surface.

- **MSE codec-change check** — for any feature that touches buffer
  behavior, identify whether the codec changes. Same codec → flush +
  replan, no SourceBuffer recreation, no setup re-entry. Codec change →
  `changeType()` or buffer recreation, routes to a separate codec-change
  feature (e.g., 5.1 surround). Worked example: the multi-language-audio
  draft originally claimed `setupAudioBufferActors` lifecycle would need
  to change for mid-stream switching; same-codec language switching does
  not require any setup change.
- **Scope-writeup vintage check** — don't treat dated writeups (kickoff
  docs, framework framing, "we're shipping X by Y") as current scope
  without confirming. Worked example: SPF Kickoff was Jan 2026 baseline
  scope ("single-language captions for Feb beta"); current implementation
  goes well beyond that.
- **Multi-writer slot characterization** — when a feature adds a writer
  to an existing state slot, identify the existing writer(s) and
  characterize coordination along three axes: decision domain (config vs
  DOM vs intent vs derived), trigger (one-shot transition vs ongoing
  reactive), cost (cheap write vs side-effect-heavy write). Don't assume
  patterns transfer cleanly. See `clusters.md` → Cross-cluster patterns →
  Multi-writer state slots.
- **Layer-boundary distinction** — when a concern arises that seems
  related to a feature, distinguish three buckets: in-scope, out-of-scope
  (separate candidate SPF feature), out-of-scope (different architectural
  layer — adapter, above-engine). Worked example: DOM
  `HTMLMediaElement.audioTracks` exposure is not an SPF concern; it
  belongs at the adapter layer.
- **"Say more" vs "update to say more"** — clarification requests on
  conversation content are not the same as doc-update requests. If the
  user asks "can you say more about X," default to conversation; ask
  before editing the doc.
- **Pre-deciding things the user wants left open** — open questions in
  the doc are markers to think about, not prompts to resolve. If the user
  says "this is required" or "this is not in scope," update the doc to
  reflect the decision. If they ask for clarification, don't resolve via
  the edit.
- **Cluster heuristic application** — for any feature, run the
  cluster signals (`clusters.md` § Clusters → each cluster's "Signals"
  list) against the user's description. Multiple clusters can apply;
  surface all that fire so cross-cluster touchpoints get considered.
- **API-as-feature inflation** — when the user invocation cites a
  single discrete API (an MDN page, a browser API, a library method)
  as the feature, don't default to treating it as a feature. An
  API-shaped invocation is more often a *primitive consumed by an
  existing phase* than a feature in its own right. Run the Step 1
  decomposition check against the closest existing feature doc's
  phase rows before scoping standalone. Worked example:
  `MediaSource.setLiveSeekableRange` invoked as a feature; the actual
  fit is the DOM-exposure side of `live-stream-support.md`'s
  "Live edge tracking" phase row, not a new doc. The invocation
  framing ("document a feature for [API]") is *not* evidence of
  feature-level scope.
- **Weak-criterion decomposition without surfacing alternatives** —
  symmetric counterpart to API-as-feature inflation. When the Step 1
  decomposition rubric fires only *weakly* on (a)/(b)/(c) — e.g., (a)
  is weak because the mechanism already lives in a closely-related
  doc, or (c) is weak because no primitive is genuinely produced —
  surface realistic alternative framings in the Step 1 report
  proactively: (1) absorb into the closest documented feature as
  worked-example annotations on existing phase rows, (2) broader
  unified doc covering parallel siblings, (3) standalone. Even if
  the recommendation lands on standalone, the user gets to see the
  judgment call explicitly rather than having to surface it
  themselves. Worked example: `hevc-variant-selection` invocation
  (2026-05-20); Step 1 recommended standalone, but the mechanism
  already lived in `capability-probing.md`'s "Multivariant CODECS-
  attribute filtering" and "Tier 2: customer probing overrides"
  phase rows. The user had to ask "is this a distinct feature or a
  complexity phase?" to surface the absorb-into-capability-probing
  and broader-`capability-gated-variant-selection` alternatives. The
  Step 1 report should have presented them up front.
- **Composition-variant logic in always-on behaviors** — when a
  feature or mechanism only applies under one composition variant
  (live, audio-only, DRM-required, etc.), it lives as a **new
  behavior composed into that variant**, not as a runtime
  conditional inside an existing always-on behavior. The SPF
  principle: live vs VoD (and audio-only vs A+V, etc.) is a
  *composition-time* distinction, not a runtime branch. Existing
  behaviors that compose unchanged across variants —
  `updateMediaSourceDuration` is the canonical example, deliberately
  simplified to read `mediaSource.sourceBuffers` so audio-only /
  video-only variants compose it unchanged — must not regain
  variant-specific branches. See `conventions/behaviors.md` →
  "One behavior or several" ("extending the simpler shape outward
  to host the complex case … produces conditional branches and
  afterthought integrations") and the `updateMediaSourceDuration`
  worked example in "Inverse: behaviors that operate uniformly
  across tracks." Worked example: `setLiveSeekableRange` initially
  proposed as a possible extension to `updateMediaSourceDuration`
  "under `Infinity` duration"; corrected to a new live-only
  behavior composed into the live engine variant. Run this check
  whenever a feature or mechanism is invoked as applying only
  under live, audio-only, video-only, DRM, or another
  composition-variant condition.

## Steps (do these in order; do not skip)

### Step 1 — Identify the feature and gather source materials

The load-bearing setup step. Triangulate the feature from every available
source:

- **The user's invocation message.** Feature name? Description? Link(s)?
- **Linked Notion docs.** Fetch them via the Notion MCP tool.
- **Linked GitHub issues.** Fetch via `gh issue view <#>`.
- **Pasted writeups in the conversation.** Read them carefully — and run
  the scope-writeup vintage check (are these current or historical?).
- **Existing feature doc.** Check
  `internal/design/spf/features/<feature-name>.md` and obvious aliases —
  the user may be invoking the skill on a doc that already exists.
- **Closely related feature docs.** Consult `clusters.md` to identify
  which clusters the user's invocation likely touches; pull in the
  documented features from those clusters as relevant context.
  - Track-selection-flavored invocation → pull `subtitles.md`,
    `video-abr.md`, `multi-language-audio.md`.
  - MSE-flavored invocation → pull `multi-language-audio.md` for its
    buffer-flush precedent, `video-abr.md` for same-buffer-different-
    segments pattern.
  - And so on per `clusters.md` § Clusters.

**Cluster identification.** Run cluster signals against everything
gathered. Note which clusters fire and which cross-cluster patterns are
likely in play. This output drives Steps 3, 4, 5, 8.

**Decomposition check (load-bearing).** Before treating this as a new
feature doc, ask: does any existing feature doc in the fired clusters
have a phase row, a "What's not implemented" bullet, or a "Likely
cross-cutting impact" entry whose concern overlaps with this invocation?
If yes, the default framing is **extend the existing doc** (phase-row
rewrite, new sibling row, scope-bucket entry, or cross-cutting-impact
bullet), not new standalone. Apply the same rubric as Step 5's "One
feature or many?" check: a new doc only earns its place if the concern
has (a) substantial independent implementation footprint, (b)
independent priority/timeline, or (c) implies a primitive that other
documented features consume. Default to extending the existing doc
unless one of those criteria clearly fires.

This check directly counters the **API-as-feature inflation** failure
mode (see catalog above): an MDN-link or single-API invocation does not
by itself establish feature-level scope. The decomposition rubric does.

**Stop and report back to the user** with:

1. The feature name (your best read).
2. Sources consulted (with links).
3. Existing doc status (none / coarse / technical / sketched).
4. Likely clusters from signal match, with confidence notes.
5. **Recommended framing** — extend `<existing doc>`'s phase row /
   add sibling phase row to `<existing doc>` / extend `<existing
   doc>`'s "What's not implemented" / new standalone doc — with
   rubric reasoning from the decomposition check above. Always have
   a recommendation; don't hedge by listing options without one.
6. Ambiguities still unresolved (going into Step 2's discussion).

This is the load-bearing step. Getting it wrong (misreading historical
context as current scope, missing a sister feature, conflating with
another feature, inflating an API primitive into a standalone feature)
invalidates everything downstream — same failure shape as
`refactor-behavior`'s Step 1 misdiagnosis.

### Step 2 — Discuss to resolve ambiguities

An **explicit conversational stage** — not optional, not implicit. After
Step 1's report, drive toward answers for the questions that remain:

- **Implementation status.** Implemented? Partially? Not at all? (Drives
  `status` frontmatter.)
- **User's intent.** Register a new feature? Deepen an existing coarse
  stub? Update an existing doc because something changed? Discuss only
  (no draft)?
- **Definition depth target.** Coarse / technical / sketched? Default
  heuristic: if implemented and code-grounded available, sketched; if
  proposed/under-discussion, coarse; if scope and constraints are
  articulated but no implementation exists, technical.
- **Scope confirmation.** If any gathered material reads like scope
  framing (kickoff docs, "must-have" lists, "we're shipping X by Y"),
  explicitly ask whether it's current or historical context.
- **Concurrent considerations.** Are there related features the user
  wants tackled in concert, or are they cross-refs only?
- **Anything else** the source materials didn't clearly resolve.

**Use `AskUserQuestion`** when the choice is clear-cut and short-listable
(definition depth, implementation status, register-vs-update intent,
framing — new doc vs extend existing). Use free-form discussion when the
question doesn't enumerate cleanly (scope nuance, what's "related
enough").

**Lead with Step 1's recommendation.** Per the system instructions on
`AskUserQuestion`, when you have a recommended option, it goes first and
is labeled `(Recommended)` in the option label. The Step 1 decomposition
check produces this recommendation — carry it through into Step 2's
question rather than presenting equivalent options in ascending scope.
Hedging by listing alternatives without a recommendation is the
canonical anti-pattern; it pushes the call back onto the user when the
skill's rubric has already answered.

**Discuss-only mode.** If the user signals they want to think out loud
without producing a doc, stay in Step 2 indefinitely until they explicitly
ask to draft. Conversation in this mode may itself produce content the
user later wants captured — but the capture is on their cue, not implicit.

### Step 3 — Ground the feature in the codebase

Required for `sketched` and `technical` definition depths; abbreviated for
`coarse`.

**For implemented features (sketched depth).** Dispatch an `Explore` agent
or read code directly to map:

- Behaviors involved — file path, top-of-file JSDoc, responsibility
- Actors involved — file path, role
- State slots read / written (identify multi-writer slots explicitly)
- Config inputs (defaults, tunables, pluggable callbacks)
- Manifest parsing touchpoints
- Tests covering the feature
- Sandbox demos exercising the feature

**Cluster heuristics point at the right files.** Per `clusters.md`:

- Track-registry feature → `behaviors/select-tracks.ts`,
  `behaviors/resolve-track.ts`, `behaviors/quality-switching.ts`,
  `behaviors/dom/sync-text-tracks.ts`.
- MSE feature → `behaviors/setup-media-source.ts`,
  `behaviors/setup-sourcebuffer.ts`, `actors/source-buffer.ts`.
- Presentation-modeling feature → `media/hls/parse-multivariant.ts`,
  `media/hls/parse-media-playlist.ts`, `behaviors/resolve-presentation.ts`.
- And so on.

**For not-yet-implemented features (coarse depth).** Identify the pieces
the feature would *touch*, not the implementation itself:

- Which existing behaviors would change shape?
- Which state slots would become multi-writer or gain new constraint
  slots?
- Which manifest-parsing paths would surface new metadata?
- Which new behaviors might emerge?

This output feeds the doc's "Likely cross-cutting impact" section.

### Step 4 — Apply cross-cutting concern checks

Run the failure-mode catalog and the cross-cluster patterns from
`clusters.md` against everything gathered so far. Each check fires when
its signals are present in the feature's description or grounded code.

**The five cross-cluster pattern checks (per `clusters.md`).** For each
pattern, follow the "Skill action when this pattern is suspected"
guidance:

- **Gating / prerequisite chains** — feature delays or conditionally
  proceeds with another's work? Identify what's gated, the prerequisite
  signal, and where the gate lives.
- **Multi-writer state slots** — feature adds a writer to a slot another
  behavior already writes? Characterize along decision domain / trigger /
  cost (the three-axis check from the failure-mode catalog above).
- **Constraint + filter** — feature introduces a slot that narrows
  another behavior's candidate set without taking over the write?
  Distinguish from multi-writer.
- **Per-type specialization** — feature follows the per-type pattern
  (video/audio/text siblings + shared `setup*` helper)? Default to the
  precedent unless a cross-type constraint forbids it.
- **Sampling-baked-into-loading** — feature needs ongoing observation of
  an existing flow? Prefer baking sample emission into the existing
  wrapper over a parallel monitoring behavior. Note the sample-producer
  in the doc.

**The failure-mode-catalog checks** (see top of this doc). Run each
against the feature's description and grounded code. Most check whether a
specific risk is present; some are explicit guard rails (e.g., MSE
codec-change check).

**Output of this step.** A list of: which patterns / checks fired, what
they imply for the doc's "Likely cross-cutting impact" section, what
out-of-scope items they push out, what cross-references they pull in.

### Step 5 — Pick phase framing and identify relationships

**Phase framing.** Pick the framing that fits the feature; don't default
to one shape across features. Three observed framings from existing
drafts:

- **Content phases** — capability slices indexed by content complexity
  (e.g., subtitles: single-language → multi-language → styled cues).
  Worked example: `subtitles.md`.
- **Scope slices** — algorithm / mechanism slices (e.g., video-abr:
  initial selection → dynamic adjustment → manual override). Worked
  example: `video-abr.md`.
- **Tier 1 / Tier 2** — spec-compliance baseline (Tier 1) vs additive
  custom support (Tier 2). From the Notion epics taxonomy. Worked
  example: `multi-language-audio.md`.

If none of the three fits cleanly, the feature may not have meaningful
phases. Skip the phases section.

**Relationships.** Sort related features into the right buckets:

- **In scope phases** → phases-of-complexity table.
- **Out of scope (sister candidate features)** → "What's not implemented"
  / "Out of scope (separate candidate features)" sub-list.
- **Out of scope (different architectural layer)** → "Out of scope
  (different architectural layer)" sub-list. Includes adapter-level
  concerns, above-engine consumer concerns, browser-API exposure that
  doesn't belong in SPF.
- **Cross-refs to existing docs** → "See also" section.
- **Forward refs to candidate features (no doc yet)** → bracketed entries
  in "Related features" (e.g., `[track-registry-primitive]`).
- **Open questions** → "Open questions" section. Markers for things to
  think about, not prompts to resolve in the draft.

**"One feature or many?" decomposition check.** Before locking the phases
in, ask: is this really one feature, or is the phasing actually a
decomposition into multiple features? Heuristic: a phase belongs in its
own doc if (a) it has substantial independent implementation footprint,
(b) it has independent priority/timeline, or (c) it implies a primitive
other features consume. Worked example: `track-registry-primitive`
likely warrants its own doc when extracted, even though "multi-language
audio" stays one doc.

### Step 6 — Draft (or update) the doc

Write the file at `internal/design/spf/features/<name>.md` using the
template. Section presence varies by definition depth:

| Section | coarse | technical | sketched |
|---|---|---|---|
| Frontmatter (status, date, definition) | ✓ | ✓ | ✓ |
| Opening paragraph | ✓ | ✓ | ✓ |
| Status block | ✓ | ✓ | ✓ |
| Phases of complexity | ✓ | ✓ | ✓ |
| What's in scope vs out of scope | ✓ | ✓ | — |
| What's not implemented | — | partial | ✓ |
| Likely cross-cutting impact | ✓ | partial | — |
| Implementation surface | — | partial | ✓ |
| Config surface | — | partial | ✓ |
| Verification | — | — | ✓ |
| Open questions | ✓ | partial | partial |
| Related features | ✓ | ✓ | ✓ |
| See also | ✓ | ✓ | ✓ |

**Sections that earned their place through iteration:**

- "Out of scope (different architectural layer)" sub-heading under "What's
  in scope vs out of scope" — for concerns that aren't a separate SPF
  feature but live at a different layer (adapter, above-engine).
- "Likely cross-cutting impact" — captures decisions this feature forces
  on existing code, not just additions. The MSE codec-change distinction
  is one canonical entry shape.

**For updates to existing docs.** Preserve structure; make targeted
edits. Don't rewrite sections wholesale unless the user asks. The "Open
questions" section in particular evolves carefully — questions resolved
through conversation update the relevant section the answer constrains
(usually a phase row or a scope-bucket entry); the open question itself
gets removed.

**Show the user before treating the draft as final.** Iteration is
expected — failure-mode catalog updates may surface during user review
(the MSE codec-change check arrived this way).

### Step 7 — Final-shape audit

A deliberate second pass against the file as written. Most misses come
from the diff itself, not the pre-draft analysis. Run through:

- **Frontmatter** — `status`, `date`, `definition` match what Step 2
  agreed on?
- **Phase framing** — the choice from Step 5 reflected, not silently
  drifted to a different shape?
- **Cross-cutting concerns** — each pattern / check that fired in Step 4
  surfaced in the doc somewhere (Likely cross-cutting impact, Open
  questions, What's not implemented)?
- **Cross-refs** — bracketed entries for not-yet-documented features?
  Plain links for existing docs? `See also` links resolve?
- **Implementation claims grounded** — every concrete behavior / actor /
  file-path reference in the doc came from Step 3's exploration, not
  invented?
- **Open questions appropriate** — at coarse depth, open questions are a
  feature, not a bug. At sketched depth, residual open questions should
  cross-reference where they're being tracked (text-track-architecture.md
  has open-questions sections too).
- **Resolved questions not lingering** — anything the user resolved during
  Step 2 or Step 6 discussion landed in its constraining section and
  cleared from open questions?
- **"What's not implemented" framing** — each entry sorted into the right
  bucket (extension boundary / out of scope as separate feature / out of
  scope at different layer)?

This is invisible to a single forward pass — the second pass is the
mechanism.

### Step 8 — Cross-doc cascade

After the feature doc is final, **survey other docs for narrow updates**
this new draft entails. Common candidates:

- **Docs in this feature's Related features that don't reference back.**
  E.g., if `multi-language-audio.md` cites `subtitles.md` as the closest
  analog for the picker shape, `subtitles.md`'s Related features should
  mention `multi-language-audio.md`.
- **Docs with forward-refs to this feature.** Bracketed entries like
  `[multi-language-audio]` should drop the brackets and the
  parenthetical now that the doc exists.
- **Docs whose Likely cross-cutting impact should mention this feature.**
  E.g., a new track-registry-primitive doc would make `subtitles.md` and
  `multi-language-audio.md` candidates for cross-cutting-impact updates
  (they're the data points the primitive was extracted from).
- **`clusters.md` docs list.** The new feature should appear in its
  cluster's docs list. Move from bracketed `[name]` to plain `name` if
  applicable.
- **Skills `README.md`.** If this skill creation is itself the feature
  (self-application), add the skill to `.claude/skills/README.md`.

**Discipline for cascade edits:**

- **Narrow** — add references, note relationships; don't restructure other
  docs.
- **Per-doc confirmation** — propose each candidate edit explicitly;
  user accepts / declines / modifies per doc.
- **Bounded** — only docs this feature explicitly references plus docs
  that reference this feature. Don't go fishing for unrelated cross-refs.

**Cascade may also trigger updates to `clusters.md`** — a new cross-
cluster pattern surfacing in this feature's analysis, a new cluster signal
worth adding, a docs-list update. These are part of the same cascade.

### Step 9 — Commit (with user confirmation)

After Step 7 audit is clean and Step 8 cascade edits are agreed:

1. **Audit working-tree state.** `git status -s`. Surface any pre-
   existing uncommitted work on files outside the doc scope; never commit
   files the user didn't ask you to touch.
2. **Propose a commit structure.** Common shapes:
   - **Single commit** — new doc only, no cascade. Most coarse stubs
     land here.
   - **Doc + cascade** — new doc plus narrow updates to other docs in
     the registry. Sketched docs that pull in cross-refs often land
     here.
   - **Doc + cluster update** — new doc plus addition to `clusters.md`
     (new entry or signal). Stays separate from cascade because review
     audience differs.
   - **All of the above** — large new features that earn updates across
     multiple docs.
3. **Ask the user to confirm via `AskUserQuestion`.** Options include
   "Land all commits as proposed," "Bundle into one commit," and "Skip
   — I'll handle commits."
4. **On confirmation, run the commits.** Stage per-commit by name (no
   `-A` / `git add .`), use the repo's commit-message conventions
   (`docs(spf)` scope per the project's `git` skill), verify with
   `git status -s` after each.
5. **On decline or skip, stop.** The user owns the commit boundary.

## Output format

Propose the doc in this order before writing the file. Use markdown
headers for each numbered section. Do not write the file until the user
confirms.

1. **Feature identification** (Step 1's report — name, sources, existing
   doc status, cluster signals, recommended framing from the
   decomposition check)
2. **Ambiguities to resolve** (Step 2 — questions for the user)
3. **Grounding summary** (Step 3 — behaviors / actors / state /
   implementation footprint, or what-it-would-touch for coarse)
4. **Cross-cutting concerns identified** (Step 4 — which checks fired,
   what they imply)
5. **Phase framing + relationships** (Step 5 — phase shape, what's in
   each scope bucket)
6. **Proposed doc** (Step 6 — the file content, ready to write)
7. **Cross-doc cascade** (Step 8 — proposed updates to other docs)

After user confirmation, write the file, run Step 7 audit, propose Step 9
commit structure.

## Why this order

The canonical failure: invocation → drafting, skipping the triangulation
and discussion that surface the actual scope and definition depth.
Steps 1–2 force the framing before mechanical work. Step 3 grounds claims
in code; Step 4 runs the failure-mode catalog while context is fresh;
Step 5 commits the structural choices before drafting. Step 6 produces
the artifact. Step 7 is the second-pass audit that catches diff-
introduced misses. Step 8 keeps the registry internally consistent. Step
9 hands the commit boundary back to the user.

## Why a discussion stage (not implicit)

Source materials are often under-specified or ambiguous in ways the user
didn't notice until asked. The conversational stage is explicit because
making it implicit produces drafts that look right but anchor on the
wrong scope — the kickoff-doc misread is the canonical example. Step 2
short-circuits to drafting only when ambiguities are genuinely resolved
by Step 1's gathering.

## When this is the wrong skill

- **You want to refactor an existing behavior** → `/refactor-behavior`.
- **You want to split a per-type behavior** → `/refactor-behavior`'s
  Step 6a may route you to `/split-behavior`.
- **You want to merge two behaviors** → `/refactor-behavior`'s Step 3
  routes to `/merge-behaviors`.
- **You want to write a design doc for an architecture concern (not a
  feature)** → `design` skill. Architectural concerns live in
  `internal/design/spf/` directly, not under `features/`.
- **You want to write an RFC for a cross-team decision** → `rfc` skill.
- **You want to write user-facing documentation** → `docs` skill.

## How the failure-mode catalog grows

When a new failure mode surfaces during use (most likely during Step 6
draft review or Step 7 audit):

1. Add an entry to the "Failure-mode catalog" section above with the
   risk pattern and a worked-example citation.
2. If the failure-mode is cluster-pattern-shaped, also update
   `clusters.md` § Cross-cluster patterns.
3. Note in the commit that the skill itself grew — `docs(spf): ...`
   commit scope covers skill updates too.

The catalog is the load-bearing distinction between this skill and a
generic "write a feature doc" prompt. Every entry exists because a real
risk was hit; keeping the catalog up-to-date is the mechanism that keeps
the skill earning its keep.
