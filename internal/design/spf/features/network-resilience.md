---
status: draft
date: 2026-05-20
definition: coarse
---

# Network resilience

Classify fetch failures and apply bounded retry/backoff without hiding terminal media or authorization errors.

## Proposed direction

- Centralize retry classification and delay policy around fetch primitives.
- Respect abort and source replacement immediately.
- Use attempt budgets and observable terminal errors.
- Keep CDN switching and playlist-specific reload policy as consumers of this layer.

## Before implementation

Specify retryable status codes, network-error handling, backoff/jitter, Retry-After support, and request-class budgets. Test aborts, offline transitions, authorization failures, and exhaustion.

## Related

[Multi-CDN failover](./multi-cdn-failover.md), [content steering](./content-steering.md), and [buffer-stall recovery](./buffer-stall-recovery.md).
