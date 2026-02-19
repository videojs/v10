# F5 - Forward Buffer Management

**Issue:** [#423](https://github.com/videojs/v10/issues/423)
**Branch:** `feat/spf-f5-423`
**Status:** COMPLETED
**Wave:** 3

## Goal

Maintain a forward buffer ahead of the playhead by calculating a buffer target (using P9 forward buffer calculator), monitoring the current buffer level, and triggering segment fetches to maintain it.

## Acceptance Criteria

- [x] Calculate buffer target using P8 (forward buffer calculator)
- [x] Monitor current buffer level
- [x] Trigger segment fetches to maintain buffer
- [x] Handle buffer underrun (implicit via demand-driven loop)
- [x] Integration tests
- [x] Unit tests with ≥80% coverage

## Dependencies

- **F4** (#422) ✅ — Segment fetch pipeline (load-segments.ts)
- **P8** (#398) — Forward buffer calculator
- **O1** (#388) — Reactive state container ✅

## Files

- `packages/spf/src/core/features/forward-buffer-management.ts` — primary implementation
- `packages/spf/src/dom/features/load-segments.ts` — segment loading (already has buffer state tracking)
- `packages/spf/src/dom/playback-engine.ts` — integration point

## What's Already Done (on this branch)

### Buffer State Tracking (94c1f285, 8f7f5218, 0e3e42ad)
`loadSegments` now tracks per-type buffer state in `state.bufferState`:
```ts
bufferState?: {
  video?: { initTrackId?: string; segments?: string[] };
  audio?: { initTrackId?: string; segments?: string[] };
}
```
This gives F5 visibility into what's already buffered.

### Bandwidth Tracking (b5419236)
F8 — `loadSegments` records per-segment timing into `bandwidthState` for the bandwidth estimator. Provides input for ABR decisions that F5 needs when deciding whether to fetch more segments.

### Task Pattern Refactor (316ec980 and earlier)
All async orchestrations now use a consistent module-level task pattern with proper abort support. F5 will follow the same pattern.

## Implementation Plan

### Phase 1: Buffer Level Monitoring
- Read `SourceBuffer.buffered` ranges relative to `currentTime`
- Calculate `forwardBufferLength = bufferedEnd - currentTime`
- Expose as observable state (subscribe to time updates via media element)

### Phase 2: Buffer Target Calculation
- Wire in P9 forward buffer calculator
- Default target: 30s (or configurable)
- Adjust based on bandwidth estimate from F8

### Phase 3: Trigger Segment Fetches
- Compare `forwardBufferLength` vs target
- If below target: request next unfetched segments from `loadSegments`
- `loadSegments` currently loads all segments upfront — needs to become demand-driven

### Phase 4: Buffer Underrun Handling
- Detect when buffer empties (`waiting` event on media element)
- Emit `bufferunderrun` event via O7 event bus
- Pause/resume segment fetching as appropriate

## Key Decisions

- **Buffer state shape** — Stored on `state.bufferState` (keyed by track type: `video`/`audio`). Added in F4 follow-up rather than F5 to avoid circular dependency.
- **Demand-driven loading** — `loadSegments` currently loads all segments eagerly. F5 needs to make it demand-driven (load N segments, check buffer, load more). This is the core change.
- **Audio manifest fix** — Test manifest for audio buffer state required `AUDIO="audio"` + `mp4a.40.2` codec on `#EXT-X-STREAM-INF`. `setupSourceBufferTask` bails if `codecs.length === 0`.

## Notes

- `shouldLoadSegments` currently skips if `SourceBuffer.buffered.length > 0` — this needs to change to "skip if buffer is full enough"
- Watch for the wait-a-frame pattern (see wave 2 lessons) when patching state after async ops
