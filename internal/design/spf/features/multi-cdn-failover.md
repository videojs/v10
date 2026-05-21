---
status: draft
date: 2026-05-20
definition: coarse
---

# Multi-CDN failover

Alternate-URI rotation for HLS sources with multiple CDN paths to the
same content. When a fetch fails on the active URI (after
[network-resilience](./network-resilience.md)'s retries are
exhausted), rotate to the next URI in the rendition's alternate-URI
list. Mux Video produces such sources via the `?redundant_streams=true`
playback URL parameter; HLS spec / vendor conventions provide the
manifest-side declaration. Cluster G sister feature to
`network-resilience`; consumes the foundation's retry + circuit-
breaker primitives and adds the URI-rotation policy on top.

A **Media-src feature** for sources that genuinely require it
(redundant-streams sources where the customer expects automatic
failover) and a **Player feature** at Tier 2 (customer-customizable
rotation policies). Notion epic #9 classifies as "Media-src? /
Player?" — the ambiguity reflects the dual scope.

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. The
  parser doesn't recognize alternate-URI declarations; no rotation
  policy state; no failover behavior. Single-URI behavior throughout.
- **Definition depth:** coarse — scope from Notion epic + Mux Video
  convention + network-resilience composition; SPF touchpoints
  sketched at the cluster level. Implementation details (parser
  syntax, state-slot shape, rotation defaults) tracked as open
  questions.
- **Hard prerequisite:** [network-resilience](./network-resilience.md).
  Rotation triggers on the foundation's retry-exhaustion signal;
  per-URI health tracking consumes the foundation's circuit-breaker
  state.

## Phases of complexity

[Tier 1 / Tier 2 framing](./clusters.md#tier-1-spec-compliant-baseline-vs-tier-2-custom-behavior)
per Notion epic #9 ("Tier 1: Parse spec-extension alternate URIs.
Tier 2: Rotation policy, backoff strategy."). Each phase notes Naive
vs Full depth where relevant per the
[Naive vs Full framing](./clusters.md#naive-vs-full-implementation-depth).

| Phase | Tier | What | Notes |
|---|---|---|---|
| Alternate-URI parsing + presentation surfacing | Tier 1 | Parser extracts alternate-URI lists from multivariant playlist (HLS spec extension or vendor convention; syntax open). Presentation `Track` data shape grows an `alternateUris: string[]` field (or similar) on each rendition | Parser extension; [presentation-modeling](../presentation-modeling.md)'s `Track` shape grows. Tier 1 spec-compliant baseline: surface what the manifest says. **Naive:** parse the simplest known syntax (Mux convention). **Full:** support multiple alternate-URI declarations across HLS spec drafts + vendor variants |
| Active-URI state + initial selection | Tier 1 | New state slot — per-rendition active-URI tracking (e.g., `selectedRenditionUris: Map<TrackId, string>` or per-Track field on resolved presentation). Initial value: first URI in each rendition's `alternateUris` list. Behaviors consuming `Track.uri` (segment loading, playlist reload, manifest fetch) read the active URI rather than the canonical URI | Constraint+filter shape: active-URI slot is the read-side for downstream consumers; rotation policy (Tier 2) is the write-side. Without rotation, this phase is degenerate-equivalent to single-URI behavior — Tier 1 alone provides parsing but not failover |
| Rotation on retry-exhaustion | Tier 2 | When `network-resilience` exhausts retries on the active URI for a given rendition, rotate to the next URI in the list. Active-URI slot updates; consumers re-fetch using the new URI. The rotation policy controls *which* URI is chosen next | Consumes [network-resilience](./network-resilience.md)'s retry-exhaustion signal. **Naive:** round-robin through the list. **Full:** primary-preferred-with-fallback (return to primary when its circuit-breaker cools), or weighted, or region-aware. Live + multi-CDN composition: reload-loop failover during live consumes this phase too |
| Per-URI health tracking | Tier 2 | Combine `network-resilience`'s per-URI circuit-breaker state into a health score per alternate URI. Rotation reads health when choosing next URI — skip known-unhealthy URIs without trying them. Health values surface from the breaker's `healthy` / `cooldown` / `unhealthy` state | Consumes `network-resilience`'s circuit-breaker primitive. Likely a derived signal (computed from breaker state). **Naive:** binary healthy/unhealthy from breaker state. **Full:** time-decayed health score that distinguishes "recently-cooled" from "long-healthy" |
| Customer-policy hooks | Tier 2 | Pluggable hooks: `selectAlternateUri(failedUri, candidates, history) → string`. Customer can override default rotation (region-preferred ordering, weighted, A/B testing, regulatory-compliant routing) | Tier 2 customer-policy surface. Built-in defaults; hooks override when set. Adapter-layer customer-facing toggles ("prefer CDN A" UI) wire through these hooks |

## What's in scope vs out of scope

**In scope:**
- All five phases above for HLS sources with alternate-URI
  declarations
- Parser support for alternate-URI lists (Mux convention syntax + any
  HLS spec extension forms)
- Active-URI state slot + rotation policy
- Integration with `network-resilience`'s retry-exhaustion + circuit-
  breaker primitives
- Customer-pluggable rotation hooks
- Live + multi-CDN composition (reload-loop failover during live
  streams)

**Out of scope (separate cluster G sister features):**
- **[network-resilience](./network-resilience.md)** *(foundation,
  prerequisite)* — retry + backoff + circuit-breaker. Multi-CDN
  consumes; doesn't reimplement.
- **[content-steering](./content-steering.md)** — HLS content-
  steering protocol. Server-side host-pool advertisement (dynamically
  updated). Different mechanism than static alternate-URI lists.
  Content-steering's pathway-priority composes with this feature's
  rotation primitive: pathway-priority is the dynamic ordering bias
  (a sort key); static manifest alternate-URI lists are the static
  candidate set.

**Out of scope (different architectural layer):**
- Adapter-layer customer-facing UI surfaces (e.g., "Switch CDN"
  buttons, region-preferred dropdowns). Consumer policy expressed via
  this feature's Tier 2 hooks.
- CDN-side load balancer / origin-shield / health-check infrastructure.
  Service-side concerns; engine reacts to what the CDN responds with.
- DRM key-server failover. Even when license fetches are CDN-routed,
  the failover concern lives under [drm-support](./drm-support.md)
  (license-fetch retries) + this feature's primitive may compose, but
  the key-server-specific rotation policy is DRM-side state.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **Per-rendition vs per-presentation active URI.** Each rendition
  can have its own alternate-URI list (different CDN paths per
  bitrate variant) OR all renditions share the same active-URI
  index. Per-rendition is more flexible (one rendition's CDN can be
  unhealthy while others are fine); per-presentation is simpler
  (one rotation state for the source). Lean: per-rendition. Affects
  state-slot shape (`Map<TrackId, string>` vs single index).
- **Active-URI slot writer composition.** This feature writes the
  active URI; downstream behaviors read it. Single-writer slot —
  this feature's rotation behavior is sole writer. The slot is read
  by segment-loading, playlist-reload (when live-stream-support
  lands), manifest-fetch. Standard constraint+filter pattern.
- **Parser surface for alternate-URI declarations.** HLS spec
  extensions vary; Mux uses one convention. Parser-pluggability
  question from [presentation-modeling](../presentation-modeling.md)
  is sharpened by this feature — alternate-URI parsing extends the
  `parseMediaPlaylist` / `parseMultivariantPlaylist` schema. Likely
  HLS-only initially; format-extension to DASH/MoQ adds different
  shapes.
- **Live + multi-CDN composition.** During live playback, manifest
  reload-loop fetches periodically. Reload-fetch retry-exhaustion
  should trigger rotation (and the new URI's reload-loop continues).
  Cross-feature with [live-stream-support](./live-stream-support.md)
  (not implemented yet).
- **Composition with `[content-steering]`.** Content-steering's
  server-advertised host pool changes the rotation's candidate set
  dynamically. Two composition shapes: (a) content-steering writes
  to the `alternateUris` list (replacing the static manifest values);
  (b) content-steering writes a separate `steeredHosts` slot that
  composes with `alternateUris` (intersect, prefer, etc.). Open
  question — when content-steering lands.
- **Rotation state across source changes.** When the consumer changes
  `presentation.url`, the active-URI state tears down with the source
  (per [source-replacement](./source-replacement.md)'s cascade). Per-
  URI circuit-breaker state in `network-resilience` may persist across
  sources for the same hosts (cross-source-resilience benefit).
- **Per-stream-type rotation coordination.** A presentation with
  separate audio and video URIs (each possibly with their own
  alternate-URI lists) can rotate them independently. Live + multi-
  CDN with per-track rotation: each track's reload-loop manages its
  own active-URI rotation. Inherits live-stream-support's per-type
  reload-coordination open question.

## Open questions

- **Alternate-URI manifest syntax.** HLS spec extension(s) vs Mux
  convention vs both. Parser scope question. Open until the first
  alternate-URI-bearing manifest lands as a test fixture.
- **Per-rendition vs per-presentation active URI.** Per the cross-
  cutting note; lean per-rendition for flexibility.
- **Default rotation policy.** Round-robin vs primary-preferred vs
  weighted. Lean: primary-preferred-with-circuit-breaker-cooldown-
  return.
- **Composition with content-steering.** Static `alternateUris`
  manifest values + dynamic content-steering host-pool: how to
  combine? Replacement vs intersection vs preference order?
- **Rotation-state preservation.** Reset on source change (default)
  vs preserve via the `bandwidthState`-style cross-source-survival
  pattern (rare in this case — rotation state is per-URI, and URIs
  are per-source).
- **Customer-hook contract.** Function signature, async semantics,
  failover-after-hook-failure policy. Same shape question as
  network-resilience's hook design; harmonize.
- **DRM license-fetch interaction.** When `drm-support` lands, license
  fetches go through CDN routing too. Multi-CDN rotation for license
  fetches: same feature, or DRM-side?
- **Per-stream-type rotation coordination.** Independent rotation
  per type (video / audio / text) is the default; whether to allow
  coordinated rotation (single failover decision rotates all types)
  is an open Tier 2 question.

## Related features

- **[network-resilience](./network-resilience.md)** *(hard
  prerequisite)* — retry + backoff + circuit-breaker foundation.
  Multi-CDN consumes the retry-exhaustion signal (rotation trigger)
  and the per-URI circuit-breaker state (per-URI health tracking).
- **[content-steering](./content-steering.md)** — parallel sister;
  dynamic host-pool advertisement variant. Pathway-priority composes
  with this feature's rotation primitive (sort-key shape).
- **[presentation-modeling](../presentation-modeling.md)** — `Track`
  data shape grows `alternateUris` field; parser extension is in
  scope here.
- **[live-stream-support](./live-stream-support.md)** *(not yet
  implemented)* — reload-loop failover during live consumes this
  feature's rotation primitive. Per-type reload coordination open
  question applies.
- **[source-replacement](./source-replacement.md)** — active-URI
  state tears down via the resolved/unresolved cascade on source
  change.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — segment-fetch
  sites consume the active-URI slot indirectly via `Track.uri` reads.
- **[drm-support](./drm-support.md)** *(not implemented)* — license-
  fetch failover question: same feature's rotation, or DRM-side?
- **[video-abr](./video-abr.md)** / **[audio-abr](./audio-abr.md)** —
  ABR operates within a rendition; rotation operates on the rendition's
  URI. Orthogonal axes; both compose.

## See also

- [clusters.md § Selection resilience](./clusters.md#selection-resilience)
  — cluster G description; this feature is the selection-side
  resilience sister to `network-resilience`'s response-error
  handling
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Tier 1 / Tier 2 framing; Media-src? / Player? classification
  ambiguity
- [presentation-modeling.md](../presentation-modeling.md) — parser-
  pluggability open question; alternate-URI parsing is one
  forcing function
- [network-resilience.md](./network-resilience.md) — hard prerequisite;
  retry + circuit-breaker foundation
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #9 (Multi-CDN Failover)
- [Mux Video — `?redundant_streams=true`](https://www.mux.com/docs/guides/play-back-on-multiple-cdns)
  — Mux Video convention for redundant-CDN sources
