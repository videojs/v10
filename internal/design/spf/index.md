---
status: active
date: 2026-03-11
last-reviewed: 2026-07-13
---

# SPF design index

SPF is the framework-neutral streaming layer behind Video.js playback engines. Source and tests own current behavior; these records preserve architecture, selection rules, feature scope, and rationale.

## Start here

- Current package behavior and public surface: `packages/spf/src/`, tests, exports, and `packages/spf/README.md`.
- Contributor dependency rules: `packages/spf/src/AGENTS.md`.
- Package-level explanations: `packages/spf/docs/`.
- Architecture rationale and registries: this directory.

Do not copy current types or composition code into internal records. Link the owning source instead.

## Architecture and rationale

| Record | Purpose |
| --- | --- |
| [architecture.md](architecture.md) | Layers, components, and data flow |
| [primitives.md](primitives.md) | Tasks, runners, actors, reactors, and signals |
| [signals.md](signals.md) | Why signals are the reactive substrate and their tradeoffs |
| [actor-reactor-factories.md](actor-reactor-factories.md) | Factory contracts and rationale |
| [presentation-modeling.md](presentation-modeling.md) | Presentation and track modeling |
| [text-track-architecture.md](text-track-architecture.md) | Text-track reference implementation and lessons |
| [track-switching-model.md](track-switching-model.md) | Selection constraints, rules, and intent resolution |
| [decisions.md](decisions.md) | SPF-specific decisions not yet extracted as standalone records |

## Working rules

| Record | Purpose |
| --- | --- |
| [conventions/](conventions/README.md) | When to use behaviors, actors, reactors, signals, and configuration |
| [evaluation-axes.md](evaluation-axes.md) | Review axes for SPF changes |

Conventions are living rules. Update them only after a pattern recurs; code and JSDoc continue to own mechanics.

## Registries

| Registry | Question |
| --- | --- |
| [features/](features/clusters.md) | What capabilities can the engine provide? |
| [use-cases/](use-cases/README.md) | How is an engine variant composed for a delivery scenario? |

Feature and use-case status is evidence-based: `draft`, `partial`, or `implemented`. Registry entries are planning inputs, not specifications.

## Research

- [multi-cdn-failover-prior-art.md](multi-cdn-failover-prior-art.md) is a reference frame, not an implementation-status record.

## Maintenance

- Update status and implementation links when code lands.
- Remove file inventories, branch instructions, and line-number audits once work completes.
- Preserve constraints, rejected alternatives, and cross-feature relationships.
- Prefer a standalone record in `internal/decisions/` when one tactical choice can be understood independently.
