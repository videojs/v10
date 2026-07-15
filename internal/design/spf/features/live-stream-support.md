---
status: draft
date: 2026-05-20
definition: technical
---

# Live stream support

Maintain a playable HLS live presentation as media playlists reload and their windows advance.

## Proposed direction

- Model playlist reload as a source-scoped lifecycle.
- Merge segments by stable media identity and handle discontinuities explicitly.
- Derive seekable range and live edge from the current presentation.
- Keep reload scheduling separate from segment loading.

## Before implementation

Define target-duration scheduling, stale-response handling, window eviction, initial live position, and terminal errors. Verify sliding windows, discontinuities, transient reload failure, and source replacement.

## Related

[DVR and event-stream support](./dvr-event-stream-support.md), [LL-HLS support](./ll-hls-support.md), and [network resilience](./network-resilience.md).
