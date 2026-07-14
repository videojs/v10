---
status: implemented
date: 2026-04-03
---

# Actor and reactor factories

This record explains why SPF uses declarative machine factories. The implementations and their tests define the current types, handlers, scheduling, and cleanup behavior.

## Problem

Early SPF actors and reactors repeated state-signal, lifecycle, runner, and destruction mechanics. A shared abstraction needed to remove that boilerplate without forcing all work into one class hierarchy or erasing the distinction between message-driven actors and signal-driven reactors.

## Decisions

- Use factory functions with definition objects, not base classes. Definitions describe behavior; factories own snapshots, transitions, lifecycle, and cleanup.
- Keep `createMachineActor` and `createMachineReactor` separate. Their inputs and work models differ enough that a unified optional-property shape would weaken type guarantees.
- Add the terminal `destroyed` state implicitly and enforce it in the framework. Domain definitions cannot omit or redefine destruction semantics.
- Give an actor runner actor-lifetime scope. The factory constructs and destroys it, while per-state handlers decide what work to schedule.
- Register reactor monitors before state effects. The factory guarantees that its monitors resolve transitions before active-state effects run, even though general signal-effect ordering is not a platform guarantee.
- Put message handlers and settling transitions on individual states so valid state/message combinations remain visible in the definition.
- Distinguish one-time, automatically untracked `entry` work from reactive `effects` that rerun with their dependencies.

## Consequences

The factories make state machines inspectable and consistent while allowing lightweight callback or transition actors when a full machine is unnecessary. Async work remains explicit and owned by the actor rather than hidden in generic invoked services.

A state-scoped runner remains a possible extension if actor-lifetime cancellation proves too coarse. It should be added only from demonstrated implementation pressure.

## Current sources of truth

- Actor factories and tests: `packages/spf/src/core/actors/`
- Reactor factory and tests: `packages/spf/src/core/reactors/`
- Signal scheduling: `packages/spf/src/core/signals/`
- Usage patterns: `packages/spf/src/playback/actors/` and `packages/spf/src/playback/behaviors/`
- Related rationale: [Signals](signals.md) and [Text track architecture](text-track-architecture.md)
