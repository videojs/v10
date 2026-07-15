---
status: active
date: 2026-05-18
---

# Configuration

Configuration owns engine-level policy and replaceable strategies. Correctness constants and transient implementation choices do not become configuration merely to avoid a literal.

## What belongs in config

- A tuning value belongs in config when engine variants have a legitimate reason to choose differently.
- A function belongs in config when a composition must replace a strategy or platform operation.
- A correctness invariant belongs in source as a named constant or algorithm.
- A value used only by one internal helper stays local until another real consumer needs the same policy.

## Ownership and defaults

- Engine config is the single source for a tunable.
- Reuse lower-layer config types for nested domains such as buffering, bandwidth, and quality.
- Resolve defaults once at the owning boundary or pass the same resolved value to every consumer.
- Never let two layers independently fall back when an override must affect both.
- Keep one standalone option flat; introduce a nested group when several options share a domain and consumer path.

## Threading

Pass configuration through behavior setup, helpers, actors, and algorithms explicitly. Avoid ambient mutable registries. A helper should accept only the slice it consumes, while an engine may spread the broader variant config into several focused factories.

## Strategies

Inject a strategy when replacement is a supported composition boundary, not as insurance against hypothetical variation. Prefer a narrow typed function over a service object unless lifecycle or multiple coordinated methods require identity.

## Verification

Test defaults, overrides, and propagation to every consuming layer. A test should fail if one consumer silently uses a module default after another receives an override.

Current configuration types and defaults live beside the behaviors, actors, algorithms, and engine config that consume them.
