---
status: implemented
date: 2026-05-20
---

# Presentation modeling

SPF uses a protocol-neutral presentation model between manifest parsing and playback behaviors. Current type fields, parser outputs, and update helpers belong to source.

## Decisions

- Model presentations as typed selection sets, switching sets, tracks, initialization data, and timed segments rather than exposing HLS playlist objects to the engine.
- Base the vocabulary on CMAF-HAM so format-specific parsers map into one playback-facing model.
- Represent the in-state presentation as progressively resolved: an adapter seeds a URL, the presentation parser adds track metadata, per-track resolution adds segments, and duration resolution enriches the result.
- Keep user selection separate from resolution. A selected track may still require asynchronous media-playlist resolution.
- Let behaviors patch only the fields they own. Source replacement returns the presentation to an unresolved state and triggers cleanup for all resolved-presentation consumers.
- Inject presentation parsing and duration policy through engine configuration. Keep format-specific resolution replaceable when a second format demonstrates the required boundary.

## Consequences

Buffering, selection, MSE, and adapter behavior consume one media model independent of manifest syntax. The progressive state shape requires guarded updates and source-identity cleanup so stale asynchronous work cannot enrich a newer presentation.

## Deferred boundaries

Multi-period presentations, richer error state, and non-HLS per-track resolution should be designed from an implementing format rather than speculative generic hooks.

## Current sources of truth

- Media types and guards: `packages/spf/src/media/types/`
- HLS parsers and tests: `packages/spf/src/media/hls/`
- Presentation and track resolution: `packages/spf/src/playback/behaviors/resolve-presentation.ts` and `resolve-track.ts`
- Duration resolution: `packages/spf/src/playback/behaviors/calculate-presentation-duration.ts`
- Source lifecycle: [Source replacement](features/source-replacement.md)
