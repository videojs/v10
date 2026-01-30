# Design Decisions

Rationale behind Player API design choices.

## Problem

Original direction used use-case presets as the primary abstraction:

```html
<website-video-player>
  <website-frosted-video-skin>
    <hls-video src="...">
  </website-frosted-video-skin>
</website-video-player>
```

### Issues

1. **Verbose for common case** — most people just want "a video player"
2. **Opaque naming** — "website" means nothing without context
3. **Mental model mismatch** — Devs think "I need a video player... then adaptive... then ads", not "I need a news player"
4. **Preset/skin/media relationship unclear** — If you use `website` preset but `<hls-video>`, does the skin show quality controls?
5. **Use-cases are just feature combos** — News = default + ads. Why make it a separate concept?
6. **Feature/skin pairing unclear** — Does `streaming-video-skin` strictly require streaming features?
7. **Default was hidden** — "website" was default but not obvious
8. **Configuration vs composition** — Presets are "pick one". Features are "add what you need". Composition scales better.
9. **Presets hid what's inside** — "website" bundles player + features, not transparent
10. **Not self-documenting** — User doesn't see what's included without checking docs
11. **Presets might make sense at a higher layer** — e.g., Mux could bundle features as presets for their customers

### Core Insight

Presets aren't the primary abstraction. **Features are.**

Player is simple. Features are additive. Skins adapt.

## Features over Presets

**Decision:** Features are the primary abstraction, not presets.

Features match the mental model: start simple, add what you need.

## Selectors (No Proxy Tracking)

**Decision:** Use explicit selectors for state subscriptions.

```tsx
// Selector-based
const paused = usePlayer(features.playback, s => s.paused);
```

**Rationale:**

- **Explicit** — You control what you subscribe to
- **Predictable** — No magic tracking, clear performance characteristics
- **Standard** — Matches Zustand, Redux Toolkit patterns

**Trade-off:** More ceremony than proxy tracking, but no surprises.

## shallowEqual for Object Selectors

**Decision:** Object selector results compared with `shallowEqual`.

```tsx
const state = usePlayer(s => ({ paused: s.paused, volume: s.volume }));
// Re-renders only when paused OR volume changes
```

**Rationale:**

- Selectors often return objects for convenience
- Without shallow comparison, new object = new reference = re-render
- `shallowEqual` exported from `@videojs/store` for custom use

## Feature Keys

**Decision:** Features can have custom symbol keys with type-carrying.

```ts
const PLAYBACK_KEY = Symbol.for('@videojs/playback');
export const playbackKey: FeatureKey<typeof playbackFeature> = PLAYBACK_KEY;
```

**Rationale:**

- **Smaller imports** — Import just the key, not the feature definition
- **Cross-realm** — `Symbol.for()` works across module boundaries
- **Type inference** — `FeatureKey<F>` carries feature type for `store.get()`

## usePlayer Overloads

**Decision:** Single hook with multiple overloads.

```tsx
usePlayer(feature)           // Full feature slice
usePlayer(feature, selector) // Selected value from feature
usePlayer(selector)          // Selected value from all state
```

**Rationale:**

- **Single hook** — Less API surface to learn
- **Progressive** — Start simple, add selector for performance
- **Consistent** — Same pattern for feature access and selection

**Why no array support?** Call `usePlayer` multiple times. Simpler, explicit.

```tsx
const playback = usePlayer(features.playback);
const volume = usePlayer(features.volume);
```

## Feature Returns Undefined, Not Throws

**Decision:** `usePlayer(feature)` returns `Slice | undefined`, doesn't throw.

**Rationale:**

- Primitives need graceful handling — they don't know user's feature config
- Throwing would break apps when features are misconfigured
- Caller decides how to handle: return null, show fallback, throw themselves

## store.get / store.has

**Decision:** Use `store.get()` and `store.has()` for feature access in feature context.

```ts
subscribe: ({ store }) => {
  const playback = store.get(features.playback);
  if (store.has('time')) { /* ... */ }
}
```

**Rationale:**

- **Map-like** — Familiar pattern, `.get()` returns `T | undefined`
- **Unified** — Same API for feature reference, key, or name
- **Cross-store** — Abstracts which store a feature lives on

## No Store Merge

**Decision:** Keep two stores internally (media + player).

**Rationale:**

- Different targets (media element vs container)
- Different attachment timing
- `store.get()` abstracts cross-store access
- Feature authors use same API regardless of store

**Trade-off:** Internal complexity, but hidden from users.

## Naming

### createPlayer (not createPlayerStore)

- Users want a player, not a store
- "Store" is implementation detail
- Matches ecosystem: `createContext`, `createRoot`, `createBrowserRouter`

### features (not slices)

- "Slice" implies Redux mental model (store owns state, reducers modify)
- Our pattern: target owns state, features observe and request
- "Feature" matches user mental model: "I want the fullscreen feature"

### MediaElement (not VjsElement)

- Clearer purpose — base class for media UI primitives
- No `vjs-` prefix in new naming convention

## Element Naming (HTML)

**Decision:** No `vjs-` prefix. Pattern-based naming.

| Layer  | Pattern                  | Examples                          |
| ------ | ------------------------ | --------------------------------- |
| Player | `<{mediatype}-player>`   | `<video-player>`, `<audio-player>` |
| Skin   | `<{mediatype}-skin>`     | `<video-skin>`                    |
| Media  | `<{source}-{mediatype}>` | `<hls-video>`, `<dash-video>`     |
| UI     | `<media-{component}>`    | `<media-play-button>`             |

**Rationale:**

- Self-documenting — element name tells you what it is
- Consistent — every name ends in its object type
- No vendor prefix — cleaner, less typing

## Adaptive Skins

**Decision:** Default skin adapts to available features.

```html
<video-skin>  <!-- shows quality menu only if streaming feature loaded -->
```

**Rationale:**

- DX — import features, skin "just works"
- Progressive — add features, UI adapts
- Named skins for specific variants (minimal, cinematic)

## Feature Bundles Are Sugar

**Decision:** Bundles like `features.video` are convenience, not required.

```ts
// These are equivalent:
features.video
[features.playback, features.volume, features.time, features.presentation, features.userActivity, /* ... */]
```

**Rationale:**

- Bundles reduce API surface — fewer imports for common cases
- Granular still available — full control when needed
- Upgrade path — add to bundle, users get it automatically
