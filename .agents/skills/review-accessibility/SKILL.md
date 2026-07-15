---
name: review-accessibility
description: Review Video.js UI accessibility without editing code. Use for semantics, names, ARIA, keyboard, focus, captions, contrast, motion, or WCAG.
---

# Accessibility review

Inspect rendered semantics, interaction code, tests, and adjacent controls.

1. Define the expected name, role, value or state, keyboard behavior, focus behavior, and announcements.
2. Use `references/checklist.md` selectively for the affected control type; do not load the whole checklist for a narrow change.
3. Verify behavior in a browser when the review covers interaction or focus.
4. Report only observable barriers or standards-backed risks.

For each finding, identify the affected user, element or state, impact, evidence, and smallest viable fix. Distinguish blockers from enhancements and avoid speculative conformance claims.

## Example

Input: “Review the captions menu for keyboard and screen-reader barriers.”

Output: Standards-backed findings with the affected user, observable impact, evidence, severity, and smallest viable fix.
