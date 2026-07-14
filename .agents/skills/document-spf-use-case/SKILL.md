---
name: document-spf-use-case
description: Document an SPF use-case composition. Use for delivery scenarios, variants, constituent features, status, constraints, or verification.
---

# Document an SPF use case

Read `internal/design/spf/use-cases/README.md`, its decomposition rubric, related feature entries, a strong neighboring use case, and current implementation/tests.

1. Describe the delivery scenario and the feature additions, removals, swaps, or tuning that compose it.
2. Separate current, planned, and open-question claims; label missing constituent features explicitly.
3. Record status, target phase, implementation surface, verification, constraints, and relationships from evidence.
4. Update directly affected entries only when their facts changed; verify links and relationship symmetry.

Do not duplicate feature definitions or code mechanics. When the missing unit is an engine capability, record it in the feature registry rather than hiding it in a delivery scenario.

## Example

Input: “Document low-latency live playback as a composed use case.”

Output: A delivery-focused entry that names constituent feature variants, current status, missing prerequisites, constraints, and verification.
