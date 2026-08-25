---
name: document-spf-use-case
description: Document an SPF use-case record. Use when the user explicitly requests delivery scenarios, variants, relationships, status, or verification.
---

# Document an SPF use case

Read `references/workflow.md` completely before acting; it contains the detailed composition, evidence, cascade, and validation workflow.

Confirm that the user explicitly requested creation or revision of the entry. Do not create adjacent feature, use-case, design, or decision records discovered during the workflow; surface them as candidates instead.

Read `internal/design/spf/use-cases/README.md`, its decomposition rubric, related feature entries, a strong neighboring use case, and current implementation/tests.

1. Describe the delivery scenario and the feature additions, removals, swaps, or tuning that compose it.
2. Separate current behavior from proposed direction and decisions still needed; label missing constituent features explicitly.
3. For shipped variants, retain composition decisions and current source pointers. For future variants, retain the scenario, boundaries, and evidence required before implementation.
4. Update directly affected entries only when their facts changed; verify links and relationship symmetry.

Do not duplicate feature definitions, code mechanics, phase tables, or progress logs. When the missing unit is an engine capability, identify it as a candidate for the feature registry; create that entry only if the user explicitly requests it.

## Example

Input: “Document low-latency live playback as a composed use case.”

Output: A compact delivery-focused entry naming composition, current status, missing prerequisites, constraints, and source evidence.
