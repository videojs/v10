---
status: reference
date: 2026-06-12
---

# Multi-CDN failover prior art

This record preserves the architectural conclusions from a 2026 survey of VHS, hls.js, dash.js, Shaka Player, RxPlayer, Media3, VLC, and OSMF. Verify upstream details before treating them as current.

## Architectural families

Players generally model redundancy in one of two ways:

1. Multiple URIs or base URLs belong to one resource and requests rotate among them.
2. Redundant variants form separate pathways or ladders and the player switches the active pathway.

SPF follows the second model in presentation shape, but expresses failover as candidate constraints rather than an imperative pathway controller. Failed-CDN filtering removes tracks from consideration, so ordinary selection falls through to the next preferred CDN.

## Durable lessons

- Explicit pathway or service-location identifiers are preferable when manifests provide them; SPF also needs configurable URL-derived identity for untagged redundancy.
- Retry classification should absorb transient request failures before a CDN is penalized.
- CDN cooldown can be longer than rendition-level exclusion because it represents an infrastructure failure.
- An all-CDNs-failed policy must decide whether to re-admit candidates or surface a terminal error.
- Content steering should reorder the priority input and may synthesize pathways; it should not replace the base failover mechanism.

## Why SPF differs

Constraint-based failover reuses the existing selection pipeline and keeps state source-scoped. The tradeoff is that retry classification, cooldown extension, and steering remain separate capabilities rather than features of a dedicated controller.

See [multi-CDN failover](./features/multi-cdn-failover.md), [network resilience](./features/network-resilience.md), [content steering](./features/content-steering.md), and [track switching](./track-switching-model.md).
