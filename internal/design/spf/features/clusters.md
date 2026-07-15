---
status: active
date: 2026-05-20
last-reviewed: 2026-07-15
---

# SPF feature clusters

Clusters are retrieval aids, not package boundaries or a roadmap. A feature may cross several clusters; its source and tests own the implementation.

## Classification axes

Ask these questions before creating or implementing a feature:

- Is this source correctness, player policy, or compensation for borderline content?
- Is it required for baseline playback or an enhancement?
- Does it need a new composition, or can an existing behavior accept a constraint or configuration?

Most work that feels compositional is better expressed as an input constraint plus one owner that resolves the output.

## Clusters

| Cluster | Responsibility | Representative records |
| --- | --- | --- |
| Presentation lifecycle | Parse, resolve, reload, and replace a presentation | live, DVR, LL-HLS, source replacement |
| Track registry and selection | Expose candidates, preserve intent, resolve one active track | multi-language audio, audio ABR, track switching |
| Timeline | Map media time to player time and compensate for malformed edges | non-zero PTS, edit lists, pseudo-ended, stall recovery |
| Media pipeline | Create buffers, append, flush, and finish streams | container support, MSE/MMS pipeline, buffer management |
| Capability and protection | Reject unsupported codecs, containers, channels, and key systems | capability probing, HEVC, 5.1, DRM |
| Network and resilience | Retry, choose redundant delivery, and steer pathways | network resilience, multi-CDN, content steering |
| Selection policy | Narrow candidates without taking ownership of selection | rendition caps, multi-signal ABR |

## Cross-cutting patterns

### Intent then resolution

User or application intent belongs in an input slot. One behavior owns the resolved selected-track output and applies defaults, capability filters, and constraints.

### Constraint then selection

Capability, policy, and failover inputs narrow the candidate set before ranking. Define the fallback when all candidates are removed.

### Gating

Represent an unresolved prerequisite explicitly when work must wait for presentation, selection, keys, or load activation. Avoid scattered early returns with no visible lifecycle.

### Per-type specialization

Video, audio, and text often need separate behaviors with a shared setup helper. Split by type when ownership or side effects differ; unify only when the contract remains clear.

### Observation at the work boundary

Collect measurements such as bandwidth or append timing in the fetch/append path that observes them. Consumers should read signals rather than duplicate monitoring work.

## Review checklist

For a selection feature, inspect capability filters, application policy, failover, DRM, and manual intent. For a buffer feature, identify codec changes, timeline effects, and end-of-stream ownership. For any new signal, name its single owner and source lifecycle.

See [presentation modeling](../presentation-modeling.md), [track switching](../track-switching-model.md), and [behavior conventions](../conventions/behaviors.md).
