---
status: draft
date: 2026-05-20
definition: coarse
---

# Buffer-stall recovery

Detect a non-ended playback stall and recover without confusing a network pause, an intentional wait, or the end of content for a decoder failure.

## Proposed direction

- Derive a stall from playhead, ready state, buffered ranges, and outstanding work.
- Escalate conservatively: retry or nudge, then flush and refetch, then reset the source.
- Bound retries and surface a terminal error.
- Keep detection separate from recovery policy.

## Before implementation

Define thresholds and ownership of recovery state. Add deterministic tests for network starvation, decode stalls, seeks, paused playback, and near-end playback.

## Related

[Network resilience](./network-resilience.md) and [pseudo-ended detection](./pseudo-ended-detection.md).
