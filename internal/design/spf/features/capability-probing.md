---
status: partial
date: 2026-05-20
definition: sketched
---

# Capability probing

Determine whether the current browser can play a candidate track before selection or append.

## Implemented

Codec filtering is available through canPlayTrack and excludeUnplayableTracks. The current HLS composition uses those primitives before track resolution.

## Remaining scope

- Key-system compatibility for encrypted tracks.
- SourceBuffer.changeType() support and transition constraints.
- Optional segment-level probing where manifest codecs are insufficient.
- Actionable errors when every candidate is rejected.

## Current sources

- packages/spf/src/media/primitives/can-play-track.ts
- packages/spf/src/playback/behaviors/track-switching.ts
- colocated tests

Add new probes only when a consuming selection or append workflow has a concrete need.
