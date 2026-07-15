---
status: implemented
date: 2026-06-08
definition: implemented
---

# Multi-CDN failover

SPF keeps redundant HLS tracks on a preferred CDN and moves to the next available CDN after a terminal fetch failure.

## Decisions

- deriveCdnPriority publishes manifest-ordered CDN preference.
- Track constraints prefer the active CDN and exclude entries in failedCdns.
- Fetch sites record the CDN that failed; setupFailoverMonitor owns cooldown and expiry.
- Failover state is source-scoped and clears on unload.
- CDN identity is configurable so query- or path-based redundancy can share the mechanism.

This is deliberately a small failover circuit, not general retry/backoff or HLS content steering.

## Current sources

- packages/spf/src/playback/behaviors/derive-cdn-priority.ts
- packages/spf/src/playback/behaviors/setup-failover-monitor.ts
- packages/spf/src/playback/primitives/failover-fetch.ts
- packages/spf/src/playback/behaviors/track-switching.ts
- HLS engine and colocated tests

## Consequences

A cooled-down CDN becomes eligible again. More sophisticated retry classification belongs in [network resilience](./network-resilience.md); dynamic pathway priority belongs in [content steering](./content-steering.md).
