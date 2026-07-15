---
status: implemented
date: 2026-05-20
definition: sketched
---

# Source replacement

An attached engine can resolve and play another source without being recreated.

## Implemented decisions

- Replacing the unresolved presentation drives the existing resolution machine through a new source lifecycle.
- Every behavior gated by a resolved presentation must fully release its per-source state on state exit. This cleanup contract is load-bearing.
- Abort asynchronous source work and destroy per-source actors before the next source becomes active.
- Reset source-specific slots while retaining intentionally engine-wide knowledge such as the bandwidth estimate.
- Verify replacement through composition tests, not only isolated behavior tests, because failures usually appear across ownership boundaries.

## Deferred scope

Cross-codec transitions, surfaced source-resolution errors, optional estimator reset, and concurrent prefetch are independent features.

## Current sources of truth

- Presentation resolution and tests: `packages/spf/src/playback/behaviors/resolve-presentation.ts` and its colocated tests
- Lifecycle cleanup across behaviors: `packages/spf/src/playback/behaviors/`
- End-to-end engine composition tests: `packages/spf/src/playback/engines/hls/tests/`
