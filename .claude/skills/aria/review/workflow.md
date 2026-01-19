# Accessibility Review Workflow

Review components and code for accessibility following WAI-ARIA and WCAG 2.1.

## Process

```
┌─────────────────────────────────────────────────────┐
│                  Gather Context                      │
│         Load file(s) or PR diff to review            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│               Load References                        │
│     Based on component type (media, menu, form)      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                Run Checklist                         │
│          review/checklist.md by section              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│               Format Report                          │
│         Use templates.md for output                  │
└─────────────────────────────────────────────────────┘
```

### 1. Gather Context

Identify what to review:

- **Single file:** `path/to/component.ts`
- **Package:** `packages/html/src/ui/`
- **PR diff:** Changed accessibility surface

### 2. Load References

Based on component type, load relevant references:

| Component Type   | Load                                            |
| ---------------- | ----------------------------------------------- |
| Media player     | `references/media.md`                           |
| Any interactive  | `references/keyboard.md`, `references/focus.md` |
| Custom widgets   | `references/aria.md`                            |
| React components | `references/react.md`                           |
| Common mistakes  | `references/anti-patterns.md`                   |

### 3. Run Checklist

Use [checklist.md](checklist.md) systematically:

1. Start with **All Interactive Elements** section
2. Check component-specific sections (Buttons, Menus, Dialogs, Sliders, etc.)
3. Review Color and Contrast
4. Check Motion and Animation
5. Verify Document Structure if applicable

### 4. Format Report

Use [templates.md](templates.md) for consistent output.

## Quick Review

For fast reviews without full checklist:

- [ ] All interactive elements have accessible names
- [ ] Keyboard navigation works (Tab, Enter, Space, Arrows, Escape)
- [ ] Focus indicator visible on all focusable elements
- [ ] Custom controls have appropriate ARIA roles
- [ ] State changes announced (aria-pressed, aria-expanded, live regions)
- [ ] No mouse-only interactions

## Severity Levels

| Level      | Meaning                                | Examples                                                         |
| ---------- | -------------------------------------- | ---------------------------------------------------------------- |
| `CRITICAL` | Blocks assistive technology users      | Missing accessible name, keyboard trap, no focus indicator       |
| `MAJOR`    | Significant barrier, workarounds exist | Poor focus contrast, missing live region, touch target too small |
| `MINOR`    | Suboptimal but functional              | Verbose label, missing description, skipped heading level        |
| `NIT`      | Enhancement opportunity                | Could use aria-describedby, label could be shorter               |

## Scoring

Start at 100, deduct per issue:

| Severity | Points |
| -------- | ------ |
| CRITICAL | -15    |
| MAJOR    | -8     |
| MINOR    | -3     |
| NIT      | -1     |

Scores below 70 indicate significant accessibility issues.

## References

| File                                                             | Contents                       |
| ---------------------------------------------------------------- | ------------------------------ |
| [checklist.md](checklist.md)                                     | Comprehensive review checklist |
| [templates.md](templates.md)                                     | Issue format, report template  |
| [../references/keyboard.md](../references/keyboard.md)           | Keyboard navigation patterns   |
| [../references/focus.md](../references/focus.md)                 | Focus management               |
| [../references/aria.md](../references/aria.md)                   | ARIA roles and states          |
| [../references/media.md](../references/media.md)                 | Media player accessibility     |
| [../references/react.md](../references/react.md)                 | React-specific patterns        |
| [../references/anti-patterns.md](../references/anti-patterns.md) | Common mistakes                |
