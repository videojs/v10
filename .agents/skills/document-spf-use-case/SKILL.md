---
name: document-spf-use-case
description: Document an SPF use-case composition. Use for delivery scenarios, variants, constituent features, status, constraints, or verification.
---

# Document an SPF use case

Read `internal/design/spf/use-cases/README.md`, its decomposition rubric, related feature entries, a strong neighboring use case, and current implementation/tests.

1. Describe the delivery scenario and the feature additions, removals, swaps, or tuning that compose it.
2. Separate current behavior from proposed direction and decisions still needed; label missing constituent features explicitly.
3. For shipped variants, retain composition decisions and current source pointers. For future variants, retain the scenario, boundaries, and evidence required before implementation.
4. Update directly affected entries only when their facts changed; verify links and relationship symmetry.

Do not duplicate feature definitions, code mechanics, phase tables, or progress logs. When the missing unit is an engine capability, record it in the feature registry rather than hiding it in a delivery scenario.

## Example

Input: “Document low-latency live playback as a composed use case.”

Output: A compact delivery-focused entry naming composition, current status, missing prerequisites, constraints, and source evidence.
