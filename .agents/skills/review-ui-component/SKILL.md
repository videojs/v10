---
name: review-ui-component
description: Review Video.js component architecture without editing code. Use for contracts, state ownership, parity, compound APIs, props, styling, or animation.
---

# Component review

Read the core contract, both platform adapters, tests, rendered semantics, and adjacent components.

1. Check layer ownership, observable behavior, state control, platform parity, props, styling contracts, cleanup, and test coverage.
2. Use `references/checklist.md` to choose the general and Video.js-specific checklists; load only those that apply.
3. Compare proposed abstractions with a nearby component before recommending a new pattern.
4. Tie findings to a caller, rendered behavior, or maintenance failure mode.

Report actionable findings by severity. Separate regressions and contract gaps from optional design preferences.

## Example

Input: “Review the HTML and React menu implementations for parity.”

Output: Prioritized findings tied to contract drift, rendered behavior, state ownership, accessibility, or missing tests.
