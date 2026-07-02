---
status: draft
date: 2026-05-20
definition: technical
---

# LL-HLS support

Low-Latency HLS extensions on top of the [live-stream-support](./live-stream-support.md)
reload-loop foundation: **blocking reload** for server-gated playlist
refresh, **partial segments** for sub-segment append granularity at the
live edge, **preload hints** for pre-fetching the next part before it's
announced, and **delta playlists** for bandwidth-efficient reloads.
Together these mechanisms collapse the engine's distance from the live
edge from "≥3× target duration" (regular live) to "≤ a few parts"
(low-latency live).

A **Media-src feature** in the framing from
[clusters.md § Feature classification axes](./clusters.md#feature-classification-axes):
LL-HLS-encoded sources play *technically* via the regular live reload
loop (each full segment lands when announced, just with regular-live
latency), but "actual support" — engaging the partials / blocking-reload
/ preload mechanisms the server advertises — requires this feature.
Without it, LL-HLS sources play at regular-live latency, not the
low-latency the producer optimized the stream for.

## Status

- **Composition:** not implemented. Hard prerequisite [live-stream-support](./live-stream-support.md)
  is also not implemented. None of `parseMediaPlaylist`, the reload
  loop (which doesn't exist yet), `forward-buffer`'s planner, or
  `createTrackedFetch` currently handle LL-HLS shapes.
- **Definition depth:** technical — scope and SPF touchpoints
  articulated against the HLS LL-HLS spec extensions; implementation
  specifics open. Source material: [SPF Epics Working Doc — LL-HLS
  Support (epic #1)](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  (cluster A, eng size XL, validation M-L, "Largest single gap").
- **Hard prerequisite:** [live-stream-support](./live-stream-support.md).
  The four LL-HLS mechanisms all build on the reload-loop, sliding-
  window, live-edge-tracking, and `Infinity`-duration primitives that
  feature introduces. LL-HLS is not independently scopable.

## Phases of complexity

Capability slices, each one an HLS LL-HLS spec extension. Naive vs Full
depth applies *within* each phase per
[clusters.md § Feature classification axes](./clusters.md#naive-vs-full-implementation-depth);
e.g., blocking reload at naive depth without preload hints, full depth
combining the two.

| Phase | What | Notes |
|---|---|---|
| Blocking reload | `_HLS_msn=N&_HLS_part=P` query params on playlist reload; server holds the response until the target msn/part is available. Replaces target-duration interval polling with response-driven request chaining. Parser must surface `#EXT-X-SERVER-CONTROL:CAN-BLOCK-RELOAD=YES` to enable the mechanism | Largest shift from regular live: the reload loop's *pacing model* changes (response-driven, not interval-driven). `createTrackedFetch` needs long-poll-aware request semantics — a single request may legitimately take ~target-duration to respond |
| Partial segments | `#EXT-X-PART:URI=...,DURATION=...,INDEPENDENT=...,GAP=...,BYTERANGE=...` tags within the most-recent few segments. Client fetches and appends partials before the full segment is announced via `#EXTINF`. Parser must surface `#EXT-X-PART-INF:PART-TARGET=...` (target part duration) and per-part attributes | Append still goes through the same `SourceBufferActor` (same variant, same codec — no `changeType()`). The forward-buffer planner must extend beyond `track.segments[]` to include a "partial head" past the last complete segment; reconcile a part eventually being superseded by its containing full segment (same media interval, two playlist entries) |
| Preload hints | `#EXT-X-PRELOAD-HINT:TYPE=PART,URI=...` (or `TYPE=MAP`). Client may pre-fetch the indicated URL before it appears in the playlist as a regular `EXT-X-PART`. Used in combination with blocking reload to pipeline the next fetch behind the in-flight blocking-reload response | Pre-fetched response is retained and consumed when the URL appears as a regular `EXT-X-PART` on the next reload; double-fetch must be avoided. Pre-fetch is *only* a latency optimization — never gates other phases |
| Delta playlists | `_HLS_skip=YES` query param on reload; server responds with a playlist containing `#EXT-X-SKIP:SKIPPED-SEGMENTS=N` denoting N segments removed from the start. Client merges the delta into its retained playlist state. Parser must surface `#EXT-X-SERVER-CONTROL:CAN-SKIP-UNTIL=...` (the minimum-skippable boundary advertised by the server) | Requires the client to retain playlist state across reloads — today's `parseMediaPlaylist` returns a fresh `Track` per fetch, so the reload-loop behavior gains a delta-merge step. Bandwidth optimization, not latency: complements but doesn't replace blocking reload + partials |

## What's in scope vs out of scope

**In scope:**
- All four phases above, applied to HLS LL-HLS-encoded sources where
  `#EXT-X-SERVER-CONTROL` advertises the capability
- Parser surface for `EXT-X-SERVER-CONTROL`, `EXT-X-PART-INF`,
  `EXT-X-PART`, `EXT-X-PRELOAD-HINT`, `EXT-X-SKIP`, `EXT-X-RENDITION-REPORT`
- Long-poll-aware fetch shape (timeout policy compatible with
  blocking-reload response holds)
- Forward-buffer planner extension for partial-head tracking
- Client-side playlist-state retention across reloads (for delta merge)

**Out of scope (sister Media-src candidate features):**
- **`[live-edge-distance-abr]`** *(candidate, cluster C extension)* —
  using distance-from-live-edge as an ABR signal alongside bandwidth.
  Consumer of LL-HLS's tighter live-edge tracking but not part of
  LL-HLS itself.

**Out of scope (different architectural layer):**
- Above-engine UI affordances ("seek to live edge," "currently live,"
  live-button states). Consume LL-HLS-tightened live-edge data via the
  live-stream-support feature's derived live-edge signal; not SPF
  concerns themselves.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Reload-loop composition variant** — LL-HLS isn't a runtime branch
  inside a regular-live reload behavior; it's a *different* reload-loop
  behavior composed into a low-latency live engine variant. Same shape
  as `live-stream-support.md`'s `setLiveSeekableRange` placement
  decision: a new variant-specific behavior, not a conditional inside
  an existing variant-agnostic behavior. Per the failure-mode catalog
  and `conventions/behaviors.md` § *Inverse: behaviors that operate
  uniformly across tracks*, the existing `updateMediaSourceDuration`
  is the canonical example of a behavior that stays composition-
  variant-agnostic; the LL-HLS reload-loop is its inverse — a
  variant-specific behavior that exists *only* in the LL-HLS engine.
- **Variant-decision point — open** — where does the engine commit to
  the LL-HLS variant: adapter-level upfront (consumer opts in), or
  after-first-playlist-parse from `EXT-X-SERVER-CONTROL` flags? The
  spec allows a stream to advertise some LL-HLS capabilities and not
  others (e.g., partials without blocking-reload), so per-mechanism
  composition is possible. Either way the *behaviors* are variant-
  specific; the question is when the composition is finalized.
- **`parseMediaPlaylist` extensions** — parser today returns a `Track`
  with segments only. LL-HLS adds: `serverControl` flags, `partInf`
  (part target duration), `parts[]` within the head segment(s), a
  current `preloadHints[]`, optional `skip` metadata. The parser
  output schema grows; the parsed-track shape that downstream
  behaviors consume gains LL-HLS-specific fields. Intersects with
  [presentation-modeling.md](../presentation-modeling.md)'s open
  question on `parseMediaPlaylist` pluggability — LL-HLS-aware
  parsing is a strong forcing function for explicit parser-extension
  shape.
- **`createTrackedFetch` request shape** — today the wrapper handles
  streaming responses chunk-by-chunk with EWMA bandwidth sampling. No
  changes needed for *partial-segment loading* (same wrapper, smaller
  payloads — bandwidth sampling continues working). **Required change
  for blocking reload:** the wrapper has no long-poll-aware timeout
  policy today. A blocking-reload request may legitimately take up to
  `target-duration` to respond; needs either a configurable per-request
  timeout or a request-type discriminant. Per the sampling-baked-into-
  loading pattern, the sample producer doesn't move.
- **Forward-buffer planner extension** — current planner iterates
  `track.segments[]` (full segments) and filters by buffered ranges
  within a fixed look-ahead. LL-HLS extends the candidate set with
  partials past the last complete segment, plus a reconciliation rule:
  if part `P` covers `[t0, t1]` and the same interval later appears as
  part of full segment `S`, both entries map to the same media
  interval; the planner must not double-load. Low-latency-aware
  buffer-duration setting is a separate tunable — the default 30s
  target buffer is incompatible with low-latency-live's "stay within
  a few parts of live edge" goal.
- **Sliding-window awareness under partials** — the segment list
  mutates more frequently (partials append at the live edge between
  full-segment announcements). Existing sliding-window-aware back-
  buffer policy from `live-stream-support` continues to apply to
  full segments; partials past the head are transient by definition.
- **`liveSeekableRange` update frequency** — `setLiveSeekableRange` from
  live-stream-support advances as the live edge advances. Under
  LL-HLS, the edge advances at part granularity (sub-second updates,
  not target-duration interval). Same writer, higher update rate; no
  new multi-writer concern.
- **Per-type partial coordination** — audio playlists can also carry
  `EXT-X-PART`. Inherits live-stream-support's open question on per-
  type reload coordination, with the additional concern that audio
  and video parts may have different target durations.

## Open questions

- **Variant-decision point.** Per the cross-cutting note above:
  adapter-level upfront vs after-first-playlist-parse vs per-mechanism
  granular composition. Affects how the engine is built and how the
  capability-detection signal flows. Resolving this likely shapes how
  the regular-live engine variant is composed too.
- **Pre-fetch retention scope.** Preload hints pre-fetched in response
  to one playlist snapshot may be invalidated by the next snapshot
  (server changed its mind about the next part URI). Retention policy:
  abort and discard, or hold pending validation against the next
  playlist? Spec leaves this to implementations.
- **Long-poll fetch shape vs `createTrackedFetch` extension.** Add a
  new request-type discriminant to the existing wrapper (with longer
  timeout), or a sibling `fetchBlockingReload` wrapper that delegates
  to the same chunk-streaming infrastructure? Trade-off: one wrapper
  with conditional timeout vs two wrappers with shared chunk handling.
- **Planner extension shape — extend `forward-buffer` or sibling.** The
  current `getForwardBufferSegments` is a pure function over
  `Segment[]`. Either it grows a `parts?: PartSegment[]` parameter
  (and a reconciliation rule baked in), or a sibling
  `getForwardBufferPartials` runs alongside and the loader merges. The
  reconciliation logic (part superseded by containing full segment) is
  the load-bearing piece either way.
- **Capability advertisement vs runtime probing.** If the server
  advertises `CAN-SKIP-UNTIL` but the client has already retained less
  history than the skip boundary, the client must fall back to a
  full-playlist reload. Where this fallback decision lives — inside
  the delta-merge step or as a reload-shape decision upstream — is
  open.
- **`#EXT-X-RENDITION-REPORT` consumption.** Spec lets the server
  advertise the LAST-MSN/LAST-PART for *other* renditions in the
  playlist; clients switching renditions can resume at the right point
  without an extra round-trip. Useful for ABR-driven variant switching
  under LL-HLS but a separate optimization. May be a sub-phase of
  partial-segments or its own follow-on.
- **GAP=YES handling.** `#EXT-X-PART` may carry `GAP=YES` indicating
  the encoder failed to produce the part on time; clients are spec-
  advised to fetch the next part anyway and let the buffer underrun.
  How this interacts with `endOfStream` gating (a "gap" past the live
  edge isn't a true terminator) and stall recovery (the underrun
  isn't a network stall) is open.

## Related features

- **[live-stream-support](./live-stream-support.md)** *(hard
  prerequisite)* — provides the reload loop, sliding-window tracking,
  live-edge tracking, `Infinity`-duration semantics, termination
  detection, and `setLiveSeekableRange` placement. LL-HLS is
  structurally an extension of this feature's reload loop with a
  different pacing model, finer-grained segment list, and added
  optimizations.
- **[dvr-event-stream-support](./dvr-event-stream-support.md)** —
  sibling extension on the same reload loop with different windowing
  semantics. Orthogonal to LL-HLS: a DVR stream can also be low-
  latency (DVR + LL-HLS), in which case both features compose.
- **[presentation-modeling](../presentation-modeling.md)** —
  `parseMediaPlaylist` extensions for LL-HLS tags forces the question
  of parser pluggability raised in that doc's open questions. The two
  features intersect tightly.
- **[buffer-management](./buffer-management.md)** — forward-buffer
  planner extension for partials lives in the same `media/buffer/`
  neighborhood; same back-buffer policy applies for full segments
  below the live edge.
- **[video-abr](./video-abr.md)** — variant switching under LL-HLS
  uses the same `bandwidthState` signal; partial-segment chunked-
  sampling continues to feed it via `createTrackedFetch`.
  `EXT-X-RENDITION-REPORT` consumption (deferred, see Open questions)
  is the LL-HLS-aware variant-switch optimization.
- **[non-zero-pts-support](./non-zero-pts-support.md)** — live streams
  including LL-HLS typically have PTS far from zero; the time-mapping
  primitive is consumed by live (including LL-HLS) for correct
  `currentTime` / `seekable` semantics.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — partial-segment
  append is same-codec append on the same `SourceBufferActor`; no
  `changeType()`, no buffer recreation. The MSE codec-change check
  explicitly does not fire for LL-HLS.

## See also

- [live-stream-support](./live-stream-support.md) — the cluster A
  foundation this feature extends
- [clusters.md § Manifest reload loop](./clusters.md#manifest-reload-loop)
  — cluster A description
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Media-src feature framing
- [presentation-modeling.md](../presentation-modeling.md) — parser
  interface; LL-HLS-aware parsing is a strong forcing function on
  parser pluggability
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #1, "Could split: blocking reload, partial
  segments, delta playlists, preload hints"
- [Mux Video Permutations Matrix](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — Stream Type section; SPF column shows 🔲 for LL-HLS
- [HLS Spec — Low-Latency HLS](https://datatracker.ietf.org/doc/html/rfc8216bis)
  (§4.4.5 EXT-X-PART, §4.4.3 EXT-X-SERVER-CONTROL, §4.4.5 EXT-X-PRELOAD-HINT,
  §6.2.5 Delta Playlists)
