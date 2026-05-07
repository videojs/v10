---
status: in-progress
branch: fix/spf-behaviors-and-media-cleanup
parent: refactor/spf-discrete-signals-and-behavior-objects
---

# SPF: behaviors + media/network cleanup

Iterative cleanup pass on `packages/spf/src/playback/behaviors/`, `packages/spf/src/media/`, and `packages/spf/src/network/`, now that the discrete-signals + behavior-as-object architecture has stabilized.

Driven by codebase evaluations rather than a pre-planned target list — findings accumulate here as they're identified.

## Branch context

- Branched off `refactor/spf-discrete-signals-and-behavior-objects` (not yet merged to `main`).
- The parent will **squash-merge**. Once it lands, rebase this branch onto `main` directly (do **not** merge the squashed commit back in — that produces duplicate-ish history).

## Scope

In bounds:

- `packages/spf/src/playback/behaviors/**`
- `packages/spf/src/media/**`
- `packages/spf/src/network/**`

Adjacent code is fair game when a cleanup pulls on it (e.g. an engine consumer of a behavior, a shared util), but we shouldn't expand into unrelated SPF areas without a separate branch.

Out of bounds (own branches if they come up):

- Stage-D-style architecture changes — that effort is closed.
- Doc refreshes for `hls-engine.md` / `fundamentals.md` — those have their own follow-up.
- Stale items called out in `discrete-signals-and-behavior-objects.md` `### Resuming` (writer-audit lint rule, `selectedVideoTrackId` decomposition, code-reuse follow-up across `select-tracks`/`resolve-track`/`load-segments`) — surface them if they overlap, otherwise leave for their own branches.

## Findings

_(populated as evaluations land)_

## Decisions

### `setupTrackResolution` reshaped to behavior-setup signature

**Commit**: `54707e59`
**File**: `packages/spf/src/playback/behaviors/resolve-track.ts`

Changed from positional `(state, selectedKey, findTrackToResolve)` to single deps-object `({ state, config })` matching `Behavior.setup`. Per-type config flows through `config`; per-type exports (`resolveVideoTrack` / `resolveAudioTrack` / `resolveTextTrack`) adapt the call inline.

**Axes**: C ↑ (Patternability) — helper signature now matches setup signature; readers don't context-switch on shape. E ≈ (Size) — call sites grow ~3 lines each. D ≈ (Simplicity) — net wash.

**Convention invoked**: [`conventions/behaviors.md`](../../../internal/design/spf/conventions/behaviors.md) "Helpers and behavior factories." Surfaced a third option not previously named in the doc — **setup-shape helper** — distinct from both inline helpers (no signal access) and behavior factories (wrap `defineBehavior`). Conventions doc updated in the same follow-up commit to add the category, the decision-table row, and a `setup*` naming convention.

**Considered and ruled out**: behavior factory (B). The factory would have hidden `defineBehavior` inside `makeResolveTrack(opts)`, giving lighter call sites. Rejected because the setup-shape helper is reproducible across many shared helpers as a uniform shape rule, while the factory pattern is more bespoke; the user explicitly preferred the lighter touch and reproducibility for **C** + **E** even at a small **E** cost at call sites.

**Follow-ups in same area** (deferred):
- AbortController vs. manual cleanup composition (assessment flagged convention violation across multiple behaviors).
- Two inline TODOs in body about `createTaskRunner` / `createResolveTrackTask` — no-good-fit-yet sniffs, held visibly.
- The `findTrack` helper's `switchingSets[0]` access — part of the cross-cutting "single switching-set" assumption cluster.
