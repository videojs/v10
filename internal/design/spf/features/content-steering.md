---
status: draft
date: 2026-05-20
definition: coarse
---

# Content steering

Apply HLS content-steering pathway priorities and reload steering manifests without weakening the existing failover behavior.

## Proposed direction

- Treat the steering response as a dynamic priority input.
- Preserve manifest order when steering data is absent or invalid.
- Reuse track constraints and failed-CDN cooldowns.
- Isolate steering-manifest fetch lifecycle from media fetch retry policy.

## Before implementation

Define TTL/reload behavior, pathway cloning support, invalid-response fallback, and interaction with user-provided CDN identity. Verify priority changes while playing and steering endpoint failure.

## Related

[Multi-CDN failover](./multi-cdn-failover.md) and [network resilience](./network-resilience.md).
