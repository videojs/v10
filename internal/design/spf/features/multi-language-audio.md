---
status: implemented
date: 2026-05-25
definition: implemented
---

# Multi-language audio

SPF exposes HLS audio renditions with language metadata, chooses a default, and supports programmatic or user-driven switching during playback.

## Decisions

- Preserve audio rendition identity and language in the presentation model.
- Separate user intent from the resolved active track.
- Use switchAudioTrack for resolution and the shared segment-loader/source-buffer path for midstream changes.
- Flush audio at the next-segment boundary when the selected rendition changes.
- Keep persistence of a user's language preference outside the playback engine.

## Current sources

- packages/spf/src/playback/engines/hls/engine.ts
- packages/spf/src/playback/behaviors/track-switching.ts
- packages/spf/src/playback/behaviors/segment-loader.ts
- packages/spf/src/playback/actors/source-buffer.ts
- colocated tests

Codec-changing switches remain constrained by browser capability. Broader probing is tracked in [capability probing](./capability-probing.md).
