---
name: implement-spf-use-case
description: Implement an SPF use-case composition. Use when a delivery scenario combines feature variants and requires composition, tests, and status updates.
---

# Implement an SPF use case

Treat the use-case entry as planning input. Read it, its constituent features, current compositions/adapters, tests, and applicable conventions.

1. Verify each required feature is implemented for the target phase; expose missing prerequisites instead of hiding them in wiring.
2. Reconcile documented assumptions with code and identify material open decisions.
3. Define the smallest observable composition phase and split it into independently testable prerequisite, behavior, composition, adapter, and documentation chunks.
4. Implement each chunk test-first at the correct feature, behavior, composition, or adapter boundary.
5. Run cumulative SPF tests, boundaries, build, and size checks proportional to impact.
6. Update use-case status, implementation surface, verification, and directly affected relationships from final code.

Report implemented and deferred phases, evidence, record updates, and remaining risks. Do not claim the use case complete while constituents remain partial.

## Example

Input: “Implement the first playable low-latency live composition.”

Output: A verified minimal composition, exposed prerequisites, cumulative checks, updated use-case evidence, and explicit deferred work.
