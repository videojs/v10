# Component Review Workflow

Review UI components for architecture, API design, and patterns.

## Process

```
┌─────────────────────────────────────────────────────┐
│                  Gather Context                      │
│         Load component file(s) or PR diff            │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│               Load References                        │
│   Based on framework (Lit, React) and component type │
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

- **Single component:** `path/to/menu.ts`
- **Component package:** `packages/html/src/ui/`
- **PR diff:** Changed component surface

### 2. Load References

Based on component type and framework:

| Component Type   | Load                                           |
| ---------------- | ---------------------------------------------- |
| Any component    | `references/props.md`, `references/styling.md` |
| Lit components   | `references/lit.md`                            |
| React components | `references/react.md`                          |
| Popups/modals    | `references/collection.md`                     |
| Animated         | `references/animation.md`                      |
| Polymorphic      | `references/polymorphism.md`                   |
| Common mistakes  | `references/anti-patterns.md`                  |

### 3. Run Checklist

Use [checklist.md](checklist.md) systematically:

1. Start with **Architecture** section
2. Check **State Management** patterns
3. Review **Props & API** conventions
4. Verify **Data Attributes** for styling
5. Run **Accessibility** review via `aria` skill

### 4. Format Report

Use [templates.md](templates.md) for consistent output.

## Quick Review

For fast reviews without full checklist:

- [ ] Compound component structure (Root, Trigger, Content, etc.)
- [ ] Parts map 1:1 to DOM elements
- [ ] Controlled/uncontrolled state supported (`value`/`defaultValue`)
- [ ] Change handlers include details (`onValueChange(value, { reason, event })`)
- [ ] State exposed via `data-*` attributes
- [ ] CSS variables documented
- [ ] No anti-patterns from `references/anti-patterns.md`

## Severity Levels

See [templates.md](templates.md) for severity definitions.

## Accessibility

For accessibility review, load the `aria` skill:

```
Load skill: aria
Run: review/workflow.md
```

Component reviews should always include accessibility checks. The `aria` skill provides comprehensive keyboard, focus, and ARIA pattern review.

## References

| File                                                             | Contents                       |
| ---------------------------------------------------------------- | ------------------------------ |
| [checklist.md](checklist.md)                                     | Component review checklist     |
| [templates.md](templates.md)                                     | Issue format, report template  |
| [../references/props.md](../references/props.md)                 | Prop naming conventions        |
| [../references/styling.md](../references/styling.md)             | Data attributes, CSS variables |
| [../references/lit.md](../references/lit.md)                     | Lit controllers, mixins        |
| [../references/react.md](../references/react.md)                 | React hooks, context           |
| [../references/polymorphism.md](../references/polymorphism.md)   | render vs asChild              |
| [../references/collection.md](../references/collection.md)       | Collections, portals           |
| [../references/animation.md](../references/animation.md)         | Animation patterns             |
| [../references/anti-patterns.md](../references/anti-patterns.md) | Common mistakes                |
