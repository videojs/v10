---
status: draft
date: 2026-05-20
definition: technical
---

# HEVC variant selection

Select HEVC variants only when the browser and active media pipeline can decode them, while retaining AVC fallback.

## Proposed direction

- Filter by codec capability before applying quality policy.
- Prefer HEVC only through explicit policy or a measured efficiency advantage.
- Reuse normal video-track switching when codec transitions are supported.
- Retain a playable AVC path for devices with incomplete HEVC support.

## Before implementation

Define codec-string normalization, platform exceptions, changeType requirements, and preference policy. Test HEVC-only, mixed HEVC/AVC, false-positive capability results, and midstream fallback.

## Related

[Capability probing](./capability-probing.md) and [rendition selection caps](./rendition-selection-caps.md).
