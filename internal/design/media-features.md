---
status: draft
date: 2026-04-22
---

# Composable Media Features

## Summary

The media layer today composes features via static TypeScript mixins
(`HlsJsMediaLiveMixin(HlsJsMediaStreamTypeMixin(...))`, `GoogleCastMixin(...)`).
Great DX for library authors, closed to app authors. The store layer has
already solved this with **declarative feature arrays** (`defineSlice` /
`createPlayer({ features })`).

This doc lays out ways to bring the same compositional freedom to the
media layer, starting with the most user-facing path (markup composition)
and progressing to the underlying primitive.

**Recommended shape:**

1. Ship HTML child elements (`<media-feature-*>`) and React child
   components (`<MediaFeature*>`) as the primary composition surface.
2. Back them with a `defineMediaFeature` primitive — mirror
   `defineSlice` 1:1.
3. Ship preset arrays (`hlsjsFeatures`, `nativeHlsFeatures`) and
   instance composition (`new HlsMedia({ features })` / `.use(f)`).
4. Add class-time composition (`HlsMedia.with(...)`) for custom-element
   authors.

Keep existing mixins usable internally; migrate leaf-first (`live`,
`errors`, `streamType`) where the lifecycle is already clean, and then
bigger surfaces like `google-cast`.

> If/when we commit to this direction, the public-API-facing pieces
> (`<media-feature-*>`, `<MediaFeature*>`, `defineMediaFeature`,
> `features: []`) belong in an RFC. This doc exists to scope the options.

---

## Today: Static Mixins

```ts
export class HlsJsMedia extends HlsJsMediaPreloadMixin(
  HlsJsMediaLiveMixin(
    HlsJsMediaStreamTypeMixin(
      HlsJsMediaTextTracksMixin(HlsJsMediaErrorsMixin(HlsJsMediaBase))
    )
  )
) {}

export class MuxVideoMedia extends GoogleCastMixin(MuxMedia) {}
```

**Pros:** precise types, `#private` fields, zero runtime overhead.
**Cons:** closed at build time, duplicated per engine delegate, lots of
lifecycle boilerplate per mixin, no user extension without subclassing.

---

## Option 1 — HTML child elements + React child components

The primary user-facing path: compose features as children of a media
element. Element authors declare `<media-feature-google-cast>` (HTML) or
`<MediaFeatureGoogleCast />` (React); the child finds its host, calls
`host.use(feature, { signal })`, and cleans up on disconnect/unmount.

Naming convention:

- HTML tag: `media-feature-<kebab-name>` — e.g. `<media-feature-google-cast>`,
  `<media-feature-live>`.
- React component: `MediaFeature<PascalName>` — e.g. `<MediaFeatureGoogleCast />`,
  `<MediaFeatureLive />`.

The prefix makes features self-identifying in markup, groups them in IDE
autocomplete, and cleanly distinguishes them from content children like
`<source>` / `<track>`.

### Worked example: `<media-feature-google-cast>` (HTML)

Google Cast is today a heavy mixin (`GoogleCastMixin` in
`packages/core/src/dom/media/google-cast/index.ts`) that adds `castSrc`,
`castReceiver`, `castContentType`, `castStreamType`, `castCustomData`,
loads the Cast framework on attach, and overrides `play` / `pause` /
`currentTime` / `volume` when casting. As a child element:

```html
<hls-video id="player" src="live.m3u8" controls>
  <source src="live.m3u8" type="application/vnd.apple.mpegurl" />
  <track kind="captions" src="en.vtt" default />

  <media-feature-live></media-feature-live>
  <media-feature-google-cast
    receiver="CC1AD845"
    content-type="application/vnd.apple.mpegurl"
  ></media-feature-google-cast>
</hls-video>
```

Features can reach back onto the host via `define()` — so declaring
`<media-feature-live>` adds `liveEdgeStart` and `targetLiveWindow`
(plus the `targetlivewindowchange` event) to the `<hls-video>` element
itself. Same API surface as today's mixin, just opt-in:

```ts
const player = document.getElementById('player') as HTMLVideoElement & {
  liveEdgeStart: number;
  targetLiveWindow: number;
};

player.addEventListener('targetlivewindowchange', () => {
  console.log('live window:', player.targetLiveWindow);
  if (player.currentTime >= player.liveEdgeStart) showLiveBadge();
});
```

Remove the child element and the properties go away — the host is a
plain `<hls-video>` again. No subclass, no global augmentation.

Shape:

```ts
import { defineMediaFeature } from '@videojs/core/dom/feature';
import { googleCastFeature } from '@videojs/core/dom/media/google-cast';

abstract class MediaFeatureElement extends HTMLElement {
  abstract getFeature(): AnyMediaFeature;
  #disconnect: AbortController | null = null;

  connectedCallback() {
    const host = this.closest<MediaHostElement>('[data-media-host]');
    if (!host) return;
    this.#disconnect = new AbortController();
    host.use(this.getFeature(), { signal: this.#disconnect.signal });
  }

  disconnectedCallback() {
    this.#disconnect?.abort();
    this.#disconnect = null;
  }
}

class MediaFeatureGoogleCast extends MediaFeatureElement {
  static observedAttributes = ['receiver', 'content-type', 'stream-type'];
  getFeature() {
    return googleCastFeature({
      receiver: this.getAttribute('receiver') ?? undefined,
      contentType: this.getAttribute('content-type') ?? undefined,
      streamType: this.getAttribute('stream-type') ?? undefined,
    });
  }
}

class MediaFeatureLive extends MediaFeatureElement {
  // No attributes — the `liveEdgeStart` / `targetLiveWindow` props it
  // defines on the host are its entire public surface.
  getFeature() { return liveFeature; }
}

customElements.define('media-feature-google-cast', MediaFeatureGoogleCast);
customElements.define('media-feature-live', MediaFeatureLive);
```

The host (`<hls-video>`, `<video-player>`) marks itself with
`data-media-host` and exposes `use(feature, { signal })` — the same
method the instance API uses. Feature registrations that arrive before
the host's `connectedCallback` get buffered and flushed once it's ready.

### Worked example: `<MediaFeatureGoogleCast />` (React)

The React twin is a 1:1 JSX wrapper that uses `useMedia()` plus an
`AbortController`-scoped effect. No DOM dance — the component returns
`null` and registers side-effectfully:

```tsx
// packages/react/src/media/feature/google-cast.tsx
'use client';

import { useMemo } from 'react';
import { useMediaFeature } from '../../utils/use-media-feature';
import { googleCastFeature } from '@videojs/core/dom/media/google-cast';

export interface MediaFeatureGoogleCastProps {
  receiver?: string;
  contentType?: string;
  streamType?: 'on-demand' | 'live';
  customData?: Record<string, unknown>;
}

export function MediaFeatureGoogleCast({
  receiver,
  contentType,
  streamType,
  customData,
}: MediaFeatureGoogleCastProps) {
  const feature = useMemo(
    () => googleCastFeature({ receiver, contentType, streamType, customData }),
    [receiver, contentType, streamType, customData]
  );
  useMediaFeature(feature);
  return null;
}
```

App markup becomes declarative and React-idiomatic:

```tsx
<PlayerProvider features={liveVideoFeatures}>
  <VideoContainer>
    <HlsVideo src="live.m3u8">
      <MediaFeatureGoogleCast receiver="CC1AD845" />
      <MediaFeatureLive />
    </HlsVideo>
    <PlayButton /><TimeSlider /><MuteButton /><CastButton />
  </VideoContainer>
</PlayerProvider>
```

Store features (`liveVideoFeatures`) shape the store state; media
features (`<MediaFeatureLive />`, `<MediaFeatureGoogleCast />`) shape
engine behaviour. Both are arrays of "what do I want this player to
do" — now at parity.

Because `<MediaFeatureLive />` registers the feature on the underlying
`HlsMedia`, the same `liveEdgeStart` / `targetLiveWindow` props and the
`targetlivewindowchange` event are available through `useMedia()` —
for a consumer-side hook:

```tsx
function useAtLiveEdge() {
  const media = useMedia<HlsMedia>();
  return useSyncExternalStore(
    (cb) => {
      media?.addEventListener('targetlivewindowchange', cb);
      media?.addEventListener('timeupdate', cb);
      return () => {
        media?.removeEventListener('targetlivewindowchange', cb);
        media?.removeEventListener('timeupdate', cb);
      };
    },
    () => !!media && media.currentTime >= media.liveEdgeStart
  );
}
```

**Pros:** HTML-native, declarative, serialisable, SSR-safe; mirrors
`<source>` / `<track>` handling; add/remove a feature by
adding/removing DOM; reactive config via attributes; React component is
a trivial wrapper. Discoverable in markup: `grep media-feature-` shows
exactly what's loaded.
**Cons:** a thin element/component per feature; startup-timing
handshake (buffer registrations until the host's `connectedCallback`,
or use the existing `containerContext` / `playerContext` pattern).

> **How this works underneath.** Each `<media-feature-*>` reads its
> attributes into a config object and hands the resulting feature to
> the host's `use()` method. That `use()` method, the feature object
> itself, and the `AbortSignal` lifecycle all come from the
> `defineMediaFeature` primitive — see **Option 2**.

---

## Option 2 — `defineMediaFeature` primitive

Underlying primitive that Option 1's child elements (and Options 3–5)
are built on. Mirrors `defineSlice` on the media side.

```ts
export interface MediaFeatureContext<Host> {
  host: Host;
  engine?: unknown;
  target: HTMLMediaElement | null;
  signal: AbortSignal;
  // Install a *new* member on the host (e.g. `liveEdgeStart`).
  define: (name: string, desc: PropertyDescriptor) => void;
  // Wrap an *existing* method on the host (e.g. `play`, `pause`,
  // `load`). The wrapper receives the previous implementation and must
  // return a replacement; wrappers compose LIFO and are restored on
  // `signal` abort.
  override: <K extends FunctionKeys<Host>>(
    name: K,
    wrap: (original: Host[K]) => Host[K]
  ) => void;
  // Same idea for getters/setters (e.g. `currentTime`, `volume`,
  // `paused`). The wrapper receives the previous descriptor and
  // returns a replacement descriptor.
  overrideAccessor: <K extends keyof Host>(
    name: K,
    wrap: (prev: { get?: () => Host[K]; set?: (v: Host[K]) => void }) =>
      { get?: () => Host[K]; set?: (v: Host[K]) => void }
  ) => void;
  emit: (type: string) => void;
}

export function defineMediaFeature<Host, API = void>(cfg: {
  name: string;
  supports?: (host: Host) => boolean;
  setup: (ctx: MediaFeatureContext<Host>) => API | void;
}) { return cfg; }
```

Each feature is a plain object. A tiny registry on the base `MediaHost`
runs features in `attach()` and tears them down via `AbortSignal` on
`detach()` / `destroy()`.

**Pros:** data-shaped, typeable, uniform lifecycle, testable, reusable
across delegates, types via `UnionToIntersection<InferAPI<F[number]>>`
(same pattern as `UnionSliceState`).
**Cons:** reliance on `Object.defineProperty` for per-feature props
(already used across the codebase).

### Worked example: `live` on `HlsJsMedia`

Today's equivalent is a mixin that does a constructor-time
`engine.on(...)`, holds private state, and has no standard teardown
(compare `HlsJsMediaStreamTypeMixin` in
`packages/core/src/dom/media/hls/stream-type.ts`):

```ts
export function HlsJsMediaLiveMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaLive extends (BaseClass as Constructor<HlsEngineHost>) {
    #targetLiveWindow = Number.NaN;
    #liveEdgeStartOffset: number | undefined;

    constructor(...args: any[]) {
      super(...args);
      this.engine?.on(Hls.Events.LEVEL_LOADED, (_e, data) => this.#derive(data.details));
      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#reset());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#reset());
    }

    get targetLiveWindow() { return this.#targetLiveWindow; }
    get liveEdgeStart() { /* derive from seekable + offset */ }

    // #derive / #reset / #setTargetLiveWindow …
  }
  return HlsJsMediaLive as unknown as Base &
    Constructor<{ readonly liveEdgeStart: number; readonly targetLiveWindow: number }>;
}

export class HlsJsMedia extends HlsJsMediaLiveMixin(HlsJsMediaStreamTypeMixin(HlsJsMediaBase)) {}
```

Reshaped as a feature:

```ts
// packages/core/src/dom/media/hls/features/live.ts
import Hls, { type LevelLoadedData } from 'hls.js';
import { defineMediaFeature } from '../../feature';
import type { HlsEngineHost } from '../types';

export const hlsjsLive = defineMediaFeature<HlsEngineHost>({
  name: 'hlsjs:live',
  setup({ host, target, signal, define, emit }) {
    let targetLiveWindow = Number.NaN;
    let liveEdgeStartOffset: number | undefined;

    define('targetLiveWindow', { get: () => targetLiveWindow });
    define('liveEdgeStart', {
      get: () => {
        if (liveEdgeStartOffset === undefined || !target) return Number.NaN;
        const { seekable } = target;
        return seekable.length ? seekable.end(seekable.length - 1) - liveEdgeStartOffset : Number.NaN;
      },
    });

    const setWindow = (value: number) => {
      if (Object.is(targetLiveWindow, value)) return;
      targetLiveWindow = value;
      emit('targetlivewindowchange');
    };

    const derive = (details: LevelLoadedData['details']) => {
      if (!details.live) return reset();
      const lowLatency = !!details.partList?.length;
      liveEdgeStartOffset = lowLatency
        ? details.partHoldBack || details.partTarget * 2
        : details.holdBack || details.targetduration * 3;
      setWindow(details.type === 'EVENT' ? Number.POSITIVE_INFINITY : 0);
    };

    const reset = () => {
      liveEdgeStartOffset = undefined;
      setWindow(Number.NaN);
    };

    const engine = host.engine;
    const onLevel = (_e: string, data: LevelLoadedData) => derive(data.details);
    engine?.on(Hls.Events.LEVEL_LOADED, onLevel);
    engine?.on(Hls.Events.MANIFEST_LOADING, reset);
    engine?.on(Hls.Events.DESTROYING, reset);

    // Every subscription is undone when `signal` aborts — no custom
    // `detach()` / `destroy()` wiring required on the host.
    signal.addEventListener('abort', () => {
      engine?.off(Hls.Events.LEVEL_LOADED, onLevel);
      engine?.off(Hls.Events.MANIFEST_LOADING, reset);
      engine?.off(Hls.Events.DESTROYING, reset);
      reset();
    });
  },
});
```

And the registration site — no mixin chain, just an array:

```ts
// packages/core/src/dom/media/hls/hlsjs.ts
import { hlsjsLive } from './features/live';
import { hlsjsStreamType } from './features/stream-type';

export const hlsjsFeatures = [hlsjsStreamType, hlsjsLive /* , … */];

export class HlsJsMedia extends HlsJsMediaBase {
  constructor(init?: HlsJsMediaInit) {
    super(init);
    for (const f of hlsjsFeatures) this.use(f);
  }
}
```

What the shape buys us:

- **Lifecycle.** One `AbortSignal` replaces the ad-hoc `destroy()` /
  `#reset()` dance — same pattern already used by
  `NativeHlsMediaLiveMixin` and store `listen()` helpers.
- **Reuse.** `hlsjsLive` and `nativeHlsLive` are two `defineMediaFeature`
  calls sitting in the same folder; users pick one or both instead of
  inheriting a whole class.
- **User extension.** `new HlsJsMedia({ features: [...hlsjsFeatures, myRecorder] })`
  needs no subclass.
- **Tests.** Setup is a pure function — pass a fake host/engine/target
  plus an `AbortController`, drive it, then `controller.abort()`. No
  class instantiation, no mixin composition.

### Overriding host members

`define()` installs *new* members; `override()` and `overrideAccessor()`
wrap *existing* ones. This is the answer to "how does a feature swap
behaviour on `play` / `pause` / `currentTime` when casting?"

Under the hood each helper does the same thing as a classical mixin
override, just scoped to a feature + `AbortSignal`:

```ts
// packages/core/src/dom/feature.ts (sketch — inside the host registry)

function override<K extends FunctionKeys<Host>>(name: K, wrap: Wrapper) {
  const proto = Object.getPrototypeOf(host);
  const prevDesc = findDescriptor(proto, name);
  const original = prevDesc.value as Host[K];
  const replacement = wrap(original);
  Object.defineProperty(host, name, { ...prevDesc, value: replacement });
  signal.addEventListener('abort', () => {
    Object.defineProperty(host, name, prevDesc);
  });
}

function overrideAccessor<K extends keyof Host>(name: K, wrap: AccessorWrapper) {
  const prevDesc = findDescriptor(Object.getPrototypeOf(host), name);
  const next = wrap({ get: prevDesc.get, set: prevDesc.set });
  Object.defineProperty(host, name, { ...prevDesc, ...next });
  signal.addEventListener('abort', () => {
    Object.defineProperty(host, name, prevDesc);
  });
}
```

Two guarantees:

- **Wrappers see the previous implementation.** A second feature
  overriding the same member gets *this feature's* wrapped version as
  its `original`, so multi-feature overrides compose LIFO — identical
  to a mixin chain, but declarative.
- **Cleanup is automatic.** `signal.abort()` (detach / destroy /
  element removal) restores the exact descriptor present before this
  feature installed its wrapper. No bookkeeping on the host.

### Sketch: `googleCastFeature`

Same primitive, wrapping the side-effecty Cast framework. The current
`GoogleCastMixin` overrides ~14 members on the host (`play`, `pause`,
`load`, `currentTime`, `volume`, `muted`, `paused`, `ended`, `seeking`,
`readyState`, `duration`, `playbackRate`, `remote`). Each is the same
shape: "if casting, defer to `provider`, else `super`". As a feature:

```ts
// packages/core/src/dom/media/google-cast/feature.ts
import { defineMediaFeature } from '../../feature';
import { GoogleCastProvider } from './google-cast-provider';
import { loadCastFramework, requiresCastFramework } from './utils';

export function googleCastFeature(config: {
  src?: string;
  receiver?: string;
  contentType?: string;
  streamType?: 'on-demand' | 'live';
  customData?: Record<string, unknown>;
}) {
  return defineMediaFeature<GoogleCastMediaHost>({
    name: 'google-cast',
    supports: () => requiresCastFramework(),
    setup({ host, signal, define, override, overrideAccessor }) {
      if (!host.disableRemotePlayback) loadCastFramework();

      const provider = new GoogleCastProvider(host, {
        src: () => config.src ?? host.src,
        receiver: () => config.receiver,
        contentType: () => config.contentType,
        streamType: () => config.streamType ?? host.streamType,
        customData: () => config.customData,
      });

      // Method overrides — same shape as today's mixin, minus the
      // `super.*` boilerplate.
      override('play',  (base) => () => provider.isCasting ? provider.play()  : base.call(host));
      override('pause', (base) => () => provider.isCasting ? provider.pause() : base.call(host));
      override('load',  (base) => () => provider.isCasting ? provider.load()  : base.call(host));

      // Accessor overrides — read-only state.
      for (const key of ['paused', 'ended', 'seeking', 'readyState', 'duration'] as const) {
        overrideAccessor(key, ({ get }) => ({
          get: () => (provider.isCasting ? provider[key] : get!.call(host)),
        }));
      }

      // Accessor overrides — read/write state.
      for (const key of ['currentTime', 'volume', 'muted', 'playbackRate'] as const) {
        overrideAccessor(key, ({ get, set }) => ({
          get: () => (provider.isCasting ? provider[key] : get!.call(host)),
          set: (v) => {
            if (provider.isCasting) (provider as any)[key] = v;
            else set!.call(host, v);
          },
        }));
      }

      // `remote` is a *new* member that cast adds on top of the host
      // surface — no prior descriptor to wrap.
      define('remote', { get: () => provider.remote });

      signal.addEventListener('abort', () => provider.destroy());
    },
  });
}
```

The loop reuses the same one-line wrapper per key — ~15 lines replace
~150 lines of mixin override boilerplate, and the "if casting, else
super" shape is expressed exactly once. The element authors of
`<media-feature-google-cast>` (Option 1) and React authors of
`<MediaFeatureGoogleCast />` both import this single feature factory
— no parallel class hierarchies.

### Facade hosts: `HlsMedia` over `HlsJsMedia` + `NativeHlsMedia`

`HlsMedia` (`packages/core/src/dom/media/hls/index.ts`) is a facade: at
`load()` it instantiates **either** `HlsJsMedia` (hls.js / MSE) **or**
`NativeHlsMedia` (browser-built-in HLS) as `#delegate`, swaps on
`src` / `type` / `preferPlayback` change, bridges events via
`bridgeEvents`, and manually forwards a handful of props
(`streamType`, `preload`). Today each delegate carries its own mixin
stack:

```ts
// hlsjs.ts
export class HlsJsMedia extends HlsJsMediaPreloadMixin(
  HlsJsMediaLiveMixin(HlsJsMediaStreamTypeMixin(HlsJsMediaErrorsMixin(HlsJsMediaBase)))
) {}

// native-hls/index.ts
export class NativeHlsMedia extends NativeHlsMediaStreamTypeMixin(NativeHlsMediaErrorsMixin(NativeHlsMediaBase)) {}
```

Two concerns the new design has to answer:

1. **Where does a feature live** when the two delegates genuinely
   require different engine-specific code (hls.js listens to
   `LEVEL_LOADED`; native listens to `durationchange` + `seekable`)?
2. **How does the facade expose it**, so a user who writes
   `<media-feature-live>` on `<hls-video>` gets the same
   `liveEdgeStart` / `targetLiveWindow` surface no matter which
   delegate ends up active?

The answer is *two layers of features* that mirror the existing two
layers of classes:

**Layer 1 — delegate features.** One per engine, each targets its own
host. Exactly the Option 2 `hlsjsLive` shown above, plus a
`nativeHlsLive` sibling under `packages/core/src/dom/media/native-hls/features/`.
These replace the delegate-specific mixins 1:1.

```ts
// packages/core/src/dom/media/hls/features/hlsjs-live.ts  → HlsJsMedia
export const hlsjsLive = defineMediaFeature<HlsJsMedia>({ /* Option 2 example */ });

// packages/core/src/dom/media/native-hls/features/live.ts → NativeHlsMedia
export const nativeHlsLive = defineMediaFeature<NativeHlsMedia>({
  name: 'native-hls:live',
  setup({ host, target, signal, define, emit }) {
    let targetLiveWindow = Number.NaN;
    define('targetLiveWindow', { get: () => targetLiveWindow });
    define('liveEdgeStart',    { get: () => { /* derive from seekable */ } });
    // listen to durationchange / seekable on target, …
    signal.addEventListener('abort', () => { /* tear down */ });
  },
});
```

**Layer 2 — facade features.** One per user-facing surface, targets
the facade host, and does three small jobs: expose getters that
forward to the active delegate, run the right delegate feature on
each delegate swap (with its own `AbortSignal`), and let existing
event-bridging carry through.

```ts
// packages/core/src/dom/media/hls/features/live.ts → HlsMedia
import { defineMediaFeature } from '../../feature';
import { HlsJsMedia } from '../hlsjs';
import { NativeHlsMedia } from '../../native-hls';
import { hlsjsLive } from './hlsjs-live';
import { nativeHlsLive } from '../../native-hls/features/live';

export const hlsLive = defineMediaFeature<HlsMedia>({
  name: 'hls:live',
  setup({ host, signal, define }) {
    // Facade surface — same members the delegate features define,
    // just read through whichever delegate is currently active.
    // Replaces today's hand-written `streamType` / `preload` getters.
    define('targetLiveWindow', { get: () => host.delegate?.targetLiveWindow ?? Number.NaN });
    define('liveEdgeStart',    { get: () => host.delegate?.liveEdgeStart    ?? Number.NaN });

    // Re-run the matching delegate feature on every delegate swap.
    // Each swap gets its own AbortSignal — teardown is automatic.
    let delegateCtrl: AbortController | null = null;
    const onSwap = () => {
      delegateCtrl?.abort();
      const delegate = host.delegate;
      if (!delegate) return;
      const feature =
        delegate instanceof HlsJsMedia    ? hlsjsLive    :
        delegate instanceof NativeHlsMedia ? nativeHlsLive : null;
      if (!feature) return;
      delegateCtrl = new AbortController();
      delegate.use(feature, { signal: delegateCtrl.signal });
    };

    host.addEventListener('delegatechange', onSwap, { signal });
    onSwap();
    signal.addEventListener('abort', () => delegateCtrl?.abort());

    // `targetlivewindowchange` fires on the delegate; `bridgeEvents`
    // already forwards it to the facade, so consumers listening on
    // `<hls-video>` get it automatically — no extra wiring.
  },
});
```

And the registration site:

```ts
// packages/core/src/dom/media/hls/index.ts
export const hlsFeatures = [hlsStreamType, hlsLive, hlsErrors /* , … */];
```

The `<media-feature-live>` child element (Option 1) mounts `hlsLive`
onto `<hls-video>`, which then runs `hlsjsLive` **or** `nativeHlsLive`
against the delegate depending on which one `load()` picked. Delegate
swap → old feature aborts, new feature runs. Users and UI code only
see one API surface.

Host-level prerequisites — small, self-contained changes to `HlsMedia`:

- **Expose `delegate`.** Already tracked internally via `#delegate`;
  add a `get delegate()` getter so facade features can read it.
- **Emit `delegatechange`.** In `load()` / `#engineDestroy()`, dispatch
  an event whenever `#delegate` reassigns. One line each.
- **Generalise property forwarding.** Today's manual
  `streamType` / `preload` getters become `define` calls from their
  respective facade features (`hlsStreamType`, `hlsPreload`). The
  facade class keeps `src` / `type` / `preferPlayback` / `config` /
  `debug` — the inputs that decide *which* delegate to build, not
  anything the delegate produces.

If this pattern recurs (`MuxMedia` over `HlsMedia`, future
`DashMedia` variants), wrap it in a helper so feature authors don't
write the swap plumbing by hand:

```ts
// packages/core/src/dom/feature.ts
export function defineDelegateFeature<Facade, Delegate>(cfg: {
  name: string;
  forward: Array<keyof Delegate>;           // auto `define` + getter
  pick: (delegate: Delegate | null) => AnyMediaFeature | null;
}) { /* wraps `defineMediaFeature` with the swap + forward plumbing */ }

// Consumer:
export const hlsLive = defineDelegateFeature<HlsMedia, HlsJsMedia | NativeHlsMedia>({
  name: 'hls:live',
  forward: ['liveEdgeStart', 'targetLiveWindow'],
  pick: (d) =>
    d instanceof HlsJsMedia    ? hlsjsLive    :
    d instanceof NativeHlsMedia ? nativeHlsLive : null,
});
```

Bottom line: **the two-delegate split stays; mixins become features,
one layer per class layer.** The feature model doesn't flatten
`HlsMedia`, it just gives each mixin tier a cleaner lifecycle and
unifies the facade's manual forwarding into the same `define` /
`forward` primitive the delegate features already use.

---

## Option 3 — Class-time composition (`.with(...)`)

Factory that returns a constructable class. Solves the custom-element
and "declare a tagName" use case.

```ts
class HlsMedia extends MediaHost {
  static with<F extends AnyMediaFeature[]>(...features: F) {
    return class extends HlsMedia {
      constructor(init?) { super(init); features.forEach((f) => this.use(f)); }
    } as Constructor<HlsMedia & WithFeatures<HlsMedia, F>>;
  }
}

customElements.define(
  'castable-hls-media',
  HlsMedia.with(...hlsjsFeatures, googleCastFeature({ receiver: 'CC1AD845' }))
);
```

**Pros:** markup-ready, typed, composes from data.
**Cons:** returns a new class per call — keep callers module-scoped.

---

## Option 4 — `features: []` escape hatch

Smallest migration. Keep the existing mixin-composed classes; add an
optional `features` constructor option that runs additional features on
top.

```ts
new HlsJsMedia({ features: [googleCastFeature({ receiver: 'CC1AD845' })] });
```

**Pros:** zero churn, additive.
**Cons:** doesn't fix per-engine duplication or per-instance opt-out of
the built-in stack — more a bridge than a destination.

---

## Option 5 — React: `useMediaFeature` hook + `features` prop

The hook is the primitive behind every `<MediaFeature*>` component in
Option 1; the `features` prop mirrors the store's `<PlayerProvider features>`.

### Hook

```tsx
export function useMediaFeature(feature: AnyMediaFeature): void {
  const media = useMedia();
  useEffect(() => {
    if (!media?.use) return;
    const ctrl = new AbortController();
    media.use(feature, { signal: ctrl.signal });
    return () => ctrl.abort();
  }, [media, feature]);
}
```

### Prop (store-parity)

```tsx
<HlsVideo src="live.m3u8" features={hlsMediaFeatures} />
```

**Pros:** `useMedia()` from `PlayerContext` already wires this up;
SSR-safe (effects run client-only); `AbortController` cleanup handles
unmount / media swap / StrictMode double-mount; tests can assert
`feature.setup` called against a mock host.
**Cons:** `features` prop array must be a stable reference; apply the
hooks-in-loops rule — register the whole array in one effect rather
than iterating `useMediaFeature`.

---

## Comparison

| Option | Runtime opt-in | Markup | Per-instance | Config | Tree-shakes | Typed | DX cost |
|---|---|---|---|---|---|---|---|
| 0. Mixins (today) | ✗ | ✗ | ✗ | N/A | ✓ | ✓✓ | high (authors) |
| 1. `<media-feature-*>` / `<MediaFeature*>` | ✓ | ✓✓ | ✓ | ✓ (attrs/props) | ✓ | ✓ | medium |
| 2. `defineMediaFeature` | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | low |
| 3. `.with(...)` | class-time | ✓ (via `define`) | ✗ | ✓ | ✓ | ✓ | low |
| 4. `features:` escape | ✓ | ✗ | partial | ✓ | ✓ | ✓ | minimal |
| 5. `useMediaFeature` + prop | ✓ | ✓✓ (JSX) | ✓ | ✓ | ✓ | ✓ | low |

---

## Recommended rollout

1. **Primitive** — `defineMediaFeature` next to `definePlayerFeature`
   (`packages/core/src/dom/feature.ts`). Same mental model. Includes
   `define` / `override` / `overrideAccessor` in the context.
2. **Host registry** — extend `MediaHost` / `HTMLVideoElementHost` with
   `use(feature, { signal })`; run in `attach`, abort on `detach` /
   `destroy`.
3. **Preset arrays** — `hlsjsFeatures`, `nativeHlsFeatures`, and
   matching `HlsMedia.with(...)` for default custom-element exports.
4. **Pilot migration** — `live` first (small, two delegates, clean
   lifecycle already in `packages/core/src/dom/media/hls/live.ts` and
   `packages/core/src/dom/media/native-hls/live.ts`). Then `errors`,
   `streamType`. `google-cast` last — it's the highest-value
   user-opt-in feature and exercises `override` /
   `overrideAccessor` end-to-end.
5. **Markup (Option 1)** — `MediaFeatureElement` base +
   `<media-feature-live>` and `<media-feature-google-cast>` as the two
   driving examples. Populate `packages/html/src/define/feature/video.ts`
   (currently a TODO stub).
6. **React (Option 1 + 5)** — `useMediaFeature` + one
   `<MediaFeature*>` wrapper per feature, mirroring the HTML tags 1:1.
   Wire through existing `useMedia()` context.

Keep mixins internally for anything too intrusive to express as a
feature (e.g. `HTMLVideoElementHost` itself).

---

## Open questions

- Ordering guarantees: should feature order in the array imply
  registration order, and should features declare dependencies
  (`requires: ['streamType']`)? `google-cast` reaches into `streamType`
  and `remote`, making this the most likely first case to hit.
- **Override arbitration.** Two features overriding the same member
  compose LIFO (last registered wraps first) — good default, matches
  mixin order. Do we also need an explicit priority, or is
  registration order enough? What about features that want to
  *replace* rather than wrap (e.g. a test harness)?
- **Conflicting active overrides.** Cast and AirPlay both override
  `play` with "if active, defer to provider". Both can't be active at
  once today, but the feature layer doesn't know that. Do we add a
  "takeover" concept (one active per group) or leave coordination to
  the features themselves?
- Shared helpers: `listenEngine(engine, event, fn, { signal })` so
  engine events get the same `AbortSignal`-scoped cleanup as DOM
  events.
- Attribute reflection: for `<media-feature-*>` elements, who owns
  attribute → config re-derivation — the element, the feature factory,
  or a shared `attributeChangedCallback` helper?
- Type augmentation strategy: per-feature `API` generic (seen by
  `WithFeatures`) vs. `declare module` merging keyed by feature `name`.
  The store side uses the generic route — recommend matching.
- Naming of the primitive: `defineMediaFeature` (parallel with
  `definePlayerFeature`), or something unique like `defineMediaPlugin`
  to avoid conflation?

---

## Considered but not pursued

- **Named preset tags** (`<live-hls-video>` alongside `<hls-video>`) —
  a separate element per feature bundle, twin of `liveVideoFeatures`
  vs `videoFeatures` on the store side. Zero-config for common cases,
  but combinatorial as features grow (`<live-castable-hls-video>`?),
  and `HlsMedia.with(...)` + `customElements.define(...)` (Option 3)
  already covers the "I want a preset tag" use case with no new
  concepts.
- **Reactive Controllers** — OO variant of `defineMediaFeature` where
  features implement a `MediaController` interface
  (`hostAttach` / `hostDetach` / `hostDestroy`, `new
  GoogleCastController(...)`). Familiar to Lit users, but redundant
  with `defineMediaFeature` and less uniform with store slices.
  `defineMediaFeature` already gives us `this`-free closures over the
  same lifecycle via `AbortSignal`.
- **`features="live google-cast"` attribute** — registry-backed
  attribute listing feature names. Short to write but every
  config-bearing feature (cast, thumbnails, …) still needs a
  `<media-feature-*>` child for its config, so the attribute ends up
  duplicating Option 1 rather than replacing it. Also inherits the
  global-registry problems below.
- **Global side-effect imports** (`import '@videojs/core/features/live'`)
  — classic plugin pattern. Rejected as a primary path because it
  breaks tree-shaking, has load-order problems across code-splitting /
  SSR / late scripts, duplicates registries when `@videojs/core` is
  deduped, has no configuration story, offers no per-instance opt-out,
  and hides the feature set from the component (harder bug triage).
  Can still be offered later as thin sugar over `defineMediaFeature`
  if there's demand.

---

## See Also

- `internal/design/media.md` — Media contract work this builds on.
- `packages/core/src/dom/feature.ts` — `definePlayerFeature` /
  `defineSlice` — the shape to mirror.
- `packages/core/src/dom/store/features/presets.ts` — preset array
  pattern (`videoFeatures`, `liveVideoFeatures`).
- `packages/core/src/dom/media/google-cast/` — the mixin this doc
  proposes reshaping as a feature factory.
