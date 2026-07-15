---
status: draft
date: 2026-05-20
definition: coarse
---

# Edit-list compensation

Interpret MP4 edit lists when container media time does not directly map to player presentation time.

## Proposed direction

- Parse the relevant elst data from initialization segments.
- Convert it into the same explicit timeline mapping used by other timestamp offsets.
- Keep parsing independent from seek and append policy.
- Reject unsupported edit patterns with a clear diagnostic.

## Before implementation

Choose the supported edit-list patterns and signed-time representation. Test empty edits, media-time offsets, audio/video alignment, seeks, and discontinuities.

## Related

[Non-zero PTS support](./non-zero-pts-support.md) and [presentation modeling](../presentation-modeling.md).
