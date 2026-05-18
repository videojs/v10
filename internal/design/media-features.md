---
status: draft
date: 2026-05-14
---

# Composable Media

Compose media behavior by registering small extensions and swapping the active
strategy at runtime.

## Problem

Today, behavior on top of the base media classes is layered with class mixins
with mixin-prefixed props:

```ts
type MuxMediaProps = {
  src: string;
  type: 'video/mp4' | 'application/vnd.apple.mpegurl';
  castSrc: string;
  castContentType: 'video/mp4' | 'application/vnd.apple.mpegurl';
  castReceiverApplicationId: string;
};

// packages/core/src/dom/media/mux/index.ts
export class MuxVideoMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia))
  implements MuxMediaProps {}
```

That pattern has costs we want to remove:

1. **Static composition.** The class is baked at module load. Cast can't be
   code-split or lazy loaded. Once mixed in, behavior can't be added,
   removed, or swapped at runtime. Cast doesn't have a way to truly turn
   itself off.
2. **Muddled mixin API.** Mixins add config props to the media API surface
   which need to be prefixed to avoid conflicts.

We want a model where Cast, Ads, and future extensions are independent
modules that attach to a host at runtime, and where redirecting playback
(Cast, ads, ...) is a single instance swap.

## Solution

Two roles, one host:

- **Extension** — A small class registered via `host.use(extension)`. Owns its
  own lifecycle (`install` → uninstaller) and any state it needs. May install
  a strategy. May only observe.
- **Strategy** — A class extending `BaseMediaStrategy` that handles the host's
  full media surface while it's active. Inherits the "do the native thing"
  behavior for accessors it doesn't override.

The host owns **one active strategy at a time** (`host.strategy`). All accessors and
methods on the host are one-liner forwarders to `host.strategy`. Extensions
decide when to swap it via `host.route(strategy)`.

This generalizes the existing `HlsMedia.#delegate` pattern (swap between
`HlsJsMedia` / `NativeHlsMedia`) and reuses it everywhere.

## Quick Start

### Imperative

```ts
import { createHlsMedia } from '@videojs/core/dom/media/hls';
import { GoogleCast } from '@videojs/core/dom/media/google-cast';
import { MuxData } from '@videojs/core/dom/media/mux';

const media = createHlsMedia();
media.attach(videoElement);

media.use(new GoogleCast({ receiverApplicationId: '…' }));
media.use(new MuxData({ envKey: '…' }));
```

### Dynamic import

```ts
const media = createHlsMedia();
media.attach(videoElement);

if (userWantsCast) {
  const { GoogleCast } = await import('@videojs/core/dom/media/google-cast');
  media.use(new GoogleCast({ receiverApplicationId: '…' }));
}
```

### Factory style

`createHlsMedia` is the convenience factory: it constructs an
`HTMLVideoElementHost`, installs the built-in HLS engine-selection
extension, and registers any additional extensions passed in.

```ts
import { createHlsMedia } from '@videojs/core/dom/media/hls';
import { googleCast } from '@videojs/core/dom/media/google-cast';
import { muxData } from '@videojs/core/dom/media/mux';

const media = createHlsMedia([
  googleCast({ receiverApplicationId: '…' }),
  muxData({ envKey: '…' }),
]);

media.attach(videoElement);
```

Each lowercase factory (`googleCast`, `muxData`, …) is a one-liner that
returns its `Extension` instance:

```ts
export const googleCast = (options: GoogleCastOptions) => new GoogleCast(options);
export const muxData = (options: MuxDataOptions) => new MuxData(options);
```

`createHlsMedia` itself is a thin wrapper around the imperative API:

```ts
export function createHlsMedia(
  extensions: ReadonlyArray<Extension<HTMLVideoElementHost<any, any>>> = []
): HTMLVideoElementHost {
  const media = new HTMLVideoElementHost();
  media.use(hls()); // built-in: routes between HlsJsMedia and NativeHlsMedia
  for (const extension of extensions) media.use(extension);
  return media;
}
```

There's no `HlsMedia` class anymore — HLS engine selection is just another
extension (`hls()`) baked into the factory. Custom hosts compose the same
way (`createAudioMedia`, `createBackgroundMedia`, …), each opting into the
extensions they need.

### React

We don't need to go this route yet, but it leaves the door open for it.

```tsx
import { lazy } from '@videojs/react/utils/lazy';
import { HlsVideo } from '@videojs/react/media/hls-video';

const GoogleCast = lazy(() => import('@videojs/react/media/google-cast'));

export default function HlsVideoWithExtensions() {
  return (
    <HlsVideo src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8">
      <GoogleCast receiverAppId="1234567890" customData={{ foo: 'bar' }} />
    </HlsVideo>
  );
}
```

The React `<GoogleCast>` child is a one-line `useEffect` that calls
`media.use(new GoogleCast(props))` on mount and returns the disposer. The
React component and the core class share a name; the import path
disambiguates them (`@videojs/react/media/google-cast` for the component,
`@videojs/core/dom/media/google-cast` for the class).

## API Surface

### Host

`HTMLMediaElementHost` (see [`media.md`](./media.md) for the host hierarchy)
gains two methods:

```ts
class HTMLMediaElementHost<T, Events> extends EventTarget {
  use(extension: Extension<this>): () => void;
  route(strategy: MediaStrategy | null, options?: { base?: boolean }): () => void;
}
```

Every accessor and method on the host (`paused`, `currentTime`, `play`, …) is
a one-liner that forwards to the currently active strategy.

| Member | Purpose |
| - | - |
| `use(extension)` | Register an extension. Returns a disposer that detaches it. Calling `use()` twice with the same `id` warns in `__DEV__` and is a no-op. |
| `route(strategy)` | Route the host's media surface to a strategy. Returns a disposer that restores the previous routing *only if* this strategy is still the active one when called — so an extension never accidentally clears a strategy that another extension has since installed. Pass `null` to route back to the default unconditionally. Dispatches a `strategychange` event. |
| `route(strategy, { base: true })` | Same shape, different slot: replaces the host's always-on **base** strategy instead of layering on top of it. Used by extensions that want to extend defaults rather than take over (e.g. cast adds a `remote` accessor to the base so it's available even when no session is connected). The active routed strategy still overlays the base; clearing the base disposer restores the host's built-in default. |

That's the entire new surface. The default strategy (the direct-to-`target`
`BaseMediaStrategy`) and the currently active strategy are both internal state.
External code observes changes via the `strategychange` event.

### MediaExtension

```ts
abstract class MediaExtension {
  abstract readonly id: string;
  install?(host: HTMLMediaElementHost<any, any>): (() => void) | void;
}
```

An `id` for dedup/lookup, and an optional `install` that returns an optional
uninstaller. That's it. Everything else is implementation.

### BaseMediaStrategy and strategies

```ts
class BaseMediaStrategy<T extends HTMLMediaElement> implements MediaStrategy {
  protected host: HTMLMediaElementHost<T, any> | null;
  protected get target(): T | null;

  activate(host: HTMLMediaElementHost<T, any>): void;
  deactivate(): void;

  get paused(): boolean;
  get currentTime(): number;
  set currentTime(v: number);
  // …full MediaStrategy, all forwarding to this.target
}
```

A strategy is any class extending `BaseMediaStrategy` that overrides the parts it
owns. Native `super` + inheritance — no chain machinery.

`activate(host)` and `deactivate()` are called by the host on `route`
swaps — strategies don't need a host at construction time. Override
`activate` / `deactivate` to wire and unwire host-level listeners; always
call `super.activate` / `super.deactivate`.

### MediaStrategy

A single interface defines the interceptable shape. `BaseMediaStrategy` and every
strategy implements it, so TypeScript catches drift between the two.

```ts
interface MediaStrategy {
  paused: boolean;
  ended: boolean;
  seeking: boolean;
  readyState: number;
  duration: number;
  currentTime: number;
  muted: boolean;
  volume: number;
  playbackRate: number;
  // …
  play(): Promise<void>;
  pause(): void;
  load(): void;
}
```

Adding a new interceptable accessor is two lines: extend `MediaStrategy`,
implement it in `BaseMediaStrategy`. Strategies inherit the default automatically.

## Examples

### Google Cast — strategy + extension

`GoogleCastProvider` IS the strategy. It extends `BaseMediaStrategy` and
owns the media surface while a cast session is connected, falling through
to `super.x` (the underlying `<video>`) for the brief window between
`caststart` and the remote media loading:

```ts
export class GoogleCastProvider extends BaseMediaStrategy<HTMLMediaElement> {
  constructor(host: HTMLMediaElementHost<HTMLMediaElement, any>, cast: CastConfig) {
    super();
    this.activate(host); // bind the base-strategy host eagerly: init() reads from it
    this.#host = host;
    this.#cast = cast;
    this.init();
  }

  override get paused()      { return this.#remote?.isMediaLoaded ? this.#remote.isPaused || this.ended : super.paused; }
  override get currentTime() { return this.#remote?.isMediaLoaded ? this.#remote.currentTime ?? 0      : super.currentTime; }
  override set currentTime(v) { this.#remote.currentTime = v; this.#remote.controller?.seek(); }
  override get muted()       { return this.#remote.isMuted; }
  override set muted(v)      { if (v !== this.#remote.isMuted) this.#remote.controller?.muteOrUnmute(); }
  // …rest of the surface

  override async play()  { /* drive the cast receiver */ }
  override pause()       { /* drive the cast receiver */ }
}
```

There's no separate `GoogleCastMedia` wrapper — the provider does double
duty as the strategy (routed while casting) and as the long-lived object
that drives cast lifecycle (events, session management) outside of any
active routing.

The extension owns the install lifecycle and toggles routing:

```ts
export class GoogleCast implements Extension<HTMLMediaElementHost<HTMLMediaElement, any>> {
  readonly id = 'google-cast';

  constructor(private options: GoogleCastOptions) {}

  install(host: HTMLMediaElementHost<HTMLMediaElement, any>) {
    const provider = new GoogleCastProvider(host, this.options);
    const remote = new RemotePlayback(provider);

    // Always-on base strategy: makes `host.remote` return our RemotePlayback
    // even when no cast session is connected, so consumers can subscribe to
    // `connect` / `disconnect` from day one.
    const BaseStrategy = class extends BaseMediaStrategy<HTMLMediaElement> {
      get remote() { return remote; }
    };
    const baseRouteOff = host.route(new BaseStrategy(), { base: true });

    // While a cast session is connected, route the provider as the active
    // strategy. `host.route` returns a clear-if-still-active disposer, so
    // concurrent routings from other extensions are never clobbered.
    const cleanup = new AbortController();
    let routeOff: (() => void) | null = null;
    const onState = (event: Event) => {
      routeOff?.();
      routeOff = event.type === 'connect' ? host.route(provider) : null;
    };
    remote.addEventListener('connect',    onState, { signal: cleanup.signal });
    remote.addEventListener('disconnect', onState, { signal: cleanup.signal });

    return () => {
      cleanup.abort();
      routeOff?.();
      baseRouteOff();
      provider.destroy();
    };
  }
}
```

Two distinct routing slots are at work:

- **Base** (`{ base: true }`) — the always-on fallback. The cast extension
  uses this to shadow only `remote` while leaving every other accessor
  flowing through the default `BaseMediaStrategy` (so `host.currentTime`
  still reads the local `<video>` when no session is connected). The base
  slot replaces the host's built-in default for as long as the extension
  is installed; `baseRouteOff()` restores the original on uninstall.
- **Routed** (default) — the active session. Layered on top of the base
  via `host.route(provider)` when `remote` emits `connect`, cleared on
  `disconnect`. The provider's overrides take precedence over base while
  it's active.

Usage is one line — `host.use(new GoogleCast(options))` — and the
extension constructs the provider on install, exposes `remote` immediately
via the base route, routes the provider as the active strategy when a
cast session connects, and clears it when the session ends.

`host.route` returns a clear-if-still-active disposer for both slots, so
the extension never has to ask "is my strategy still the active one?" —
and the host doesn't have to expose `activeStrategy`.

The ~245-line `GoogleCastMixin` (with its 15 redirecting accessors)
collapses to one strategy class that owns the redirect and one extension
class that owns the on/off.

### Mux Data — observer only

No strategy needed — Mux Data observes lifecycle and initializes the SDK
against the underlying element.

```ts
export class MuxData extends MediaExtension {
  readonly id = 'mux-data';

  constructor(private options: MuxDataOptions) { super(); }

  install(host: HTMLMediaElementHost<HTMLMediaElement, any>) {
    const off = new AbortController();
    host.addEventListener('load',   () => initMuxDataSdk(host, this.options),  { signal: off.signal });
    host.addEventListener('detach', () => host.target?.mux?.destroy(),         { signal: off.signal });
    return () => off.abort();
  }
}
```

### HLS — engine selection as an extension

HLS engine selection (MSE vs native) used to live inside an `HlsMedia`
class. With the new model it's an extension that listens for `load` and
routes the appropriate strategy:

```ts
import HlsJs from 'hls.js';

export class HlsExtension extends MediaExtension {
  readonly id = 'hls';

  constructor(private options: HlsOptions = {}) { super(); }

  install(host: HTMLVideoElementHost<any, any>) {
    const off = new AbortController();
    host.addEventListener('load', () => {
      const useMse =
        HlsJs.isSupported() &&
        host.type === 'application/vnd.apple.mpegurl' &&
        this.options.preferPlayback !== 'native';

      host.route(useMse
        ? new HlsJsMedia({ config: this.options.config, debug: this.options.debug })
        : new NativeHlsMedia());
    }, { signal: off.signal });
    return () => off.abort();
  }
}

export const hls = (options?: HlsOptions) => new HlsExtension(options);
```

`HlsJsMedia` and `NativeHlsMedia` are `BaseMediaStrategy` subclasses — same
shape as `GoogleCastMedia`, just owning their own engine. The legacy
`HlsMedia` class, its `#delegate` field, the manual `bridgeEvents`
plumbing, and the `#shouldEngineUpdate` book-keeping collapse to one
extension + two strategies. `createHlsMedia` installs `hls()` for you;
custom hosts can install it (or a different engine extension) the same
way.

## Behavior

### Lifecycle

- `use(extension)` calls `extension.install(host)`; the returned function is
  the uninstaller.
- The disposer returned from `use()` calls the extension's disposer and
  removes it from the host's internal registry.
- An extension that installed a strategy should call the disposer returned
  from `route` in its own disposer. That disposer is a no-op if another
  strategy has since taken over.

### Strategy switching

- One active strategy at a time. Calling `route` while another strategy is
  active replaces it. No stacking.
- `route` calls `strategy.activate(host)` on the incoming strategy and
  `prevStrategy.deactivate()` on the outgoing one before swapping `#active`,
  then dispatches `strategychange`. UI code can listen for that event to
  react ("we're now casting").
- Strategies are constructed without a host. They get the host in
  `activate(host)` and lose it in `deactivate()`. `super.target` reads
  through the host once activated, so accessors that fall through to the
  underlying element (`super.paused`, `super.currentTime`) just work.
- Strategies are responsible for controlling event propagation during their
  tenure. `GoogleCastMedia`, for example, swallows or synthesizes
  `timeupdate` to reflect the cast receiver's clock, not the local
  `<video>`. Wire those listeners in `activate`, unwire them in `deactivate`.

### Disposal order

- Calling `host.destroy()` (or the equivalent teardown) iterates registered
  extensions in registration order and runs each disposer, then resets the
  active strategy to the default.

## Trade-offs

| Gain | Cost |
| - | - |
| Behavior is composable at runtime and code-splittable | One active strategy at a time — no multi-extension overlap on the same property |
| Cast's per-accessor redirects collapse into one strategy class | Each strategy must extend `BaseMediaStrategy` even if it only overrides one property |
| `super` and native class inheritance — no Proxy, no prototype mutation, no chain dispatcher | Adding a new interceptable accessor touches two places (`MediaStrategy` + `BaseMediaStrategy`) |
| Extensions are tree-shakeable, independently testable modules | Combined behaviors that aren't naturally mutually exclusive (e.g. ads-while-casting) must be modeled at the strategy level (subclass one from the other) |
| Generalizes the existing `HlsMedia.#delegate` pattern; no new mental model | A handful of features (HLS engine selection) drop a private idiom for a public API call |

### About single-strategy

The current set of features is naturally mutually exclusive:

- Cast takes over while casting.
- Ads take over while an ad plays.
- HLS engine selection picks one engine at a time.
- Mux Data doesn't take over anything.

"Ads while casting" is a product decision (pause cast for the ad, or play
ads on the cast receiver) that resolves at the strategy level — not in the
extension dispatcher. If a future need genuinely requires per-property
stacking across extensions, the same `use()` API could grow into a more
complex view (see [Open Questions](#open-questions)).

## Beyond Media

`HTMLMediaElementHost` is a specialization of a smaller pattern: a host that
accepts extensions and routes its public surface to a swappable strategy.
The pattern doesn't care that the surface is `MediaStrategy` — it works
anywhere "one active implementation at a time, with pluggable lifecycle
behavior around it" applies.

Concretely, future iframe-based players (YouTube, Vimeo, …) don't share
`HTMLMediaElement` semantics, but they want the same composition story:
swap implementations at runtime, attach Mux Data or other extensions
identically. They'd extend their own host with their own surface and reuse
`Extension` / `route` unchanged.

When a second concrete host appears, the shared machinery can be lifted
into an abstract `Host<Surface>`:

```ts
abstract class Host<Surface> {
  use(extension: Extension<this>): () => void;
  route(strategy: Surface | null): () => void;
}

class HTMLMediaElementHost<T, Events> extends Host<MediaStrategy> { … }
class IframePlayerHost<Events> extends Host<IframePlayerSurface> { … }
```

`Host` is deliberately the most boring noun — it pairs with the existing
`HTMLMediaElementHost` naming, scales to `IframePlayerHost`, `EditorHost`,
etc., and reads as "this class is what makes it a host." The two operations
on it (`use`, `route`) describe its capabilities; neither verb on its own is
strong enough to headline the class name.

This is a forward-looking note, not part of the initial migration. The
abstract base gets extracted when the second concrete host arrives — until
then, the pattern lives on `HTMLMediaElementHost` directly.

## Prior Art

- **`HlsMedia.#delegate`** in this repo — the swap-the-implementation pattern,
  scoped to engine selection. The new design lifts it to a first-class host
  API.
- **HTMLMediaElement / MediaSession** — the native platform's "one active
  media element at a time" model.
- **Lit `ReactiveController`** — the lifecycle-attach-with-disposer pattern.
  Not reused directly (`ReactiveController` is bound to
  `ReactiveControllerHost`, which the media host isn't), but the shape is
  intentionally similar.
- **CodeMirror 6 extensions** — `EditorView.dispatch({ effects: … })` to
  reconfigure behavior at runtime. Same registration model, no class
  inheritance.
- **Strategy pattern (GoF)** — what's happening here, applied to media.

## Open Questions

- **Event bridging during strategy swaps.** `bridgeEvents` today forwards
  every event from a delegate up to the host. With strategies swapping in
  and out, we want the host to keep firing events for the currently active
  source of truth. Two options:
  1. Strategy `activate`/`deactivate` hooks responsible for hooking and unhooking
     event forwarding (mirrors today's `bridgeEvents` per delegate).
  2. The host centralizes a small forwarder that re-targets when
     `route` fires `strategychange`.

  Leaning toward (1) — each strategy already owns its source, so it owns
  its events.

- **Multi-host extensions.** A single `MediaExtension` instance is currently
  scoped to one host (it captures `host` in its `install` closure). Should
  the contract require fresh instances per host, or allow one instance to
  install into multiple hosts? Today's Mux Data and Cast are per-host anyway,
  so the simpler "one instance per host" contract is the starting point.

## HLS media composition

Lazy load the much heavier HlsJsVideo component only when needed.

```tsx
import { lazy } from '@videojs/react/utils/lazy';
import { MediaRouter } from '@videojs/react/media/media-router';
import { SimpleHlsVideo } from '@videojs/react/media/simple-hls-video';
import { NativeHlsVideo } from '@videojs/react/media/native-hls-video';

const HlsJsVideo = lazy(() => import('@videojs/react/media/hls-js-video'));

export default function HlsVideo({ src, preferPlayback = 'mse', children }) {
  return (
    <MediaRouter 
      src={src} 
      preferPlayback={preferPlayback}
    >
      <SimpleHlsVideo />
      <HlsJsVideo  />
      <NativeHlsVideo  />
      {children}
    </MediaRouter>
  );
}
```
