---
status: draft
date: 2026-05-20
---

# PlaybackRates

Headless component for configuring the list of available playback rates from outside the skin.

## Problem

The `playbackRate` store feature shipped with a hard-coded list of rates
`[0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2]`. There was no consumer API to override
it and no mechanism for source plugins (YouTube,
Vimeo, HLS) to communicate their own supported rate lists to the UI.

Requirements:

- Declarative HTML-first API — configure via markup, no scripting required
- React component equivalent
- Source plugins can inject constraints independently of consumer intent
- Zero UI output — the component renders nothing
- The effective rate list flows to both `PlaybackRateButton` and
  `PlaybackRateMenu` without changes to either consumer

## API

### Component

A single headless `<media-playback-rates>` / `<PlaybackRates>` component.
It lives as a sibling inside the player provider — same pattern as `<Hotkey>`.

#### HTML

```html
<video-player>
  <video-minimal-skin>
    <mux-video src="..."></mux-video>
  </video-minimal-skin>

  <!-- override default rates -->
  <media-playback-rates rates="0.5 1 1.5 2"></media-playback-rates>
</video-player>
```

#### React

```tsx
<Player.Provider>
  <VideoSkin>
    <Video src="..." />
  </VideoSkin>

  <PlaybackRates rates={[0.5, 1, 1.5, 2]} />
</Player.Provider>
```

#### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rates` | `number[]` | `DEFAULT_RATES` | Available playback rates. Space-separated string in HTML, number array in React. |

### Store state

The feature exposes three rate-related fields and two actions beyond the
pre-existing `playbackRate` / `setPlaybackRate`:

```ts
interface MediaPlaybackRateState {
  /** Derived — the effective list the UI reads. */
  readonly playbackRates: readonly number[];
  /** Set by <PlaybackRates> — consumer intent. */
  readonly requestedRates: readonly number[];
  /** Set by source plugins — null when unconstrained. */
  readonly sourceRates: readonly number[] | null;
  /** True while sourceRates overrides requestedRates. */
  readonly ratesLockedBySource: boolean;

  setRequestedRates(rates: number[]): void;
  setSourceRates(rates: number[] | null): void;
}
```

`DEFAULT_RATES` is exported from `@videojs/core/dom` so headless components
and source plugins can reset to the same baseline.

## Architecture

### Derived state

`playbackRates` is never set directly — it is always computed:

```
requestedRates (consumer) ─┐
                            ├─ computeEffectiveRates() ─→ playbackRates
sourceRates (plugin)    ───┘
```

Effective rates rules:

| Condition | `playbackRates` |
|---|---|
| No source constraint | `requestedRates` |
| Source + overlap | `intersection(requested, source)` |
| Source + no overlap | `source` (source wins entirely) |

`ratesLockedBySource` is `true` whenever `sourceRates !== null`, regardless
of overlap. It lets the UI signal that rates are externally constrained.

### Closure variables

`requestedRates` and `sourceRates` are closure variables inside the feature's
`state()` factory, not stored in the reactive slice. They serve as the
authoritative input to the next `computeEffectiveRates()` call without relying
on `get()` — which could return stale state if both actions fire in the same
synchronous tick.

### Sanitization

`sanitizeRates()` is applied to the `rates` argument of `setRequestedRates`:

- Filters non-finite and non-positive values
- Deduplicates preserving first occurrence (no auto-sort — consumer order is respected)
- Falls back to `[...DEFAULT_RATES]` if nothing valid remains

`sourceRates` is not sanitized — source plugins are trusted to provide valid arrays.

### Array equality guard

`arraysEqual()` compares `requestedRates` before writing. If the incoming
sanitized array is identical to the current value, `set()` is skipped. This
prevents redundant subscriber notifications when the same logical rates are
written again (e.g., from a React effect re-running with a stable array).

## Decisions

**Separate headless component, not a prop on the button or menu.** A single
`<PlaybackRates>` sibling sets rates once for all consumers (button + menu
read the same `playbackRates` from the store). Adding a `rates` prop to each
consumer would require coordinating multiple sources of truth and duplicating
sanitization. The headless pattern is identical to `<Hotkey>`.

**Closure variables instead of `get()`.** Reading state via `get()` inside
`setRequestedRates` creates a stale-read race: if `setRequestedRates` and
`setSourceRates` are called in the same synchronous tick, the second call
would compute effective rates using the old value of the first (before `set()`
has propagated). Closure vars are always up-to-date at call time.

**`usePlayer()` without selector in React.** `usePlayer(selectPlaybackRate)`
subscribes to state changes. `setRequestedRates` writes new array references →
the subscription fires → React re-renders → the effect re-runs → infinite
loop. `usePlayer()` with no selector returns a stable store reference backed
by `noopSubscribe` — it never causes re-renders. `selectPlaybackRate(store.state)`
is applied inside the effect to access the actions without subscribing.

**No reset on unmount.** When `<PlaybackRates>` unmounts the last set rates
persist in the store. Reset-on-unmount would create a visible flash during
provider re-renders and React Strict Mode double-invoke (rates briefly revert
to `DEFAULT_RATES`). Consumers who need reset can mount
`<PlaybackRates rates={DEFAULT_RATES} />` explicitly.

**Space-separated attribute format.** `rates="0.5 1 1.5 2"` matches the
multi-value attribute convention used elsewhere in the component set (e.g.,
`<media-status-indicator actions="toggleSubtitles toggleFullscreen">`). JSON
(`[0.5,1]`) is awkward for HTML authors; comma-separated conflicts with how
some template engines split attribute values.

**`PlayerController` without selector in HTML.** Using `PlayerController` with
a selector wraps a `StoreController` whose `.value` getter throws
`"Store not available"` when the store is `null` — the `?.` optional chain on
the subsequent method call does not protect against the throw. Without a
selector, `PlayerController.value` returns `undefined` safely when disconnected.

## Edge cases

**Empty or all-invalid rates** — `sanitizeRates([])` falls back to
`[...DEFAULT_RATES]`, so `<media-playback-rates rates="">` never leaves the
player rateless.

**Duplicates** — Deduplicated at sanitization time. `rates="1 1.5 1"` becomes
`[1, 1.5]`.

**Source rates, no overlap** — `computeEffectiveRates([0.5, 1, 1.5], [2, 4])`
returns `[2, 4]`. Source wins entirely; `ratesLockedBySource` is `true`.

**`setSourceRates(null)`** — Clears the constraint. `playbackRates` reverts to
`requestedRates`. `ratesLockedBySource` becomes `false`.

**Disconnect order in HTML** — `PlaybackRatesElement.disconnectedCallback`
must reset rates *before* calling `super.disconnectedCallback()`. The super
call disconnects the `PlayerController`, making the store inaccessible.
Calling reset after super is a silent no-op.

## Descoped

| Feature | Reason |
|---|---|
| Reset on unmount | Causes a flash during re-mount. Last value persisting is the safer default; explicit reset is always available. |
| Per-component `rates` prop (on button or menu) | A single `<PlaybackRates>` sibling is sufficient. Multiple coordinated sources add complexity with no benefit. |
| `setSourceRates` on `<PlaybackRates>` | Source plugins call `setSourceRates` directly via the store. A consumer-facing source API is a separate concern. |

## References

- Issue [#1404](https://github.com/videojs/v10/issues/1404)
- `internal/design/ui/playback-rate-button.md` — Deferred: Custom `rates` Prop section
- `packages/core/src/dom/store/features/playback-rate.ts`
- `packages/react/src/ui/playback-rates/playback-rates.tsx`
- `packages/html/src/ui/playback-rates/playback-rates-element.ts`
