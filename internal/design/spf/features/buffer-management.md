---
status: implemented
date: 2026-05-20
definition: sketched
---

# Buffer management

Buffer management is the segment-level policy between loading gates and MediaSource operations.

## Implemented decisions

- Plan a bounded amount of media ahead of current time and evict old back-buffer data.
- Deduplicate work by media type, segment, and selected quality while still permitting gap repair and seek-back recovery.
- Continue useful in-flight work and preempt work that no longer serves the current plan.
- Stream media chunks to the buffer actor while treating initialization data atomically.
- Give each media type a shared loading gate derived from preload and source state.
- Keep planning policy separate from the SourceBuffer actor that serializes browser operations.

These choices make seeks, quality changes, and playback-rate changes inputs to the same planner rather than special loading pipelines.

## Deferred scope

Rate- or network-aware buffer targets, learned quota policy, loop anticipation, cross-codec `changeType()`, and a public buffer-health model require separate evidence and design.

## Current sources of truth

- Segment planner and loading behavior: `packages/spf/src/playback/behaviors/dom/load-segments.ts`
- Segment and SourceBuffer actors plus tests: `packages/spf/src/playback/actors/dom/`
- Loading gates: `packages/spf/src/playback/behaviors/sync-preload.ts` and `packages/spf/src/playback/behaviors/dom/track-load-triggers.ts`
