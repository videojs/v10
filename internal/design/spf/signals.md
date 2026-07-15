---
status: implemented
date: 2026-04-02
---

# Reactive state: signals

This record preserves the decision to use signals as SPF's reactive substrate. The signal wrappers, scheduler, machine factories, and tests define current behavior.

## Decision

SPF uses the TC39 signal polyfill behind a small local API for writable signals, computed values, effects, untracked reads, and updates.

Signals fit SPF because nearly all engine state is a value over time. Automatic dependency tracking keeps derived state and side effects local, scheduling can be controlled at the wrapper boundary, and contributors do not need to adopt an observable pipeline vocabulary for ordinary state composition.

## Architectural roles

- Shared state signals expose engine facts and writable intent across behaviors.
- Computed signals derive values without creating another ownership layer.
- Effects connect reactive state to external work.
- Actor and reactor snapshots make state-machine lifecycle observable.
- Configuration stays ordinary immutable input unless it genuinely changes over time.

## Constraints

- Do not create computed signals inside a rerunning effect; hoist them to a stable owner.
- Use `untrack()` when a read supplies context but must not become a dependency.
- Object updates notify by identity, so deeply nested shared objects can create broad invalidation and verbose spreading.
- Signals model state, not event history; ordered or lossless event sequences need an actor, runner, or explicit queue.
- General effect execution order is behavioral, not guaranteed by the TC39 proposal. Any abstraction that depends on ordering must own, document, and test that guarantee.
- The polyfill and wrapper boundary insulate SPF from proposal churn, but a native or dependency migration must revalidate scheduling and bundle cost.

## Consequences

SPF gains one small reactive model for shared state, derived state, actors, and reactors. In return, abstraction authors must make tracked versus one-time work explicit and avoid relying on ambient scheduler behavior.

Structured update helpers or finer-grained signals may be introduced if repeated code demonstrates the need; they are not part of this decision.

## Current sources of truth

- Signal wrappers, scheduler, and tests: `packages/spf/src/core/signals/`
- Machine boundaries: `packages/spf/src/core/actors/` and `packages/spf/src/core/reactors/`
- Repository conventions: [SPF conventions](conventions/README.md)
- Factory-specific ordering guarantee: [Actor and reactor factories](actor-reactor-factories.md)
