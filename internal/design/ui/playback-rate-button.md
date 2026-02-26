---
status: draft
date: 2026-02-26
---

# PlaybackRateButton

Button for cycling through playback speeds. Displays the current rate and advances to the next on click.

## Problem

Users want to speed up or slow down video playback. A button that cycles through preset rates is the most common pattern — compact, one-click, no menu required.

Three things are needed:

1. **Store feature** — `playbackRate` isn't tracked in the store yet. No state, no selector, no action.
2. **ReactiveElement enhancement** — `ReactiveElement` can't handle array attributes. The `rates` prop needs a `converter` option.
3. **Button component** — Three-layer implementation (Core + HTML + React) following existing button patterns.

## Store: Extend `MediaPlaybackState`

Playback rate belongs in the existing playback feature — it's a property of playback, not a separate concern. (Very open to pushback; alternatives discussed below.)

### State Addition

```ts
export interface MediaPlaybackState {
  paused: boolean;
  ended: boolean;
  started: boolean;
  waiting: boolean;
  playbackRate: number;
  play(): Promise<void>;
  pause(): void;
  changePlaybackRate(rate: number): void;
}
```

### Feature Addition

```ts
// In playbackFeature
state: ({ target }): MediaPlaybackState => ({
  // ... existing state
  playbackRate: 1,
  changePlaybackRate(rate: number) {
    target().media.playbackRate = rate;
  },
}),

attach({ target, signal, set }) {
  const { media } = target;

  const sync = () =>
    set({
      // ... existing sync
      playbackRate: media.playbackRate,
    });

  // ... existing listeners
  listen(media, 'ratechange', sync, { signal });
},
```

### Why Not a Separate Feature

**Alternatives:**

- **New `playbackRateFeature`** — Separate selector, separate state slice.
- **Extend `playbackFeature`** — Add `playbackRate` and `changePlaybackRate` to existing state.

**Decision:** Extend `playbackFeature`.

**Rationale:**

- Conceptually cohesive — rate is a property of playback. The native API puts it on the same `HTMLMediaElement` alongside `play()`/`pause()`.
- Already listens to related events — adding `ratechange` fits naturally.
- Avoids selector proliferation — a separate `selectPlaybackRate` for one property is heavy. Consumers using `selectPlayback` get rate for free.
- Rate changes are rare — no re-render concern from including it in the playback slice.

## ReactiveElement: `converter` Option

`ReactiveElement` only handles `String`, `Boolean`, and `Number` property types — no `Array`. The `rates` attribute (`rates="0.5 1 1.5 2"`) needs custom conversion.

Without a `converter`, the only workaround is a class getter (`get rates()`). But class getters are non-enumerable, which breaks two patterns silently: `setProps(this)` skips the property (the `defaults()` utility uses `for...in`), and `satisfies PropertyDeclarationMap<keyof Props>` requires an `Exclude` escape hatch. Rather than introduce one-off exceptions, we extend `ReactiveElement` to handle this generically.

### `PropertyDeclaration` Change

```ts
export interface PropertyDeclaration {
  readonly type?: typeof String | typeof Boolean | typeof Number;
  readonly attribute?: string;
  /** Custom attribute-to-property conversion. When set, `type` is ignored. */
  readonly converter?: (value: string | null) => unknown;
}
```

### `attributeChangedCallback` Change

One branch before the existing type checks:

```ts
if (decl.converter) {
  value = decl.converter(newValue);
} else if (decl.type === Boolean) {
  // ... existing logic unchanged
}
```

### Alternatives

- **Custom getter** — `get rates()` parsing the attribute manually. Class getters are non-enumerable, so `setProps(this)` silently skips `rates` and the `satisfies` constraint needs `Exclude`. Two one-off exceptions to standard patterns.
- **`AttributeTokenList`** — Media Chrome's approach. A `DOMTokenList`-like class that syncs a space-separated attribute, with `add`/`remove`/`toggle` per token. More infrastructure, and still needs conversion to `number[]` for the Core.
- **`Array` as a built-in type** with `JSON.parse` default (Lit's approach) — Produces `rates='[1, 1.5, 2]'` in HTML, which is awkward for HTML authors. And we'd still want space-separated for `rates`, so we'd need a `converter` override anyway. Adding `Array` as a type buys us a default we don't want.

### Rationale

The `converter` option is ~10 lines of implementation in `ReactiveElement`, follows [Lit's established pattern](https://lit.dev/docs/components/properties/), and is general purpose — any future property needing custom attribute parsing (comma-separated lists, enums with validation, etc.) uses the same mechanism.

## Component

### Usage

Headless — no default text or icons, matching all other buttons. Consumers show the rate via `data-rate` or the render prop.

#### React

```tsx
import { PlaybackRateButton } from "@videojs/react";

{/* Minimal — renders an empty <button>, use render or CSS to display the rate */}
<PlaybackRateButton />

{/* With rate display */}
<PlaybackRateButton
  render={(props, state) => <button {...props}>{state.rate}x</button>}
/>

{/* Custom rates */}
<PlaybackRateButton rates={[0.5, 1, 1.5, 2]} />
```

#### HTML

```html
<media-playback-rate-button></media-playback-rate-button>

<!-- Custom rates -->
<media-playback-rate-button rates="0.5 1 1.5 2"></media-playback-rate-button>
```

```css
/* Rate display via CSS */
media-playback-rate-button::after {
  content: attr(data-rate) "x";
}
```

### API

#### Props

| Prop       | Type                                                     | Default                   | Description                                          |
| ---------- | -------------------------------------------------------- | ------------------------- | ---------------------------------------------------- |
| `rates`    | `number[]`                                               | `[1, 1.2, 1.5, 1.7, 2]` | Playback rates to cycle through.                     |
| `label`    | `string \| ((state: PlaybackRateButtonState) => string)` | —                         | Custom accessible label. Falls back to default text. |
| `disabled` | `boolean`                                                | `false`                   | Disables interaction.                                |

Default rates match [Media Chrome](https://www.media-chrome.org/docs/en/components/media-playback-rate-button).

#### Data Attributes

| Attribute   | Values               | Description            |
| ----------- | -------------------- | ---------------------- |
| `data-rate` | Number (e.g., `1.5`) | Current playback rate. |

#### State

```ts
interface PlaybackRateButtonState {
  rate: number;
}
```

#### HTML Element `rates` Declaration

With the `converter` from the ReactiveElement section, `rates` goes into `static properties` like every other prop — no exceptions:

```ts
static override properties = {
  rates: {
    converter(value) {
      const defaults = PlaybackRateButtonCore.defaultProps.rates;
      if (!value) return defaults;
      const parsed = value.split(/\s+/).map(Number).filter((n) => !Number.isNaN(n));
      return parsed.length > 0 ? parsed : defaults;
    },
  },
  label: { type: String },
  disabled: { type: Boolean },
} satisfies PropertyDeclarationMap<keyof PlaybackRateButtonCore.Props>;
```

Filters invalid tokens (e.g., `rates="1 1.f 2"` → `[1, 2]`). Falls back to defaults if nothing valid remains. Space-separated is the natural HTML pattern (like `srcset`, Media Chrome's `rates`).

### Behavior

On click, advance to the next rate in the list. Wrap to the beginning after the last rate:

```
rates = [1, 1.2, 1.5, 1.7, 2]

Click: 1 → 1.2 → 1.5 → 1.7 → 2 → 1 → ...
```

If the current rate isn't in the list (e.g., set programmatically to `0.75`), jump to the first rate in array order that's greater than the current rate. If none is greater, wrap to the first rate.

#### `cycle` method

```ts
cycle(media: MediaPlaybackState): void {
  if (this.#props.disabled) return;
  const { rates } = this.#props;
  if (rates.length === 0) return;

  const idx = rates.indexOf(media.playbackRate);
  // If current rate isn't in the list, find the first rate in array order
  // that's greater. If none, wrap to the first rate.
  const next = idx === -1
    ? rates.find((r) => r > media.playbackRate) ?? rates[0]
    : rates[(idx + 1) % rates.length];

  media.changePlaybackRate(next);
}
```

Out-of-list lookup respects array order (not numeric order) — consistent with the no-sort decision. If `rates = [2, 1, 1.5]` and the current rate is `1.2`, the next rate is `2` (first in array order that's greater), not `1.5` (smallest greater value).

#### Edge Cases

**Empty rates:** `defaults()` keeps an empty array since it's defined, so `rates: []` would pass through. The `cycle` method early-returns if `rates` is empty.

**No auto-sorting:** Rates are cycled in the order provided — not sorted. Media Chrome sorts with `.sort((a, b) => a - b)`, but, in accordance with our headless ethos, we defer to the consumer's order. This allows non-linear sequences (e.g., `[1, 2, 1.5]`) if desired. If a consumer wants ascending order, they pass ascending order.

**Why `rates` over `min`/`max`/`step`:** [Vidstack's speed slider](https://vidstack.io/docs/wc/player/components/sliders/speed-slider/) uses scalar `min`/`max`/`step` props to define a continuous range — sidestepping array attributes entirely. But a cycle button with explicit `rates` gives consumers more control: non-uniform spacing (e.g., `[0.5, 1, 1.5, 2, 3]`), arbitrary ordering, and skipping unwanted values. A slider is a complementary component, not a replacement.

## Accessibility

### Keyboard

| Key     | Action             |
| ------- | ------------------ |
| `Enter` | Cycle to next rate |
| `Space` | Cycle to next rate |

### ARIA

- `aria-label`: Default `"Playback rate {rate}"` (e.g., `"Playback rate 1.5"`). Updates on rate change. Matches Media Chrome's format.
- `aria-disabled`: Present when `disabled` prop is true.

## References

- [Media Chrome: Playback Rate Button](https://www.media-chrome.org/docs/en/components/media-playback-rate-button) — Default rates `[1, 1.2, 1.5, 1.7, 2]`, cycle on click
- [`HTMLMediaElement.playbackRate` (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate)
- Issue [#622](https://github.com/videojs/v10/issues/622)
