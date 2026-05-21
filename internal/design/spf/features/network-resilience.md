---
status: draft
date: 2026-05-20
definition: coarse
---

# Network resilience

Defensive engine logic for HTTP retry/backoff, error-class-specific
response handling, and pluggable customer policies. The cluster G
foundation that consumer features ([multi-cdn-failover](./multi-cdn-failover.md),
[content-steering](./content-steering.md) — sister cluster G features) build on, and
the home for borderline response-error handling that today's `hls.js`-
parity behavior (treat 4xx as fatal, naive 5xx retry) doesn't cover.

A **Media-src feature** at Tier 1 (generic retry / spec-compliant
behavior matching `hls.js` parity) layered with **Borderline /
Player feature** scope at Tier 2 (response-aware specialized handling
like VRLT detection, playback-token-expiry refresh, and customer-
configured policies). The Borderline classification per
[clusters.md § Feature classification axes](./clusters.md#media-src-vs-player-vs-borderline)
specifically calls out this kind of work: "for response errors that
emerge from playback behavior (response-error handling)."

Absorbs the previously-candidate `selection-retry-backoff` (now a
Tier 1 phase). Absorbs scope from Notion epics #12 (VRLT — Viewer
Rate Limiting Token handling) and #14 (Playback Token Expiry) as
Tier 2 phases.

## Status

- **Composition:** not implemented in `createSimpleHlsEngine`. No
  retry logic in `packages/spf/src/` today; `createTrackedFetch` and
  other fetch sites treat HTTP errors as fatal. Aligns with `hls.js`'s
  default behavior (4xx fatal, basic 5xx retry).
- **Definition depth:** coarse — scope identified from the cluster
  taxonomy + the conversation reframe + Notion epics; SPF touchpoints
  sketched at the cluster level. Implementation details (retry-policy
  slot vs config, per-site defaults, etc.) tracked as open questions.
- **Foundational** for cluster G — sister candidate features
  (multi-cdn-failover, content-steering) consume this feature's
  retry/backoff primitives + state slots.

## Phases of complexity

[Tier 1 / Tier 2 framing](./clusters.md#tier-1-spec-compliant-baseline-vs-tier-2-custom-behavior)
per the Notion epics taxonomy. Each phase includes a Naive depth (≈
hls.js parity) and Full depth (specialized handling) where the
distinction applies, per the [Naive vs Full framing](./clusters.md#naive-vs-full-implementation-depth).

| Phase | Tier | What | Notes |
|---|---|---|---|
| Generic retry with backoff | Tier 1 | HTTP errors (4xx / 5xx / network failures / timeouts) trigger retry attempts with configurable backoff. Configurable max-retries, base interval, growth factor. Retry-exhaustion surfaces as a state error to upstream behaviors | **Naive:** exponential backoff matching `hls.js` parity (e.g., 1s / 2s / 4s, max 3 retries on 5xx). **Full:** jitter + per-fetch-site policy (manifest retries longer than segment retries; segment retries bounded tightly to avoid playback stall). Integrated into `createTrackedFetch` so retry is transparent to most fetch sites |
| Error classification | Tier 1 | Distinguish error classes: 4xx (generally fatal but some recoverable — 408 / 429), 5xx (transient, retry by default), network errors (timeouts, DNS, abort), 0-status (CORS / opaque). Per-class retry-vs-fatal policy. `Retry-After` header respected when present | **Naive:** 5xx + network errors retry; 4xx fatal. **Full:** per-status-code policy (429 with Retry-After delay, 503 with Retry-After respect, 451 unrecoverable, etc.) |
| Retry budget + circuit breaker | Tier 2 | Bound total retries per session / per source to prevent runaway retry loops on persistent failures. Circuit-breaker pattern: N consecutive failures from one URI / host marks it unhealthy and short-circuits further retry attempts for a cooldown duration | **Naive:** skip (rely on max-retries per-attempt alone). **Full:** session-wide retry budget + per-host circuit-breaker state. Open: where the breaker state slot lives, and how multi-cdn-failover composes with it (rotation before breaker fires?) |
| VRLT-aware response handling | Tier 2 | Mux Video Viewer Rate Limiting Token signature detection in 4xx responses; adjust request pacing rather than retrying naively. Aggressive retry on VRLT-rate-limited responses makes the throttling worse (more retries → more 4xxs → more aggressive throttling). Notion epic #12 | **Naive:** treat as generic 4xx (currently fatal-by-default; possibly retry with longer backoff). **Full:** detect VRLT response signature (header / body shape), switch to back-off-and-wait mode for the affected session. Open: VRLT detection signature is Mux-specific; whether the detection logic lives in SPF or in an adapter-pluggable hook |
| Playback-token-expiry handling | Tier 2 | Detect playback-token-expiry errors (typically 4xx from a token-protected URL where the token has expired); call a customer-pluggable refresh hook; retry with the refreshed token. Notion epic #14 | **Naive:** 4xx fatal (≈ `hls.js`). **Full:** customer-pluggable refresh hook (`refreshPlaybackToken(originalUrl, errorContext) → string \| Promise<string>`); retry the failed fetch with the refreshed token. Cross-cutting with DRM where license-fetch token-expiry similarly needs refresh |
| Customer-policy hooks | Tier 2 | Pluggable hooks for consumer-customizable retry decisions: `shouldRetry(error, attempt, history) → boolean \| { retryAfter: number }`. Consumer can override per-source retry policy, intercept specific error patterns, surface error UX before exhaustion | **Naive:** no hooks (built-in policy only). **Full:** consumer-pluggable hooks composed atop the built-in defaults; built-ins remain the fallback. Adapter-layer use case: surface "still trying..." UI on first failure |

## What's in scope vs out of scope

**In scope:**
- All six phases above for HLS content (live + VOD)
- Integration with `createTrackedFetch` (the primary fetch wrapper)
  and other fetch sites — manifest fetch (`resolvePresentation`),
  playlist reload (when `live-stream-support` lands), segment fetch,
  license fetch (when `drm-support` lands), text-track segment fetch
- Retry-policy config surface (per-site defaults + customer override)
- Customer-pluggable hooks for response-handling and token-refresh
- Error-class-specific defaults (4xx vs 5xx vs network vs 0-status)
- Retry-exhaustion error surfacing (state slot + customer callback)

**Out of scope (separate cluster G features — both consume this
feature's primitives):**
- **[multi-cdn-failover](./multi-cdn-failover.md)** — alternate-URI
  rotation on retry-exhaustion. Consumes this feature's retry +
  circuit-breaker state. Adds the URI-rotation policy on top.
- **[content-steering](./content-steering.md)** — HLS content-
  steering protocol (server-side host-pool advertisement, client-side
  host selection). Consumes this feature's retry machinery for
  steering-pathway-specific retries.

**Out of scope (different architectural layer):**
- Adapter-layer customer-facing API surfaces — token-refresh hooks
  consumed by Mux Player's `drm-token` / `playback-token` integration,
  retry-status UI ("Reconnecting...", "Still trying..."), error
  modals on retry exhaustion. The SPF feature owns the engine-side
  retry machinery and exposes the hooks; the adapter wires them.
- Token-server signing / VRLT enforcement at the service layer.
  Service-side concerns.
- DNS / connectivity-level reachability checks. Browser-level
  concerns.

## Likely cross-cutting impact

Things this feature probably forces decisions on, not just additions:

- **`createTrackedFetch` extension or sibling wrapper.**
  Today's `createTrackedFetch` (per [video-abr](./video-abr.md) +
  [audio-abr](./audio-abr.md)) wraps `fetchStream` with EWMA
  bandwidth sampling. Network-resilience adds retry/backoff +
  error-classification on top. Two shapes: (a) extend
  `createTrackedFetch` with retry config (one wrapper does both);
  (b) compose a sibling `withRetry` wrapper that consumes
  `createTrackedFetch`'s output. Lean (b) — single-responsibility
  wrappers compose better; retry-wrapping bandwidth-sampling is a
  meaningful composition order (retry happens at request level,
  sampling at chunk level within the successful request).
- **Bandwidth-sampling exclusion of retry attempts.** Retried
  requests are typically faster than first-attempts (CDN caching,
  warm sockets), or slower (degraded path during failure). Either
  way, they don't reflect actual playback bandwidth. The EWMA
  estimator should filter out retry-attempt samples or weight them
  differently. Open whether this is a `createTrackedFetch` change
  or a network-resilience-aware sample exclusion.
- **Retry-policy state slot vs per-site config.** Each fetch site
  (manifest / playlist-reload / segment / license / text-segment) has
  different retry needs. Manifest retries can be long-running (user
  waits for source to start); segment retries must be tight (playback
  stall risk). Two shapes: (a) per-fetch-site config in the engine
  composition (manifest config / segment config / etc.); (b) one
  retry-policy state slot read by all fetch sites with site-specific
  defaults. Lean (a) — per-site config is more discoverable; (b)
  invites coordination complexity.
- **Composition with `multi-cdn-failover`.** Multi-CDN failover sits
  on top of retry: typically retry first within one CDN, then rotate
  on retry-exhaustion. The boundary between this feature's retries
  and multi-cdn-failover's rotation is the load-bearing design
  question. Likely: this feature surfaces retry-exhaustion state
  via a state slot; multi-cdn-failover reads it and triggers rotation.
- **Circuit-breaker state ownership.** Circuit-breaker is per-host /
  per-URI state — tracks consecutive failures, cooldown timers,
  health status. Where it lives: in network-resilience (host-tracking
  primitive) or in multi-cdn-failover (per-rotation-target state)?
  Lean: in network-resilience as a reusable primitive; multi-CDN
  consumes the breaker's verdict.
- **Token-refresh hook shape vs DRM license-refresh hook.** Playback-
  token-expiry refresh and DRM license-fetch token-refresh share
  conceptual shape (4xx → call hook → retry with new credential).
  Different hook signatures today (playback token is a URL-rewriting
  refresh; DRM license is a key-system-specific message). Worth
  harmonizing if the abstractions converge, but probably stay
  separate per-feature.
- **`bandwidthState` and retries.** Per the bandwidth-sampling
  exclusion note above. Cross-cutting with `video-abr` /
  `audio-abr`.
- **Live-stream reload-loop retry semantics.** When live-stream-
  support lands, its reload loop fetches the media playlist
  periodically. Reload-fetch retries have different semantics from
  segment-fetch retries (playlist re-fetch is idempotent and lower-
  stakes; missing one reload extends the gap to live edge but
  doesn't stall playback). This feature's per-fetch-site config
  surface needs to accommodate reload-fetch-specific defaults.

## Open questions

- **Retry-policy slot vs per-site config.** Per cross-cutting note;
  lean per-site config but worth confirming when implementation lands.
- **Default retry counts and backoff parameters per fetch site.**
  Manifest, playlist-reload, segment, license, text-segment — each
  needs sensible defaults. Empirical tuning territory.
- **VRLT detection signature.** Mux-specific. Lives in SPF
  (adapter-agnostic detection logic with Mux convention hard-coded)
  vs in an adapter-pluggable hook (consumer provides the detection
  function). Lean: pluggable hook — keeps Mux specifics in adapter
  layer.
- **Token-refresh hook shape.** Function signature, async semantics,
  error handling (what if refresh fails?), retry-after-refresh
  policy.
- **Bandwidth-sample filtering for retry attempts.** Exclude all
  retry samples, exclude only first-retry, weight retry samples
  differently? Affects ABR accuracy after a retry burst.
- **Circuit-breaker state ownership.** Network-resilience vs
  multi-cdn-failover. Lean network-resilience.
- **Composition order with multi-cdn-failover.** Retry-within-host
  first then rotate, or rotate after first failure on any host? The
  former is more conservative (less rotation churn); the latter
  recovers faster from a single failed host. Customer policy
  territory.
- **Retry-exhaustion error surfacing.** State-error slot vs callback
  vs both. Customer use case drives this; lean: both (state slot for
  reactive consumers + callback for one-shot notification).
- **Composition with DRM license-fetch.** When `drm-support` lands,
  license fetches gain retry/backoff via this feature. Per-site
  config naturally applies. Token-refresh hook may converge with
  DRM-side license-refresh hook (or stay separate).
- **Composition with multi-CDN content-steering.** When
  `content-steering` lands, the server-advertised host pool
  composes with multi-cdn-failover's rotation policy and this
  feature's circuit-breaker state. Three-way coordination.

## Related features

- **[multi-cdn-failover](./multi-cdn-failover.md)** — consumer.
  Sits on top of this feature's retry/breaker primitives; adds
  alternate-URI rotation policy.
- **[content-steering](./content-steering.md)** — consumer.
  HLS content-steering protocol; uses this feature's retry primitives
  for steering-pathway-specific retries.
- **[video-abr](./video-abr.md)** / **[audio-abr](./audio-abr.md)** —
  `createTrackedFetch` is the shared fetch wrapper; this feature's
  retry/backoff layer composes with it (lean: sibling wrapper rather
  than extending). Bandwidth-sample filtering for retries is the
  cross-cutting concern.
- **[mse-mms-pipeline](./mse-mms-pipeline.md)** — segment fetch is
  one of the primary consumer call sites. Per-fetch-site config
  applies.
- **[drm-support](./drm-support.md)** — license fetch is another
  consumer; token-expiry refresh hook may overlap with DRM-side
  license-refresh.
- **[live-stream-support](./live-stream-support.md)** — playlist
  reload-loop fetches consume this feature; reload retries have
  different semantics from segment retries.
- **[buffer-management](./buffer-management.md)** — segment-fetch
  retries gate segment availability; tight retry budgets avoid
  playback stall.

## See also

- [clusters.md § Selection resilience](./clusters.md#selection-resilience)
  — cluster G description; this feature is the foundation
- [clusters.md § Feature classification axes](./clusters.md#feature-classification-axes)
  — Borderline / response-error handling category; Naive vs Full
  framing; Tier 1 / Tier 2 framing
- [SPF Epics Working Doc](https://www.notion.so/35f97a7f89d08123a13fecab1ca1cac4)
  — source material; epic #12 (VRLT, Viewer Rate Limiting Audit),
  epic #14 (Playback Token Expiry), epic #9 (Multi-CDN Failover —
  separate but consuming feature)
- [Mux Video Permutations Matrix](https://www.notion.so/32c97a7f89d08191b84dd30f06685490)
  — Response Handling section
- [HTTP/1.1 Retry-After header (RFC 7231 §7.1.3)](https://datatracker.ietf.org/doc/html/rfc7231#section-7.1.3)
  — spec-compliant retry timing
