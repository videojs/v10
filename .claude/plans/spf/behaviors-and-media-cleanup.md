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

_(populated as cleanups are committed)_
