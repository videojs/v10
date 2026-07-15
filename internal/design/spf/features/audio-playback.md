---
status: implemented
date: 2026-05-20
definition: sketched
---

# Audio playback

Single-rendition audio playback is the audio-specific layer of the HLS engine. Shared MediaSource, buffering, preload, and replacement behavior is recorded by their owning features and implemented in source.

## Implemented decision

The engine parses audio renditions, resolves one rendition when a source loads, creates the audio buffer path, and loads its segments. Audio is modeled symmetrically with video and text so per-track behavior can compose without a media-type-specific engine architecture.

Selection is intentionally stable for the current source. Mid-stream language or rendition switching belongs to [multi-language audio](multi-language-audio.md), and bandwidth-driven selection belongs to [audio ABR](audio-abr.md).

## Boundaries

- Browser MediaSource owns audio/video synchronization.
- Buffer policy is owned by [buffer management](buffer-management.md).
- MediaSource lifecycle is owned by [the MSE/MMS pipeline](mse-mms-pipeline.md).
- Cleanup across a new source is owned by [source replacement](source-replacement.md).
- Surround and audio-only optimization are independent follow-ups.

## Current sources of truth

- HLS engine composition and adapter tests: `packages/spf/src/playback/engines/hls/`
- Buffer and segment actors: `packages/spf/src/playback/actors/dom/`
- Track resolution and selection: `packages/spf/src/playback/behaviors/`
