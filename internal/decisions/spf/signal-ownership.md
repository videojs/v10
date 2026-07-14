---
status: decided
date: 2026-07-13
---

# Allow intentional multi-writer SPF signals

## Decision

SPF expresses per-behavior access with writable `Signal<T>` and read-only `ReadonlySignal<T>` types, but it does not enforce a global zero-or-one-writer invariant at composition time. Multi-writer slots are allowed when ownership is explicit and the writers model one coherent value.

## Context

The discrete-signal migration considered rejecting any slot written by more than one behavior. The writer audit found legitimate shapes: user intent plus a default, a staged pipeline, and bidirectional DOM synchronization. A count rule would reject those designs or force extra reconciliation state without improving correctness.

## Alternatives considered

- **Reject every multi-writer slot** — simple to check, but too strict for valid coordination patterns.
- **Hide writes behind a reconciler for every shared slot** — explicit, but adds state and lifecycle machinery even when precedence is already clear.

## Rationale

Per-behavior types catch accidental writes inside a behavior while composition and conventions preserve flexibility. Shared writers must document precedence, cleanup, and source-reset behavior. Prefer decomposed intent/output signals when that makes ownership clearer; use a reconciler only when conflict resolution is real domain logic.

See `internal/design/spf/conventions/signals.md` and the behavior definitions under `packages/spf/src/` for current contracts.
