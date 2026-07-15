---
status: draft
date: 2026-05-20
definition: technical
---

# Non-zero PTS support

Map media timestamps that begin away from zero onto a stable player presentation timeline.

## Proposed direction

- Derive an explicit media-to-presentation offset from parsed timing evidence.
- Apply the mapping consistently to append windows, seeks, duration, and buffered ranges.
- Keep the original media timestamps available for diagnostics.
- Recompute only at defined discontinuity boundaries.

## Before implementation

Choose the authoritative timestamp evidence and discontinuity rules. Test positive and negative offsets, audio/video skew, seeks, source replacement, and malformed metadata.

## Related

[Edit-list compensation](./edit-list-compensation.md) and [presentation modeling](../presentation-modeling.md).
