---
name: spf-describe-pr
description: >-
  Draft or revise a PR description for SPF-area PRs using a reviewer-orientation
  discipline. Produces a body structured around how to read the PR — bucket-
  calibrated reading order, per-file [depth] + Look-for tags drawn from a
  five-label set, design-decisions framed as choice/alternative/why, scope-
  narrowed reviewer callouts, and link discipline that survives merge.
  Distinct from /commit-pr (which produces the title + a baseline body)
  and /review-branch (which audits the diff). Triggers: "describe PR",
  "rewrite PR description", "PR description", "draft PR body", "improve
  PR description", "SPF PR description".
allowed-tools: Bash(gh:*), Bash(git:*), Read, Write, Edit, AskUserQuestion
---

# Describe an SPF PR

Draft or revise the body of a PR that touches SPF-area code (and adjacent
design docs / agent skills). Produces a body that lets reviewers pace
themselves: what to read fully, what to skim, what to skip — and *what
kind of issue* lives in each file. Distinct from /commit-pr (which writes
a baseline body matching project conventions) and /review-branch (which
audits the diff itself).

The default failure mode without this discipline is a description that
enumerates *what changed* file-by-file like an extended changelog —
useful for someone who already knows the codebase, useless to a reviewer
arriving cold who needs to figure out where to focus. This skill
reorganizes the body around *how to review*.

## Usage

```
/spf-describe-pr [<pr-number-or-url>]
```

- `<pr-number-or-url>` (optional): the PR to describe. If omitted, infer
  from the current branch via `gh pr view`.

## Reference: when to use this skill

**Use when:**

- A PR is non-trivial (~10+ files or any file with substantial design impact).
- The PR touches multiple areas (runtime + docs, runtime + skills, etc.).
- The author wants reviewer guidance, not just a changelog.
- Cursor Bugbot or similar tooling has produced inline findings worth
  promoting into the description.
- An existing PR description is doing the changelog thing and a rewrite
  would meaningfully change reviewer experience.

**Don't use when:**

- The PR is a trivial fix (1–3 files, mechanical).
- The author wants only a commit-message-style body (use /commit-pr).
- The PR has no reviewers and won't get any (just write a TL;DR).

## Output

The final PR body, written to `/tmp/pr-<num>-body.md` and pushed via
`gh pr edit <num> --body-file /tmp/pr-<num>-body.md`. Always check in
with the user before pushing — see the *Workflow* section.

## Structure (eight sections, in order)

The order matters: framing → reviewer guidance → smoke test → narrative →
decisions → callouts → breaking → tests. Reviewers who stop reading at
any cut-point get useful information at that depth. Smoke test sits high
in the order because a reviewer who can confirm the change works in 30
seconds will read the rest with different eyes than one who can't.

### 1. TL;DR

2–4 sentences. What this PR establishes + what validates it (if non-obvious)
+ scope rationale if the PR is internal-only or alpha. Pull the "why
this scope" justification up here if reviewers might push back on scope
(e.g., "why is X inline rather than a follow-up PR").

### 2. For reviewers — how to read this PR

The load-bearing section. Three buckets, each with files grouped by
depth label. The target shape is "Bucket 1 fits in one viewport" —
prioritize line count over word count. See *Compression discipline*
below for the line-saving moves.

Open with one short line on the diff shape — `#<num>: X files / +Y / −Z`
— and note any line-count weirdness only if material (e.g., "~3500 of
4593 added lines are agent skills with no runtime impact"). Skip the
intro entirely if the diff shape is unremarkable.

Per-bucket shape:

- **Heading** carries everything load-bearing about the bucket: what's
  in it, the recommended depth (e.g., "focus here" / "skim" / "skim or
  skip"), and any deferrability rationale (e.g., "no runtime impact").
  No framing sentence below the heading.
- **Files grouped by depth label**, not by original ordering. The
  reviewer scans for `[Read fully]` and `[Targeted careful read]`
  first; the `[Skim ...]` groups can be glanced.
- **Single-file depth groups: inline.** One line: `**Read fully:**
  path — verification targets`.
- **Multi-file depth groups: block.** Depth heading on its own line,
  then bulleted list. Each bullet: `path (Δ) — verification targets`.
- **No "*Look for:*" label.** Verification content is the body of each
  entry; the em-dash after the path or depth label introduces it
  directly.

#### Bucket calibration

The three buckets are scoped by *artifact type*. Per-file depth labels
within each bucket carry the risk signal — don't put risk claims in
the bucket framing.

- **Bucket 1 — Runtime surface (focus here).** SPF behaviors, actors,
  engines, adapters, primitives, and their tests. The code surface
  this PR touches. Spans the full label range (`[Read fully]` → `[Skim
  structure only]`).
- **Bucket 2 — Design docs / infrastructure-as-doc (skim).** Internal
  design registry, conventions, use-case docs, feature-doc cascades.
  Not user-facing; not runtime. Caps at `[Skim file]` for the
  precedent-setting doc; everything else is `[Skim structure only]`
  or `[Skim or skip]`.
- **Bucket 3 — Agent skills (skim or skip).** `.claude/skills/*` files.
  LLM-consumed; no runtime impact. Drift can be corrected in any
  future PR — explicitly say so in the bucket framing. Every file
  here is `[Skim or skip]`.

A file's bucket is determined by *what kind of artifact it is*, not by
its directory. A test file for a runtime behavior goes in Bucket 1. A
sandbox demo goes in Bucket 1 (it's runtime-adjacent even though not
shipped). A feature-doc cascade goes in Bucket 2.

**Drop framing sentences below bucket headings.** The heading does the
work — there's no need for a one-line intro elaborating it. If the
bucket has rationale worth surfacing (typically Bucket 3's "why is
skipping OK?" answer), fold a 2–4-word qualifier into the heading
itself rather than write a sentence:

```
### Bucket 3 — Agent skills, no runtime impact (skim or skip)
```

Avoid framing sentences that restate the heading ("SPF runtime:
behaviors, actors, segment-loading. The code surface this PR touches.")
and avoid framings that claim risk profile ("Where regression bugs
live") — both overclaim and waste vertical space. The per-file depth
labels carry per-file risk; the heading carries category.

**When a bucket is empty.** Docs-only or skill-only PRs have no Bucket
1 — omit the heading entirely rather than naming an empty bucket. With
only 1–2 buckets populated, drop bucket numbering in favor of
descriptive headings ("Design doc cascade", "Agent skills"); the
numbering matters only when all three are present. The PR's load-
bearing artifact gets `[Skim file]` regardless of which bucket it sits
in — a precedent-setting skill in an otherwise-cascade PR is
`[Skim file]`, not the default `[Skim or skip]`. Worked example:
#1624 (this skill's own PR).

#### The five-label set

A 2D grid: scope of attention × intensity of attention.

|                | Whole file       | Targeted              |
| -------------- | ---------------- | --------------------- |
| **High attention** | `[Read fully]`         | `[Targeted careful read]` |
| **Low attention**  | `[Skim file]`          | `[Skim structure only]`   |

Plus a fifth tier below the grid: `[Skim or skip]` — deferrable
entirely; reviewer can pass.

**Label-to-file mapping rules:**

- **`[Read fully]`** — new files, especially precedent-setters. Reviewer
  reads every line and asks *"is this the right shape?"* Example:
  `engine-audio-only.ts` (first concrete variant engine, +168 lines new).
- **`[Targeted careful read]`** — diffs into existing files where the
  *Look for:* prose names what to focus on. Reviewer doesn't re-read
  the whole file; they zoom in on named areas at high attention. Used
  for risk-surface files too (the qualifier lives in prose, not the
  label). Example: `segment-loader.ts` (+90 into a much larger
  pre-existing file; "*Look for: staleRange anchor correctness…*").
  Also use for files where the *Look for:* names multiple specific
  things to verify (single-writer invariants, ordering, predicate
  edge cases) — fold "Spot-check + verify X, Y, Z" up into this label.
- **`[Skim file]`** — whole file at low attention. Pass through; come
  away with a working mental model. Used for prose-heavy files where
  substance matters but reviewer doesn't need to memorize details.
  Example: `multi-language-audio.md` (+178; "*Look for: Tier 1/2
  status reflects what shipped…*"). Also for *test* files where the
  test suite is heavy and reviewer trusts the suite but verifies
  assertion shape.
- **`[Skim structure only]`** — targeted at low attention. Don't read
  prose; confirm specific structural properties (does it mirror its
  sibling? is the frontmatter intact? was the single caller updated?).
  Used for mechanical files and trust-internals-verify-wiring cases.
  Example: `setup-buffer-actors.ts` (small lifecycle-only revert; "*Look
  for: no stray flush logic left behind*"). Also for `[Trust + verify
  single caller]`-shaped asks where the file internals are trusted
  and only one consequence needs verification — fold those into this
  label.
- **`[Skim or skip]`** — genuinely deferrable. Reviewer can pass
  entirely without the PR being meaningfully under-reviewed. Used for
  Bucket 3 (agent skills) and for tertiary Bucket 2 files (coarser
  siblings, secondary use-case docs). The bucket-level framing should
  explain *why* skipping is acceptable (e.g., "drift can be corrected
  in any future PR — no coupling to runtime review").

**Avoid the medium-tier trap.** Earlier iterations of this discipline
used labels like `[Spot-check]`, `[Trust + verify single caller]`,
`[Skim + verify the spy filter]` for files that didn't quite fit the
four-cell grid. These collapse into the four cells cleanly:

- Logic-y verification (a small change with named things to verify) →
  `[Targeted careful read]`.
- Mechanical or single-consequence verification (file internals trusted,
  one wiring point to confirm) → `[Skim structure only]`.

The specific ask lives in the *Look for:* prose. The label carries
*how much / how carefully*, not *what to verify*.

#### Verification content (the "Look for:" content, no label)

Every file entry names specific things to verify after the depth
label. The verification content is the body of the entry — no explicit
"*Look for:*" label needed; the em-dash after the depth label or
file path introduces it directly. This is where the mode-of-attention
nuance lives that the depth label alone can't carry.

**Rules:**

- **Noun phrases or short clauses, not full sentences.** Multiple items
  separated by semicolons. Target 5–10 words per item.
- **Every technical term needs a contrast or a gloss.** Either pair an
  abbreviated term with the alternative it's contrasted against
  (`switchVideoTrack` (bandwidth-driven ABR) vs. `switchAudioTrack`
  (pin-to-current)), or provide a parenthetical (`ABR (bandwidth-
  driven)`). **Compressing past the reader's prior knowledge produces
  terse-but-obscure prose; that's worse than wordy-but-clear.** A
  reviewer who isn't deep in SPF should still be able to act on each
  item.
- **Name what's verifiable, not what the file does.** "Only the one
  internal caller updated" is verifiable; "manages quality selection"
  is descriptive. *What changed — by surface* carries file-purpose
  narrative; the Look-for clause carries verification targets.

**Good shapes:**

- *Names a precedent.* "First concrete subtractive-composition engine
  variant (engine omits the default's video + text behaviors); the
  shape sets precedent for future variants."
- *Names a risk pattern.* "Just absorbed the stall-bug fix in
  `cb6cd8b2` — same class of bug can re-emerge if `planTasks` ordering
  changes."
- *Names invariants.* "Filter doesn't violate the single-writer
  invariant on `selectedAudioTrackId` (path must stay clear for
  `switchAudioQuality`)."
- *Names what's mechanically verifiable.* "Only the one internal caller
  in `media/primitives/select-tracks.ts` updated; no shim debt."

**Gloss table for common SPF terms** (use gloss on first mention; drop
on subsequent uses within the same description):

| Term | Suggested first-use gloss |
|---|---|
| `ABR` | `(bandwidth-driven)` or `(adaptive bitrate)` |
| `cross-rendition switch` | `(language or codec change, not bitrate)` |
| `per-rendition switch` | `(same program, different bitrate)` — i.e., ABR |
| `variant engine` | `(composition variant of the default engine)` |
| `subtractive composition` | `(engine variant omitting some default behaviors)` |
| `defensive-read pattern` | `(behavior reads cross-track slots as optional)` |
| `staleRanges` / `stale-range` | `(buffered content that will be overwritten on next append)` |
| `single-writer invariant` | `(only one behavior may write a given state slot)` |
| `slot owner` | `(behavior that writes a specific state slot)` |
| `DWIM` | `(do-what-I-mean — sensible default for under-specified cases)` |

Bad *Look for:* prose restates what the bullet's intro already said,
uses bare technical terms without contrast or gloss, or describes file
purpose rather than verification targets.

### 3. Smoke test

A reviewer-actionable verification block: a URL the reviewer can paste
into a running sandbox (or a deploy-preview link), plus 2–5 concrete
things to observe that confirm the change. Distinct from *Test plan*
(section 8), which is the author's record of what was already run. This
section is for the reviewer's hands.

**Shape (when smoke-test applies):**

```markdown
## Smoke test

**Sandbox:** `/<template>/?<params>&src=<source-url>`

- Load locally (`pnpm dev:sandbox` → paste path into the running
  Vite server) or via the PR's deploy preview (if one is configured).
- **Observe:**
  - <Observable 1 — concrete, user-visible>
  - <Observable 2>
  - ...
```

**Rules:**

- **URL is path-only**, not host-qualified. Reviewers append the path
  to whichever host they're using (local Vite, deploy preview). One
  artifact, two consumption modes.
- **Template path comes from `apps/sandbox/src/<template>/`.** The
  directory name is the URL path. Pick the template that exercises the
  surface this PR changes — usually the sandbox demo the PR also
  updates.
- **Source URLs must be publicly accessible.** Mux test streams, public
  HLS samples — not LOCAL or auth-gated assets. The reviewer should
  be able to load the URL without any setup beyond pulling the branch.
- **Observables are user-visible, not internal-state.** "Audio language
  switches mid-stream without a stall" is observable. "`planTasks`
  emits the expected stale range" is not — that's a test, not a smoke
  test.
- **2–5 observables.** Fewer = the section isn't carrying its weight.
  More = reviewer fatigue; pick the most distinguishing ones and
  defer the rest to the test plan.

**When smoke-test doesn't apply.** Some PRs have no observable surface
(internal refactor, docs-only, skill-only, types-only). Don't fabricate
a smoke test. Either omit the section or, if reviewers might expect one
and look for it, keep the heading with an explicit note:

```markdown
## Smoke test

No reviewer-actionable smoke test for this PR — the change is
<internal refactor / docs-only / skill-only / types-only> with no
runtime surface. Verification lives in *Test plan*.
```

The explicit note is preferable when one of:

- The PR has runtime impact but the user-visible effect is null (e.g.,
  a refactor that preserves behavior).
- The PR is large enough (~10+ files or ~500+ lines) that reviewers may
  scan for a smoke-test before reading the description top-to-bottom,
  regardless of whether runtime is touched.

Omit the section entirely for small docs-only / skill-only PRs (< 10
files, < 500 lines) — the docs-only nature speaks for itself.

Skipping the section silently on a large PR makes reviewers wonder
whether you forgot or whether none exists; the explicit note resolves
that ambiguity.

**Human-in-the-loop.** The skill can detect candidates from the diff
(sandbox templates touched, new behaviors with observable output, demo
preset changes) but cannot reliably synthesize the *meaningful* part —
which source URL exercises the new behavior, which query params are
needed, what specifically to look for. Propose a draft to the user and
ask them to confirm the URL, source, and observables before writing.
See *Smoke-test discipline* under *Disciplines* for the proposal
pattern.

### 4. What changed — by surface

Theme-grouped narrative, 3–5 themes. Each theme = 1 short paragraph
(3–5 sentences). Themes are by *surface*, not by file or by section
of the registry. Examples of good theme labels:

- "Multi-language audio Tier 1 + Tier 2 (programmatic + mid-stream)."
- "Track-switching unification."
- "Cross-rendition switch via MSE overwrite-on-append."
- "Stall-bug fix."
- "SPF doc registry — new use-case-composition tier."

If a theme's narrative wants to grow beyond 5 sentences, factor a
*Notable design decisions* bullet out of it.

### 5. Notable design decisions

Bulleted list. Each item: **choice / alternative / why**. Lead with
the choice in bold, then a sentence on the alternative considered,
then the rejection rationale. Format:

```
- **<Choice>.** <One-sentence elaboration.> Alternative considered:
  <the road not taken>. Rejected because <why>.
```

Use this section for decisions a reviewer might reasonably push back
on. Don't use it for routine implementation details (those belong in
*What changed* or commit messages).

End an item with a reviewer-facing question when one exists. Example:
*"Reviewers: is the filter too broad?"*

### 6. Reviewer callouts — known limitations

Bulleted list of explicit known-gaps + deferred-work flags + Cursor
Bugbot findings worth promoting from inline threads.

**Scope-narrow the section heading if it doesn't apply PR-wide.** A
common case: a known limitation lives entirely in `apps/sandbox` and
doesn't affect runtime code. The heading should say so:

```markdown
## Reviewer callouts — known limitations (sandbox app only)

> Scope: this section is **only about `apps/sandbox`** (the dev/test
> harness). No runtime/library code is affected.
```

For each callout, frame as **<source-tag>** (e.g., `[Cursor Bugbot]`,
`[Author]`, `[Deferred from Tier 2]`) + the limitation + the
disposition ("good enough for now," "follow-up issue welcome," "blocker
if reviewer disagrees").

### 7. Breaking changes

Single paragraph. If none, say so explicitly with the alpha caveat if
SPF: *"None. SPF stays alpha; `<config>` surface unchanged. Deleted
docs are internal-only, not exported API."*

### 8. Test plan

Markdown checklist. `[x]` for completed items, `[ ]` for pending. Each
item: command + result. **Author-facing**: what was actually run, what's
deferred, what depends on a sibling PR landing. The reviewer-actionable
verification surface lives in *Smoke test* (section 3) — don't duplicate
it here. Include any manual verification the author did beyond the
smoke-test (deeper sweeps, environment-specific checks).

## Disciplines

### Compression discipline

The *For reviewers — how to read this PR* section is what reviewers
will actually use to pace themselves. The target is **"Bucket 1 fits
in one viewport"** (~25 lines at typical zoom). Line count matters
more than word count.

**Line-saving moves (apply in order):**

1. **Drop bucket framing lines.** Heading does the work. If a
   rationale needs to be visible, fold a 2–4-word qualifier into the
   heading itself (e.g., `Bucket 3 — Agent skills, no runtime impact`).
2. **Group files by depth label.** Reviewers scan for priority; depth
   grouping makes it visible at a glance.
3. **Inline single-file depth groups.** One line:
   `**Read fully:** path — verification targets`. Multi-file groups
   keep the block shape.
4. **Combine multiple low-priority files into one line.** Three
   `[Skim structure only]` files can share a line as
   `path1 (note1), path2 (note2), path3 (note3)`.
5. **Drop the *Look for:* label.** Em-dash introduces verification
   content directly.

**Per-entry budget:**

- **One line is default.** ~80–120 characters including depth label
  and verification content.
- **Spill to a second line only when content genuinely earns it.**
  Examples that earn the spill: a recent bug-fix regression risk (the
  `cb6cd8b2` callout on `segment-loader.ts` in #1605); a new-file
  precedent that future PRs will copy (`engine-audio-only.ts` in
  #1584).

**What to cut:**

- **"What this file is" narrative per entry.** Themes live in *What
  changed — by surface*. Entries carry path + (Δ) + depth + verification.
- **Multi-sentence verification items.** Noun phrases / short clauses,
  semicolon-separated. See *Verification content*.
- **Teaching prose in bucket framings.** A reviewer who doesn't know
  SPF won't be taught by one sentence; one who does is wasting their
  time on it.
- **The *Look for:* label.** Em-dash is enough.

**What to keep:**

- **Glosses on first use of technical terms.** Terseness is not the
  same as obscurity. See *Verification content* for the gloss rule
  and table.
- **Commit links inside verification prose** when they anchor a risk
  pattern.
- **Contrast pairs** that establish meaning for compressed terms
  (`X (does this) vs. Y (does that)`).

**Target shape** (Bucket 1 example):

```
### Bucket 1 — Runtime (focus here)

**Read fully:** `track-switching.ts` (new) — no video-ABR vs.
audio-pin bias; conventions; `switchAudioQuality` slots in

**Targeted careful read:**
- `segment-loader.ts` (+90) — `staleRange` at playhead (not next-
  boundary); `isCrossRenditionSwitch` edges; bandwidth-aware dedup
  keeps new-track segments. Stall-bug fix [`<sha>`](url) — same
  class can re-emerge if `planTasks` ordering changes
- `source-buffer.ts` (+22) — `initTrackLanguage` captured before
  append
- `select-tracks.ts` — single-writer invariant on selected-slot;
  3-tier picker default; short-circuit when filter narrows to one

**Skim structure only:** `quality-selection.ts` (single caller, no
shim), `setup-buffer-actors.ts` (lifecycle revert), sandbox demo
(mirrors siblings)

**Skim file:** Tests (4 files, +628 total) — assertion shape across
cross-rendition, stall regression, picker tiebreaks
```

~11 lines for an 8-file bucket. The whole *How to read* section
should fit in ~25 lines for typical PRs.

### Smoke-test discipline

The skill cannot reliably synthesize a meaningful smoke-test URL from
the diff alone. The diff names what changed; it does not name what
source URL exercises the change, which query params trigger the right
codepath, or what the reviewer should *see* if it works. Those are
author-knowledge choices that the skill should propose and the author
should confirm.

**The proposal pattern:**

1. **Scan the diff for smoke-test signals.** Worth proposing a smoke
   test when any of these are present:
   - A sandbox template (`apps/sandbox/src/<template>/`) is touched.
   - A sandbox demo preset is added or modified (e.g., a new HLS
     source preset, a new picker UI).
   - A new public behavior shows up with observable output (default
     selection, mid-stream switching, error UX, accessibility surface).
   - A bug fix where the regression has a user-visible signature
     (stall, broken control, wrong default).
2. **Draft a proposal.** Pick the most likely template + a placeholder
   source URL + 2–5 observables drawn from the *What changed* themes.
   Be explicit that values are guesses:

   ```
   Proposed smoke test (please confirm or correct):

   **Sandbox:** `/<template>/?<params>&src=<your source URL>`
   - <Observable 1, inferred from theme A>
   - <Observable 2, inferred from theme B>
   ```

3. **Ask the user to confirm three things.** The URL path + params, the
   source URL, and the observables. Use one `AskUserQuestion` block;
   each is a separate question. If the user provides a full URL in the
   conversation (e.g., pasted directly), skip the URL questions and
   only confirm observables.
4. **Write the section once confirmed.** Don't write the smoke test
   to the body until the user signs off — a wrong URL or a wrong
   observable burns reviewer time.

**When no smoke test applies.** Internal refactors, docs-only PRs,
skill-only PRs, types-only PRs. Don't propose a fabricated smoke test.
Either omit the section entirely or, if the PR is large enough that
reviewers might expect one, write the explicit *"No reviewer-actionable
smoke test"* note (see section 3 shape). Confirm with the user which.

**Don't try to infer the deploy-preview URL.** Vercel / Netlify /
similar preview-URL conventions vary per project and per PR; the skill
should not hard-code a hostname. Path-only smoke-test URLs let
reviewers append to whichever host they use; the author can paste a
preview link in a PR comment if helpful, but the description stays
host-agnostic.

**Observable phrasing.** Same rules as *Verification content* in
section 2 — noun phrases or short clauses, technical terms paired with
a contrast or gloss. Observables are *user-visible*, not internal:

- Good: "Audio language switches mid-stream without a visible stall."
- Good: "Default selection picks `en` (preferred) over `fr` on first
  load."
- Bad: "`planTasks` emits a `staleRange` for the cross-rendition
  switch." (Internal state — that's a test, not a smoke test.)
- Bad: "Multi-language audio works." (Not distinguishing — what
  specifically would tell the reviewer the change is broken?)

### Link discipline

**File-path links in PR descriptions are fragile. The default is no link.**

- Relative paths (`packages/.../file.ts`) resolve against the repo's
  *default branch* (main), not the PR's head. Always wrong for new
  files; misleading for modified files.
- Absolute branch-ref URLs
  (`https://github.com/<owner>/<repo>/blob/<head-branch>/path`) work
  during the PR's open period but rot after merge (branch is usually
  deleted). They also encode the head-branch name, which makes the
  body harder to reuse.
- Commit-SHA URLs are stable but require knowing the SHA at draft
  time and don't update with subsequent pushes.

**Default: keep file paths as plain backticked code spans** (`` `path/to/file.ts` ``).
Reviewers can navigate via the *Files changed* tab. The path-as-text
survives all merge / rebase / branch-deletion events.

**Exception: commit links.** Absolute commit URLs (`pull/<num>/commits/<sha>`)
are stable forever. Use these when referencing a specific commit's
context (e.g., a postmortem in the commit message that you're pointing
reviewers at).

### Cursor Bugbot integration

When Bugbot has produced inline findings, decide per finding:

- **Promote to *Reviewer callouts***: a real finding that the PR isn't
  addressing (or is addressing partially). Frame as `[Cursor Bugbot]`
  + description + disposition ("good enough for now," "follow-up issue
  welcome").
- **Address in code**: a real finding the PR should fix. Don't put in
  the description; just fix it.
- **Dismiss inline**: a false positive. Reply in the inline thread; no
  description treatment needed.

Don't bury Bugbot findings in the narrative body. They belong as
explicit callouts so reviewers can engage with them.

### Stacked-PR awareness

If the PR is stacked on another open PR (e.g., #1605 stacked on #1584),
GitHub's *Files changed* tab is anchored at the merge-base on main,
not at the parent PR's tip. Until the parent PR squash-merges and the
stacked PR rebases, the diff display will include the parent's
content.

**Default: don't mention stacking in the PR description.** It adds
noise for reviewers who don't need to know about the branch topology.
The description should describe what *this PR contributes* on top of
its base — the diff-display weirdness is a workflow concern, not a
review-content concern.

**Exception:** if the PR is open for review *before* the parent lands
and the diff display will materially confuse reviewers, add a brief
stacking note in the *How to read* section. Remove the note before
final merge.

### Carry-forward discipline

When you draft a description for one PR and a related PR (stacked,
sibling, follow-up) exists, propagate the structure + label set to
the related PR. Reviewers benefit from consistent shape across a PR
family. Specific items to carry forward:

- The five-label set + 2D grid (don't re-derive).
- The seven-section structure (don't reorder).
- Discoveries that apply to both PRs (a link-discipline rule learned
  on PR A applies to PR B).

If you propose a structural change on one PR (e.g., dropping a section,
narrowing a callout scope), check whether the same change applies to
the sibling.

**When the sibling has already shipped (merged or closed).** Don't
retroactively edit a closed PR's description to backfill a new
discipline that landed after it shipped. Instead, log the gap as a
Reviewer callout in the *current* PR (`[Deferred] <discipline> not
applied to #<n>; backfill if reviewing that PR's history`) and let
the new discipline land on the next SPF PR description. Retroactive
edits churn merged context for marginal value; the canonical
worked-example library lives in *open* PR descriptions.

## Workflow

1. **Gather context.**
   - `gh pr view <num>` for current title, body, base/head branches.
   - `gh pr view <num> --json files | …` for the file list with line
     counts (sort by `additions + deletions` descending).
   - `git log <base>..<head>` for the commit history — commit messages
     often carry the design rationale you'll cite in *Notable design
     decisions*.
   - `gh pr view <num> --json reviews,comments` + the inline-comments
     endpoint for Cursor Bugbot findings.
   - The current description (if any) — read it before drafting; some
     content may be reusable.

2. **Route files to buckets.** Walk the file list and assign each file
   (or file group) to Bucket 1 / 2 / 3 by risk concentration (see
   *Bucket calibration*). Group mechanical files into single bullets
   (e.g., "Player cascade (core / html / react / sandbox) + sandbox
   preset wiring").

3. **Assign labels.** For each Bucket 1 file, apply the five-label
   set. For Bucket 2, default to `[Skim file]` for the precedent-setting
   doc and `[Skim structure only]` or `[Skim or skip]` for the rest.
   For Bucket 3, every file is `[Skim or skip]`.

4. **Write *Look for:* prose.** For each labeled file, name the
   specific things the reviewer should check. See *"Look for:" prose*
   above for what makes good prose.

5. **Propose the smoke test (or confirm none applies).** Scan the
   diff for smoke-test signals (see *Smoke-test discipline*). If
   any are present, draft a `<template>` + source-URL + observables
   proposal and ask the user to confirm. If none are present — or
   if the PR is internal-only — confirm with the user whether to
   omit the section or include the explicit no-smoke-test note.

6. **Draft the body.** Write to `/tmp/pr-<num>-body.md`. Preserve any
   `<!-- CURSOR_SUMMARY -->` block from the current description intact
   at the bottom.

7. **Propose to the user.** Always check in before pushing. Show the
   structure and key choices; ask whether to push as-is or revise.
   Specific things worth flagging:
   - Trim level (aggressive vs. preserve-detail).
   - Bugbot finding framing (callout / address / dismiss).
   - Authorship note (omit by default).
   - Scope justification (in TL;DR or omit).
   - Sandbox-only scope on Reviewer callouts (when applicable).
   - Smoke-test inclusion + observables (re-confirm if values
     changed since the proposal in step 5).

8. **Push via `gh pr edit <num> --body-file /tmp/pr-<num>-body.md`.**
   Verify the live state matches the file with a quick
   `gh pr view <num> --json body --jq .body | diff -`.

9. **If a sibling PR exists, offer to carry forward.** See *Carry-
   forward discipline*.

## Audit pattern

When revising an existing description, walk this checklist:

- [ ] **TL;DR carries the "why this scope" rationale** if reviewers
      might push back on scope.
- [ ] **How-to-read uses the five-label set** with no medium-tier
      labels (`[Spot-check]`, `[Trust + verify…]`) lingering.
- [ ] **Files grouped by depth label**, not by original ordering.
- [ ] **No bucket framing sentences** below headings. Deferrability
      rationale folded into heading itself (e.g., "no runtime impact").
- [ ] **No *Look for:* label** on entries; em-dash introduces
      verification content.
- [ ] **Single-file depth groups inline**; multi-file groups in block.
- [ ] **How-to-read section fits in ~25 lines** for a typical PR
      (Bucket 1 in one viewport).
- [ ] **Smoke test section present** with path-only URL + 2–5 observable
      checks, OR the explicit no-smoke-test note, OR justifiably absent
      (purely internal change with no runtime surface). User confirmed
      the URL + observables before push.
- [ ] **Every entry has verification content** with contrast pairs or
      glosses for technical terms.
- [ ] **Notable design decisions follow choice/alternative/why** for
      every bullet.
- [ ] **Reviewer callouts have scope-narrowing** when the limitation
      doesn't apply PR-wide.
- [ ] **No relative file-path links** anywhere in the body.
- [ ] **No stacking note** (unless the parent PR hasn't landed and
      the stacking materially confuses the diff display).
- [ ] **Cursor summary block preserved** if present in the original.

## Common pitfalls

- **Treating the description as a changelog.** File-by-file
  enumeration is what *Files changed* is for. The description should
  tell a reviewer *how to read* and *what's at stake*.
- **Stacking medium-tier labels.** `[Spot-check]` and friends
  proliferate when you try to express *mode of attention* (precedent-
  check vs. risk-hunt vs. consistency-check) through the label. The
  label carries scope × intensity only; the prose carries mode.
- **Adding file-path links because they look professional.** They
  almost always break. Either commit to working absolute URLs and
  verify them with `curl`, or use plain code spans. Don't ship
  relative paths.
- **Burying Bugbot findings in the body.** A finding the PR isn't
  addressing belongs in *Reviewer callouts* with explicit disposition.
- **Skipping the user check-in.** Always propose before pushing. PR
  descriptions are author-facing artifacts; the author has context
  the skill doesn't.
- **Over-compressing past reader knowledge.** Terse-but-obscure is
  worse than wordy-but-clear. "No video-ABR bias in the variant-
  agnostic body" fails because *variant-agnostic body* and *video-
  ABR* are both jargon with no anchor for someone who isn't deep in
  SPF. Pair every technical term with a contrast or gloss; the
  reviewer should be able to act on each *Look for:* item without
  spelunking the code first.
- **Claiming risk in bucket framings.** "Where regression bugs live"
  overclaims (implies bugs exist) and isn't categorically true
  (additive opt-in changes have minimal regression surface). Name
  what's in the bucket and characterize *code shape*; let the per-
  file labels carry per-file risk.
- **Fabricating a smoke test when none applies.** Internal refactors,
  docs-only PRs, skill-only PRs have no observable runtime surface.
  Don't manufacture observables to pad the section. Either omit it or
  write the explicit no-smoke-test note (see section 3 shape).
- **Burying the smoke test in Test plan.** The author-facing checklist
  (section 8) is for "what I ran"; the reviewer-actionable URL +
  observables belongs in section 3 where reviewers can find it without
  reading to the bottom. If both feel like they're saying the same
  thing, the *Test plan* item is over-detailed — trim it to the
  command + result.
- **Hard-coding a deploy-preview hostname.** Vercel / Netlify /
  similar conventions vary per project, per PR, per fork. The smoke-
  test URL is path-only; reviewers append it to whichever host they
  use. Hosts in the description rot when redeploys happen.
- **Skipping the user confirmation on smoke-test values.** The skill
  can't reliably guess the source URL or the observables. Always
  propose + confirm before writing the section.
