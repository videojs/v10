---
status: draft
date: 2025-02-04
---

# Time Component

Displays current time, duration, or remaining time with formatting aligned to `Intl.DurationFormat`.

## Problem

Video players need to display time in various formats:

1. **Current playback position** — updates continuously
2. **Total duration** — static once loaded
3. **Remaining time** — duration minus current, often with negative sign

Requirements:

- Formatting options: `1:30:45` (digital), `1h 30m` (narrow), etc.
- Conditional hour display (hide when duration < 1 hour)
- Proper accessibility (screen readers need context, not just "1:30")
- Composable for common patterns like `1:30 / 5:00`

## Anatomy

### React

```tsx
import { Time } from '@videojs/react';

// Standalone
<Time.Value type="current" />

// Composed
<Time.Group format="digital">
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
<media-time-group format="digital">
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

### Padded Hours

```tsx
<Time.Group hoursDisplay="always" hours="2-digit">
  <Time.Value type="current" />
  <Time.Separator />
  <Time.Value type="duration" />
</Time.Group>
// Renders: 00:01:30 / 00:05:00
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

### Accessible Format

```tsx
<Time.Value type="duration" format="long" />
// Renders: 5 minutes, 30 seconds
```

## Parts

### Group

Container for composed time displays. Provides formatting context to children.

#### Props

| Prop           | Type                               | Default     | Description                   |
| -------------- | ---------------------------------- | ----------- | ----------------------------- |
| `format`       | `'digital' \| 'short' \| 'narrow' \| 'long'` | `'digital'` | Display format preset.        |
| `hours`        | `'numeric' \| '2-digit'`           | `'numeric'` | Hour formatting.              |
| `minutes`      | `'numeric' \| '2-digit'`           | `'2-digit'` | Minute formatting.            |
| `seconds`      | `'numeric' \| '2-digit'`           | `'2-digit'` | Second formatting.            |
| `hoursDisplay` | `'auto' \| 'always'`               | `'auto'`    | When to show hours.           |
| `fallback`     | `string`                           | `'--:--'`   | Text when time unknown.       |
| `as`           | `ElementType`                      | `'span'`    | Container element (React).    |
| `render`       | `ReactElement \| (props, state) => ReactElement` | — | Custom render element. |

#### Data Attributes

| Attribute | Description |
| --------- | ----------- |
| `data-format` | Current format value. |

---

### Value

Displays a formatted time value. Works standalone or within Group.

#### Props

| Prop          | Type                               | Default     | Description                    |
| ------------- | ---------------------------------- | ----------- | ------------------------------ |
| `type`        | `'current' \| 'duration' \| 'remaining'` | `'current'` | Which time to display.         |
| `format`      | `'digital' \| 'short' \| 'narrow' \| 'long'` | Inherited | Display format (overrides Group). |
| `hours`       | `'numeric' \| '2-digit'`           | Inherited   | Hour formatting.               |
| `minutes`     | `'numeric' \| '2-digit'`           | Inherited   | Minute formatting.             |
| `seconds`     | `'numeric' \| '2-digit'`           | Inherited   | Second formatting.             |
| `hoursDisplay`| `'auto' \| 'always'`               | Inherited   | When to show hours.            |
| `signDisplay` | `'auto' \| 'always' \| 'never'`    | `'auto'`    | Negative sign for remaining.   |
| `fallback`    | `string`                           | Inherited   | Text when time unknown.        |
| `label`       | `string`                           | Auto        | Custom aria-label.             |
| `render`      | `ReactElement \| (props, state) => ReactElement` | — | Custom render element. |

**Note:** When used standalone (outside Group), formatting props default to: `format="digital"`, `hours="numeric"`, `minutes="2-digit"`, `seconds="2-digit"`, `hoursDisplay="auto"`, `fallback="--:--"`.

#### State

| Property       | Type     | Description                      |
| -------------- | -------- | -------------------------------- |
| `type`         | `string` | `'current'`, `'duration'`, or `'remaining'` |
| `text`         | `string` | Formatted display text.          |
| `hours`        | `number` | Hours component.                 |
| `minutes`      | `number` | Minutes component.               |
| `seconds`      | `number` | Seconds component.               |
| `totalSeconds` | `number` | Raw value in seconds.            |

#### Data Attributes

| Attribute    | Description                              |
| ------------ | ---------------------------------------- |
| `data-type`  | `current`, `duration`, or `remaining`.   |

#### Renders

```html
<time datetime="PT1M30S" aria-label="Current time">1:30</time>

<!-- Remaining with negative sign -->
<time datetime="PT4M30S" aria-label="Remaining">
  <span aria-hidden="true">-</span>4:30
</time>
```

---

### Separator

Divider between time values. Hidden from screen readers.

#### Props

| Prop       | Type        | Default | Description           |
| ---------- | ----------- | ------- | --------------------- |
| `children` | `ReactNode` | `'/'`   | Separator content.    |
| `render`   | `ReactElement \| (props, state) => ReactElement` | — | Custom render element. |

#### Renders

```html
<span aria-hidden="true">/</span>
```

## Formatting

### Format Presets

Aligned with `Intl.DurationFormat` style options:

| Format    | Example (5430 seconds) | Description                  |
| --------- | ---------------------- | ---------------------------- |
| `digital` | `1:30:30`              | Colon-separated numerals.    |
| `short`   | `1 hr, 30 min, 30 sec` | Abbreviated unit labels.     |
| `narrow`  | `1h 30m 30s`           | Minimal unit labels.         |
| `long`    | `1 hour, 30 minutes, 30 seconds` | Full unit labels. |

### Hour Display

When `hoursDisplay="auto"` (default), hours are shown only when:

- Current value has hours > 0, OR
- Duration has hours > 0 (for consistency within Group)

This ensures `1:30 / 1:05:00` doesn't happen — both would show hours.

### Digit Formatting

| Option     | `'numeric'` | `'2-digit'` |
| ---------- | ----------- | ----------- |
| `hours`    | `1`         | `01`        |
| `minutes`  | `5`         | `05`        |
| `seconds`  | `5`         | `05`        |

Default: hours are `numeric`, minutes and seconds are `2-digit`.

### Sign Display

For `type="remaining"`:

| Option        | Output    | Description                    |
| ------------- | --------- | ------------------------------ |
| `'auto'`      | `-4:30`   | Show negative sign (default).  |
| `'always'`    | `-4:30`   | Always show sign.              |
| `'never'`     | `4:30`    | Hide sign.                     |

The negative sign is rendered as a separate `<span aria-hidden="true">` element.

## Accessibility

### Screen Reader Behavior

The `<time>` element's `datetime` attribute is **not announced** by screen readers. It's for machine parsing only. We use `aria-label` to provide context:

```html
<time datetime="PT1M30S" aria-label="Current time">1:30</time>
```

### Labels

Default labels by type:

| Type        | Default Label    |
| ----------- | ---------------- |
| `current`   | `"Current time"` |
| `duration`  | `"Duration"`     |
| `remaining` | `"Remaining"`    |

Override with the `label` prop.

### Live Regions

Time displays do **not** use `aria-live`. Time updates too frequently and would overwhelm screen readers. Users who need time info can navigate to the control.

### Separator

The separator is hidden from screen readers:

```html
<span aria-hidden="true">/</span>
```

Screen readers announce the two time values without the "/" between them.

## Architecture

### File Structure

```
packages/
├── utils/src/time/
│   ├── format.ts              # formatTime, formatTimeAsPhrase
│   ├── duration.ts            # secondsToIsoDuration
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
  
  getText(time: TimeState): string;           // Formatted display
  getDatetime(time: TimeState): string;       // ISO 8601 duration
  getLabel(time: TimeState): string;          // Screen reader label
  getAttrs(time: TimeState): ElementProps;    // aria-label
  getState(time: TimeState): TimeValueState;  // State for styling
}
```

### Formatting Utilities

New utilities in `@videojs/utils`:

```ts
// Format seconds to display string
function formatTime(
  seconds: number,
  options?: FormatTimeOptions
): string;

// Format for screen readers (long format)
function formatTimeAsPhrase(seconds: number): string;

// Convert seconds to ISO 8601 duration
function secondsToIsoDuration(seconds: number): string;
// 90 → "PT1M30S"
```

### Context Pattern

Group provides formatting options via React context:

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

**Rationale:** Single component is simpler to learn. Type safety via `type` prop guides usage. Aligns with how `Intl.DurationFormat` works (one formatter, different inputs).

### `<time>` Element

**Decision:** Render `<time>` with `datetime` attribute, use `aria-label` for screen readers.

**Alternatives:**

- `<span>` with `role="presentation"` — Video.js 8 approach, but loses semantic value
- `<output>` — has implicit `aria-live`, would announce every update

**Rationale:** `<time>` provides semantic meaning for machines (SEO, parsers). `datetime` isn't announced by screen readers, so `aria-label` provides the accessible name. Best of both worlds.

### Prop Names from Intl APIs

**Decision:** Use `format`, `hoursDisplay`, `signDisplay`, `hours: "numeric" | "2-digit"` — matching `Intl.DurationFormat` and `Intl.NumberFormat`.

**Alternatives:**

- `style` — conflicts with React's inline CSS prop
- `padHours: boolean` — less flexible, non-standard
- `showNegativeSign: boolean` — doesn't match Intl pattern

**Rationale:** Alignment with web standards makes the API familiar. Users who know Intl APIs will find these props intuitive.

### Group vs Root Naming

**Decision:** `Time.Group` / `<media-time-group>` for container, not `Time.Root` / `<media-time-root>`.

**Alternatives:**

- `Time.Root` — matches Radix/Base UI
- `Time.Container` — verbose

**Rationale:** "Group" better describes the purpose (grouping time displays). `<media-time>` is the primary component; "group" clearly indicates it's for composition.

### aria-label Content

**Decision:** Label contains role only (`"Current time"`), not the value.

**Alternatives:**

- Role + value: `"Current time: 1 minute, 30 seconds"` — redundant with visible text
- Value only: `"1 minute, 30 seconds"` — loses context

**Rationale:** The visible text "1:30" provides the value. The label provides context about what that value represents. Keeps announcements concise.

## Open Questions

1. **Locale support** — Should we support a `locale` prop for internationalized formatting via `Intl.DurationFormat`? Currently keeping it simple with English-only.

2. **Guide time for formatting** — Should Value automatically use duration as "guide" for hour display when inside Group? (So `1:30 / 1:05:00` becomes `0:01:30 / 1:05:00`)

3. **CSS custom properties** — Should we expose any for styling (e.g., `--vjs-time-separator-gap`)?
