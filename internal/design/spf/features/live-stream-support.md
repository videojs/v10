---
status: draft
date: 2026-05-20
definition: technical
---

# Live stream support

The engine's foundation for playing **live** HLS sources: periodic
media-playlist refetch, sliding-window segment tracking, target-duration
pacing, and `Infinity` duration semantics. Distinct from sibling
capabilities for low-latency live (LL-HLS), DVR / event streams, and
live-termination detection — those are extensions on top of this
foundation, tracked as separate candidate features.

A **Media-src feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
without it, live HLS sources don't play correctly.

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. Today's
  engine assumes VOD: `resolvePresentation` fetches the manifest once;
  media playlists are fetched once per resolved track; no reload loop.
- **Definition depth:** technical — scope and constraints articulated;
  no implementation. Source material: [SPF Epics Working Doc — Live
  Stream Support (epic #2)](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  (cluster A foundation, eng size L, validation M).
- **Foundational** for the manifest-reload-loop cluster — `[ll-hls-support]`,
  `[dvr-event-stream-support]`, and `[live-stream-termination-detection]`
  all build on this feature.

## Phases of complexity

Capability slices for the foundational live-stream-support feature.
Each phase below is part of "live works at all"; richer live variants
(LL-HLS, DVR, termination detection) sit in sibling features.

| Phase | What | Notes |
|---|---|---|
| Manifest reload loop | Periodic media-playlist refetch keyed off `#EXT-X-TARGETDURATION` pacing per HLS spec. Each selected track's media playlist reloads independently as long as the source is live | The core primitive; cluster A foundation |
| Sliding-window segment tracking | Engine handles segments dropping off the start of the playlist as the window slides forward. Already-buffered segments past the window are still playable; un-fetched segments past the window are no longer fetchable | Affects the segment-loader's planning + back-buffer policy |
| Live duration semantics | `presentation.duration = Infinity` flows through `config.resolveDuration` (already pluggable). Downstream `updateMediaSourceDuration` propagates to `mediaSource.duration = Infinity` per MSE spec for live | The pluggable `resolveDuration` hook from `mse-mms-pipeline` is the surface; no new state slot needed |
| Live edge tracking | Engine tracks the latest segment available in the current playlist snapshot. Distinct from `currentTime` (the playhead); the gap between them is the buffer + the user's distance from live edge | Likely a derived signal (computed) rather than a new state slot |
| Reload jitter / backoff | Pacing variations under server delays or slow networks. Naive: poll on target-duration; full: jitter to avoid thundering herd, backoff on consecutive identical-playlist responses | Naive depth matches what hls.js does; full depth adds Mux-specific tuning |
| Per-type reload coordination | Audio / video / text media playlists each reload independently. Today the per-type `resolveXTrack` family is one-shot; live requires extending or replacing it with a reloading variant | Open question: extend in place, add a sibling `reloadXTrack` behavior, or compose differently |

## What's in scope vs out of scope

**In scope:**
- All phases above for HLS live VOD content with `#EXT-X-TARGETDURATION` pacing
- Standard sliding-window behavior (segments roll off the start)
- `Infinity` duration semantics through MSE
- Naive reload pacing (target-duration interval; no jitter)

**Out of scope (separate Media-src candidate features):**
- **`[ll-hls-support]`** — blocking reload, partial segments, delta
  playlists, preload hints. Largest single live-related gap per the
  permutation matrix; builds directly on this feature's reload loop.
- **`[dvr-event-stream-support]`** — DVR / event streams: growing
  playlist (non-sliding); user can seek backwards through history.
  Extension of this feature with different windowing semantics.
- **`[live-stream-termination-detection]`** — `#EXT-X-ENDLIST` + unchanged-
  playlist miss-counter fallback. Detects "live stream just ended" and
  transitions the engine out of live mode.

**Out of scope (related but separate concerns):**
- **`[non-zero-pts-support]`** — live streams' PTS advances continuously
  from stream start, typically far from zero. Live needs this for
  correct `currentTime` / `seekable` semantics, but the time-mapping
  primitive itself is a separate cluster B feature.
- **`[buffer-stall-recovery]`** — affects live more than VoD due to
  ingest variability, but is a separate borderline feature.
- **`[viewer-rate-limiting-audit]`** — reload-loop pacing must respect
  Mux VRLT; the audit itself is a separate borderline feature.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **`resolvePresentation` reload variant** — today's behavior is
  one-shot: parse manifest → write resolved presentation. Live requires
  re-fetching the *media playlists* (not the multivariant), so the
  reload loop sits below `resolvePresentation` rather than replacing
  it. Most likely a per-type `reloadXTrack` family alongside the
  existing `resolveXTrack` family, or an extension to the existing
  `resolve-track.ts` shape. Touches the `parseMediaPlaylist` direct
  import (see [presentation-modeling.md](../presentation-modeling.md))
  — same parser, but called repeatedly per track.
- **Segment-loader sliding-window awareness** — today's planner
  iterates over all segments in `track.segments`. Live needs the
  planner to handle the segment list mutating mid-flight (segments
  appended at the live edge, segments removed from the start). The
  existing back-buffer eviction policy may need extension to honor
  "no longer in the playlist" as an eviction signal independent of
  `keepSegments` count.
- **`bandwidthState` resume semantics** — already preserved across
  source resets (see [video-abr.md](./video-abr.md)). For live,
  bandwidth-aware ABR continues to function, but bandwidth measurement
  during live is more variable (network conditions matter more without
  the full-buffer-ahead cushion).
- **Time mapping for live edge** — `state.currentTime` is the playhead;
  the live edge is a derived value computed from the playlist's last
  segment. Tools like "seek to live edge" or "is at live edge" would
  consume this derived signal. Doesn't necessarily need its own state
  slot.
- **End-of-stream handling** — `endOfStream` today fires when last
  segments are appended + currentTime reaches. For live, `endOfStream`
  must *not* fire until `[live-stream-termination-detection]` flips
  the source from live to terminated. The current behavior gates on
  `presentation.duration` being finite (Infinity won't pass the EOS
  gate the way it's written today — needs review).

## Open questions

- **Per-type reload coordination.** Audio / video / text media
  playlists each have their own `EXT-X-TARGETDURATION`. Reload them
  independently per their own pacing, or coordinate (e.g., reload all
  on the shortest target duration)? The Epics doc doesn't take a
  position; HLS spec allows independent. Practical question: does the
  engine want symmetric coordination for stalls (one playlist behind →
  block segment-loader from advancing) or independent (each playlist
  paces itself)?
- **Reload behavior extension vs new behavior.** Extending the
  existing `resolveXTrack` family to keep reloading vs adding a
  sibling `reloadXTrack` family vs composing differently. Affects
  cleanup-cascade semantics — the existing family ties cancellation
  to source identity via reactor state-exit; a reload variant needs
  to honor the same contract.
- **Default `defaultResolveDuration` already handles VoD; does live
  need a different wired default in `createSimpleHlsEngine`, or do
  live consumers wire their own?** The `resolveDuration` hook is
  already pluggable; the only question is whether the default engine
  variant covers live or requires opt-in.
- **DVR / event boundary.** A DVR stream is structurally a growing
  playlist with no `#EXT-X-ENDLIST` (yet). The reload loop is the same
  shape as live; the difference is windowing semantics (no slide-off).
  Whether DVR is its own feature or a phase of `live-stream-support`
  is a sub-question of the cluster's epic-decomposition.

## Related features

- **`[ll-hls-support]`** *(candidate, not yet documented)* — builds
  on this feature's reload loop. Adds blocking reload, partial
  segments, delta playlists, preload hints. Largest live-related gap.
- **`[dvr-event-stream-support]`** *(candidate)* — different
  windowing semantics on top of the same reload loop.
- **`[live-stream-termination-detection]`** *(candidate)* —
  `#EXT-X-ENDLIST` + miss-counter; detects live → terminated.
  Required to fire `endOfStream` correctly for sources that end mid-
  session.
- **`[non-zero-pts-support]`** *(candidate, cluster B)* — live PTS
  starts far from zero. Live without non-zero PTS handling means
  `currentTime` is wrong. Cluster B foundation that live consumes.
- **mse-mms-pipeline** — `Infinity` duration via `config.resolveDuration`
  is already supported there; live writes the value, MSE pipeline
  propagates it. `endOfStream` gate logic needs review for live
  (today gates on finite duration).
- **buffer-management** — sliding-window segment tracking interacts
  with back-buffer eviction. The planner's currentTime-driven plan
  shape applies; the playlist itself mutating mid-flight is new.
- **video-abr** / **audio-playback** / **subtitles** — all per-type
  consumers continue to work in live, but each reads the resolved
  track which now changes over time (segments append / roll off).
  Quality-aware buffer planning preserves buffered higher-quality
  content; for live this still applies but the windowing changes the
  buffered-set turnover rate.
- **source-replacement** — orthogonal; live and VoD source changes
  use the same in-place cascade. Live → live source change tears
  down and rebuilds the reload loop along with everything else.

## See also

- [clusters.md § Manifest reload loop](./clusters.md#manifest-reload-loop)
  — cluster A description; this feature is the foundation
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — the Media-src feature framing this doc instantiates
- [presentation-modeling.md](../presentation-modeling.md) —
  architectural deep-dive; the reload loop sits below
  `resolvePresentation` and re-uses `parseMediaPlaylist` per cycle.
  When `parseMediaPlaylist` pluggability arrives (see that doc's
  Open questions), live + format support intersect
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; cluster A epic candidates and decompositions
- [Mux Video Permutations Matrix](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — Stream Type section; SPF column shows ⚠️ for live + DVR (manifest
  re-polling unverified), 🔲 for LL-HLS
