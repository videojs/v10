# Component Spec Guidance

Guidance for writing component design docs. Think of these as **proto-user-facing docs** — the API surface spec that eventually feeds into the docs site.

## When to Use

- New UI components
- Component API changes
- Interaction patterns (keyboard, touch, focus)
- Accessibility requirements

## Templates

| Template                          | Use For                                         |
| --------------------------------- | ----------------------------------------------- |
| `templates/component-basic.md`    | Single-element components (Button, Icon, Badge) |
| `templates/component-compound.md` | Multi-part components (Slider, Menu, Dialog)     |

## Structure

Design docs for components should read like what a user would eventually see in reference docs, plus the store/state context needed for implementation.

**Basic component:** Problem → Usage → API Surface → State & Store → Accessibility

**Compound component:** Problem → Anatomy → API Surface → State & Store → Accessibility

Everything lives in a single `index.md`. If significant decisions were debated, add a `decisions.md` alongside it.

## What Goes in the API Surface

The API surface section is the core of the doc. It covers everything a consumer needs:

- **Props / Attributes** — What the component accepts
- **Data Attributes** — Styling hooks for component states
- **CSS Custom Properties** — Theming and customization points
- **Events / Callbacks** — What the component emits

For compound components, highlight important part-specific details inline rather than creating a separate parts file. The anatomy section already shows the structure — call out anything noteworthy per part within the API surface.

## State & Store

Every component design should call out its store integration:

- What store features/slices does it require?
- What state does it read? What state does it write?
- Does it introduce new state? What's the shape?
- Any store subscriptions or side effects?

## Accessibility

Accessibility is first-class, not an afterthought:

- **ARIA roles and attributes** — What role does each part play?
- **Keyboard interactions** — Full keyboard table
- **Focus management** — Tab order, focus trapping, focus restoration
- **Screen reader announcements** — Live regions, aria-live, status updates
- **Touch behavior** — Mobile-specific interactions

Reference [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) for the relevant pattern.

## Tips

1. **Anatomy first** (compound) — Show component structure before API details
2. **Minimal examples** — Only show what's different, use `{/* ... */}` for the rest
3. **Data attributes** — Essential for styling component states
4. **No separate parts file** — API surface covers everything; highlight noteworthy parts inline
5. **No architecture file** — Implementation details go in `.claude/plans/`

## Prior Art

Research prior art before drafting. Two tiers:

### API Patterns (how we design)

- **[Base UI](https://base-ui.com/)** — Primary reference. Check API shape, prop naming, composition model, data attributes. If Base UI has the component, start there.
- **[WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)** — Canonical accessibility pattern. Required for keyboard, ARIA roles, and focus management.
- **[Radix UI](https://www.radix-ui.com/)** — Fallback when Base UI doesn't have the pattern.

### Player Context (what we need to know)

These aren't API references — look at them for edge cases, feature requirements, platform quirks, and lessons learned:

- **[Media Chrome](https://www.media-chrome.org/)** — Media-specific UI edge cases, attribute-based API, shadow DOM tradeoffs
- **[Vidstack](https://www.vidstack.io/)** — Feature requirements, what they got right, signals approach
- **[Video.js v8](https://videojs.com/)** — Legacy context, what worked and what didn't, migration considerations
- **[Plyr](https://plyr.io/)** — Minimal implementations, what a simple player needs

## Related Skills

- `aria` skill — Accessibility implementation details
- `component` skill — Component architecture patterns
- `api` skill — API design principles
