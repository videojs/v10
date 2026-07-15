---
status: implemented
date: 2026-05-21
definition: implemented
---

# Audio-only mode override

Deliver audio without composing video or text-track responsibilities, for both audio-only sources and mixed HLS manifests.

## Decisions

- createHlsAudioOnlyEngine is a real composition variant, not a runtime flag on the full engine.
- It shares HLS presentation, selection, loading, failover, duration, and end-of-stream primitives with the full engine.
- Video and text behaviors are absent, so their state and work are not merely disabled.
- The DOM adapter exposes the same media-element contract used by other SPF engines.

## Current sources

- packages/spf/src/playback/engines/hls/engine-audio-only.ts
- packages/spf/src/playback/engines/hls/tests/engine-audio-only.test.ts
- the audio-only DOM adapter and its tests

Audio bitrate adaptation is separate future work in [audio ABR](../features/audio-abr.md).
