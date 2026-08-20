---
status: implemented
date: 2026-08-04
---

# Resolved player feature state

Some feature values combine user input, media input, and defaults. These inputs need separate ownership because they have different precedence and lifetimes. A last-write-wins value cannot represent those rules.

## Decision

A feature keeps each owned input in private source state and uses `derived` to publish the resolved value. Lower-priority inputs keep updating under an override, so removing the override reveals their latest value.

The feature's `config` map connects each provider input to an action and its user-owned state key. This one declaration serves two purposes: provider adapters know which inputs to expose, and the store knows which state survives media detach. Media-owned state resets on detach. Provider and imperative user values persist.

An action accepts its input's own value type plus `null | undefined`, so a narrower union such as a string enum keeps that type on the provider input.

Derived formulas run before a source update is published. Consumers therefore receive one frozen snapshot containing the resolved state.

## Single-owner values

Privacy follows from resolution, not from being configurable. A value with one owner has nothing to resolve, so it is a published source key whose action applies the feature default when input is absent — no symbol, no `derived` formula. `orientationLockType` initialises to `landscape`, and `setOrientationLockType` restores that default for absent input. Absent means nullish *and* the empty string, which is what a valueless HTML attribute delivers.

Publishing the key is also what makes the value observable. `publish` copies string keys only, so a symbol-keyed change produces no public snapshot and notifies nobody. An attached behavior that reacts to its own configuration — orientation lock re-locks the screen when the type changes mid-fullscreen — therefore needs its value on the public snapshot, whether as a published source key or as a `derived` value.

## Alternatives considered

- **One shared value** — makes precedence depend on update order and clears user input with media state.
- **A second config store** — models the lifetime directly but adds another mutable state system.
- **Replay provider props after detach** — loses imperative user writes and can restore stale props.
- **Resolve inside every setter** — requires each mutation site to repeat the formula.

Each configured value needs a state key and an action. Provider adapters apply multi-key changes one action at a time; the design adds no separate batching API.

## Sources of truth

- Store rules: [`internal/decisions/store/reactive-state.md`](../../decisions/store/reactive-state.md), [`packages/store/src/core/`](../../../packages/store/src/core/)
- Metadata and media behavior: [`packages/core/src/dom/store/features/`](../../../packages/core/src/dom/store/features/), [`packages/media/src/`](../../../packages/media/src/)
- Provider adapters: [`packages/react/src/player/`](../../../packages/react/src/player/), [`packages/html/src/player/`](../../../packages/html/src/player/)
