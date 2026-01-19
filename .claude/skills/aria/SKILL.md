---
name: aria
description: Review and implement accessibility patterns for UI components following WAI-ARIA and WCAG 2.1. Use when auditing code for a11y issues, implementing accessible controls, adding ARIA attributes, fixing keyboard navigation, handling focus management, building screen reader support, or implementing media player accessibility. Triggers on "accessibility review", "a11y", "ARIA", "keyboard navigation", "screen reader", "focus management", "WCAG", "captions", "live region".
---

# ARIA Skill

## References

| Pattern             | Reference                                       |
| ------------------- | ----------------------------------------------- |
| Keyboard Navigation | [keyboard.md](references/keyboard.md)           |
| Focus Management    | [focus.md](references/focus.md)                 |
| ARIA Roles & States | [aria.md](references/aria.md)                   |
| React Patterns      | [react.md](references/react.md)                 |
| Media Players       | [media.md](references/media.md)                 |
| Anti-Patterns       | [anti-patterns.md](references/anti-patterns.md) |
| Review Checklist    | [checklist.md](references/checklist.md)         |

## Review Output Format

When reviewing code for accessibility, output findings in this format:

```
═══════════════════════════════════════════════════
A11Y REVIEW: {filename}
═══════════════════════════════════════════════════

CRITICAL ({n} issues)
─────────────────────
[A11Y] Line {n}: {issue title}
  {code snippet}
  Fix: {recommended fix}
  WCAG: {criterion}

SERIOUS ({n} issues)
─────────────────────
[A11Y] Line {n}: {issue title}
  {code snippet}
  Fix: {recommended fix}
  WCAG: {criterion}

MODERATE ({n} issues)
─────────────────────
[A11Y] Line {n}: {issue title}
  {code snippet}
  Fix: {recommended fix}
  WCAG: {criterion}

═══════════════════════════════════════════════════
SUMMARY: {n} critical, {n} serious, {n} moderate
Score: {score}/100
═══════════════════════════════════════════════════
```

### Severity Definitions

- **Critical**: Blocks assistive technology users entirely (missing names, broken keyboard access, focus traps)
- **Serious**: Significant barriers but workarounds exist (poor focus indicators, missing live regions)
- **Moderate**: Suboptimal but functional (verbose labels, missing descriptions)

### Scoring

Start at 100, deduct: Critical −15, Serious −8, Moderate −3

## Core Principles

1. **Semantic HTML first** — Use native elements before ARIA
2. **Keyboard accessible** — All interactions work without a mouse
3. **Focus visible** — Clear indication of current focus
4. **Name, Role, Value** — Every control has accessible name, correct role, exposed state
5. **Announce changes** — Dynamic content updates reach screen readers

## Common Issues (Quick Fixes)

| Issue                  | Fix                                   |
| ---------------------- | ------------------------------------- |
| Icon button no name    | Add `aria-label`                      |
| Custom control no role | Add appropriate `role` attribute      |
| Focus outline removed  | Use `focus-visible` instead           |
| Toggle state unclear   | Use `aria-pressed` or `aria-expanded` |
| Dynamic content silent | Add live region with `aria-live`      |
| Click-only handler     | Add `keydown` for Enter/Space         |

## Anti-Patterns

❌ **Never do these:**

- Remove focus outlines without replacement
- Use `tabindex > 0`
- Rely solely on color to convey information
- Auto-focus without user intent
- Trap focus unintentionally
- Use ARIA where native HTML suffices
- Change `aria-label` to convey state (use `aria-pressed`)

## Next Steps

- For keyboard patterns: [keyboard.md](references/keyboard.md)
- For focus management: [focus.md](references/focus.md)
- For ARIA roles and states: [aria.md](references/aria.md)
- For React-specific patterns: [react.md](references/react.md)
- For media player accessibility: [media.md](references/media.md)
- For common mistakes: [anti-patterns.md](references/anti-patterns.md)
- For comprehensive checklist: [checklist.md](references/checklist.md)
