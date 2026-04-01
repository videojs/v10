---
status: implemented
date: 2025-02-04
---

# Time Display

Displays current time, duration, or remaining time.

## Problem

Video players need to display time:

1. **Current playback position** — updates continuously
2. **Total duration** — static once source loads
3. **Remaining time** — duration minus current, often with negative sign

Requirements:

- Digital format: `1:30:45` or `5:30`
- Conditional hour display (hide when duration < 1 hour)
- Proper accessibility (screen readers need human-readable time, not "1:30")
- Composable for common patterns like `1:30 / 5:00`

## Anatomy

### React

```tsx
import { Time } from '@videojs/react';

// Standalone
<Time.Value type="current" />

// Composed
<Time.Group>
  <Time.Value type="current" />
  <Time.Separator />
  <Time.Value type="duration" />
</Time.Group>
```

### HTML

```html
<!-- Standalone -->
<media-time type="current"></media-time>

<!-- Composed -->
<media-time-group>
  <media-time type="current"></media-time>
  <media-time-separator></media-time-separator>
  <media-time type="duration"></media-time>
</media-time-group>
```

## Accessibility

### Screen Reader Approach

Following [Media Chrome's pattern](https://github.com/muxinc/media-chrome/blob/main/src/js/media-time-display.ts): `aria-label` for the static role label ("Current time"), `aria-valuetext` for the dynamic human-readable value ("1 minute, 30 seconds").

**No live regions.** Time updates too frequently and would overwhelm screen readers. Users who need time info can navigate to the control.

**Negative sign is `aria-hidden`.** The `aria-valuetext` already says "4 minutes, 30 seconds **remaining**" — announcing "minus" or "dash" would be redundant.

**React uses `<time>` element** for semantic `datetime` attribute. **HTML renders text directly** — custom elements can't reliably extend `<time>`, and nesting creates styling complexity. `aria-valuetext` provides equivalent accessibility.

## Decisions

### Single Value Component with Type Prop

**Decision:** One `Time.Value` component with `type` prop, not separate `Time.Current`, `Time.Duration`, `Time.Remaining`.

**Alternatives:**

- Separate components — more explicit, but fragments the API
- Base component with aliases — extra exports without clear benefit

**Rationale:** Single component is simpler to learn. Type safety via `type` prop guides usage.

### Minimal Props for Beta

**Decision:** Only essential props: `type`, `negativeSign`, `label`. Defer `hoursDisplay` and `fallback` to later releases.

**Alternatives:**

- Per-unit formatting (`hours`, `minutes`, `seconds` props) — more control
- Multiple format presets (`digital`, `short`, `narrow`, `long`) — more options

**Rationale:** Video players have used the same digital format for decades. Smart defaults handle padding and hour display. We can add options later if users request them.

### `aria-valuetext` for Human-Readable Time

**Decision:** Use `aria-valuetext` with human phrase ("1 minute, 30 seconds"), following Media Chrome's pattern.

**Alternatives:**

- Visually hidden text — clutters DOM
- `aria-label` with full value — replaces visible content entirely

**Rationale:** `aria-valuetext` is purpose-built for providing alternative text representations. Keeps DOM clean while giving screen readers proper context.

### HTML Renders Text Directly

**Decision:** `<media-time>` renders text content directly, not inside a `<time>` element.

**Alternatives:**

- Render `<time>` inside — semantic but creates styling complexity
- Shadow DOM with `<time>` — encapsulated but harder to style

**Rationale:** Custom elements can't extend built-in elements reliably. Nesting creates `media-time > time` selector complexity. `aria-valuetext` provides equivalent accessibility without the semantic `<time>`.

### Group vs Root Naming

**Decision:** `Time.Group` / `<media-time-group>` for container, not `Time.Root`.

**Alternatives:**

- `Time.Root` — matches Radix/Base UI
- `Time.Container` — verbose

**Rationale:** "Group" better describes the purpose (grouping time displays). `<media-time>` is the primary component; "group" clearly indicates it's optional for composition.

### Separator as Custom Element

**Decision:** `<media-time-separator>` is a custom element, not just a documented pattern.

**Alternatives:**

- Document "use `<span aria-hidden='true'>/</span>`" — simpler
- No separator component — leave entirely to users

**Rationale:** Consistency with component model. Automatic `aria-hidden` prevents accessibility mistakes. Can have default styling. Low implementation cost.

### `negativeSign` as String

**Decision:** `negativeSign` is a string (the symbol to display), not an enum like `'auto' | 'always' | 'never'`.

**Alternatives:**

- `signDisplay` enum — matches `Intl.NumberFormat` but adds complexity
- Boolean `showSign` — doesn't allow custom symbols

**Rationale:** Users who want a different symbol (like proper minus `−`) can specify it. Users who want to hide it can use CSS — the sign is wrapped in `<span aria-hidden="true">` which is a natural styling target.

### Negative Sign Internal to Value

**Decision:** The negative sign for remaining time is rendered internally by `<Time.Value>`, controlled by `negativeSign` prop.

**Alternatives:**

- Separate `<Time.Sign>` component — maximum flexibility but overkill
- User's responsibility — minimal API but users must handle a11y

**Rationale:** The negative sign is semantically part of "remaining time", not a compositional element like Separator. Internal rendering ensures consistent `aria-hidden` handling.

## Open Questions

1. **Locale support** — Should we support internationalized phrases via `Intl.DurationFormat`? Currently English-only. Could add `locale` prop later.

2. **Toggle behavior** — Media Chrome allows clicking to toggle between current/remaining. Should we support this? Probably a separate concern (wrap in a button).
