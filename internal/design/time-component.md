---
status: draft
date: 2025-02-04
---

# Time Component

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

```ts
import '@videojs/html/time';
// or
import '@videojs/html/time/group';
import '@videojs/html/time/separator';
```

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

## Examples

### Current Time Only

```tsx
<Time.Value />
```

### Current / Duration

```tsx
<Time.Group>
  <Time.Value type="current" />
  <Time.Separator />
  <Time.Value type="duration" />
</Time.Group>
```

### Remaining Time

```tsx
<Time.Value type="remaining" />
// Renders: -4:30
```

### Always Show Hours

```tsx
<Time.Group hoursDisplay="always">
  <Time.Value type="current" />
  <Time.Separator />
  <Time.Value type="duration" />
</Time.Group>
// Renders: 0:01:30 / 0:05:00
```

### Custom Separator

```tsx
<Time.Group>
  <Time.Value type="current" />
  <Time.Separator> of </Time.Separator>
  <Time.Value type="duration" />
</Time.Group>
// Renders: 1:30 of 5:00
```

### Hide Negative Sign

```tsx
<Time.Value type="remaining" negativeSign="never" />
// Renders: 4:30 (instead of -4:30)
```

## Parts

### Group

Container for composed time displays. Provides shared context to children.

**Why a component?**

- **Semantic structure** — Clear boundary around related time displays
- **Shared context** — Children inherit `hoursDisplay` for consistent formatting
- **Future API surface** — Room to add formatting options that apply to all children
- **Styling container** — Provides a "box" for layout and theming

#### Props

| Prop           | Type                 | Default   | Description              |
| -------------- | -------------------- | --------- | ------------------------ |
| `hoursDisplay` | `'auto' \| 'always'` | `'auto'`  | When to show hours.      |
| `render`       | `RenderProp<State>`  | —         | Custom render element.   |

#### Data Attributes

| Attribute | Description |
| --------- | ----------- |
| — | None currently. |

---

### Value

Displays a formatted time value. Works standalone or within Group.

#### Props

| Prop            | Type                                       | Default     | Description                    |
| --------------- | ------------------------------------------ | ----------- | ------------------------------ |
| `type`          | `'current' \| 'duration' \| 'remaining'`   | `'current'` | Which time to display.         |
| `hoursDisplay`  | `'auto' \| 'always'`                       | `'auto'`    | When to show hours.            |
| `negativeSign`  | `'auto' \| 'always' \| 'never'`            | `'auto'`    | Negative sign for remaining.   |
| `fallback`      | `string`                                   | `'--:--'`   | Text when time unknown.        |
| `label`         | `string`                                   | Auto        | Custom aria-label.             |
| `render`        | `RenderProp<State>`                        | —           | Custom render element.         |

#### State

| Property       | Type     | Description                                       |
| -------------- | -------- | ------------------------------------------------- |
| `type`         | `string` | `'current'`, `'duration'`, or `'remaining'`       |
| `text`         | `string` | Formatted display text.                           |
| `hours`        | `number` | Hours component.                                  |
| `minutes`      | `number` | Minutes component.                                |
| `seconds`      | `number` | Seconds component.                                |
| `totalSeconds` | `number` | Raw value in seconds.                             |

#### Data Attributes

| Attribute    | Description                              |
| ------------ | ---------------------------------------- |
| `data-type`  | `current`, `duration`, or `remaining`.   |

#### Renders

**React** — Uses `<time>` element for semantic value:

```html
<time 
  datetime="PT1M30S" 
  aria-label="Current time"
  aria-valuetext="1 minute, 30 seconds">
  1:30
</time>

<!-- Remaining with negative sign -->
<time 
  datetime="PT4M30S" 
  aria-label="Remaining"
  aria-valuetext="4 minutes, 30 seconds remaining">
  <span aria-hidden="true">-</span>4:30
</time>
```

**HTML** — Renders text directly for simpler styling:

```html
<media-time 
  type="current"
  aria-label="Current time"
  aria-valuetext="1 minute, 30 seconds">
  1:30
</media-time>

<!-- Remaining with negative sign -->
<media-time 
  type="remaining"
  aria-label="Remaining"
  aria-valuetext="4 minutes, 30 seconds remaining">
  <span aria-hidden="true">-</span>4:30
</media-time>
```

---

### Separator

Divider between time values. Hidden from screen readers.

**Why a custom element?**

- **Consistency** — Fits the component model, composable with Group
- **Automatic accessibility** — Always applies `aria-hidden="true"`
- **Styling** — Can be targeted with CSS, has default spacing
- **Prevents mistakes** — Users don't need to remember `aria-hidden`

**Why `aria-hidden="true"`?**

The separator is a decorative visual cue. Screen readers already hear two separate time values — announcing "slash" or "of" between them adds noise without meaning. Each `<Time.Value>` has its own `aria-valuetext` providing full context.

#### Props

| Prop       | Type              | Default | Description           |
| ---------- | ----------------- | ------- | --------------------- |
| `children` | `ReactNode`       | `'/'`   | Separator content.    |
| `render`   | `RenderProp<{}>` | —       | Custom render element. |

#### Renders

```html
<span aria-hidden="true">/</span>
```

## Formatting

### Digital Format

Time displays use colon-separated digital format:

| Duration | Display |
| -------- | ------- |
| 90 sec   | `1:30` |
| 10 min   | `10:00` |
| 1 hr 5 min 30 sec | `1:05:30` |

### Padding Rules

Smart defaults handle padding automatically:

| Unit    | Rule | Example |
| ------- | ---- | ------- |
| Hours   | Never padded | `1:05:30` not `01:05:30` |
| Minutes | Padded when hours shown | `1:05:30` but `5:30` |
| Seconds | Always padded | `1:05` not `1:5` |

### Hour Display

When `hoursDisplay="auto"` (default), hours are shown only when:

- Current value has hours > 0, OR
- Duration has hours > 0 (for consistency within Group)

This ensures `1:30 / 1:05:00` doesn't happen — both would show hours.

### Negative Sign

For `type="remaining"`:

| Option     | Output  | Description                   |
| ---------- | ------- | ----------------------------- |
| `'auto'`   | `-4:30` | Show negative sign (default). |
| `'always'` | `-4:30` | Always show sign.             |
| `'never'`  | `4:30`  | Hide sign.                    |

The negative sign is rendered internally as `<span aria-hidden="true">-</span>`.

**Why internal to Value?**

The negative sign is semantically part of "remaining time", not a compositional element between siblings. The `negativeSign` prop provides control without exposing a separate component.

**Why `aria-hidden="true"`?**

The `aria-valuetext` already says "4 minutes, 30 seconds **remaining**" — the word "remaining" conveys the meaning. Announcing "minus" or "dash" would be redundant and potentially confusing.

## Accessibility

### Screen Reader Approach

Following [Media Chrome's pattern](https://github.com/muxinc/media-chrome/blob/main/src/js/media-time-display.ts):

| Attribute | Purpose | Example |
| --------- | ------- | ------- |
| `aria-label` | Static role label | `"Current time"` |
| `aria-valuetext` | Dynamic human-readable time | `"1 minute, 30 seconds"` |

Screen readers announce: "Current time, 1 minute, 30 seconds"

### Labels

Default labels by type:

| Type        | `aria-label`     | `aria-valuetext` example |
| ----------- | ---------------- | ------------------------ |
| `current`   | `"Current time"` | `"1 minute, 30 seconds"` |
| `duration`  | `"Duration"`     | `"5 minutes, 30 seconds"` |
| `remaining` | `"Remaining"`    | `"4 minutes, 30 seconds remaining"` |

Override the label with the `label` prop. The `aria-valuetext` is always auto-generated from the time value.

### Live Regions

Time displays do **not** use `aria-live`. Time updates too frequently and would overwhelm screen readers. Users who need time info can navigate to the control.

### Separator

Hidden from screen readers with `aria-hidden="true"`. Screen readers announce the two time values without the "/" between them.

### React vs HTML Element Choice

**React uses `<time>`** — Provides semantic value via `datetime` attribute for machine parsing (SEO, parsers). Styling is controlled by the developer anyway.

**HTML uses text directly** — Custom elements can't extend `<time>`, and nesting `<time>` inside creates styling complexity. The `aria-valuetext` provides equivalent accessibility.

## Architecture

### File Structure

```
packages/
├── utils/src/time/
│   ├── format.ts              # formatTime, formatTimeAsPhrase
│   └── tests/
├── core/src/core/ui/time/
│   ├── time-core.ts           # TimeCore class (shared logic)
│   └── tests/
├── react/src/ui/time/
│   ├── time.tsx               # Time namespace export
│   ├── time-value.tsx
│   ├── time-group.tsx
│   ├── time-separator.tsx
│   ├── time-context.tsx       # Context for Group → Value
│   └── tests/
└── html/src/ui/time/
    ├── time-element.ts        # <media-time>
    ├── time-group-element.ts  # <media-time-group>
    ├── time-separator-element.ts
    └── tests/
```

### Core Class

Platform-agnostic formatting logic:

```ts
class TimeCore {
  setProps(props: TimeCoreProps): void;
  
  getText(time: TimeState): string;           // Formatted display "1:30"
  getPhrase(time: TimeState): string;         // Human-readable "1 minute, 30 seconds"
  getDatetime(time: TimeState): string;       // ISO 8601 "PT1M30S"
  getLabel(): string;                         // aria-label
  getAttrs(time: TimeState): ElementProps;    // aria-label, aria-valuetext
  getState(time: TimeState): TimeValueState;  // State for styling
}
```

### Formatting Utilities

New utilities in `@videojs/utils/time`:

```ts
/**
 * Format seconds to digital display string.
 * Uses guide (typically duration) to determine hour display.
 */
function formatTime(seconds: number, guide?: number): string;
// 90 → "1:30"
// 3661 → "1:01:01"

/**
 * Format seconds to human-readable phrase for screen readers.
 */
function formatTimeAsPhrase(seconds: number): string;
// 90 → "1 minute, 30 seconds"
// -270 → "4 minutes, 30 seconds remaining"

/**
 * Convert seconds to ISO 8601 duration for datetime attribute.
 */
function secondsToIsoDuration(seconds: number): string;
// 90 → "PT1M30S"
```

Reference: [Media Chrome time utilities](https://github.com/muxinc/media-chrome/blob/main/src/js/utils/time.ts)

### Context Pattern

Group provides options via React context:

```tsx
// time-context.tsx
const TimeContext = createContext<TimeContextValue | null>(null);

function useTimeContext(): TimeContextValue | null {
  return useContext(TimeContext);
}

// time-value.tsx
function TimeValue(props: TimeValueProps) {
  const context = useTimeContext();
  const mergedProps = { ...context, ...props }; // Props override context
  // ...
}
```

## Decisions

### Single Value Component with Type Prop

**Decision:** One `Time.Value` component with `type` prop, not separate `Time.Current`, `Time.Duration`, `Time.Remaining`.

**Alternatives:**

- Separate components — more explicit, but fragments the API
- Base component with aliases — extra exports without clear benefit

**Rationale:** Single component is simpler to learn. Type safety via `type` prop guides usage.

### Minimal Props for Beta

**Decision:** Only essential props: `type`, `hoursDisplay`, `negativeSign`, `fallback`, `label`.

**Alternatives:**

- Per-unit formatting (`hours`, `minutes`, `seconds` props) — more control
- Multiple format presets (`digital`, `short`, `narrow`, `long`) — more options

**Rationale:** Video players have used the same digital format for decades. Smart defaults handle padding. We can add options later if users request them.

### Smart Padding Defaults

**Decision:** Automatic padding based on context — hours never padded, minutes padded when hours shown, seconds always padded.

**Alternatives:**

- Explicit `leadingZeros` boolean — simpler but less flexible
- Per-unit `hours: "numeric" | "2-digit"` props — matches Intl but adds complexity

**Rationale:** This matches every major video player's behavior. Users rarely need to customize padding.

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

### `negativeSign` Instead of `signDisplay`

**Decision:** Use `negativeSign` prop name.

**Alternatives:**

- `signDisplay` — matches `Intl.NumberFormat`
- `showSign` — simpler but less precise

**Rationale:** More descriptive for this specific use case. `signDisplay` is generic; `negativeSign` is clear about what it controls.

### Negative Sign Internal to Value

**Decision:** The negative sign for remaining time is rendered internally by `<Time.Value>`, controlled by `negativeSign` prop.

**Alternatives:**

- Separate `<Time.Sign>` component — maximum flexibility but overkill
- User's responsibility — minimal API but users must handle a11y

**Rationale:** The negative sign is semantically part of "remaining time", not a compositional element like Separator. It only appears with `type="remaining"`. Internal rendering ensures consistent `aria-hidden` handling.

## Open Questions

1. **Locale support** — Should we support internationalized phrases via `Intl.DurationFormat`? Currently English-only. Could add `locale` prop later.

2. **Toggle behavior** — Media Chrome allows clicking to toggle between current/remaining. Should we support this? Probably a separate concern (wrap in a button).
