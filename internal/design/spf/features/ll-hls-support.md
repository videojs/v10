---
status: draft
date: 2026-05-20
definition: technical
---

# LL-HLS support

Extend live HLS playback with partial segments, preload hints, server-control directives, and blocking reload.

## Proposed direction

- Build on the normal live reload and timeline model.
- Represent parts without creating a parallel track model.
- Treat preload hints as provisional work that can be cancelled or replaced.
- Respect server hold-back and blocking-reload policy.

## Before implementation

Define part identity, append ordering, rendition reports, skip support, fallback to regular HLS, and latency control. Verify missed parts, stale hints, discontinuities, and servers with partial LL-HLS support.

## Related

[Live stream support](./live-stream-support.md) and [DVR and event-stream support](./dvr-event-stream-support.md).
