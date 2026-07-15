---
name: document-spf-feature
description: Document an SPF feature under internal/design/spf/features. Use for capability scope, status, phases, evidence, constraints, or relationships.
---

# Document an SPF feature

Registry entries guide planning but do not override code. Read `internal/design/spf/features/clusters.md`, a strong neighboring entry, relevant implementation/tests, and linked records.

1. Classify the engine capability and distinguish it from delivery use cases or implementation conventions.
2. Separate current, planned, and open-question claims.
3. Record capability, status, phases or depth, implementation surface, verification, constraints, and relationships at the level supported by evidence.
4. Update directly affected entries only when their facts changed; verify links and relationship symmetry.

Cite repository paths for implemented behavior. Do not mark work implemented without code and verification evidence, and do not implement the feature unless requested.

## Example

Input: “Document the current depth of discontinuity handling.”

Output: An evidence-backed feature entry separating implemented behavior, planned phases, constraints, verification, and open questions.
