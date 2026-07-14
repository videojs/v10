---
status: implemented
date: 2026-05-20
definition: sketched
---

# Video ABR

Video ABR chooses a rendition from measured segment throughput while allowing explicit selection intent to constrain the candidates.

## Implemented decisions

- Sample bandwidth in the loading path and keep estimation separate from quality selection.
- Use fast and slow exponentially weighted estimates and consume the conservative result so downgrades react faster than upgrades.
- Apply a safety margin and asymmetric upgrade threshold to reduce oscillation.
- Represent manual selection as a constraint on the candidate set, not a separate `abrDisabled` mode. Clearing the constraint restores automatic selection.
- Reuse the shared track-selection chain so user authority and automatic ranking remain visible and composable.

## Deferred scope

Audio ABR, rendition/viewport caps, buffer-aware or multi-signal algorithms, and a pluggable public strategy are separate features.

## Current sources of truth

- Quality selection and tests: `packages/spf/src/media/abr/`
- Track selection behavior and tests: `packages/spf/src/playback/behaviors/track-switching.ts` and its colocated tests
- Bandwidth sampling and HLS composition: `packages/spf/src/playback/engines/hls/` and segment-loading actors
