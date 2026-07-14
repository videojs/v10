---
status: implemented
date: 2026-05-20
definition: sketched
---

# MSE/MMS pipeline

This feature owns the MediaSource lifecycle boundary: attaching a source, constructing per-type buffers, reflecting duration, and ending the stream. Segment policy is intentionally separate.

## Implemented decisions

- Support standard `MediaSource` and Safari `ManagedMediaSource` behind the same setup behavior.
- Serialize operations through one SourceBuffer actor per media type.
- Add video before audio and create both buffers in the same pending turn when required by Firefox audio detection behavior.
- Treat duration writes as idempotent and coordinate `endOfStream()` only after active buffers reach their appended tails.
- Keep MediaSource setup and teardown tied to resolved-presentation lifecycle so source replacement cleans up the entire browser pipeline.

## Deferred scope

Audio switching flushes, cross-codec `changeType()`, live seekable-range management, a dedicated MediaSource actor, and consumer control over managed-source preference are separate features.

## Current sources of truth

- MediaSource setup, duration, EOS behavior, and tests: `packages/spf/src/playback/behaviors/dom/`
- SourceBuffer actor and tests: `packages/spf/src/playback/actors/dom/source-buffer.ts` and `packages/spf/src/playback/actors/dom/tests/source-buffer.test.ts`
- HLS engine composition: `packages/spf/src/playback/engines/hls/`
