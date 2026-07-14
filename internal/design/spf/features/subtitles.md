---
status: implemented
date: 2026-05-20
definition: sketched
---

# Subtitles

The HLS engine exposes WebVTT subtitle renditions as DOM text tracks and loads cues for the resolved selection.

## Implemented decisions

- Parse and expose multiple subtitle renditions while keeping CDN scoping in the selection constraint chain.
- Keep user intent separate from the resolved track identifier. Defaults, user selection, and programmatic intent all flow through the same resolver.
- Treat DOM track-mode changes as input intent and mirror the resolved result one way back to the DOM with guards against echo loops.
- Load selected WebVTT segments through owned actors, deduplicate cues, honor preload gates, and tear everything down on source exit.
- Exclude forced-only tracks from ordinary automatic selection unless the composition explicitly opts in.

## Deferred scope

Cue styling policy, simultaneous showing tracks, cue eviction, surfaced fetch retries/errors, and embedded CEA captions need separate features.

## Current sources of truth

- Track actors and tests: `packages/spf/src/playback/actors/`
- DOM synchronization and loading behaviors: `packages/spf/src/playback/behaviors/dom/`
- Selection rules: `packages/spf/src/playback/behaviors/track-switching.ts`
- Architectural rationale: [Text track architecture](../text-track-architecture.md)
