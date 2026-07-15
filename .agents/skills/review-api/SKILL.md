---
name: review-api
description: Review Video.js TypeScript APIs without editing code. Use for inference, state, extensibility, composition, packaging, or architecture audits.
---

# API review

Read the implementation, public exports, callers, types, tests, and relevant design records.

1. Define the changed or proposed public surface and compatibility constraints.
2. Check runtime behavior, inference, naming, defaults, composition, escape hatches, lifecycle, packaging, and adjacent API consistency.
3. Use `references/checklist.md` for a broad audit; load only the sections relevant to the surface.
4. Tie every finding to a concrete caller, failure mode, or maintenance cost.

Report findings by severity with the location, user impact, evidence, and smallest viable improvement. Separate correctness or compatibility problems from preferences. Do not score the API or invent issues to fill a template.

## Example

Input: “Review this new player factory API.”

Output: Prioritized findings tied to concrete callers, inference failures, compatibility risks, or maintenance costs.
