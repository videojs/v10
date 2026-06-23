---
status: draft
date: 2026-06-23
definition: sketched
---

# Live stream support

The engine's foundation for playing **live** HLS sources: periodic
media-playlist refetch, sliding-window segment tracking, target-duration
pacing, `Infinity` duration semantics, live-edge seek, and termination
detection (transitioning out of live mode when the stream ends). Distinct from
sibling capabilities for low-latency live (LL-HLS) and DVR / event streams —
those are extensions on top of this foundation, tracked as separate features.

A **Media-src feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
without it, live HLS sources don't play correctly.

## Status

- **Composition:** implemented in `createSimpleHlsEngine` at naive depth on
  branch `feat/spf-hls-live`. The engine composes **uniformly** across VOD and
  live — there is no live-vs-VOD composition branch; live behaviors are inert
  for VOD via finite-duration guards (`Number.isFinite(track.duration)`). The
  reload loop, sliding-window tracking, `Infinity` duration semantics,
  live-edge seek + `setLiveSeekableRange`, and termination-on-`#EXT-X-ENDLIST`
  all land. The **live-window playhead guard** (reposition-on-window-exit) is
  now implemented in `seek-to-live-edge`. **Not yet implemented:** the edge-only
  `on-resume` reposition policy (a future use-case). Termination is
  `#EXT-X-ENDLIST`-based (the naive tier —
  sufficient for conformant content); the miss-counter fallback and reload
  jitter are deferred full-depth, and `clearLiveSeekableRange()` on termination
  is a low-risk verify-later item.
- **Definition depth:** sketched — grounded in the implementation on
  `feat/spf-hls-live`. Source material: [SPF Epics Working Doc — Live Stream
  Support (epic #2)](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  (cluster A foundation, eng size L, validation M).
- **Foundational** for the manifest-reload-loop cluster —
  [ll-hls-support](./ll-hls-support.md) and
  [dvr-event-stream-support](./dvr-event-stream-support.md) build on this
  feature.

## Phases of complexity

Capability slices for the foundational live-stream-support feature. Each phase
below is part of "live works (and terminates) at all"; richer live variants
(LL-HLS, DVR) sit in sibling features.

| Phase | Status | What / how |
|---|---|---|
| Manifest reload loop | ✅ Implemented | Periodic media-playlist refetch keyed off `#EXT-X-TARGETDURATION`. Each `resolveXTrack` owns a `RecurringRunner` (`resolve-track.ts`) rescheduled by `delayedReschedule(mediaPlaylistReloadDelay)` (wired in `engine.ts`). Cadence in `reload-policy.ts`: full target-duration on window change / first reload, half target-duration on unchanged window; start-anchored per RFC 8216bis §6.3.4; returns `null` (stops) once duration is finite |
| Sliding-window segment tracking | ✅ Implemented | `placeOnPreviousTimeline` (`parse-media-playlist.ts`) carries the new window onto the established timeline via media-sequence overlap (PDT bridge on full turnover). Segment-loader `planTasks` re-evaluates the mutating `track.segments` on each load dispatch; back-buffer keeps last 2 segments. No explicit "no-longer-in-playlist" eviction signal — the keep-count heuristic + list shrink handle roll-off |
| Live duration semantics | ✅ Implemented | Parser sets `Track.duration = Infinity` for unended live; `calculatePresentationDuration` (default resolver `getResolvedSelectedTrackDuration`) writes it; `updateMediaSourceDuration` propagates `mediaSource.duration = Infinity` once MS is open and buffers idle |
| Live edge tracking + `setLiveSeekableRange` | ✅ Implemented (option **b**) | The live window (or null for VOD/ended) is derived once by the pure `liveWindowFor` (`media/live-window.ts`), consumed by two separate behaviors: `sync-live-seekable-range.ts` declares `setLiveSeekableRange(start, end)` reactively on each window slide (runs while paused too), and `seek-to-live-edge.ts` does the one-time HOLD-BACK seek. Separate from the reload loop (option b). Inert for VOD via `liveWindowFor` returning null. **Gap:** no `clearLiveSeekableRange()` on termination |
| Live-window playhead guard | ✅ Implemented (`window-exit`) | While playing (`!paused && !seeking && readyState > 0`), reposition `currentTime` to `liveEdgeStart = max(windowStart, windowEnd − HOLD_BACK_TARGET_MULTIPLIER×targetDuration)` when the playhead falls **outside** the sliding window — covering *paused-too-long* (Scenario A; fires on the `playing` resume) and *fell-behind-on-poor-network* (Scenario B; fires on the reload / window-update re-fire of the effect, since `timeupdate` stops during a stall). Within-window pause and scrub-back are left untouched (DVR model). Lives in `seek-to-live-edge` so the live playhead position has a single owner (the one-time initial seek + the ongoing guard); secondary triggers are `playing` / `timeupdate` / `seeked` listeners. Reposition policy is a seam (`repositionPolicy`, default `'window-exit'`); the edge-only `'on-resume'` branch is not yet implemented. **Deferred:** playback-rate latency catch-up, MSE gap-jumping |
| Reload jitter / backoff | ✅ Naive only | Target-duration cadence with unchanged-window throttle (half target). No thundering-herd jitter, no backoff on repeated identical-playlist responses (full depth, not implemented) |
| Per-type reload coordination | ✅ Independent | Audio / video / text each own their `RecurringRunner` and reload on their own `#EXT-X-TARGETDURATION`. Resolved as **extended `resolveXTrack`** (same `setupTrackResolution` handles one-shot VOD and recurring live via the `RecurringRunner` abstraction) — no separate `reloadXTrack` family |
| Termination detection | ✅ Naive depth | `#EXT-X-ENDLIST` recognized and surfaced (`MediaPlaylistMetadata.endList`); parser flips `Track.duration` finite (on `ENDLIST` or `PLAYLIST-TYPE:VOD`), which stops the reload loop. ENDLIST-only is the sanctioned naive tier (per [clusters.md](./clusters.md#naive-vs-full-implementation-depth)) and sufficient for conformant content (Mux always emits `ENDLIST`); the miss-counter fallback for non-conformant servers is deferred full-depth |
| Terminated state transition | ✅ Implemented (one verify-later item) | Reload stops (policy returns `null`); the `endOfStream` gate unblocks once `Track.duration` is finite and the last segment is appended; per-type independent (waits for all active tracks). `clearLiveSeekableRange()` is **not** called on the transition — low-risk (a terminated window's stale live range ~matches its buffered/duration-derived seekable); verify on a real terminating stream |

## What's not implemented

**Within this feature:**

- **Edge-only `on-resume` reposition policy** — the `repositionPolicy` seam
  exists (default `'window-exit'`, implemented), but the `'on-resume'`
  (always-snap-to-edge / no-DVR) branch is inert. It lands as the
  `[live-edge-only-mode]` use-case, not here.
- **`clearLiveSeekableRange()` on termination** — not called; low-risk (a
  terminated window's stale live range ~matches its buffered/duration-derived
  seekable). Verify on a real terminating stream; not a blocker.

**Naive depth (sufficient for conformant content; full depth deferred):**

- **Termination detection** — `#EXT-X-ENDLIST` / `PLAYLIST-TYPE:VOD` only, the
  sanctioned naive tier per
  [clusters.md](./clusters.md#naive-vs-full-implementation-depth). Full depth
  adds a miss-counter fallback for non-conformant servers that stop updating
  without `ENDLIST` (Mux always emits it).
- **Reload jitter / backoff** — target-duration cadence only; full depth adds
  thundering-herd jitter + backoff on identical-playlist responses.

**Out of scope (separate Media-src features):**

- **[ll-hls-support](./ll-hls-support.md)** — blocking reload, partial
  segments, delta playlists, preload hints. Builds on this feature's reload
  loop.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)** — growing
  (non-sliding) window, back-seek through history. Extension with different
  windowing semantics; shares the reload loop and the `setLiveSeekableRange`
  writer shape. Sits at the maximal-back-seek end of the same seekable
  spectrum the guard's `repositionPolicy` exposes (edge-only ↔ in-window
  scrub-back ↔ full-history back-seek).
- **[non-zero-pts-support](./non-zero-pts-support.md)** — live PTS advances
  from stream start, far from zero; the time-mapping primitive live consumes is
  a separate cluster B feature.
- **[buffer-stall-recovery](./buffer-stall-recovery.md)** — mid-stream stall
  detection + unstick-in-place recovery (nudge → flush → reset). Coordinates
  with this feature's planned
  guard: an in-window stall is buffer-stall-recovery's territory; the
  window-*exit* reposition is the live-specific terminal action.

## Likely cross-cutting impact

The foundation is implemented, so most prior cross-cutting concerns are now
realized. The remaining forward-looking impact is concentrated in the planned
guard:

- **`repositionPolicy` composition seam.** The guard's reposition condition is
  a policy point: `'window-exit'` (default — DVR model; reposition only when
  the playhead is outside the window, in-window scrub-back preserved) vs
  `'on-resume'` (edge-only — always snap to the live edge on resume). Per
  [clusters.md § Composition vs Policy vs middle pattern](./clusters.md#composition-vs-policy-vs-middle-pattern),
  `'window-exit'` ships as the default config consumed by the guard behavior;
  the **edge-only variant** (stop fetching segments while paused + always-snap
  on resume + narrowed seekable) is a future **Composition**
  (alternative-default-config + add + alternative-impl), tracked as a
  `[live-edge-only-mode]` use-case rather than a runtime branch. Leaving the
  seam in place costs only the policy indirection now and keeps the edge-only
  mode a composition rather than a rewrite later.
- **Single owner of the live playhead position.** The guard writes
  `currentTime` (a seek). `seek-to-live-edge` already does the one-time initial
  seek; folding the guard into it keeps one writer of "where the live playhead
  belongs" (initial seek = first firing) rather than two behaviors racing
  seeks. No new state slot — the guard reads existing `presentation.duration`
  (finiteness guard), `selectedVideoTrackId`, and `track.segments` (window),
  plus the `currentTime` mirror.
- **Primary trigger is the window-update signal, not `timeupdate`.** Scenario
  B's fall-behind happens *during a stall*, when `timeupdate` has stopped but
  the window keeps sliding via reloads — so the guard must re-evaluate on the
  reload / window-update signal. `playing` / `timeupdate` / `seeked` are
  secondary triggers (resume case, prompt in-playback detection, overran-edge).

## Implementation surface

**Behaviors:**

| Behavior | File | Live responsibility |
|---|---|---|
| `liveWindowFor` *(pure helper)* | `media/live-window.ts` | Derive the live window `{start,end,targetDuration}` from the selected video track, or `null` (VOD/ended/unresolved). The single source of truth consumed by the two behaviors below — centralizes all inertness so neither re-derives the window. |
| `syncLiveSeekableRange` | `behaviors/dom/sync-live-seekable-range.ts` | Consume `liveWindowFor`; `setLiveSeekableRange(start, end)` reactively on each window slide, including while paused. Duration is owned solely by `updateMediaSourceDuration`. Composed before `seekToLiveEdge`. |
| `seekToLiveEdge` | `behaviors/dom/seek-to-live-edge.ts` | Consume `liveWindowFor`; one-time HOLD-BACK seek + the live-window playhead guard (reposition-on-window-exit, `repositionPolicy` seam). Gates on `mediaSource` open so the seek lands in the declared range. |
| `anchorLiveTracks` | `behaviors/anchor-live-tracks.ts` | Pin live track timelines to the SourceBuffer's native-PTS ground truth (first appended segment) or manifest estimate; re-pin per reload as the window slides |
| `resolveVideoTrack` / `resolveAudioTrack` / `resolveTextTrack` | `behaviors/resolve-track.ts` | Own the reload loop via `RecurringRunner`; reschedule defaults to `mediaPlaylistReloadDelay`; per-type independent |
| `calculatePresentationDuration` | `behaviors/calculate-presentation-duration.ts` | Populate `presentation.duration` via the config resolver (`Infinity` for unended live) |
| `updateMediaSourceDuration` | `behaviors/dom/update-mediasource-duration.ts` | Propagate `presentation.duration` to `mediaSource.duration` once per MediaSource (uniform across variants) |
| `endOfStream` | `behaviors/dom/end-of-stream.ts` | Gate on `Track.duration` finiteness — inert for ongoing live, reachable once terminated |

**Actors:** `SegmentLoaderActor` (`actors/dom/segment-loader.ts`) —
`planTasks` / `getSegmentsToLoad` iterate the live-mutating segment list within
the forward/back-buffer windows; `SourceBufferActor`
(`actors/dom/source-buffer.ts`) — append/remove + tracks appended segment IDs
for the `endOfStream` gate.

**State / derived:** `presentation.duration` (`Infinity` for live; written by
`calculatePresentationDuration`, read by `updateMediaSourceDuration` /
`seek-to-live-edge` / `endOfStream` — distinct decision domains, not a
multi-writer conflict). `presentation.streamType` (`'live'`). Per-track
`segments` (live-mutating; written by reload parse, read by segment-loader).
Live edge and the planned `liveEdgeStart` are **derived** from
`track.segments`, not state slots.

**Engine composition:** `engines/hls/engine.ts` composes the live behaviors
unconditionally (`anchorLiveTracks`, `calculatePresentationDuration`,
`updateMediaSourceDuration`, the `resolveXTrack` family with
`reschedule: delayedReschedule(mediaPlaylistReloadDelay)`, `seekToLiveEdge`,
`endOfStream`); VOD inertness comes from finite-duration guards, not a branch.

## Config surface

| Constant | File | Value | Purpose |
|---|---|---|---|
| `HOLD_BACK_TARGET_MULTIPLIER` | `behaviors/dom/seek-to-live-edge.ts` | `3` | Initial-seek + guard reposition target = live edge − 3×target-duration, clamped to window start |
| `REPOSITION_TOLERANCE` | `behaviors/dom/seek-to-live-edge.ts` | `0.1` | Guard's boundary tolerance (s) — avoids jitter seeks at the window edges |
| `FALLBACK_TARGET_DURATION` | `media/hls/reload-policy.ts` | `6` | Reload cadence (s) when no `#EXT-X-TARGETDURATION` |
| `DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration` | `media/buffer/forward-buffer.ts` | `30` | Seconds ahead of playhead to load |
| `DEFAULT_BACK_BUFFER_CONFIG.keepSegments` | `media/buffer/back-buffer.ts` | `2` | Segments kept behind playhead |
| `repositionPolicy` | `seek-to-live-edge` config (behavior-scoped) | `'window-exit'` | Reposition condition seam. `'window-exit'` implemented; `'on-resume'` (edge-only) is inert pending the `[live-edge-only-mode]` use-case, which adds the public engine-config surface |

## Verification

**Existing (implemented phases):**

- `media/hls/tests/reload-policy.test.ts` — cadence: `null` for finite
  duration, full/half target-duration, 6s fallback.
- `media/hls/tests/parse-media-playlist.test.ts` — `Infinity` for unended
  live; `endList` on `#EXT-X-ENDLIST`; finite for `PLAYLIST-TYPE:VOD`; PDT
  capture + carry-forward.
- `behaviors/tests/anchor-live-tracks.test.ts` — pin to buffer ground truth;
  PDT carry-forward; sequence-origin bootstrap.
- `behaviors/tests/resolve-track.test.ts` — live reload re-resolves; stops on
  finite duration; source-change abort.
- `behaviors/dom/tests/seek-to-live-edge.test.ts` — declares window; seeks to
  HOLD-BACK; no-op for finite/absent tracks. Plus the live-window guard matrix
  (see below).
- `behaviors/tests/calculate-presentation-duration.test.ts` — `Infinity` for
  live resolver.
- `engines/hls/tests/engine.test.ts` — end-to-end live setup / reload / window
  slide / termination.
- Sandbox: `apps/sandbox/templates/live-hls-engine`, `SOURCES['hls-live']`.

**Live-window playhead guard** — `behaviors/dom/tests/seek-to-live-edge.test.ts`
(`describe('live-window playhead guard')`, event-capable fake media element):
playing-inside-window → no seek; `currentTime < windowStart` (playing) → seek to
`liveEdgeStart`; `currentTime > windowEnd` (playing) → seek; paused-out-of-window
→ no seek, then seek on `playing` resume; DVR mid-window scrub-back → **no** yank;
`seeking` in flight → defer to `seeked`; sub-tolerance boundary → no jitter seek,
beyond-tolerance → seek; window slides past frozen paused playhead across reloads
→ no seek while paused, snaps in on resume; stalled-behind-window → repositions on
the window-update re-fire; `on-resume` policy → inert (not yet implemented).

**Out of scope / deferred:** E2E (Chromium) — a local synthetic sliding-window
stream (short target-duration) driving pause-beyond-window → resume-snaps-near-edge
and a CDP `Network.emulateNetworkConditions` buffer-drain → reposition-and-recover.
Deferred: needs new synthetic-sliding-window HLS fixture infra; the unit matrix
covers the guard logic deterministically.

## Open questions

- **Guard reposition target under truly-insufficient bandwidth.** If the
  network can't sustain even the lowest rate, the guard can loop
  (reposition → stall → window slides → reposition). v1 lean: accept the loop
  (the stream is below its playable floor; the jumps are honest) and document
  it; cheap alternative is deepening the holdback on repeated exits rather than
  touching playback rate.
- **Miss-counter threshold** (if pursued). How many identical-manifest reloads
  constitute termination?

**Resolved during guard implementation:**

- **`repositionPolicy` seam shape** → behavior-scoped config on
  `seek-to-live-edge` (default `'window-exit'`), **not** a public
  `SimpleHlsEngineConfig` field. Avoids a speculative engine-config surface with
  no current consumer (per `conventions/config.md`); the `[live-edge-only-mode]`
  use-case adds the public field when it implements `'on-resume'`.
- **Guard placement** → extends `seek-to-live-edge` (single owner of the live
  playhead position), not a sibling behavior.

## Related features

- **[ll-hls-support](./ll-hls-support.md)** — builds on this feature's reload
  loop; adds blocking reload, partial segments, delta playlists, preload hints.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)** — growing
  window + full-history back-seek on the same reload loop; the maximal-back-seek
  end of the seekable spectrum the guard's `repositionPolicy` sits on (edge-only
  ↔ in-window scrub-back ↔ full history).
- **[buffer-stall-recovery](./buffer-stall-recovery.md)** — in-window stall
  detection + unstick-in-place recovery; coordinates with this feature's
  planned guard (window-exit reposition is the live-specific terminal action).
- **[non-zero-pts-support](./non-zero-pts-support.md)** — live PTS starts far
  from zero; cluster B foundation live consumes for correct `currentTime` /
  `seekable`.
- **mse-mms-pipeline** — `Infinity` duration via `config.resolveDuration`; the
  `endOfStream` gate uses segment + currentTime, not duration finiteness.
- **buffer-management** — sliding-window tracking interacts with back-buffer
  eviction; the planner's currentTime-driven shape applies with the list
  mutating mid-flight.
- **video-abr** / **audio-playback** / **subtitles** — per-type consumers read
  the resolved track that now changes over time (segments append / roll off).
- **source-replacement** — orthogonal; live → live source change tears down and
  rebuilds the reload loop via the same in-place cascade.
- **`[live-edge-only-mode]`** *(future use-case)* — the edge-only composition
  the `repositionPolicy: 'on-resume'` seam enables.

## See also

- [clusters.md § Manifest reload loop](./clusters.md#manifest-reload-loop) —
  cluster A description; this feature is the foundation.
- [clusters.md § Composition vs Policy vs middle pattern](./clusters.md#composition-vs-policy-vs-middle-pattern)
  — the `repositionPolicy` seam / edge-only composition framing.
- [live-timeline-anchoring](../../../decisions/live-timeline-anchoring.md) — PDT
  anchor that places the sliding-window timeline `anchorLiveTracks` consumes.
- [mse-timestamp-offset](../../../decisions/mse-timestamp-offset.md) — native-PTS
  default, `setLiveSeekableRange` in native coords, one-time seek into the
  window on load.
- [presentation-modeling.md](../presentation-modeling.md) — the reload loop
  sits below `resolvePresentation` and re-uses `parseMediaPlaylist` per cycle.
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — cluster A epic candidates.
- [Mux Video Permutations Matrix](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — Stream Type section.
</content>
</invoke>
