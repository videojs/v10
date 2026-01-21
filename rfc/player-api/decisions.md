# Design Decisions

Rationale behind Player API design choices.

## Naming

### `createPlayer` / `createMedia` (not `createPlayerStore` / `createMediaStore`)

**Decision:** Use `createPlayer` and `createMedia` — don't expose "store" in the primary API.

**Rationale:**

- Users want a player, not a store
- "Store" is an implementation detail — complexity should grow with use case
- Progressive disclosure: simple concept first, internals when authoring features
- Returns stay clean: `Provider`, `usePlayer` (not `StoreProvider`, `usePlayerStore`)

**"But we're not creating a player?"** — This matches React ecosystem conventions where `create*` means "create the infrastructure for X":

| Factory                 | Returns                                                 |
| ----------------------- | ------------------------------------------------------- |
| `createContext()`       | `{ Provider, Consumer }` — not "a context"              |
| `createRoot()`          | `{ render, unmount }` — not "a root"                    |
| `createBrowserRouter()` | Config for `<RouterProvider>` — not "a router"          |
| `createTRPCReact()`     | `{ Provider, hooks }` — not "a tRPC"                    |
| `createMachine()`       | Machine definition — needs actor to run                 |
| **`createPlayer()`**    | `{ Provider, usePlayer }` — infrastructure for a player |

The pattern is established: `create*` returns building blocks, not a usable instance.

### `features` (not `slices`)

**Decision:** Rename from "slices" to "features" everywhere (user-facing AND internal).

**Rationale:**

Our pattern is fundamentally different from Redux Toolkit slices:

| Aspect          | Redux "slice"          | Our pattern                               |
| --------------- | ---------------------- | ----------------------------------------- |
| State ownership | Store owns state       | Target owns state (HTMLMediaElement)      |
| State mutation  | Reducers modify state  | Requests mutate target, snapshot reflects |
| Mental model    | "A slice of the store" | "A feature I'm enabling"                  |

Our concept is:

- **Observer/Adapter** — binds store to external source of truth
- **Feature module** — bundles related state + requests
- **Binding** — connects reactive state to DOM element

"Feature" maps to user mental models:

- "I want the fullscreen feature"
- "Add the keyboard feature"
- "This preset includes playback, volume, and time features"

Calling it "slice" creates false expectations from Redux users.

### `createPlayerFeature` / `createMediaFeature` (not `createSlice`)

**Decision:** Use explicit factory names: `createPlayerFeature` and `createMediaFeature`.

**Alternatives considered:**

- `createFeature<PlayerTarget>()` — generic with type parameter (rejected: curried call, less clear intent)
- `createFeature` — simpler but ambiguous

**Rationale:**

- Clearer intent — you know what you're creating
- Simpler call signature — no curried type parameter
- Matches `createPlayer` naming pattern
- Explicit is better than implicit

### Simple Provider Naming

**Decision:** Keep `Provider`, not `PlayerProvider`.

**Rationale:**

- Scoped by `createPlayer()` call — context is already clear
- Less ceremony for the common case
- If someone needs multiple providers (rare), they can alias:
  ```ts
  const { Provider: VideoProvider } = createPlayer(...);
  ```

## API Shape

### Flat `usePlayer` Return

**Decision:** Return flattened object with state and requests at same level, no `.state`/`.request` namespaces.

```tsx
// Before (considered)
const player = usePlayer();
player.state.paused;
player.request.play();

// After (chosen)
const player = usePlayer();
player.paused;
player.play();
```

**Rationale:**

- Less nesting = less typing
- Proxy-based tracking works at property access level
- Naming convention prevents collisions (state = nouns, requests = verbs)

**Trade-off:** Requires runtime duplicate detection. If a feature defines state `foo` and another defines request `foo`, throw at creation time.

### Proxy-Based Tracking (No Selectors)

**Decision:** Use proxy-based automatic tracking instead of selector functions.

```tsx
// Before (selector approach)
const paused = usePlayer((s) => s.paused);

// After (proxy tracking)
const player = usePlayer();
player.paused; // accessing subscribes automatically
```

**Rationale:**

- Simpler API — no selector functions to write
- Automatic fine-grained subscriptions
- Matches modern patterns (Valtio, MobX)
- Works with flattened return (proxy tracks which properties accessed)

**Implementation:** Based on existing `SnapshotController` pattern using `track()`.

### PlayerController Uses `.value`

**Decision:** Access player state/requests via `.value` property (like `SnapshotController`).

```ts
class MyComponent extends VjsElement {
  #player = new PlayerController(this);

  render() {
    const { paused, play } = this.#player.value;
    // ...
  }
}
```

**Rationale:**

- Consistent with `SnapshotController` API
- `.value` returns tracking proxy
- Property access during render auto-subscribes
- No `watch()` method needed — proxy handles tracking

### Keep Shorthand Config

**Decision:** Support both shorthand and config object forms.

```ts
// Shorthand — common case
createPlayer(presets.website);
createPlayer([features.playback, features.fullscreen]);

// Config object — extensibility
createPlayer({
  features: presets.website,
  // future: devTools, middleware, etc.
});
```

**Rationale:**

- Shorthand is the 90% case — don't penalize it
- Config object enables future extensibility without API changes
- Progressive disclosure: simple → extensible

**Feedback addressed:** "Doing things too many ways can be rough" — but these aren't competing APIs, they're progressive complexity levels.

## Escape Hatches

### Keep `useMedia`

**Decision:** Keep `useMedia` as escape hatch for direct media access.

**Rationale:**

- Progressive disclosure — 95% of users never need it
- Costs nothing if unused
- Saves advanced users when they need raw media state
- Debugging scenarios: compare player vs media fullscreen state

```tsx
function DebugPanel() {
  const player = usePlayer();
  const media = useMedia();

  // Player may abstract/transform media state
  // Sometimes you need the raw value
  console.log({ playerFS: player.isFullscreen, mediaFS: media.isFullscreen });
}
```

## Architecture

### Two Stores (Not One)

**Decision:** Maintain two internal stores (Media Store + Player Store).

**Rationale:**

- **Different targets:** Media features target `HTMLMediaElement`. Player features target container element.
- **Different attachment timing:** `<Video>` and `<Container>` mount at different times.
- **Config dependency:** Player features configure against typed media store. Media store must exist first.
- **Observability:** Player→media interactions go through store. Enables debugging, tracing, request queuing.
- **Standalone media:** Headless player, audio-only, programmatic control. Media store works alone.

**Trade-off:** Two stores exist internally, but feature authors access media via `target.media` proxy — same flat API as components.

### Container ≠ Provider

**Decision:** Container is purely UI attachment. Provider owns state.

Container inside skin attaches to existing store — doesn't provide one.

## Validation

### Runtime Duplicate Key Detection

**Decision:** Throw at `createPlayer` time if state/request keys collide.

```ts
// This should throw
const bad = createPlayerFeature({
  initialState: { play: false }, // "play" as state
  request: { play: () => {} }, // "play" as request — collision!
});
```

**Rationale:**

- Flat namespace requires disambiguation
- Fail fast at creation, not at runtime access
- Clear error message: "Duplicate key 'play' found in state and requests"

## Primitives API

### `hasFeature`, `getFeature`, `throwMissingFeature`

**Decision:** Three utilities for feature access:

| Function              | Returns                            | Best for                             |
| --------------------- | ---------------------------------- | ------------------------------------ |
| `hasFeature`          | Type guard                         | Conditional narrowing                |
| `getFeature`          | Object with `T \| undefined` props | Optional features, optional chaining |
| `throwMissingFeature` | `never` (throws)                   | Critical features, fail fast         |

```ts
// Critical feature — throw on missing
if (!hasFeature(player, features.playback)) {
  throwMissingFeature(features.playback, { displayName: 'PlayButton' });
}
player.play(); // typed, guaranteed

// Optional feature — graceful degradation
const volume = getFeature(player, features.volume);
volume.setVolume?.(0.5); // safe, no crash
```

**`throwMissingFeature` rationale:**

- Surfaces misconfiguration immediately — silent `return null` hides bugs
- Clear error message: `"PlayButton requires playback feature"`
- Options object extensible for future needs (e.g., `{ displayName, silent }`)

### `StoreProxy<T>` and `UnknownPlayer`

**Decision:** Use a generic `StoreProxy<T>` interface that all proxies implement.

```ts
interface StoreProxy<T extends AnyStore = AnyStore> {
  readonly [STORE_SYMBOL]: T;
  [key: string]: unknown;
}

interface UnknownPlayerStore extends Store<PlayerTarget, []> {}
interface UnknownMediaStore extends Store<MediaTarget, []> {}

interface UnknownPlayer extends StoreProxy<UnknownPlayerStore> {}
interface UnknownMedia extends StoreProxy<UnknownMediaStore> {}
```

**Rationale:**

- Preserves store type through the proxy — `UnknownPlayer` knows it wraps `UnknownPlayerStore`
- Index signature `[key: string]: unknown` allows any property access
- Intersecting with feature types narrows specific properties
- Uses interfaces (not type aliases) for clearer hover hints in editors

### `Store<Target, []>` for Unknown Stores

**Decision:** Use empty array `[]` for features type on unknown stores.

**Rationale:**

- `[]` means "no features statically typed" not "no features at runtime"
- Avoids confusing `AnyFeature[]` which reads as "any/all features"
- Store still works at runtime — features registry is populated
- Type narrowing comes from `hasFeature`, not from store's feature list

### Feature Registry as `ReadonlyMap`

**Decision:** `store.features` is a `ReadonlyMap<symbol, AnyFeature>` keyed by `feature.id`.

**Rationale:**

- Map provides `.has()`, `.get()`, `.keys()` — standard API
- Keyed by symbol (feature.id) — unique, no string collisions
- Readonly — features are immutable after store creation
- Familiar pattern — Maps are standard JavaScript

### `target.media` as Flat Proxy

**Decision:** `PlayerTarget.media` is an `UnknownMedia` proxy, not a store.

**Rationale:**

- Consistent API — feature authors and component authors use same flat access pattern
- No `.state`/`.request` namespacing for feature authors to learn
- Subscription via `subscribe(target.media, ...)` — same as components
- Simpler `hasFeature`/`getFeature` — only one signature (StoreProxy), no store overloads

### `createProxy(store)` Factory

**Decision:** Proxies are created from stores via `createProxy()` function.

```ts
import { createProxy } from '@videojs/store';

const store = createStore({ ... });
const proxy = createProxy(store); // StoreProxy<typeof store>
```

**Rationale:**

- Clear factory pattern — store → proxy transformation is explicit
- Used internally by `createPlayer` to build `PlayerTarget.media`
- Not typically used by library consumers (they receive proxies via hooks/controllers)

## Open Questions

### "In-between" Functionality

Where does functionality that's not clearly media or UI go?

Examples needed to clarify boundary.

### Feature Author Experience

How many concepts must authors learn? Current: Target types, state, requests, subscribe pattern.

Is this the right level of complexity for the extension story?
