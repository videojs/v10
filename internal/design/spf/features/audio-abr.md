---
status: draft
date: 2026-05-20
definition: technical
---

# Audio ABR

Adapt bitrate within the selected audio language or rendition group without changing the user's language intent.

## Proposed direction

- Treat language selection as intent and bitrate selection as resolution within that intent.
- Reuse shared bandwidth estimates and the existing audio-track switch path.
- Prefer seamless switches; flush only when the chosen rendition requires it.
- Keep audio and video budgets coordinated when both are present.

## Before implementation

Specify grouping, startup selection, hysteresis, and audio/video budget allocation. Test audio-only playback, multiplexed playback, constrained bandwidth, and codec changes.

## Related

[Multi-language audio](./multi-language-audio.md), [multi-signal ABR](./multi-signal-abr.md), and [rendition selection caps](./rendition-selection-caps.md).
