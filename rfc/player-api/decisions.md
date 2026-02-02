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

## Single Store with PlayerTarget

**Decision:** Use a single store with composite `PlayerTarget`.

```ts
interface PlayerTarget {
  media: Media;                    // HTMLMediaElement
  container: MediaContainer | null; // Container element (optional)
}
```

### Why Single Store

| Reason                | Explanation                                                     |
| --------------------- | --------------------------------------------------------------- |
| **Simpler mental model** | One store, one target, one subscription flow                 |
| **Unified state**     | All state in one place, selectors work across all slices        |
| **Easier debugging**  | Single state tree to inspect                                    |
| **Composite target**  | `PlayerTarget` gives features access to both media and container |
| **Optional container** | `container: null` for headless/audio-only use cases            |

### Trade-off

Features that only need the media element still receive the full `PlayerTarget`. This is acceptable because:

- Type narrowing via `target.media` is straightforward
- No runtime overhead — just property access
- Consistent API for all features

## Selector-Based Access

**Decision:** Use explicit selectors for state subscriptions.

```tsx
// Selector-based
const playback = usePlayer(selectPlayback);
const paused = usePlayer((s) => s.paused);
```

### Why Selectors over Feature-Scoped Hooks

| Reason                | Explanation                                                |
| --------------------- | ---------------------------------------------------------- |
| **Simpler API**       | One hook pattern, not multiple hook variants               |
| **Matches ecosystem** | Zustand, Redux Toolkit use same pattern                    |
| **Explicit**          | You control what you subscribe to                          |
| **Composable**        | Selectors can derive, combine, filter                      |
| **No magic**          | No proxy tracking, clear performance characteristics       |

**Trade-off:** Requires importing selectors separately from `@videojs/core/dom`.

## shallowEqual for Object Selectors

**Decision:** Object selector results compared with `shallowEqual`.

```tsx
const state = usePlayer((s) => ({ paused: s.paused, volume: s.volume }));
// Re-renders only when paused OR volume changes
```

**Rationale:**

- Selectors often return objects for convenience
- Without shallow comparison, new object = new reference = re-render
- `shallowEqual` exported from `@videojs/store` for custom use

## Selector Returns Undefined, Not Throws

**Decision:** Selectors return `T | undefined`, don't throw.

**Rationale:**

- Primitives need graceful handling — they don't know user's slice config
- Throwing would break apps when slices are misconfigured
- Caller decides how to handle: return null, show fallback, throw themselves

```tsx
const playback = usePlayer(selectPlayback);
if (!playback) return null; // Graceful handling
```

## createPlayer Factory

**Decision:** Use `createPlayer()` factory that returns typed infrastructure.

```ts
const { Provider, Container, usePlayer } = createPlayer({
  features: [...features.video],
});
```

### Why Factory

| Reason                | Explanation                                                |
| --------------------- | ---------------------------------------------------------- |
| **Type inference**    | Return types inferred from features array                  |
| **Scoped context**    | Each `createPlayer` call creates isolated context          |
| **Explicit config**   | Features declared upfront, not discovered at runtime       |
| **Tree-shakeable**    | Unused features not bundled                                |

### Why Not Global Registration

Global registration (like side-effect imports) works for HTML but doesn't fit React's component model. The factory provides:

- Type safety from features to hooks
- Multiple players with different features
- Clear dependency graph

## PlayerElement vs Mixins

**Decision:** Provide both `PlayerElement` (simple) and mixins (advanced).

```ts
// Simple — complete player element
customElements.define('video-player', PlayerElement);

// Advanced — custom behavior
class MyPlayer extends PlayerMixin(MediaElement) {}
```

### Why Both

| Use Case        | Solution       | When to Use                        |
| --------------- | -------------- | ---------------------------------- |
| Standard player | `PlayerElement` | Most cases, just works            |
| Custom behavior | `PlayerMixin`  | Need to extend lifecycle, add logic |
| Split concerns  | `ProviderMixin` + `ContainerMixin` | Media and controls in different DOM locations |

## Naming

### createPlayer (not createPlayerStore)

- Users want a player, not a store
- "Store" is implementation detail
- Matches ecosystem: `createContext`, `createRoot`, `createBrowserRouter`

### features (not slices)

- "Slice" implies Redux mental model
- "Feature" matches user mental model: "I want the fullscreen feature"
- Slices are the implementation, features are the concept

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
[playbackSlice, volumeSlice, timeSlice, sourceSlice, bufferSlice]
```

**Rationale:**

- Bundles reduce API surface — fewer imports for common cases
- Granular still available — full control when needed
- Upgrade path — add to bundle, users get it automatically

## Future Work Deferred

Some patterns were considered but deferred:

### Feature Keys

```ts
const playbackKey: FeatureKey<typeof playbackSlice> = PLAYBACK_KEY;
store.get(playbackKey); // Typed access without importing slice
```

**Deferred:** `createSelector` provides equivalent type-safe access without the complexity of symbol-based keys.

### store.get / store.has

```ts
store.get(feature); // Direct feature access
store.has(feature); // Check if feature exists
```

**Deferred:** Selectors provide the same capability with better composition and TypeScript inference.
