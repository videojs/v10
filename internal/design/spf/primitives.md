---
status: implemented
date: 2026-03-11
---

# SPF primitives

This record preserves the roles of SPF's composition primitives. Their types, states, scheduling, and cleanup semantics belong to source and tests.

## Decisions

- A behavior is the unit of engine composition. Other primitives live inside a behavior rather than beside it in the engine list.
- A signal represents state over time and connects otherwise independent behaviors.
- A task is one cancellable unit of asynchronous work. It does not own long-lived domain state.
- A runner owns task scheduling policy such as serialization, concurrency, cancellation, or deduplication.
- An actor owns a message-driven resource or work queue and exposes observable lifecycle when consumers need it.
- A reactor observes signals, derives lifecycle state, and runs state-scoped setup, reactive work, and cleanup without owning a message channel.
- Destruction is part of every long-lived primitive's contract and must release active work before the composition finishes destroying.

## Selection rule

Use the smallest primitive matching the work:

- direct derivation or synchronization: signals and effects;
- cancellable operation: task and runner;
- message-driven ownership: actor;
- signal-driven lifecycle with state-specific cleanup: reactor.

Do not add a wrapper solely for naming consistency. Introduce another primitive only after repeated work cannot be expressed cleanly by these roles.

## Current sources of truth

- Signals: `packages/spf/src/core/signals/`
- Tasks and runners: `packages/spf/src/core/tasks/`
- Actors: `packages/spf/src/core/actors/`
- Reactors: `packages/spf/src/core/reactors/`
- Composition: `packages/spf/src/core/composition/`
- Factory rationale: [Actor and reactor factories](actor-reactor-factories.md)
