---
name: implement-spf-feature
description: Implement an SPF feature from its registry entry. Use when an engine capability spans behaviors and requires tests plus status updates.
---

# Implement an SPF feature

Treat the feature entry as planning input. Reconcile it with code, tests, conventions, and requested scope before editing.

1. Read the entry, related features, implementation, tests, and applicable SPF conventions.
2. List contradictions, open decisions, and out-of-scope phases.
3. Define the smallest end-to-end phase with observable value and split it into testable state, behavior, composition, adapter, and documentation chunks.
4. For each chunk, add or update a failing test, implement the minimum at the correct ownership layer, and run the narrow target.
5. Run cumulative SPF tests, boundaries, build, and size checks proportional to impact.
6. Update the feature status, implementation surface, verification, and resolved questions from final code.

Report implemented and deferred phases, test evidence, record updates, and remaining risks. Do not claim completion for a prerequisite or partial phase.

## Example

Input: “Implement the first phase of timeline discontinuity support.”

Output: The smallest end-to-end capability, test evidence, proportional checks, updated feature status, and explicit deferred phases.
