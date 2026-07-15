---
status: draft
date: 2026-05-20
definition: technical
---

# DVR and event-stream support

Support growing HLS event playlists with a seekable back window and a clean transition to a completed presentation.

## Proposed direction

- Build on the live playlist reload lifecycle.
- Derive seekable range from retained segments rather than wall-clock duration.
- Preserve playback position as the window grows or slides.
- Transition to VOD-style completion when the playlist ends.

## Before implementation

Define window eviction, duration reporting, live-edge behavior, and event-to-VOD transition semantics. Test back-seeks across reloads, discontinuities, and playlist completion.

## Related

[Live stream support](./live-stream-support.md) and [LL-HLS support](./ll-hls-support.md).
