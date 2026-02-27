---
status: draft
date: 2026-02-26
---

# PlaybackRateButton

Button for cycling through playback speeds. Displays the current rate and advances to the next on click.

## Problem

Users want to speed up or slow down video playback. A button that cycles through preset rates is a common pattern — compact, one-click, no menu required.

Two things are needed:

1. **Store feature** — `playbackRate` isn't tracked in the store yet. No state, no selector, no action.
2. **Button component** — Three-layer implementation (Core + HTML + React) following existing button patterns.

## Store: New `MediaPlaybackRateState`

Playback rate gets its own feature and state slice — separate from `MediaPlaybackState`.

### State

```ts
export interface MediaPlaybackRateState {
  readonly playbackRates: readonly number[];
  playbackRate: number;
  setPlaybackRate(rate: number): void;
}
```

`playbackRates` is a readonly array of available rates, statically set to `[1, 1.2, 1.5, 1.7, 2]` for now. Later, providers can populate this dynamically (e.g., YouTube's `getAvailablePlaybackRates`).

### Feature

```ts
const DEFAULT_RATES: readonly number[] = [1, 1.2, 1.5, 1.7, 2];

export const playbackRateFeature = createFeature({
  state: ({ target }): MediaPlaybackRateState => ({
    playbackRates: DEFAULT_RATES,
    playbackRate: 1,
    setPlaybackRate(rate: number) {
      target().media.playbackRate = rate;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;

    const sync = () => set({ playbackRate: media.playbackRate });
    sync();

    listen(media, "ratechange", sync, { signal });
  },
});
```

### Why a Separate Feature

The alternative is extending `playbackFeature` — adding `playbackRate` and `setPlaybackRate` to existing `MediaPlaybackState`. Conceptually cohesive since rate is a property of playback, and the native API puts it on the same `HTMLMediaElement`. But coupling means every playback subscriber re-renders on rate change, and the state can't independently track capability/support.

A separate feature wins out ([per review](https://github.com/videojs/v10/pull/624#discussion_r2861102031)):

- **Self-contained capability** — Rate support varies by provider (e.g., Vimeo required Pro, YouTube exposes `getAvailablePlaybackRates`). A separate feature can later track availability without bloating the playback state.
- **Used independently in UI** — The playback rate button only needs rate state, not `paused`/`ended`/`waiting`.
- **Granular contracts** — Aligns with the pattern of capability-scoped features.

## Component

### Usage

Headless — no default text or icons, matching all other buttons. Consumers show the rate via `data-rate` or the render prop.

#### React

```tsx
import { PlaybackRateButton } from "@videojs/react";

<PlaybackRateButton />;

{
  /* With rate display */
}
<PlaybackRateButton
  render={(props, state) => <button {...props}>{state.rate}&times;</button>}
/>;
```

#### HTML

```html
<media-playback-rate-button></media-playback-rate-button>
```

```css
/* Rate display via CSS */
media-playback-rate-button::after {
  content: attr(data-rate) "\00D7";
}
```

### API

#### Props

| Prop       | Type                                                     | Default | Description                                          |
| ---------- | -------------------------------------------------------- | ------- | ---------------------------------------------------- |
| `label`    | `string \| ((state: PlaybackRateButtonState) => string)` | —       | Custom accessible label. Falls back to default text. |
| `disabled` | `boolean`                                                | `false` | Disables interaction.                                |

No `rates` prop — rates are sourced from `playbackRates` in the [store](#store-new-mediaplaybackratestate). A consumer-facing prop is [deferred](#deferred-custom-rates-prop) until provider rate constraints are sorted out.

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

### Behavior

On click, advance to the next rate in the `playbackRates` list. Wrap to the beginning after the last rate:

```
playbackRates = [1, 1.2, 1.5, 1.7, 2]

Click: 1 → 1.2 → 1.5 → 1.7 → 2 → 1 → ...
```

If the current rate isn't in the list (e.g., set programmatically to `0.75`), find the first rate in array order that's greater. If none is greater, wrap to the first rate.

#### `cycle` method

```ts
cycle(media: MediaPlaybackRateState): void {
  if (this.#props.disabled) return;
  const { playbackRates, playbackRate } = media;
  if (playbackRates.length === 0) return;

  const idx = playbackRates.indexOf(playbackRate);
  const next = idx === -1
    ? playbackRates.find((r) => r > playbackRate) ?? playbackRates[0]
    : playbackRates[(idx + 1) % playbackRates.length];

  media.setPlaybackRate(next);
}
```

## Accessibility

### Keyboard

| Key     | Action             |
| ------- | ------------------ |
| `Enter` | Cycle to next rate |
| `Space` | Cycle to next rate |

### ARIA

- `aria-label`: Default `"Playback rate {rate}"` (e.g., `"Playback rate 1.5"`). Updates on rate change. Matches Media Chrome's format.
- `aria-disabled`: Present when `disabled` prop is true.

## Deferred: Custom `rates` Prop

Custom rates are intentionally deferred ([per review](https://github.com/videojs/v10/pull/624#discussion_r2861088551)). Some providers only support specific playback rates (e.g., [YouTube's `getAvailablePlaybackRates`](https://developers.google.com/youtube/iframe_api_reference#getAvailablePlaybackRates)), so exposing a consumer-facing `rates` prop without accounting for provider constraints could lead to broken UX. The store's `playbackRates` array is the right place — providers can populate it dynamically in the future.

When we're ready to expose custom rates, the following research applies:

**Proposed API:** `<PlaybackRateButton rates={[0.5, 1, 1.5, 2]} />` in React, `rates="0.5 1 1.5 2"` (space-separated) in HTML. A component `rates` prop would override the store's `playbackRates` for that instance.

**ReactiveElement `converter`:** The HTML attribute needs a `converter` option on `ReactiveElement` since it only handles `String`, `Boolean`, and `Number` today. The proposed approach adds a `converter` function to `PropertyDeclaration`, aligning with [Lit's converter API](https://lit.dev/docs/v1/components/properties/#conversion-converter) (~10 lines of implementation). General-purpose for any future attribute needing custom parsing.

```ts
export interface PropertyDeclaration {
  readonly type?: typeof String | typeof Boolean | typeof Number;
  readonly attribute?: string;
  readonly converter?: (value: string | null) => unknown;
}
```

Element declaration with `converter`:

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
};
```

**No auto-sorting:** Rates are cycled in array order, not sorted numerically. Media Chrome sorts with `.sort((a, b) => a - b)`, but we respect the consumer's order. Non-linear sequences (e.g., `[1, 2, 1.5]`) are valid.

**Alternatives explored:**

- **Property-only (no attribute)** — Standard web component convention for complex types, but forces JS-only configuration and undermines the declarative HTML story.
- **Custom getter** — Non-enumerable, breaks `setProps(this)` and `satisfies` constraint.
- **`AttributeTokenList`** — Media Chrome's `DOMTokenList`-like approach. More infrastructure than needed.
- **`Array` built-in type with `JSON.parse`** — Produces `rates='[1, 1.5, 2]'` which is awkward for HTML authors.
- **`min`/`max`/`step`** — [Vidstack's approach](https://vidstack.io/docs/wc/player/components/sliders/speed-slider/) for continuous ranges. Doesn't allow non-uniform spacing or arbitrary ordering.

## References

- [Media Chrome: Playback Rate Button](https://www.media-chrome.org/docs/en/components/media-playback-rate-button) — Default rates `[1, 1.2, 1.5, 1.7, 2]`, cycle on click
- [`HTMLMediaElement.playbackRate` (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/playbackRate)
- Issue [#622](https://github.com/videojs/v10/issues/622)
