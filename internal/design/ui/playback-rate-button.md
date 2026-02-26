---
status: draft
date: 2026-02-26
---

# PlaybackRateButton

Button for cycling through playback speeds. Displays the current rate and advances to the next on click.

## Problem

Users want to speed up or slow down video playback. A button that cycles through preset rates is the most common pattern — compact, one-click, no menu required.

Two things are needed:

1. **Store feature** — `playbackRate` isn't tracked in the store yet. No state, no selector, no action.
2. **Button component** — Three-layer implementation (Core + HTML + React) following existing button patterns.

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

## Component

### Usage

Headless — no default text or icons, matching all other buttons. Consumers show the rate via `data-rate` or the render prop.

#### React

```tsx
import { PlaybackRateButton } from "@videojs/react";

{/* Minimal */}
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

### Behavior

On click, advance to the next rate in the list. Wrap to the beginning after the last rate:

```
rates = [1, 1.2, 1.5, 1.7, 2]

Click: 1 → 1.2 → 1.5 → 1.7 → 2 → 1 → ...
```

If the current rate isn't in the list (e.g., set programmatically to `0.75`), jump to the first rate that's greater than the current rate. If none is greater, wrap to the first rate.

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
