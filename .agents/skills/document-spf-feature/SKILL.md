---
name: document-spf-feature
description: Document an SPF feature under internal/design/spf/features. Use for capability scope, status, evidence, constraints, or relationships.
---

# Document an SPF feature

Registry entries guide planning but do not override code. Read `internal/design/spf/features/clusters.md`, a strong neighboring entry, relevant implementation/tests, and linked records.

1. Classify the engine capability and distinguish it from delivery use cases or implementation conventions.
2. Separate current behavior from proposed direction and decisions still needed.
3. For shipped work, retain decisions, consequences, and current source pointers. For future work, retain scope, boundaries, and evidence required before implementation.
4. Update directly affected entries only when their facts changed; verify links and relationship symmetry.

Cite repository paths for implemented behavior. Remove phase tables, speculative file inventories, and progress logs once code lands. Do not mark work implemented without code and verification evidence, and do not implement the feature unless requested.

## Example

Input: “Document the current depth of discontinuity handling.”

Output: A compact evidence-backed entry separating implemented behavior, remaining decisions, constraints, and source pointers.
