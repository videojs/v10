---
status: draft
date: 2026-05-20
definition: technical
---

# Rendition selection caps

Apply application and device constraints before adaptive ranking chooses a video rendition.

## Proposed direction

- Express caps as composable candidate constraints.
- Keep capability exclusions mandatory and policy caps configurable.
- Support viewport, resolution, bitrate, and customer limits without coupling to DOM reads.
- Define a fallback when constraints remove every candidate.

## Before implementation

Specify constraint precedence, update frequency, fallback semantics, and interaction with manual selection. Test conflicting caps, resize, device-pixel ratio, and an empty candidate set.

## Related

[Multi-signal ABR](./multi-signal-abr.md), [HEVC variant selection](./hevc-variant-selection.md), and [capability probing](./capability-probing.md).
