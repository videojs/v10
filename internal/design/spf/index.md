---
status: active
date: 2026-03-11
last-reviewed: 2026-07-15
---

# SPF design index

SPF is the framework-neutral streaming layer behind Video.js playback engines. Source and tests own behavior; these records preserve durable rationale and future capability boundaries.

## Sources of truth

- Current behavior and contracts: packages/spf/src and colocated tests.
- Public surface and package guides: packages/spf/README.md and packages/spf/docs/.
- Dependency rules: packages/spf/src/AGENTS.md.

Do not copy current types, file inventories, or engine composition code into design records.

## Architecture

- [Architecture](./architecture.md)
- [Primitives](./primitives.md)
- [Signals](./signals.md)
- [Actor and reactor factories](./actor-reactor-factories.md)
- [Presentation modeling](./presentation-modeling.md)
- [Text tracks](./text-track-architecture.md)
- [Track switching](./track-switching-model.md)
- [Conventions](./conventions/README.md)

## Registries

- [Feature clusters](./features/clusters.md) group capabilities and cross-cutting patterns.
- [Use-case compositions](./use-cases/README.md) cover engine variants for delivery scenarios.
- Individual records use draft, partial, or implemented status based on source evidence.

## Maintenance

- Replace shipped implementation plans with decisions, consequences, and source links.
- Delete superseded research and temporary phase tracking.
- Keep a future brief only when it names a durable boundary or unresolved decision.
