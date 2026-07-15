---
status: draft
date: 2026-05-21
definition: coarse
---

# Video-only mode override

Deliver ordinary HLS video while omitting audio work, independently of whether the manifest advertises audio.

## Proposed direction

- Use a dedicated composition variant, mirroring the audio-only engine.
- Share video presentation, selection, loading, failover, duration, and end-of-stream primitives with the full HLS engine.
- Omit audio behaviors and state rather than selecting and discarding audio.
- Keep product-specific background-video defaults outside this generic variant.

## Before implementation

Confirm a consumer distinct from the existing background-video engine. Specify text-track support, native audio-detection behavior, adapter naming, and source-switch semantics. Test video-only and mixed manifests.

## Related

[Background video](./background-video.md) is implemented but intentionally narrower in product behavior.
