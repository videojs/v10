---
status: active
date: 2026-05-07
---

# Behaviors

Behaviors are SPF's unit of composition. A behavior declares the state and context slots it needs, installs one concern, and returns cleanup for everything it owns.

## Choose the internal shape

- Use signals and effects for direct derivation or synchronization.
- Add a reactor when signal-derived lifecycle states and state-exit cleanup matter.
- Add an actor when the concern owns a message-driven resource or queue.
- Add tasks and a runner for cancellable scheduled work.
- Do not add a primitive because adjacent files use one; match the actual work.

## One behavior or several

Keep work together when it has one purpose, the same inputs, one lifecycle, and one cleanup boundary. Split when parts have independent ownership, platform boundaries, reuse, scheduling, or tests.

Do not split solely by media type. Prefer a shared typed setup helper with small per-type behavior definitions when video, audio, and text have the same lifecycle. Split by type when browser constraints, state, or scheduling genuinely differ.

Merge behaviors when they compete to resolve the same output from the same inputs. One behavior should own the final selection; user intent and automatic policy remain separate inputs.

## Source replacement

Every behavior gated by a resolved presentation must leave that state cleanly when the source changes:

- abort source-bound tasks;
- destroy per-source actors and browser resources;
- clear source-owned context and derived state;
- reject stale asynchronous completion before committing;
- preserve only explicitly engine-wide state.

## State and context contract

- Type setup parameters to the smallest state, context, and config slices used.
- Mark read-only slots as readonly signals.
- Put platform objects and owned resources in context, not state.
- Avoid optional typing when composition requires the slot; use optionality only when the behavior genuinely supports its absence.

## Helpers and factories

- Keep a pure calculation outside the behavior directory when it has independent domain value.
- Use a local helper for readable decomposition with no reuse contract.
- Use a typed setup helper when sibling behaviors share mechanics but declare separate slots.
- Use a behavior factory only when consumers intentionally configure and instantiate variants.
- Do not hide state/context dependencies behind an untyped closure.

## Placement and names

- Runtime-neutral behaviors live in `playback/behaviors/`.
- Browser-dependent behaviors live in `playback/behaviors/dom/`.
- Name a behavior for the lasting responsibility, not the current technique.
- Keep types and tests beside the owning behavior.

## Verification

Test the observable responsibility, lifecycle cleanup, destruction, source replacement, and any per-type specialization. Composition tests cover load-bearing ordering or cross-behavior ownership.

Current behavior definitions and tests live under `packages/spf/src/playback/behaviors/`; composition mechanics live in `packages/spf/src/core/composition/`.
