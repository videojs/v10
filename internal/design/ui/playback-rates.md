---
status: draft
date: 2026-05-20
updated: 2026-05-25
---

# PlaybackRates

Store feature and configuration API for the available playback rate list. Rates are set at the root player and optionally constrained by source plugins.

## Problem

The `playbackRate` store feature shipped with a hard-coded list of rates
`[0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2]`. There was no consumer API to override
it and no mechanism for source plugins (YouTube, Vimeo, HLS) to communicate
their own supported rate lists to the UI.

Requirements:

- Declarative HTML-first API — configure via markup, no scripting required
- React component equivalent
- Source plugins can inject constraints independently of consumer intent
- The effective rate list flows to both `PlaybackRateButton` and
  `PlaybackRateMenu` without changes to either consumer

## API

### Configuration

Rates are configured at the root player. Rate controls read the effective list
from the store directly.

#### HTML

```html
<media-player playback-rates="0.5 1 1.5 2">
  <video-minimal-skin>
    <mux-video src="..."></mux-video>
  </video-minimal-skin>
</media-player>
```

#### React

```tsx
<Player.Provider playbackRates={[0.5, 1, 1.5, 2]}>
  <VideoSkin>
    <Video src="..." />
  </VideoSkin>
</Player.Provider>
```

#### Root player props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `playbackRates` | `number[]` | `DEFAULT_RATES` | Available playback rates. Space-separated string in HTML, number array in React. |

### Store state

```ts
interface MediaPlaybackRateState {
  /** Derived — the effective list the UI reads. Never set directly. */
  readonly playbackRates: readonly number[];
  /** Set by the root player — consumer intent. */
  readonly requestedRates: readonly number[];
  /** Set by source plugins — null when unconstrained. */
  readonly sourceRates: readonly number[] | null;
  /** Currently active rate. */
  readonly playbackRate: number;
}
```

Three actions — no others:

```ts
setRequestedRates(rates: number[]): void;
setSourceRates(rates: number[] | null): void;
setPlaybackRate(rate: number): void;
```

`DEFAULT_RATES` is exported from `@videojs/core/dom` so rate controls and
source plugins can reference the same baseline.

## Architecture

### Data flow

```
<media-player playback-rates="...">
  ↓ parse, validate
  store.setRequestedRates(...)

store.requestedRates + store.sourceRates
  ↓ (computed intersection)
  store.playbackRates  ← derived getter, never stored

  ↓ read via selector
<media-playback-rate-button>  ← read only; click → setPlaybackRate(next)
```

### Derived state

`playbackRates` is a computed getter — never stored, always derived:

| Condition | `playbackRates` |
| --- | --- |
| No source constraint (`sourceRates === null`) | `requestedRates` |
| Source constraint with overlap | `intersection(requested, source)` |
| Source constraint, no overlap | `[]` — button is disabled |

### Rate guard

Whenever `requestedRates` or `sourceRates` changes, the current rate is
checked against the new effective list. If it is no longer valid, it resets
to the first available rate (or `1` if the list is empty).

### Input validation

`requestedRates` is validated on write: non-finite and non-positive values are
filtered, duplicates are removed (first occurrence wins), and consumer order is
preserved — no automatic sorting. If nothing valid remains, `DEFAULT_RATES` is
used as the fallback.

`sourceRates` is not validated — source plugins are trusted to provide valid arrays.

## Decisions

**Configuration at the root player.** The consumer sets `playback-rates` on
`<media-player>`. This keeps configuration at the component that owns the player
lifecycle and makes the data flow unambiguous: one owner writes, all consumers
read. It also establishes a pattern that scales to other features such as quality
selection.

**Pure intersection.** When source rates and requested rates have no overlap,
`playbackRates` is empty and the button is disabled. The previous "source wins
entirely on no-overlap" rule added complexity for a case that should not occur
in a correctly configured integration.

**`playbackRates` is a derived getter, not stored.** Storing the derived value
would require invalidation logic and risks stale reads if both `setRequestedRates`
and `setSourceRates` fire in the same synchronous tick. A getter recomputes from
the authoritative inputs every time it is read.

**Space-separated attribute format.** `playback-rates="0.5 1 1.5 2"` matches
the multi-value attribute convention used elsewhere in the component set (e.g.,
`actions="toggleSubtitles toggleFullscreen"`). JSON is awkward for HTML authors;
comma-separated conflicts with how some template engines split attribute values.

## Edge cases

**Empty or all-invalid rates** — If no valid rates remain after validation,
`DEFAULT_RATES` is used. `<media-player playback-rates="">` never leaves the
player rateless.

**Duplicates** — Deduplicated at write time, preserving the first occurrence.
`playback-rates="1 1.5 1"` becomes `[1, 1.5]`.

**Source rates, no overlap** — `playbackRates` becomes empty and the button is
disabled. This signals a configuration mismatch rather than silently overriding
consumer intent.

**`setSourceRates(null)`** — Clears the constraint. `playbackRates` reverts to
`requestedRates`.

**Current rate becomes invalid** — After any change to `requestedRates` or
`sourceRates`, if the current rate is no longer in the effective list, it resets
to the first available rate or `1`.

## Descoped

| Feature | Reason |
| --- | --- |
| `ratesLockedBySource` flag | The UI can derive this from `sourceRates !== null`. Storing a derived boolean creates a second source of truth. |
| `setSourceRates` consumer API | Source plugins call `setSourceRates` directly via the store. A consumer-facing source API is a separate concern. |

## Scalability

This pattern — configure at root, derived effective state, read-only consumers —
applies directly to quality selection and other features that require both
consumer configuration and source plugin constraints.

## References

- Issue [#1404](https://github.com/videojs/v10/issues/1404)
- `internal/design/ui/playback-rate-button.md` — Deferred: Custom `rates` Prop section
- `packages/core/src/dom/store/features/playback-rate.ts`
- `packages/react/src/ui/playback-rate-button/playback-rate-button.tsx`
- `packages/html/src/ui/playback-rate-button/playback-rate-button-element.ts`
