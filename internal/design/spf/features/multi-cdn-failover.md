---
status: draft
date: 2026-06-05
definition: sketched
---

# Multi-CDN failover

CDN selection and failover for HLS sources that publish the same content
on more than one host (e.g. Mux Video's `?redundant_streams=true`). The
redundant variants parse as ordinary candidate tracks — one per
(rendition × CDN) — so the work is **selecting which CDN to use and
keeping the whole presentation on it**, modeled inside the
[track-switching rule model](../track-switching-model.md) rather than as
URL rewriting at fetch time.

Two sub-features, mapping onto the two rule kinds in that model:

1. **Sticky CDN pick** *(implemented)* — a session-level behavior picks a
   CDN (the manifest-head host) and holds it; a shared **scope** rule
   (`preferActiveCdn`) narrows every track type's candidates to that CDN,
   so video / audio / text resolve from one host. This is the
   *active-pathway scope* the track-switching model lists for
   multi-cdn-failover.
2. **Failover** *(deferred)* — when requests to the active CDN fail too
   often within a window, a **constraint** removes that CDN's tracks from
   the candidate set during cooldown and the session behavior rotates the
   active CDN. This is the *failed-CDN constraint* the model lists, and it
   consumes [network-resilience](./network-resilience.md)'s per-host
   circuit-breaker — its hard prerequisite.

A **Media-src feature** for sources that genuinely require failover, with
a **Player feature** surface at the failover tier (customer-customizable
CDN policy). Notion epic #9 classifies as "Media-src? / Player?" — the
ambiguity reflects that split.

## Status

- **Composition:** sub-feature 1 (sticky CDN pick) is implemented in
  `createSimpleHlsEngine` and `createHlsAudioOnlyEngine`. The
  `resolveCdnPriority` behavior owns the `cdnPriority` signal (the
  manifest-ordered CDN list, most-preferred first); the `preferActiveCdn`
  scope rule (shared by the video + audio chains in `track-switching`)
  narrows candidates to the highest-priority CDN with surviving tracks.
  Failover (sub-feature 2) is not implemented — no constraints pass, no
  per-CDN failure tracking, no rotation.
- **Definition depth:** sketched — sub-feature 1 has a populated
  implementation surface + verification; sub-feature 2 stays at the
  scope-and-constraints level pending its prerequisite.
- **Hard prerequisite (failover only):**
  [network-resilience](./network-resilience.md). The failed-CDN
  constraint consumes the foundation's per-host circuit-breaker /
  retry-exhaustion state. Sub-feature 1 has no such dependency — it's
  pure selection over the already-parsed candidate set.
- **Governing model:** [track-switching-model.md](../track-switching-model.md)
  — multi-CDN is the canonical *constraint + scope* feature there. The
  active-CDN scope is a soft filter in the rule chain; the failed-CDN
  constraint is a hard filter in the (not-yet-built) constraints pre-pass.

## How redundant streams are modeled

There is no `alternateUris` field and no fetch-time URL rotation. A
redundant-streams manifest lists each rendition once per CDN (duplicate
`#EXT-X-STREAM-INF` / `#EXT-X-MEDIA` entries on different hosts), and the
existing parser already emits one `Track` per entry with a unique id and
its own absolute `url`. So the candidate set for each type *already*
contains one variant per CDN. CDN identity is derived from each track
URL's origin (`getCdnId`); the set of CDNs is published as a single
per-presentation ordered signal (`cdnPriority`, most-preferred first —
mirroring HLS content steering's `PATHWAY-PRIORITY`). The *active* CDN is
not stored: the scope derives it as the highest-priority `cdnPriority`
entry that still has tracks after the constraints pass. Selecting a
CDN-tagged track id means `resolveTrack` / segment loading fetch from that
CDN with no further plumbing.

This list shape is what makes failover fall out cleanly: the failed-CDN
constraint (sub-feature 2) prunes a cooled-down CDN's tracks, so
"first-with-survivors" moves to the next CDN automatically and returns to
the primary when it recovers — no reactive rewrite of an "active" value.
Content steering, likewise, just reorders `cdnPriority` (pathway priority
as a sort key).

This is why sub-feature 1 needed **no parser change** and no new data
shape — only a selection behavior and a scope rule over existing tracks.

## Phases of complexity

| Phase | Sub-feature | Kind | What | State |
|---|---|---|---|---|
| Sticky CDN pick | 1 | scope | `resolveCdnPriority` publishes the manifest-ordered CDN list (`cdnPriority`); `preferActiveCdn` narrows every type's candidates to the highest-priority CDN with surviving tracks, falling through when nothing matches. Shared list → all types on one CDN | **Implemented** |
| Failed-CDN constraint | 2 | constraint | A constraint in the track-switching constraints pre-pass removes a cooled-down CDN's tracks from the candidate set. The scope then picks the next `cdnPriority` entry automatically. Requires the generic constraints phase (track-switching-model "Phase 2") to be built first | Deferred |
| Per-CDN failure tracking | 2 | — | Count per-CDN fetch failures within a window; mark a CDN unhealthy / in cooldown. Consumes `network-resilience`'s circuit-breaker | Deferred (prereq) |
| CDN priority override / steering | 2 | scope | Reorder `cdnPriority` to bias the pick (region-preferred, weighted, or content-steering's pathway priority). No reactive "active" rewrite needed — the order *is* the policy | Deferred |
| Customer CDN-id derivation | 2 | config | Pluggable `getCdnId` for non-origin identity. The origin-based default is built in; a config seam is anticipated | Deferred |

## What's in scope vs out of scope

**In scope:**
- Sticky per-presentation CDN selection (sub-feature 1, done)
- Failover via a track-switching constraint + active-CDN rotation
  (sub-feature 2)
- Per-CDN health derived from `network-resilience`'s circuit-breaker
- Customer-configurable CDN-id derivation / rotation policy

**Out of scope (separate cluster G sister features):**
- **[network-resilience](./network-resilience.md)** *(foundation,
  prerequisite for failover)* — retry + backoff + circuit-breaker.
  Multi-CDN consumes; doesn't reimplement.
- **[content-steering](./content-steering.md)** — HLS content-steering
  protocol (server-advertised, dynamically-updated host pool). Different
  mechanism than static redundant streams, but the *same* active-pathway
  scope shape: content-steering picks the active pathway dynamically; the
  scope reflecting it is the one implemented here. Designed-with-in-mind:
  `cdnPriority` is a reorderable list a steering behavior writes (pathway
  priority as a sort key), and the scope honors the order unchanged.

**Out of scope (different architectural layer):**
- Adapter-layer customer-facing UI ("Switch CDN" buttons). Consumer
  policy is expressed via the failover tier's config seam.
- CDN-side load balancer / origin-shield infrastructure. Service-side.
- DRM key-server failover — lives under [drm-support](./drm-support.md).

## Likely cross-cutting impact

- **Per-presentation, not per-rendition (resolved).** A single
  `cdnPriority` list governs all track types — the per-presentation
  coherence requirement. The track-switching model's
  "cross-type consistency is a composition convention" applies: both the
  video and audio chains reference the *same* `preferActiveCdn` definition
  reading the *same* list, so they agree on the CDN even if their per-type
  track arrays differ. (The doc's earlier per-rendition lean is superseded.)
- **`cdnPriority` writer composition.** `resolveCdnPriority` is the sole
  writer today (publishes the manifest order). Failover needs no second
  writer — the failed-CDN constraint prunes tracks and the scope re-derives
  the active CDN. Content-steering would *reorder* `cdnPriority` (still a
  single owning behavior; the list reflects one upstream priority).
- **Active CDN is derived, not stored.** The scope computes "highest
  priority with surviving tracks," so failover and recovery need no extra
  state: pruning moves the pick to the next CDN, un-pruning returns it to
  the primary. This is why the array beats a single reactive `activeCdn`
  value — the failed-set information is applied once (in the constraint),
  not duplicated into an active-value rewrite.
- **Constraints phase is a shared prerequisite.** The failed-CDN
  constraint can't land until the generic constraints pre-pass
  (`applyConstraints` + the `constraints` config field + empty-playable-set
  terminal state) is built into `setupTrackSwitching`. The seam exists
  (`candidateSet` computed); the machinery does not. capability-probing
  shares this prerequisite.
- **Live + multi-CDN.** During live playback the reload loop re-resolves
  the presentation; `resolveCdnPriority` re-publishes only when the CDN set
  changes (idempotent for a stable manifest). Cross-feature with
  [live-stream-support](./live-stream-support.md) (not yet implemented).
- **Priority state across source changes.** `cdnPriority` tears down with
  the source via the resolved/unresolved cascade (per
  [source-replacement](./source-replacement.md)); per-host circuit-breaker
  state in `network-resilience` may outlive a source.

## Open questions

- **Constraints-phase shape.** How `applyConstraints` and the
  empty-playable-set terminal state are modeled — owned by the
  track-switching constraints work, consumed here. (See
  [track-switching-model.md](../track-switching-model.md) → *Fitting the
  model to the track-switching behavior*.)
- **Failure-window policy.** Threshold count / window length / cooldown
  duration for marking a CDN unhealthy. Empirical; lives with
  `network-resilience`'s circuit-breaker.
- **CDN-id derivation configurability.** Origin-based `getCdnId` is the
  default; whether/where to expose a consumer override (config field vs.
  rule config view) is deferred until a non-origin case appears.
- **Composition with content-steering.** Static redundant CDNs +
  dynamic steered host pool: does steering replace, intersect, or
  reprioritize the candidate CDNs? Open until content-steering lands; the
  reorderable `cdnPriority` list keeps it tractable (steering reorders it).

### Resolved during sub-feature 1 implementation

- **Signal shape** → a per-presentation ordered `cdnPriority` list (active
  = first-with-survivors, derived), not a single stored `activeCdn` value
  and not per-rendition. The list makes failover a pure constraint and
  composes with content-steering as a reorder. Matches the cross-type
  coherence requirement (one shared list).
- **CDN identity** → URL origin (`getCdnId`); configurable derivation
  deferred.
- **Manifest syntax / parser** → no change. Redundant variants already
  parse as separate per-CDN tracks; no `alternateUris` field needed.
- **Architecture** → constraint + scope in the track-switching model, not
  active-URI rotation in `resolveTrack`.

## Implementation surface

- **`packages/spf/src/media/utils/cdn.ts`** — `getCdnId(url)` (origin-based
  CDN identity) and `getOrderedCdnIds(presentation)` (distinct CDNs in
  manifest order; head = primary).
- **`packages/spf/src/playback/behaviors/resolve-cdn-priority.ts`** —
  `resolveCdnPriority` behavior + `ResolveCdnPriorityState`. Machine reactor
  on `presentation-unresolved` ↔ `presentation-resolved`; owns the
  `cdnPriority` signal; publishes `getOrderedCdnIds(presentation)` (skipping
  the write when the CDN set is unchanged), clears on exit.
- **`packages/spf/src/playback/behaviors/track-switching.ts`** —
  `preferActiveCdn` scope rule (soft filter on `cdnPriority`: narrow to the
  highest-priority CDN with surviving tracks), added to both variants'
  chains: `[filterByUserSelection, preferActiveCdn, rankByBandwidth]`.
  `SwitchableTrack` gains `url` (the rule's input).
- **`packages/spf/src/playback/engines/hls/engine.ts` +
  `engine-audio-only.ts`** — `resolveCdnPriority` composed after
  `resolvePresentation`; `cdnPriority?: string[]` added to both engine state
  interfaces.

State signal: `cdnPriority?: string[]` (CDN origins, most-preferred first),
owned by `resolveCdnPriority`, read optionally by `preferActiveCdn`.

## Verification

Sub-feature 1:

- `media/utils/tests/cdn.test.ts` — `getCdnId` (origin extraction;
  same/different host; scheme+port; unparseable fallback);
  `getOrderedCdnIds` (distinct CDNs in order; dedupe; single-CDN;
  unresolved → `[]`).
- `playback/behaviors/tests/resolve-cdn-priority.test.ts` — publishes the
  manifest-ordered CDN list; single-CDN source; skips the write when a
  resolved swap keeps the same CDNs; updates when the order changes; clears
  on src unload + on destroy; re-publishes after a src reset.
- `playback/behaviors/tests/track-switching.test.ts` (`preferActiveCdn`
  block) — narrows to the highest-priority CDN overriding manifest track
  order; keeps the pick on the primary; falls through to the next CDN when
  the first has no survivors; falls through to all when none match; no-op
  when `cdnPriority` absent; re-picks reactively when the order changes
  (steering/failover seam); same scope applied to the audio chain
  (cross-type coherence).
- `playback/engines/hls/tests/engine.test.ts` — integration: a
  redundant-stream presentation yields `cdnPriority` = manifest order and a
  video selection on the primary; reordering `cdnPriority` re-narrows and
  the selection follows.

Out of scope / deferred:

- End-to-end + sandbox verification against a real Mux
  `?redundant_streams=true` source (needs a fixture).
- All of sub-feature 2 (failover): blocked on the constraints phase +
  `network-resilience`.

## Related features

- **[track-switching-model.md](../track-switching-model.md)** *(governing
  model)* — multi-CDN is its canonical constraint + scope feature; the
  active-CDN scope is implemented against the rule chain it specifies.
- **[network-resilience](./network-resilience.md)** *(hard prerequisite
  for failover)* — per-host circuit-breaker the failed-CDN constraint
  consumes.
- **[content-steering](./content-steering.md)** — dynamic host-pool
  sibling; shares the active-pathway scope shape (`cdnPriority` as a
  reorderable reflected list — pathway priority as a sort key).
- **[capability-probing](./capability-probing.md)** — shares the
  not-yet-built constraints pre-pass with the failed-CDN constraint.
- **[live-stream-support](./live-stream-support.md)** *(not implemented)*
  — reload-loop re-resolution; `cdnPriority` is republished only when the
  CDN set changes.
- **[source-replacement](./source-replacement.md)** — `cdnPriority` tears
  down via the resolved/unresolved cascade on source change.
- **[video-abr](./video-abr.md)** / **[audio-abr](./audio-abr.md)** — ABR
  ranks within the CDN-narrowed set; the scope runs before the ranker.

## See also

- [track-switching-model.md](../track-switching-model.md) — the rule
  model (constraints → soft filters → ranker) this feature composes into
- [clusters.md § Selection resilience](./clusters.md#selection-resilience)
  — cluster G; this feature is the selection-side resilience sister to
  `network-resilience`'s response-error handling
- [clusters.md § Selection / filtering across clusters](./clusters.md#selection--filtering-across-clusters)
  — cluster G's role: alternate-CDN selection within the chosen track
- [network-resilience.md](./network-resilience.md) — circuit-breaker
  foundation the failover tier consumes
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #9 (Multi-CDN Failover)
- [Mux Video — `?redundant_streams=true`](https://www.mux.com/docs/guides/play-back-on-multiple-cdns)
  — Mux Video convention for redundant-CDN sources
