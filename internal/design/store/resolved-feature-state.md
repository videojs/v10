---
status: implemented
date: 2026-08-04
---

# Resolved player feature state

Some feature values combine user input, media input, and defaults. These inputs need separate ownership because they have different precedence and lifetimes. A last-write-wins value cannot represent those rules.

## Decision

A feature keeps each owned input in private source state and uses `derived` to publish the resolved value. Lower-priority inputs keep updating under an override, so removing the override reveals their latest value.

The feature's `config` map connects each provider input to an action and its user-owned state key. This one declaration serves two purposes: provider adapters know which inputs to expose, and the store knows which state survives media detach. Media-owned state resets on detach. Provider and imperative user values persist.

Derived formulas run before a source update is published. Consumers therefore receive one frozen snapshot containing the resolved state.

## Alternatives considered

- **One shared value** — makes precedence depend on update order and clears user input with media state.
- **A second config store** — models the lifetime directly but adds another mutable state system.
- **Replay provider props after detach** — loses imperative user writes and can restore stale props.
- **Resolve inside every setter** — requires each mutation site to repeat the formula.

Each configured value needs private state and an action. Provider adapters apply multi-key changes one action at a time; the design adds no separate batching API.

## Sources of truth

- Store rules: [`internal/decisions/store/reactive-state.md`](../../decisions/store/reactive-state.md), [`packages/store/src/core/`](../../../packages/store/src/core/)
- Metadata and media behavior: [`packages/core/src/dom/store/features/`](../../../packages/core/src/dom/store/features/), [`packages/media/src/`](../../../packages/media/src/)
- Provider adapters: [`packages/react/src/player/`](../../../packages/react/src/player/), [`packages/html/src/player/`](../../../packages/html/src/player/)
