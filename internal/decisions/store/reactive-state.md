---
status: decided
date: 2026-07-13
---

# Use explicit store state and computed values

## Decision

`@videojs/store` uses explicit state updates and computed values rather than proxy mutation, a public request queue, or implicit task orchestration.

## Context

An early proxy-based implementation reduced update ceremony but obscured mutation boundaries and complicated snapshots. Earlier queue and task APIs also modeled work the media target already owns. The replacement shipped through [#311](https://github.com/videojs/v10/pull/311) and [#321](https://github.com/videojs/v10/pull/321), followed by removal of the queue surface.

## Alternatives considered

- **Proxy mutation** — concise writes, but less explicit state transitions and more runtime machinery.
- **Public queue/task API** — useful for general orchestration, but duplicated target behavior and expanded the store's responsibility.

## Rationale

Explicit updates make ownership and tests easier to follow. Frozen snapshots prevent accidental mutation, key-aware subscriptions avoid unrelated work, and derived formulas are evaluated eagerly so source and computed values publish as one atomic snapshot. Internal source changes that produce a shallowly equal public snapshot preserve its identity and do not notify subscribers. Target-specific async behavior stays in slices or the target rather than a generic store queue.

The current API and examples live in `packages/store/src/`, its tests, and `packages/store/README.md`.
