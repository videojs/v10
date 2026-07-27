---
status: draft
date: 2026-05-20
definition: technical
---

# Live stream support

The engine's foundation for playing **live** HLS sources: periodic
media-playlist refetch, sliding-window segment tracking, target-duration
pacing, `Infinity` duration semantics, and termination detection
(transitioning out of live mode when the stream ends). Distinct from
sibling capabilities for low-latency live (LL-HLS) and DVR / event
streams — those are extensions on top of this foundation, tracked as
separate candidate features.

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
- **Foundational** for the manifest-reload-loop cluster —
  [ll-hls-support](./ll-hls-support.md) and
  [dvr-event-stream-support](./dvr-event-stream-support.md) build on
  this feature.

## Phases of complexity

Capability slices for the foundational live-stream-support feature.
Each phase below is part of "live works (and terminates) at all";
richer live variants (LL-HLS, DVR) sit in sibling features.

| Phase | What | Notes |
|---|---|---|
| Manifest reload loop | Periodic media-playlist refetch keyed off `#EXT-X-TARGETDURATION` pacing per HLS spec. Each selected track's media playlist reloads independently as long as the source is live | The core primitive; cluster A foundation |
| Sliding-window segment tracking | Engine handles segments dropping off the start of the playlist as the window slides forward. Already-buffered segments past the window are still playable; un-fetched segments past the window are no longer fetchable | Affects the segment-loader's planning + back-buffer policy |
| Live duration semantics | `presentation.duration = Infinity` flows through `config.resolveDuration` (already pluggable). Downstream `updateMediaSourceDuration` propagates to `mediaSource.duration = Infinity` per MSE spec for live | The pluggable `resolveDuration` hook from `mse-mms-pipeline` is the surface; no new state slot needed |
| Live edge tracking | Engine tracks the latest segment available in the current playlist snapshot. Distinct from `currentTime` (the playhead); the gap between them is the buffer + the user's distance from live edge. DOM exposure via `mediaSource.setLiveSeekableRange(start, end)` so the browser's `HTMLMediaElement.seekable` reflects the live window (without it, `seekable` is empty under `duration === Infinity`) | Likely a derived signal (computed) rather than a new state slot |
| Reload jitter / backoff | Pacing variations under server delays or slow networks. Naive: poll on target-duration; full: jitter to avoid thundering herd, backoff on consecutive identical-playlist responses | Naive depth matches what hls.js does; full depth adds vendor-specific tuning |
| Per-type reload coordination | Audio / video / text media playlists each reload independently. Today the per-type `resolveXTrack` family is one-shot; live requires extending or replacing it with a reloading variant | Open question: extend in place, add a sibling `reloadXTrack` behavior, or compose differently |
| Termination detection (manifest signal) | Recognize when the reload loop should stop. **Naive**: `#EXT-X-ENDLIST` recognition only (assumes spec-compliant servers). Today's parser matches the literal `#EXT-X-ENDLIST` line but doesn't surface the value to the track output — the parser-side fix is part of this phase. **Full**: ENDLIST + unchanged-playlist miss-counter as a fallback for servers that stop updating without emitting `ENDLIST` | Naive vs Full depth per [clusters.md § Feature classification axes](./clusters.md#naive-vs-full-implementation-depth) |
| Terminated state transition | Engine flips out of live mode for the affected track. Reload loop stops scheduling that track's playlist. The track's segment list stops mutating, which makes the existing `endOfStream` gate naturally reachable (last segment now exists permanently). Per-type independence: audio / video can terminate at different times | The state transition is the only new orchestration; `endOfStream` doesn't need new code, just the playlist to stabilize. `clearLiveSeekableRange()` pairs with the transition so the browser's `seekable` returns to buffer-derived semantics |

## What's in scope vs out of scope

**In scope:**
- All phases above for HLS live VOD content with `#EXT-X-TARGETDURATION` pacing
- Standard sliding-window behavior (segments roll off the start)
- `Infinity` duration semantics through MSE
- Naive reload pacing (target-duration interval; no jitter)
- `#EXT-X-ENDLIST` recognition + unchanged-playlist miss-counter fallback for termination detection

**Out of scope (separate Media-src candidate features):**
- **[ll-hls-support](./ll-hls-support.md)** — blocking reload, partial
  segments, delta playlists, preload hints. Largest single live-related
  gap per the permutation matrix; builds directly on this feature's
  reload loop.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)** —
  DVR / event streams: growing playlist (non-sliding); user can seek
  backwards through history. Extension of this feature with different
  windowing semantics.

**Out of scope (related but separate concerns):**
- **[non-zero-pts-support](./non-zero-pts-support.md)** — live streams' PTS advances continuously
  from stream start, typically far from zero. Live needs this for
  correct `currentTime` / `seekable` semantics, but the time-mapping
  primitive itself is a separate cluster B feature.
- **`[buffer-stall-recovery]`** — affects live more than VoD due to
  ingest variability, but is a separate borderline feature.
- **`[viewer-rate-limiting-audit]`** — reload-loop pacing must respect
  server-side rate limiting; the audit itself is a separate borderline
  feature.

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
- **End-of-stream handling** — `endOfStream` today gates on
  `isLastSegmentAppended` + `currentTime >= lastSegStart`, *not* on
  `presentation.duration` finiteness. For live, the gate naturally
  doesn't fire because the playlist keeps growing — no segment is
  permanently "the last." Once termination commits via this feature's
  termination-detection phases, the last segment stabilizes and the
  gate becomes reachable for normal reasons. **Subtlety:** there's a
  possible race if reload pacing lags playhead consumption — the
  current last segment could meet the gate before the next reload
  appends a new one, firing `endOfStream` spuriously. Whether this
  happens in practice depends on reload pacing relative to
  forward-buffer depth.
- **Parser-side ENDLIST surfacing** — `parseMediaPlaylist` currently
  recognizes `#EXT-X-ENDLIST` (skips the line) but doesn't extract the
  value. The `MediaPlaylistInfo.endList: boolean` type field exists
  but is orphaned (the parser returns a `Track`, not
  `MediaPlaylistInfo`). The termination-detection phases need the
  parser to surface the value to the track output.
- **`mediaSource.*` third-writer pattern — `setLiveSeekableRange`** —
  `mediaSource.duration` already has two non-overlapping writers
  (`updateMediaSourceDuration` for the initial `Infinity` write;
  `endOfStream` for the deterministic final value — see
  [mse-mms-pipeline.md](./mse-mms-pipeline.md) on DOM-property
  multi-writer). Live introduces a structurally *different* third
  writer on the same `mediaSource` resource: ongoing reactive
  `setLiveSeekableRange(start, end)` calls keyed off live-edge updates,
  plus `clearLiveSeekableRange()` paired with the terminated-state
  transition. Distinct from the existing two writers along all three
  characterization axes — decision domain (derived from playlist
  snapshot vs. presentation / buffered), trigger (ongoing reactive vs.
  one-shot transitions), and method (range setter rather than
  `.duration` assignment). `start` = earliest still-fetchable segment
  (sliding-window-aware); `end` = live edge. **Lives as a new live-only
  behavior composed into the live engine variant**, not as a runtime
  branch inside an existing MSE behavior — live vs VoD is a
  composition-time distinction, and `updateMediaSourceDuration` is
  deliberately uniform-across-variants (see
  [conventions/behaviors.md](../conventions/behaviors.md) → *Inverse:
  behaviors that operate uniformly across tracks* and the
  `updateMediaSourceDuration` worked example). Two SPF-shaped options
  for placement within the live variant: (a) baked into the
  (yet-to-exist) live track-polling / reload-loop behavior that
  produces edge data, or (b) a separate behavior reading presentation /
  segment state and writing to DOM. Current lean: (b) — single-purpose
  composition keeps other consumers of the same derived live-edge
  signal (above-engine "seek to live edge," ABR live-edge-distance if
  ever introduced) pluggable on the same data without coupling to the
  polling behavior. Gates on MediaSource `'open'`; buffers-idle gating
  is an implementation detail for the behavior itself.

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
- **Miss-counter threshold.** Heuristic feature — how many identical-
  manifest reloads constitute termination? hls.js uses some count;
  SPF needs its own choice. Threshold affects false-positive vs
  false-negative rate.
- **Per-type termination semantics.** When audio terminates before
  video, what's the engine's consumer-facing surface? "Live until all
  tracks terminate" or "terminated when any track terminates"? Likely
  the former, but worth confirming the precedent. Aligns with the
  per-type reload-coordination question above.
- **`endOfStream` race under live reload pacing.** Could the gate fire
  spuriously between reloads on a heavily-buffered live source?
  Likely not in practice (reload pace beats consumption pace) but
  worth verifying.
- **`setLiveSeekableRange` behavior shape within the live variant.**
  Two SPF-shaped options — (a) call from inside the live track-polling
  / reload-loop behavior that produces edge data, or (b) a separate
  behavior reacting to presentation / track state changes. Lean: (b),
  for single-purpose composition and so other consumers of the same
  derived live-edge signal can plug in alongside without coupling to
  the polling behavior. Revisit once the polling behavior's shape
  lands.

## Related features

- **[ll-hls-support](./ll-hls-support.md)** — builds on this feature's
  reload loop. Adds blocking reload, partial segments, delta playlists,
  preload hints. Largest live-related gap.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)** —
  different windowing semantics on top of the same reload loop.
  Growing playlist + back-seek through history; resolves this doc's
  prior "DVR / event boundary" decomposition question (DVR is its
  own feature, not a phase here).
- **[non-zero-pts-support](./non-zero-pts-support.md)** — live PTS
  starts far from zero. Live without non-zero PTS handling means
  `currentTime` is wrong. Cluster B foundation that live consumes.
- **mse-mms-pipeline** — `Infinity` duration via `config.resolveDuration`
  is already supported there; live writes the value, MSE pipeline
  propagates it. The `endOfStream` gate uses segment + currentTime,
  not duration finiteness; it naturally doesn't fire for live (growing
  playlist) and becomes reachable once termination commits.
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
