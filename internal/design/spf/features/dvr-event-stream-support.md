---
status: draft
date: 2026-05-20
definition: technical
---

# DVR / event-stream support

DVR (digital video recorder) and event-stream HLS support: engine
handles HLS playlists with **growing-window** semantics (segments
never roll off the start) instead of sliding-window (live). Adds
back-seek capability through history, event-stream recognition via
`#EXT-X-PLAYLIST-TYPE:EVENT`, and the transition from event-stream to
VOD when termination commits. The third cluster A doc — sibling to
[live-stream-support](./live-stream-support.md) (foundation) and
[ll-hls-support](./ll-hls-support.md) (low-latency extension).

A **Media-src feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
without it, DVR / event sources either don't play (engine treats the
growing playlist as a malformed live stream) or back-seek doesn't
work (buffer-management evicts history before the user reaches it).

DVR and event-stream are documented together because they share the
core mechanism — a growing playlist with no roll-off — and structural
implementation. The HLS-spec-defined `PLAYLIST-TYPE:EVENT` is one
producer-side construct; DVR is the capability that exposes back-seek
through whatever history the server retains. Both consume the same
client-side engine surface.

## Status

- **Composition:** not implemented. Hard prerequisite
  [live-stream-support](./live-stream-support.md) is also not
  implemented. Today's `parseMediaPlaylist` recognizes
  `#EXT-X-PLAYLIST-TYPE:` as a known-tag pass-through but doesn't
  surface the value to the track output.
- **Definition depth:** technical — scope and SPF touchpoints
  articulated against live-stream-support's structure; implementation
  specifics open. Source material: [SPF Epics Working Doc — epic #3
  DVR / Event Stream Support](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  (cluster A, Media-src, eng M, validation M; "Growing playlist;
  extension of #2 (live-stream-support).").
- **Hard prerequisite:** [live-stream-support](./live-stream-support.md).
  The reload loop, target-duration pacing, `Infinity` duration
  semantics, and `setLiveSeekableRange` writer-behavior shape all
  come from that feature; DVR/event-stream supplies the windowing
  variance. The "DVR / event boundary" open question in
  live-stream-support.md's Open questions section is **resolved by
  this doc's existence**: DVR is its own feature, not a phase of
  live-stream-support.

## Phases of complexity

Content phases (capability slices). Each phase is a distinct
capability slice of "DVR/event-stream supported."

| Phase | What | Notes |
|---|---|---|
| Growing-window playlist semantics | Playlist grows from the recording / event start; no roll-off. Engine retains full history. `setLiveSeekableRange` start value derives from the playlist's first segment media time (or `0`) rather than the sliding-back-N derivation live uses. The reload-loop and target-duration-pacing machinery is unchanged from live | The core windowing difference. Variant-specific producer behavior (computes `seekableStart` from the playlist's first retained segment) feeds the variant-agnostic `setLiveSeekableRange` writer that live also uses |
| Event-stream recognition (`PLAYLIST-TYPE:EVENT`) | Parser surfaces `#EXT-X-PLAYLIST-TYPE:EVENT` from the media playlist (today the tag is recognized but not extracted; track output gains `playlistType: 'EVENT' \| 'VOD' \| undefined`). Engine uses the value to distinguish event-stream from live-with-large-window — semantically distinct even if structurally similar | Parser-side change; the value isn't yet surfaced. `PLAYLIST-TYPE:VOD` is the orthogonal case (already-finished recording) that the parser would surface uniformly |
| Back-seek through history | User can seek arbitrarily far back into the recorded portion. Buffer-management's seek phase already handles non-contiguous gap-fill (per [buffer-management.md](./buffer-management.md)'s "Seek handling" phase); DVR exercises this aggressively with large seek distances. No new behavior; existing seek code path under different load | The "DVR works" experience surface. Stress-tests the existing seek-from-arbitrary-position planning |
| DVR-aware back-buffer policy | Default `backBuffer.keepSegments: 2` from buffer-management is too aggressive for DVR (history is evicted before user can seek back to it). Either configurable (large value for DVR variants) or a variant-specific policy ("retain N seconds back" or "retain indefinitely") | Variant-specific behavior. Affects buffer-management.md's back-buffer eviction phase. Open question: shape of the policy (configurable threshold vs subtractive composition) |
| Event-stream termination → VOD transition | When `#EXT-X-ENDLIST` appears on an event-stream, live-stream-support's terminated-state-transition phase handles the mechanics (reload loop stops, last segment stabilizes, `mediaSource.duration` flips from `Infinity` to the finite value, `clearLiveSeekableRange()` paired with the transition). This phase notes the additional semantic that the stream now behaves equivalently to VOD: seekable to start, finite duration, normal `endOfStream` gating | Composes with live-stream-support's termination phases. No new termination behavior; this phase is the semantic note about what post-termination means for event-stream specifically |

## What's in scope vs out of scope

**In scope:**
- All five phases above for HLS event-stream and DVR-style growing-
  playlist sources
- Parser surface for `EXT-X-PLAYLIST-TYPE:EVENT` (and `:VOD` for
  uniformity)
- Variant-specific producer behavior for the seekable-range start
  signal
- Variant-specific back-buffer policy
- Composition with [live-stream-support](./live-stream-support.md)'s
  reload loop and termination phases

**Out of scope (separate Media-src candidate features):**
- **[ll-hls-support](./ll-hls-support.md)** — orthogonal sibling
  extension. DVR can compose with LL-HLS for low-latency live with
  back-seek; both extensions compose on the same reload-loop
  foundation but address different concerns (LL-HLS = latency
  reduction at the live edge; DVR = back-seek through history). The
  composition shape is "DVR + LL-HLS engine variant" with both
  feature's behaviors composed in.

**Out of scope (different architectural layer):**
- Adapter-layer customer-facing affordances ("seek back 30 seconds"
  buttons, scrub bar with history range, DVR window UI). Consume
  this feature's seekable-range signal; not SPF concerns themselves.
- User-facing DVR window configuration (e.g., "only show last 24
  hours"). Adapter-level policy; SPF respects what the server
  provides in the playlist.
- Server-side DVR retention policy. The engine handles whatever
  segments the server lists; it doesn't enforce retention.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Composition-variant placement for variant-specific behaviors.**
  Per the failure-mode catalog's composition-variant entry: behaviors
  with variant-specific value derivation (the seekable-range start
  producer, the back-buffer policy) compose into the DVR variant, not
  as runtime branches in always-on behaviors. Same shape as
  ll-hls-support's variant-composition analysis. The `live-stream-
  support` engine variant, the `ll-hls-support` extension variant,
  and the `dvr-event-stream-support` variant are three distinct
  compositions of the reload-loop foundation; each adds / replaces
  variant-specific behaviors.
- **Seekable-range producer split.** live-stream-support documents
  `setLiveSeekableRange` as a new behavior reading derived live-edge
  data; for DVR, the *value derivation* differs (start = 0 / first-
  segment-time vs sliding-back-N). The cleanest split: a variant-
  specific *producer* behavior computes the `(seekableStart,
  seekableEnd)` signal; a variant-agnostic *writer* behavior consumes
  the signal and calls `mediaSource.setLiveSeekableRange()`. The
  writer doesn't branch; the producer is variant-specific. Same
  pattern as `updateMediaSourceDuration`'s uniform-across-variants
  shape, mirrored — uniform writer, variant-specific upstream.
- **Back-buffer policy shape under DVR.** Today's `backBuffer.
  keepSegments: 2` is a single config knob. DVR may want one of:
  (a) a large configurable value, (b) a "retain N seconds back"
  alternative axis, (c) "retain indefinitely" (no eviction within
  the DVR window). The choice affects whether the back-buffer policy
  becomes variant-specific behavior (different policy composed for
  DVR variant) or stays uniform with a richer config surface.
- **DVR-vs-live-with-large-window distinction.** A DVR stream
  *without* `PLAYLIST-TYPE:EVENT` is structurally indistinguishable
  from "live with a very large sliding window" until the engine
  observes that segments don't roll off. The engine has options: (a)
  configure DVR vs live at the adapter layer (consumer opts in via
  config), (b) detect from `PLAYLIST-TYPE:EVENT` when present, (c)
  observe the playlist's behavior over multiple reloads and infer
  (engine flips to "DVR mode" once it sees segments stay). (a) is
  the simplest; (c) is the most adaptive but adds detection
  complexity.
- **`endOfStream` gate under DVR.** live-stream-support documents
  that `endOfStream` doesn't naturally fire for live (playlist keeps
  growing). For DVR-during-recording, same — `endOfStream` waits for
  termination. For DVR-post-termination, the gate becomes reachable
  the same way live-post-termination does (last segment stabilizes).
  No new gate semantics needed; the existing
  isLastSegmentAppended + currentTime gate logic from
  mse-mms-pipeline.md applies uniformly.
- **Server-side retention edge case.** A server may stop serving
  older segments while still listing them in the playlist (e.g.,
  "we keep 24 hours of history; older segments 404 on fetch"). The
  engine references segments via URI; if a back-seek targets a
  segment URI that 404s, the fetch fails. Whether this falls under
  this feature's scope (recover gracefully — surface a "history
  expired" error to the consumer) or under
  `[unsupported-case-error-mapping]` (generic fetch-failure mapping)
  is an open boundary.
- **DVR + LL-HLS composition.** Both are cluster A extensions on the
  same reload loop. Composition order: LL-HLS replaces the standard
  reload-loop behavior with its variant; DVR replaces the back-buffer
  policy and seekable-range producer. The two extensions are
  orthogonal — neither's behaviors conflict with the other's. A
  "DVR + LL-HLS" engine variant composes both extension sets atop
  the live-stream-support foundation.

## Open questions

- **Back-buffer policy shape.** Configurable `keepSegments` with large
  default for DVR vs "retain N seconds back" alternative axis vs
  "retain indefinitely" mode. Affects whether back-buffer becomes
  variant-specific behavior or stays uniform with richer config.
- **DVR-vs-live distinction signal source.** Adapter-config opt-in
  vs `PLAYLIST-TYPE:EVENT` detection vs observe-over-reloads
  inference. (a) is simplest; (b) only covers spec-flagged event
  streams; (c) is the most adaptive but adds complexity. Likely
  combination: (b) when the tag is present; otherwise (a) until (c)
  matures.
- **Seekable-range start derivation under server retention.** When
  the server keeps only the last N hours of segments and the
  playlist's first segment slides forward over time, the
  `seekableStart` value should track that. Same writer (variant-
  agnostic `setLiveSeekableRange` writer), but the variant-specific
  producer needs to read the playlist's current first-segment, not
  a constant `0`.
- **Server-side retention error handling.** Segment 404 on back-seek
  fetch. Scope of this feature vs `[unsupported-case-error-mapping]`.
- **`PLAYLIST-TYPE:VOD` semantics.** When a media playlist arrives
  with `PLAYLIST-TYPE:VOD` from the start (fully-resolved at first
  fetch, no reload needed), the engine should recognize this and
  skip reload-loop composition. Adjacent concern; may belong here
  (parser surfacing the value uniformly) or in live-stream-support
  (engine-side reload-loop activation gate).
- **Event-stream-during-pre-event.** An event-stream playlist may
  exist with metadata but few or no segments before the event
  starts. Reload-loop pacing handles this naturally (target-duration
  reload until segments appear), but pre-roll segment-zero
  semantics are worth verifying.
- **DVR + LL-HLS composition specifics.** Order of behavior
  composition, shared state between DVR and LL-HLS extensions.
  Verify when both extensions get implementation work.
- **`liveSeekableRange` clearance on DVR termination.** For live →
  termination, live-stream-support's terminated-state-transition
  phase pairs `clearLiveSeekableRange()` with the transition (so
  the browser's `seekable` reverts to buffer-derived semantics).
  For event-stream → VOD transition, the seekable range stays a
  finite range from playlist start to last segment — but does it
  still go through `setLiveSeekableRange` (now with finite end) or
  through `clearLiveSeekableRange()` + `mediaSource.duration`
  setter? Spec allows either; spec-conformant browsers should
  behave equivalently. Verify when implementation arrives.

## Related features

- **[live-stream-support](./live-stream-support.md)** *(hard
  prerequisite)* — provides the reload loop, target-duration pacing,
  `Infinity` duration semantics, termination detection (`ENDLIST` +
  miss-counter), and the `setLiveSeekableRange` writer-behavior
  shape. DVR/event-stream supplies the windowing variance and the
  variant-specific seekable-range start producer.
- **[ll-hls-support](./ll-hls-support.md)** — orthogonal cluster A
  extension. DVR + LL-HLS compose; both extensions sit atop the
  same reload-loop foundation but address different concerns
  (latency reduction vs back-seek). A DVR + LL-HLS engine variant
  is the cross-extension composition.
- **[buffer-management](./buffer-management.md)** — back-buffer
  policy needs DVR-aware shape. Seek-from-arbitrary-position
  gap-fill is exercised aggressively under DVR. Both phases of
  buffer-management interact with this feature; the open question
  on back-buffer policy shape (variant-specific behavior vs
  configurable threshold) is shared.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — `Infinity`
  duration semantics during recording; finite duration on event-
  stream termination. Same MSE writer semantics as live;
  `endOfStream` gate logic applies uniformly.
- **[non-zero-pts-support](./non-zero-pts-support.md)** — DVR and
  event streams typically have PTS far from zero (recording starts
  at wall-clock time, not at PTS 0). `currentTime` / `seekable`
  semantics require non-zero-PTS support to be correct.
- **`[unsupported-case-error-mapping]`** *(candidate)* — server-
  side retention 404 errors on back-seek fall under this candidate's
  scope for consumer-facing mapping.

## See also

- [live-stream-support.md](./live-stream-support.md) — cluster A
  foundation this feature extends; the doc's "DVR / event boundary"
  open question is resolved by this doc's existence (standalone, not
  absorbed)
- [ll-hls-support.md](./ll-hls-support.md) — sibling cluster A
  extension; orthogonal composition
- [clusters.md § Manifest reload loop](./clusters.md#manifest-reload-loop)
  — cluster A description
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Media-src feature framing
- [conventions/behaviors.md](../conventions/behaviors.md) →
  *Inverse: behaviors that operate uniformly across tracks* — the
  precedent for variant-agnostic writer + variant-specific producer
  split this feature applies to `setLiveSeekableRange`
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #3 (DVR / Event Stream Support)
- [Mux Video Permutations Matrix](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — Stream Type section; SPF column shows ⚠️ for DVR (manifest re-
  polling unverified)
- [HLS Spec — `EXT-X-PLAYLIST-TYPE`](https://datatracker.ietf.org/doc/html/rfc8216bis)
  (§4.4.3.5)
