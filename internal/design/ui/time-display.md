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

## Open Questions

1. **Locale support** — Should we support internationalized phrases via `Intl.DurationFormat`? Currently English-only. Could add `locale` prop later.

2. **Toggle behavior** — Media Chrome allows clicking to toggle between current/remaining. Should we support this? Probably a separate concern (wrap in a button).
