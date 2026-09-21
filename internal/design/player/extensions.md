---
status: draft
date: 2026-09-21
---

# Player extensions

Google Cast and Mux Data are player-level concerns: a cast session outlives any one media, and a Mux Data view session spans every video one player plays. Before #2880 both were written to a media-level `MediaExtension` contract registered on `HTMLMediaAdapter`, so a plain `<video>` was silently ignored and casting worked only because `<google-cast>` happened to register before the store attached. This record lays out the architecture #2880 implements so it can be discussed before it is treated as settled.

## Problem

```html
<video-player>
  <video src="https://example.com/video.mp4"></video>
  <google-cast></google-cast> <!-- did nothing: no adapter to register with -->
</video-player>
```

The `MediaExtension` registry lived in `@videojs/media/dom`, keyed by adapter. `HTMLMediaAdapter` resolved every getter through `getMediaOwner()`, which scanned extension `targetOverride`s before its own protected `target`. Ownership, ordering, and interception were all decided one level below the thing they were about.

## Decisions

### 1. Extensions register with the player

Markup and JSX do not change. What changes is who the element or component talks to: the player, through context, instead of an adapter it has to find.

```html
<video-player>
  <video src="https://example.com/video.mp4"></video>
  <google-cast receiver="APP_ID"></google-cast>
  <mux-data env-key="KEY"></mux-data>
</video-player>
```

```tsx
<Player>
  <Video src="https://example.com/video.mp4" />
  <GoogleCast receiver="APP_ID" />
  <MuxData envKey="KEY" />
</Player>
```

The contract moves to `@videojs/core/dom` and receives the player's resolved target, never an adapter:

```ts
interface PlayerExtension {
  /** Read on every access; may change while attached (e.g. only while a cast session is connected). */
  readonly mediaOverride?: Partial<Video> | null;
  attach?(target: PlayerTarget): void; // { media, container }
  detach?(): void;
  destroy?(): void;
}
```

The owner (element or hook) creates and destroys the instance. The player attaches and detaches it alongside the store and moves it when the media changes. `PlayerExtensionCoordinator` holds one instance per class.

### 2. The player owns attach order

Store features capture members such as `media.remote` once, at attach time. The player therefore attaches extensions before the store, and re-attaches the store when an extension is registered or released, so a late `<google-cast>` takes effect instead of silently never working.

```ts
// packages/html/src/player/element.ts, packages/react/src/player/create-player.tsx
#attach(target: PlayerTarget) {
  this.#detach?.();
  this.#extensions.attach(target);
  this.#detach = store.attach({ media: this.#extensions.wrap(target.media), container: target.container });
}

#extensions = new PlayerExtensionCoordinator(() => this.#attach(this.#attached)); // on register / release
```

Cost: a re-attach resets non-`preserve` store state, the same as a media swap. Dynamic add/remove of an extension is rare.

### 3. The player intercepts media reads through a facade

`wrap()` returns the raw media while no extension is registered, otherwise a `Proxy` that consults each extension's `mediaOverride` first (first defined member wins) and falls through to the media. Getters run and methods bind against the owner, so DOM accessors and `#private` members keep working; `instanceof`, `in`, `matches(':fullscreen')`, `shadowRoot`, and event dispatch still resolve to the real element.

```ts
// Google Cast, simplified: the whole provider while connected, only `remote` otherwise so the cast button can prompt.
get mediaOverride() {
  return this.#connected ? this.#provider : { get remote() { return provider.remote; } };
}
```

`internal/design/media/architecture.md` rejects Proxy machinery for custom media implementations. This facade is player-internal plumbing over a media the player already resolved; a hand-written class would break Element semantics for a plain `<video>`. Whether that distinction holds is one of the open questions below.

### 4. `HTMLMediaAdapter` is a pure host

No registry, no override routing: every member forwards to the target. Extensions reach the adapter or native element behind any media through two public helpers instead of protected access:

```ts
import { getMediaAdapter, getMediaElement } from '@videojs/media/dom';

getMediaElement(media); // HTMLMediaElement | null — the <video> a custom element or adapter fronts
getMediaAdapter(media); // HTMLMediaAdapter | null — for `engine` and adapter-level `src`
```

### 5. Media swaps have one owner

The player's attach lifecycle drives both extensions; each decides what a swap means for its own session.

- **Google Cast:** the provider and session persist; the override stays the provider. The next `loadstart` on the new media with a source the receiver does not have loads it there. The provider claims the source before awaiting anything so one local load reaches the receiver once, and releases the claim on failure. Adapter-backed media now also loads locally (paused) rather than short-circuiting the engine rebuild.
- **Mux Data:** one `view_session_id` and `player_init_time` per instance. Same element, new `src` is a `videochange` on the live monitor; same element, new `engine` swaps the hls.js / dash.js hook; a different native element destroys the monitor and starts one on the new element, because `mux-embed` binds a monitor to an element.

## Public API changes

| Before (`@videojs/media/dom`) | After |
| --- | --- |
| `MediaExtension` with `targetOverride`, `setAdapter(adapter)`, `attach(target)` | `PlayerExtension` with `mediaOverride`, `attach({ media, container })` in `@videojs/core/dom` |
| `addMediaExtension`, `getMediaExtensions`, `getMediaProp`, `setMediaProp`, `getMediaOwner` | removed; `PlayerExtensionCoordinator` (`register`, `attach`, `detach`, `wrap`, `get`) |
| — | `getMediaAdapter(media)`, `getMediaElement(media)` |
| `MediaExtensionElement` / `createComponent()` / `this.component` (`@videojs/html`) | `PlayerExtensionElement` / `createExtension()` / `this.extension` |
| `useMediaExtension` (`@videojs/react`) | `usePlayerExtension`; `registerExtension` on the player context; `useExtensionRegistrar()` |

`@videojs/google-cast` and `@videojs/mux-data` gain a dependency on `@videojs/core`.

## Open questions

- Is a Proxy facade acceptable given `media/architecture.md`, or should the store instead expose an explicit override hook that features read through?
- Should the facade always wrap (one code path, `store.target.media !== media` always) or only while an extension is registered (current)?
- `mediaOverride` resolution is first-registered-wins. Is that sufficient, or do extensions need explicit priority?
- Re-attaching the store on register/release resets transient state. Is that acceptable, or should the store support swapping its media without a full detach?
- Should `PlayerExtension` live in `@videojs/core/dom`, or in a smaller package so extension packages do not depend on the whole player core?

## Sources

- Contract, coordinator, facade: [`packages/core/src/dom/extensions/`](../../../packages/core/src/dom/extensions/)
- Player wiring: [`packages/html/src/player/element.ts`](../../../packages/html/src/player/element.ts), [`packages/react/src/player/create-player.tsx`](../../../packages/react/src/player/create-player.tsx)
- Extensions: [`packages/extensions/google-cast/src/extension.ts`](../../../packages/extensions/google-cast/src/extension.ts), [`packages/extensions/mux-data/src/extension.ts`](../../../packages/extensions/mux-data/src/extension.ts)
- Plain `<video>` coverage: the `extensions` cases in [`create-player.test.ts`](../../../packages/html/src/player/tests/create-player.test.ts) and [`create-player.test.tsx`](../../../packages/react/src/player/tests/create-player.test.tsx)
- Related: [`provider-attach`](../../decisions/player/provider-attach.md) (the player owns `store.attach()`), #2872, #2873, #1863
