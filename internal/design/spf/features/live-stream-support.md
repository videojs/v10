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
  implemented as a reactor in `seek-to-live-edge` (window-update re-fire + a
  `play` listener). **Not yet implemented:** an edge-only live mode (a future
  use-case). Termination is
  `#EXT-X-ENDLIST`-based (the naive tier —
  sufficient for conformant content); the miss-counter fallback and reload
  jitter are deferred full-depth.
- **Definition depth:** sketched — grounded in the implementation on
  `feat/spf-hls-live`. Source material: [SPF Epics Working Doc — Live Stream
  Support (epic #2)](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  (cluster A foundation, eng size L, validation M).
- **Foundational** for the manifest-reload-loop cluster —
  [ll-hls-support](./ll-hls-support.md) and
  [dvr-event-stream-support](./dvr-event-stream-support.md) build on this
  feature.
- **Open hardening follow-ups:** tracked under the Live/DVR Seekable and Anchor
  Hardening epic (#1742).

## Phases of complexity

Capability slices for the foundational live-stream-support feature. Each phase
below is part of "live works (and terminates) at all"; richer live variants
(LL-HLS, DVR) sit in sibling features.

| Phase | Status | What / how |
|---|---|---|
| Manifest reload loop | ✅ Implemented | Periodic media-playlist refetch keyed off `#EXT-X-TARGETDURATION`. Each `resolveXTrack` owns a `RecurringRunner` (`resolve-track.ts`) rescheduled by `delayedReschedule(mediaPlaylistReloadDelay)` (wired in `engine.ts`). Cadence in `reload-policy.ts`: full target-duration on window change / first reload, half target-duration on unchanged window; start-anchored per RFC 8216bis §6.3.4; returns `null` (stops) once duration is finite |
| Sliding-window segment tracking | ✅ Implemented | `placeOnPreviousTimeline` (`parse-media-playlist.ts`) carries the new window onto the established timeline via media-sequence overlap (PDT bridge on full turnover). Segment-loader `planTasks` re-evaluates the mutating `track.segments` on each load dispatch; back-buffer keeps last 2 segments. No explicit "no-longer-in-playlist" eviction signal — the keep-count heuristic + list shrink handle roll-off |
| Live duration semantics | ✅ Implemented | Parser sets `Track.duration = Infinity` for unended live; `calculatePresentationDuration` (default resolver `getResolvedSelectedTrackDuration`) writes it; `updateMediaSourceDuration` propagates `mediaSource.duration = Infinity` once MS is open and buffers idle |
| Live edge tracking + `setLiveSeekableRange` | ✅ Implemented (option **b**) | The live window (or null for VOD/ended) is derived once by the pure `liveWindowFor` (`media/live-window.ts`), consumed by two separate behaviors: `sync-live-seekable-range.ts` declares `setLiveSeekableRange(start, end)` reactively on each window slide (runs while paused too), and `seek-to-live-edge.ts` does the one-time seek to `liveEdgeStart` (the live latency behind the edge, via the `getLiveEdge` primitive). Separate from the reload loop (option b). Inert for VOD via `liveWindowFor` returning null. No `clearLiveSeekableRange()` on termination — unnecessary: the UA consults the live range only while `duration === Infinity`, so once `endOfStream` sets a finite duration it's ignored |
| Live-window playhead guard | ✅ Implemented | `seek-to-live-edge` is a reactor (`inactive ↔ live`); the guard is the `live` state's `effects`. While playing (`!paused`), it repositions `currentTime` to `liveEdgeStart` when the playhead has fallen behind the window start — including a seek whose target has slid out of the window (it can never settle, so the guard rescues rather than waiting on `seeking`; the `currentTime < windowStart` test discriminates, since in-window scrub-back lands `≥ windowStart`). Two triggers: the **window-update re-fire** (the effect reads the live edge, so each reload re-runs it — this catches *fell-behind-on-poor-network* (Scenario B), where `timeupdate` is silent during a stall) and a single **`play` listener** for immediate reposition on *resume* (Scenario A; the reload interval can be seconds) — `play`, not `playing`, since after a long pause the playhead sits behind the window at an unseekable position where `playing` never fires. Within-window pause / DVR scrub-back are left untouched. **Deferred:** playback-rate latency catch-up, MSE gap-jumping |
| Reload jitter / backoff | ✅ Naive only | Target-duration cadence with unchanged-window throttle (half target). No thundering-herd jitter, no backoff on repeated identical-playlist responses (full depth, not implemented) |
| Per-type reload coordination | ✅ Independent | Audio / video / text each own their `RecurringRunner` and reload on their own `#EXT-X-TARGETDURATION`. Resolved as **extended `resolveXTrack`** (same `setupTrackResolution` handles one-shot VOD and recurring live via the `RecurringRunner` abstraction) — no separate `reloadXTrack` family |
| Termination detection | ✅ Naive depth | `#EXT-X-ENDLIST` recognized and surfaced (`MediaPlaylistMetadata.endList`); parser flips `Track.duration` finite (on `ENDLIST` or `PLAYLIST-TYPE:VOD`), which stops the reload loop. ENDLIST-only is the sanctioned naive tier (per [clusters.md](./clusters.md#naive-vs-full-implementation-depth)) and sufficient for conformant content (Mux always emits `ENDLIST`); the miss-counter fallback for non-conformant servers is deferred full-depth |
| Terminated state transition | ✅ Implemented (one verify-later item) | Reload stops (policy returns `null`); the `endOfStream` gate unblocks once `Track.duration` is finite and the last segment is appended; per-type independent (waits for all active tracks). `clearLiveSeekableRange()` is intentionally **not** called — the MSE spec consults the live range only while `duration === Infinity`, so once `endOfStream` sets a finite duration the UA ignores it; clearing on the `ENDLIST`→finite transition would be premature (duration still `Infinity`) and shrink `seekable` to buffered-only |

## What's not implemented

**Within this feature:**

- **Edge-only live mode** — always snap to the live edge / no DVR (stop fetching
  while paused, narrowed seekable, snap to edge on resume). Lands as the
  `[live-edge-only-mode]` use-case, which introduces its own reposition behavior.
  (An earlier `repositionPolicy` seam anticipating it was removed when the guard
  became reload-driven — nothing consumed it, and "always-snap-on-resume" isn't
  expressible without resume-detection the window-exit guard doesn't carry.)

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
  writer shape. Sits at the maximal-back-seek end of the seekable spectrum
  (edge-only ↔ in-window scrub-back ↔ full-history back-seek).
- **[non-zero-pts-support](./non-zero-pts-support.md)** — live PTS advances
  from stream start, far from zero; the time-mapping primitive live consumes is
  a separate cluster B feature.
- **[buffer-stall-recovery](./buffer-stall-recovery.md)** — mid-stream stall
  detection + unstick-in-place recovery (nudge → flush → reset). Coordinates
  with this feature's guard: an in-window stall is buffer-stall-recovery's
  territory; the window-*exit* reposition is the live-specific terminal action.

## Likely cross-cutting impact

The foundation is implemented, so most prior cross-cutting concerns are now
realized. What remains is forward-looking:

- **Edge-only mode is a future composition, not a runtime branch.** The guard
  ships one behavior: window-exit (the DVR model — reposition only when the
  playhead is outside the window, in-window scrub-back preserved). The edge-only
  variant (stop fetching while paused + always-snap on resume + narrowed
  seekable) is a future **Composition** (alternative-default-config + add +
  alternative-impl) tracked as the `[live-edge-only-mode]` use-case. Per
  [clusters.md § Composition vs Policy vs middle pattern](./clusters.md#composition-vs-policy-vs-middle-pattern),
  it composes a variant rather than branching at runtime, and introduces its own
  reposition behavior. (The `repositionPolicy` config seam that once anticipated
  it was removed when the guard became reload-driven — see "What's not implemented".)
- **Single owner of the live playhead position.** The guard writes
  `currentTime` (a seek). `seek-to-live-edge` already does the one-time initial
  seek; folding the guard into it keeps one writer of "where the live playhead
  belongs" (initial seek = first firing) rather than two behaviors racing
  seeks. No new state slot — the guard reads existing `presentation.duration`
  (finiteness guard), `selectedVideoTrackId`, and `track.segments` (window),
  plus the `currentTime` mirror.
- **Primary trigger is the window-update signal, not `timeupdate`.** Scenario
  B's fall-behind happens *during a stall*, when `timeupdate` has stopped but
  the window keeps sliding via reloads — so the guard re-evaluates on the
  reload / window-update signal (the effect's tracked read of the live edge). A
  single `play` listener is the secondary trigger, for immediate reposition on
  resume (the reload interval can be seconds). `timeupdate` / `seeked` are unused.

## Implementation surface

**Behaviors:**

| Behavior | File | Live responsibility |
|---|---|---|
| `liveWindowFor` *(pure helper)* | `media/live-window.ts` | Derive the live window `{start,end}` from the track with the given id (type-agnostic via `findTrackById`), or `null` (VOD/ended/unresolved). Purely geometric — no delivery-format metadata. Centralizes all inertness so consumers don't re-derive the window. |
| `liveWindowFromState` / `getLiveEdge` *(primitives)* | `playback/primitives/live-window.ts` | The state-reading call sites the live behaviors use. `liveWindowFromState` picks the timeline-bearing track — `selectedVideoTrackId ?? selectedAudioTrackId` (video positions both A/V; audio-only falls back to audio) — and calls `liveWindowFor`. `getLiveEdge({state,config})` adds the target playhead position (`liveEdgeStart = end − live latency`, clamped to start), bundling window geometry with the format-specific `config.resolveLiveLatency` policy so the behavior consumes one edge. Reads signals lazily (call inside an effect). |
| `syncLiveSeekableRange` | `behaviors/dom/sync-live-seekable-range.ts` | Consume `liveWindowFromState`; `setLiveSeekableRange(start, end)` reactively on each window slide, including while paused. Duration is owned solely by `updateMediaSourceDuration`. Composed before `seekToLiveEdge`. |
| `seekToLiveEdge` | `behaviors/dom/seek-to-live-edge.ts` | A reactor (`inactive ↔ live`) consuming `getLiveEdge`. `live` `entry` does the one-time seek to `liveEdgeStart`; `live` `effects` runs the window-exit guard (window-update re-fire + `play` listener). Format-neutral — the live latency comes from the injected `resolveLiveLatency` seam, never read here. The `mediaSource`-open precondition orders the entry seek after `sync-live-seekable-range` declares the range, so the seek lands in-window. Also gated on `presentationAnchor` (published by `anchorPresentationTimeline`): the seek waits until the timeline is buffer-anchored, so it targets the final native-PTS window rather than the raw pre-anchor one (which the pin's later shift would strand). |
| `anchorPresentationTimeline` | `behaviors/anchor-presentation-timeline.ts` | A reactor that establishes **one** shared presentation anchor once per source — on first buffer ground truth, first-track-wins — and stamps it onto every track via `positionAllTracksToAnchor`: resolved tracks shift onto it, not-yet-resolved shells get `startDate` for the parser's `placeOnAnchor` to honor at first resolve. Covers video, audio, and text; any track selected later (ABR / audio language / late captions) resolves already anchored. No pre-buffer estimate. See [live-presentation-anchor](../../../decisions/live-presentation-anchor.md). |
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
Live edge and `liveEdgeStart` are **derived** (via `getLiveEdge`) from
`track.segments` + the injected latency, not state slots.

**Engine composition:** `engines/hls/engine.ts` composes the live behaviors
unconditionally (`anchorPresentationTimeline`, `calculatePresentationDuration`,
`updateMediaSourceDuration`, the `resolveXTrack` family with
`reschedule: delayedReschedule(mediaPlaylistReloadDelay)`, `seekToLiveEdge`,
`endOfStream`); VOD inertness comes from finite-duration guards, not a branch.

## Config surface

| Constant | File | Value | Purpose |
|---|---|---|---|
| `HOLD_BACK_TARGET_MULTIPLIER` | `media/hls/reload-policy.ts` | `3` | HLS default HOLD-BACK as a multiple of target duration. `liveLatencyFor(track)` applies it; the engine injects it as `seekToLiveEdge`'s format-neutral `resolveLiveLatency` seam. Initial-seek + guard reposition target = live edge − live latency, clamped to window start |
| `REPOSITION_TOLERANCE` | `behaviors/dom/seek-to-live-edge.ts` | `0.1` | Guard's boundary tolerance (s) — avoids jitter seeks at the window edges |
| `FALLBACK_TARGET_DURATION` | `media/hls/reload-policy.ts` | `6` | Reload cadence (s) — and HOLD-BACK basis — when no `#EXT-X-TARGETDURATION` |
| `resolveLiveLatency` | `seekToLiveEdge` config (engine-injected) | `liveLatencyFor` (HLS) | Format-neutral seam for the seconds the playhead trails the live edge. HLS injects `HOLD-BACK` (3× target duration); a DASH engine would inject `suggestedPresentationDelay`. Keeps `seek-to-live-edge` free of delivery-format specifics |
| `DEFAULT_FORWARD_BUFFER_CONFIG.bufferDuration` | `media/buffer/forward-buffer.ts` | `30` | Seconds ahead of playhead to load |
| `DEFAULT_BACK_BUFFER_CONFIG.keepSegments` | `media/buffer/back-buffer.ts` | `2` | Segments kept behind playhead |

## Verification

**Existing (implemented phases):**

- `media/hls/tests/reload-policy.test.ts` — cadence: `null` for finite
  duration, full/half target-duration, 6s fallback.
- `media/hls/tests/parse-media-playlist.test.ts` — `Infinity` for unended
  live; `endList` on `#EXT-X-ENDLIST`; finite for `PLAYLIST-TYPE:VOD`; PDT
  capture + carry-forward.
- `behaviors/tests/anchor-presentation-timeline.test.ts` — establishes from the buffered
  video track and stamps all tracks (incl. an unresolved text shell);
  first-track-wins; establishes once across reloads; inert without buffer truth.
- `behaviors/tests/resolve-track.test.ts` — live reload re-resolves; stops on
  finite duration; source-change abort.
- `behaviors/dom/tests/seek-to-live-edge.test.ts` — seeks to `liveEdgeStart`
  (latency injected via `resolveLiveLatency`); no-op for finite/absent tracks.
  Plus the live-window guard matrix (see below).
- `playback/primitives/tests/live-window.test.ts` — `liveWindowFromState` /
  `liveTrackId` track-pick; `getLiveEdge` latency placement + window-start clamp.
- `media/hls/tests/reload-policy.test.ts` — also `liveLatencyFor` (3× target
  duration; fallback).
- `behaviors/tests/calculate-presentation-duration.test.ts` — `Infinity` for
  live resolver.
- `engines/hls/tests/engine.test.ts` — end-to-end live setup / reload / window
  slide / termination.
- Sandbox: `apps/sandbox/templates/live-hls-engine`, `SOURCES['hls-live']`.

**Live-window playhead guard** — `behaviors/dom/tests/seek-to-live-edge.test.ts`
(`describe('live-window playhead guard')`, event-capable fake media element):
playing-inside-window → no seek; behind-window-start on resume (`play`) → seek to
`liveEdgeStart`; paused while the window slides → no seek, then seek on `play`
resume; DVR mid-window scrub-back across a window update → **no** yank; an
in-window seek in flight → **no** yank (the guard discriminates on position, not
the `seeking` flag); a seek stranded behind the window start while still
`seeking` → rescued to `liveEdgeStart`; sub-tolerance boundary → no
jitter seek, beyond-tolerance → seek; stalled-behind-window (playing, frozen
`currentTime`) → repositions on the window-update re-fire.

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
- **Seekable-range "lip" ahead of buffered data.** `liveWindowFor` derives the
  window start from the model's first listed segment, which can lead the
  actually-buffered / fetchable boundary by ~a segment (observed ~2s on a
  sliding-window source: declared `seekable.start` preceded the SourceBuffer's
  first range). A seek into that lip lands on unloadable media and strands until
  the window slides past it — the guard now rescues, but the lip is the trigger.
  Follow-up: tighten the derived window start toward the fetchable boundary.
  Tracked in #1743.
- **Clamp-to-seekable as the general windowed-playhead mechanism.** A behavior
  enforcing `currentTime ∈ seekable` off the **native** `seekable` range would be
  timeline-agnostic (robust to non-zero start PTS — see
  [non-zero-pts-support](./non-zero-pts-support.md)) and would subsume the
  window-exit guard's reposition half (not the one-time entry seek). Deferred; it
  raises the recovery-target decision — snap-to-edge for sliding live vs
  hold-at-oldest for DVR — the same DVR-vs-sliding distinction
  [dvr-event-stream-support](./dvr-event-stream-support.md) faces. Tracked in
  #1744.
- **Back-of-window playback yanked to the live edge on discrete window slides.**
  Now that out-of-window seeks are rescued (above), watching from the back of a
  sliding window is unstable: the window start advances a full segment (~2s) per
  reload, so a playhead parked near the back transiently drops below `windowStart`
  and the guard repositions it — but to the live **edge**, not the new window
  start, yanking the viewer forward. Aggravated by the reload-cadence /
  segment-sized discreteness of the window update (and any lag in observing it).
  The reposition **target** is the lever: snapping to `windowStart + margin` (or
  clamp-to-seekable's hold-at-oldest) instead of the edge keeps a back-of-window
  viewer in place. Same recovery-target decision as the clamp-to-seekable item;
  observed live on the ~20s sliding source. Needs cleanup. Tracked in #1745.

**Resolved during guard implementation:**

- **`repositionPolicy` seam** → introduced as behavior-scoped config in the
  initial guard, then **removed** when the guard became reload-driven
  (window-update re-fire + `play` listener): nothing consumed it, and the
  edge-only `'on-resume'` behavior isn't expressible without resume-detection the
  window-exit guard doesn't carry. The `[live-edge-only-mode]` use-case defines
  its own reposition behavior when built (per `conventions/config.md` —
  anti-speculative-config).
- **Guard placement** → the `live` state's `effects` in the `seek-to-live-edge`
  reactor (single owner of the live playhead position), not a sibling behavior.
- **Out-of-window seek stall** → the guard originally bailed on
  `mediaElement.seeking`, so a seek to a position that had slid out of the window
  (data evicted, seek never settles) stranded the playhead permanently — the
  guard couldn't rescue the very stall it exists for. Removed the `seeking` bail;
  `currentTime < windowStart` is itself the discriminator (in-window scrub-back
  lands `≥ windowStart`, so it's untouched). Fixed on `feat/spf-hls-live`;
  reproduced + verified live on a Mux sliding-window source.

## Related features

- **[ll-hls-support](./ll-hls-support.md)** — builds on this feature's reload
  loop; adds blocking reload, partial segments, delta playlists, preload hints.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)** — growing
  window + full-history back-seek on the same reload loop; the maximal-back-seek
  end of the seekable spectrum (edge-only ↔ in-window scrub-back ↔ full history).
- **[buffer-stall-recovery](./buffer-stall-recovery.md)** — in-window stall
  detection + unstick-in-place recovery; coordinates with this feature's guard
  (window-exit reposition is the live-specific terminal action).
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
  (always snap to the live edge / no DVR); introduces its own reposition behavior.

## See also

- [clusters.md § Manifest reload loop](./clusters.md#manifest-reload-loop) —
  cluster A description; this feature is the foundation.
- [clusters.md § Composition vs Policy vs middle pattern](./clusters.md#composition-vs-policy-vs-middle-pattern)
  — the edge-only composition framing.
- [live-timeline-anchoring](../../../decisions/live-timeline-anchoring.md) — PDT
  anchor that places the sliding-window timeline `anchorPresentationTimeline` consumes.
- [mse-timestamp-offset](../../../decisions/mse-timestamp-offset.md) — native-PTS
  default, `setLiveSeekableRange` in native coords, one-time seek into the
  window on load.
- [presentation-modeling.md](../presentation-modeling.md) — the reload loop
  sits below `resolvePresentation` and re-uses `parseMediaPlaylist` per cycle.
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — cluster A epic candidates.
- [Mux Video Permutations Matrix](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — Stream Type section.
