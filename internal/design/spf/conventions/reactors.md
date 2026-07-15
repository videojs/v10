---
status: active
date: 2026-05-07
---

# Reactors

Use a reactor when signals derive meaningful lifecycle states and each state has distinct setup, reactive work, or cleanup.

## Selection

- Use a direct effect for simple synchronization without lifecycle state.
- Use a reactor when nested guards are becoming an implicit state machine, or when state-exit cleanup is load-bearing.
- Use an actor when the unit owns a message-driven resource or serialized queue.

## Shape

- Derive state in a pure helper or stable computed value when more than one condition participates.
- Keep the monitor limited to choosing the state; put work in that state's definition.
- Use `entry` for one-time, automatically untracked setup on state entry.
- Use `effects` only for work that must rerun while the state remains active.
- Return cleanup from the scope that created the resource. Cleanup must be safe during transition, destruction, and source replacement.
- Prefer domain states such as resolved/unresolved or attached/detached over flag combinations.

## Source identity

A reactor gated by a resolved presentation must leave its active state when the source becomes unresolved. Setup for one source cannot survive into another. Capture source identity when asynchronous completion could race replacement, and verify the live state before committing.

## Ordering

The machine factory guarantees its monitor runs before state effects. Do not infer general signal-effect ordering outside that abstraction.

## Verification

Test state derivation separately, then cover entry, reactive reruns, state-exit cleanup, destruction, and rapid source transitions.

Current factory semantics live in `packages/spf/src/core/reactors/`; playback examples live in `packages/spf/src/playback/behaviors/`.
