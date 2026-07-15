---
status: draft
date: 2026-05-20
definition: coarse
---

# Container support

Support HLS media containers that cannot be appended directly to the selected browser pipeline.

## Proposed direction

- Keep container recognition separate from codec capability probing.
- Prefer native append when supported.
- Put required transmuxing behind a media transformation boundary before append.
- Preserve timestamps, captions, and metadata through transformation.

## Before implementation

Choose the first required container and measure bundle, worker, and memory costs. Verify discontinuities, encrypted content boundaries, captions, and mixed-container playlists.

## Related

[Capability probing](./capability-probing.md) and [non-zero PTS support](./non-zero-pts-support.md).
