---
status: draft
date: 2026-05-20
definition: technical
---

# Multi-signal ABR

Extend adaptive selection beyond bandwidth with stable device, viewport, visibility, and application policy signals.

## Proposed direction

- Keep candidate constraints separate from ranking.
- Normalize signals into explicit policy inputs rather than embedding DOM reads in ABR.
- Use hysteresis and minimum dwell times to avoid oscillation.
- Preserve deterministic selection when optional signals are absent.

## Before implementation

Choose the first additional signal based on a concrete product need. Define precedence, sampling, privacy boundaries, and test fixtures before expanding the algorithm.

## Related

[Rendition selection caps](./rendition-selection-caps.md), [audio ABR](./audio-abr.md), and [capability probing](./capability-probing.md).
