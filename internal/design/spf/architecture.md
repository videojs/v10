---
status: active
date: 2026-03-11
---

# SPF architecture

SPF separates reusable composition primitives, streaming-domain logic, network policy, and playback-engine integration. Source, entry points, tests, and package exports define the current module graph.

## Boundaries

- `core/` owns signals, tasks, actors, reactors, and composition. It has no media, network, or browser dependency.
- `media/` owns protocol-neutral media types and algorithms plus format and browser capability adapters scoped beneath that domain.
- `network/` owns reusable fetching and bandwidth estimation.
- `playback/` composes actors, behaviors, and engines. Browser-dependent playback modules live in explicit `dom/` subdirectories.
- Root entry points expose deliberate public subsets; internal modules are not public merely because another package can import their source in the monorepo.

## Composition model

An engine is a list of behaviors sharing signal maps, immutable configuration, and one destruction boundary. Each behavior declares the state and context slots it needs. Actors own message-driven resources and serialized work; reactors own signal-driven lifecycle; tasks are cancellable work scheduled by runners.

Platform adapters drive an engine through shared signal references. They do not reach into the behavior graph. Source replacement reuses the engine while resolved-presentation state controls per-source setup and cleanup.

## Consequences

Capabilities can be recomposed into engine variants without subclassing a central playback engine. The architecture depends on explicit ownership and cleanup: every resource must be destroyed by the behavior or actor that created it, and browser APIs must not leak into `core/`.

## Current sources of truth

- Package topology and entry points: `packages/spf/package.json` and `packages/spf/src/*.ts`
- Composition primitives: `packages/spf/src/core/`
- Media and network layers: `packages/spf/src/media/` and `packages/spf/src/network/`
- Playback behaviors, actors, engines, and tests: `packages/spf/src/playback/`
- Contributor rules: `packages/spf/src/AGENTS.md`
- HLS composition overview: `packages/spf/docs/hls-engine.md`
