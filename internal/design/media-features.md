---
status: draft
date: 2026-04-22
---

# Composable Media Features

## Summary

The media layer today composes features via static TypeScript mixins
(`HlsJsMediaLiveMixin(HlsJsMediaStreamTypeMixin(...))`). Great DX for
library authors, closed to app authors. The store layer has already solved
this with **declarative feature arrays** (`defineSlice` /
`createPlayer({ features })`).

This doc lays out ways to bring the same compositional freedom to the
media layer, in order from smallest change to most user-facing, so they
can be adopted together or one at a time.

**Recommended shape:**

1. Introduce `defineMediaFeature` as the primitive — mirror `defineSlice`
   1:1.
2. Ship preset arrays (`hlsjsFeatures`, `nativeHlsFeatures`).
3. Expose instance composition (`new HlsMedia({ features })` / `.use(f)`).
4. Add class-time composition (`HlsMedia.with(...)`) for custom elements.
5. Add HTML child elements (`<media-live>`) and a `features="…"` attribute.
6. Add React mirror: `useMediaFeature` + `<MediaLive />` + `features` prop.
7. Optional: side-effect import entry points (`@videojs/html/auto`) as
   sugar only — **not** the only path.

Keep existing mixins usable internally; migrate leaf-first (`live`,
`errors`, `streamType`) where the lifecycle is already clean.

> If/when we commit to this direction, the public-API-facing pieces
> (`defineMediaFeature`, `features: []`, `<media-*>` children, React
> hook/component) belong in an RFC. This doc exists to scope the options.

---

## Today: Static Mixins

```ts
export class HlsJsMedia extends HlsJsMediaPreloadMixin(
  HlsJsMediaLiveMixin(
    HlsJsMediaStreamTypeMixin(
      HlsJsMediaMetadataTracksMixin(
        HlsJsMediaTextTracksMixin(HlsJsMediaErrorsMixin(HlsJsMediaBase))
      )
    )
  )
) {}
```

**Pros:** precise types, `#private` fields, zero runtime overhead.
**Cons:** closed at build time, duplicated per engine delegate, lots of
lifecycle boilerplate per mixin, no user extension without subclassing.

---

## Option 1 — `defineMediaFeature` primitive

Mirror `defineSlice` on the media side.

```ts
export interface MediaFeatureContext<Host> {
  host: Host;
  engine?: unknown;
  target: HTMLMediaElement | null;
  signal: AbortSignal;
  define: (name: string, desc: PropertyDescriptor) => void;
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

### Worked example: `live` on `HlsMedia`

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

### Worked example: `<hls-video>` custom element

Today `HlsVideo` just wraps `HlsMedia` with `CustomMediaElement`
(`packages/html/src/media/hls-video/index.ts`). With features, the
element exposes a `features` init hook — no new classes, just a config:

```ts
// packages/html/src/media/hls-video/index.ts
import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { HlsMedia, hlsMediaFeatures } from '@videojs/core/dom/media/hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsVideo extends MediaAttachMixin(
  CustomMediaElement('video', HlsMedia, { features: hlsMediaFeatures })
) {
  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'type', 'prefer-playback', 'debug'];
  }
}
```

App authors pick their own composition without subclassing:

```html
<!-- Default preset -->
<hls-video src="live.m3u8" controls></hls-video>

<!-- Custom element wrapping a trimmed feature set -->
<script type="module">
  import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
  import { HlsMedia, hlsjsLive, hlsjsStreamType } from '@videojs/core/dom/media/hls';
  import { myAnalytics } from './my-analytics.js';

  customElements.define(
    'my-hls-video',
    class extends CustomMediaElement('video', HlsMedia, {
      features: [hlsjsStreamType, hlsjsLive, myAnalytics],
    }) {}
  );
</script>
<my-hls-video src="live.m3u8" controls></my-hls-video>
```

Attributes still flow through `observedAttributes` and the
`CustomMediaElement` reflection — features add behaviour, they don't
take over the element.

### Worked example: `<HlsVideo />` React component

Mirror the HTML story with a `features` prop. The prop is consumed once
at mount by `useMediaInstance`, which already owns the media instance
lifecycle (`packages/react/src/utils/use-media-instance.ts`):

```tsx
// packages/react/src/media/hls-video/index.tsx
'use client';

import type { HlsMediaProps, AnyMediaFeature } from '@videojs/core/dom/media/hls';
import { HlsMedia, hlsMediaFeatures } from '@videojs/core/dom/media/hls';
import { forwardRef, useMemo, type ReactNode, type VideoHTMLAttributes } from 'react';
import { useAttachMedia } from '../../utils/use-attach-media';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface HlsVideoProps
  extends Omit<VideoHTMLAttributes<HTMLVideoElement>, keyof HlsMediaProps>,
    Partial<HlsMediaProps> {
  features?: readonly AnyMediaFeature[];
  children?: ReactNode;
}

export const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(function HlsVideo(
  { features = hlsMediaFeatures, children, ...props },
  ref
) {
  // `useMediaInstance` creates the media once; pass features as part of init.
  const init = useMemo(() => ({ features }), [features]);
  const media = useMediaInstance(HlsMedia, init);
  const attachRef = useAttachMedia(media);
  const composedRef = useComposedRefs(attachRef, ref);
  const htmlProps = useSyncProps(media, props);

  return (
    <video ref={composedRef} {...htmlProps}>
      {children}
    </video>
  );
});
```

Usage stays declarative and React-idiomatic:

```tsx
import { HlsVideo, hlsjsLive, hlsjsStreamType } from '@videojs/react/hls-video';
import { myAnalytics } from './my-analytics';

// Default preset
<HlsVideo src="live.m3u8" controls />

// Custom composition — memoised array to keep the reference stable
const features = [hlsjsStreamType, hlsjsLive, myAnalytics];

<HlsVideo src="live.m3u8" controls features={features} />
```

Both surfaces bottom out on the same `defineMediaFeature` primitive —
HTML composes at element-definition time, React composes per-instance
through props. Options 5–8 later in this doc build on top of this by
adding _incremental_ composition (adding a single feature at runtime via
`<media-live>` or `useMediaFeature`); this worked example shows only
the "set the full feature array at construction" story, which is the
minimum needed for Option 1 to stand on its own.

---

## Option 2 — Reactive Controllers

OO flavour of Option 1. Features implement a controller interface.

```ts
interface MediaController {
  hostAttach?(host, target, signal): void;
  hostDetach?(): void;
  hostDestroy?(): void;
}
media.addController(new HlsLiveController());
```

**Pros:** holds state on `this`, familiar to Lit users, plays well with
existing `*Controller` classes.
**Cons:** less data-like, needs `new`, not as uniform with store slices.

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

customElements.define('hls-media', HlsMedia.with(...hlsjsFeatures));
```

**Pros:** markup-ready, typed, composes from data.
**Cons:** returns a new class per call — keep callers module-scoped.

---

## Option 4 — `features: []` escape hatch

Smallest migration. Keep the existing mixin-composed classes; add an
optional `features` constructor option that runs additional features on
top.

```ts
new HlsJsMedia({ features: [myRecorderFeature] });
```

**Pros:** zero churn, additive.
**Cons:** doesn't fix per-engine duplication or per-instance opt-out of
the built-in stack — more a bridge than a destination.

---

## Option 5 — HTML child elements

Each feature gets a thin custom element that finds its media host and
registers on `connectedCallback`.

```html
<hls-video src="live.m3u8">
  <source src="live.m3u8" type="application/vnd.apple.mpegurl" />
  <track kind="captions" src="en.vtt" default />

  <media-live></media-live>
  <media-thumbnails src="thumbs.vtt"></media-thumbnails>
  <media-metadata-tracks></media-metadata-tracks>
</hls-video>
```

```ts
abstract class MediaFeatureElement extends HTMLElement {
  abstract getFeature(): AnyMediaFeature;
  #disconnect: AbortController | null = null;

  connectedCallback() {
    const host = this.closest<MediaHostElement>('[data-media-host]');
    if (!host) return;
    this.#disconnect = new AbortController();
    host.addFeature(this.getFeature(), { signal: this.#disconnect.signal });
  }
  disconnectedCallback() { this.#disconnect?.abort(); this.#disconnect = null; }
}
```

**Pros:** HTML-native, declarative, serialisable, SSR-safe, mirrors
existing `<source>` / `<track>` handling; add/remove a feature by
adding/removing DOM; reactive config via attributes; React works
identically (1:1 JSX wrapper).
**Cons:** a thin element per feature; tag-name conventions to decide;
startup-timing handshake (buffer feature registrations until the host's
`connectedCallback`, or use the existing `containerContext` /
`playerContext` pattern).

---

## Option 6 — `features="…"` attribute

Registry-backed attribute for quick presets with no config.

```html
<hls-video src="live.m3u8" features="live metadata-tracks thumbnails" />
```

```ts
registerMediaFeature('live', liveMediaFeature);
// host reads + diffs `features` attribute
```

**Pros:** shortest markup, attribute-reactive.
**Cons:** no per-feature config; global registry side effects (see
Option 9 caveats).

---

## Option 7 — Named preset tags

Different element for different preset bundle.

```html
<hls-video src="vod.m3u8" />
<live-hls-video src="live.m3u8" />
```

`<live-hls-video>` = `HlsVideoElement` with a `liveFeatures` default
array. Twin of `liveVideoFeatures` vs `videoFeatures` on the store side.

**Pros:** zero-config for common cases.
**Cons:** combinatorial as features grow.

---

## Option 8 — React: hook + component + prop

All three layers stack on Option 1's primitive.

### Hook

```tsx
export function useMediaFeature(feature: AnyMediaFeature): void {
  const media = useMedia();
  useEffect(() => {
    if (!media?.addFeature) return;
    const ctrl = new AbortController();
    media.addFeature(feature, { signal: ctrl.signal });
    return () => ctrl.abort();
  }, [media, feature]);
}
```

### Component (sugar)

```tsx
export const MediaLive = () => <MediaFeature feature={liveMediaFeature} />;

export function MediaThumbnails({ src }: { src?: string }) {
  const feature = useMemo(() => thumbnailsMediaFeature({ src }), [src]);
  useMediaFeature(feature);
  return null;
}
```

### Prop (store-parity)

```tsx
<HlsVideo src="live.m3u8" features={liveMediaFeatures} />
```

**Pros:** `useMedia()` from `PlayerContext` already wires this up;
SSR-safe (effects run client-only); `AbortController` cleanup handles
unmount / media swap / StrictMode double-mount; tests can assert
`feature.setup` called against a mock host.
**Cons:** `features` prop array must be stable reference; hooks-in-loops
rule — register the whole array in one effect rather than iterating
`useMediaFeature`.

### App example

```tsx
<PlayerProvider features={liveVideoFeatures}>
  <VideoContainer>
    <HlsVideo src="live.m3u8">
      <MediaLive />
      <MediaThumbnails src="thumbs.vtt" />
    </HlsVideo>
    <PlayButton /><TimeSlider /><MuteButton />
  </VideoContainer>
</PlayerProvider>
```

Store features (`liveVideoFeatures`) shape the store state; media
features (`<MediaLive />`) shape engine behaviour. Both declarative,
both cleanup-safe.

---

## Option 9 — Global side-effect imports

```ts
import '@videojs/core/media/features/live';
import '@videojs/core/media/features/thumbnails';
// every HlsMedia instance now has these attached
```

Classic plugin pattern (jQuery, `chart.js/auto`, Video.js 7).

**Pros:** zero opt-in boilerplate; feels like "batteries included".
**Cons — real ones:**

- Breaks tree-shaking; invalidates `sideEffects: false`.
- Module-graph ordering across code-splitting, dynamic `import()`, SSR,
  late `<script>` tags leads to "works in dev, breaks in prod".
- Duplicate copies of `@videojs/core` = duplicate registries (monorepos,
  linked packages). Mitigate with `Symbol.for('@videojs/media-features')`.
- No configuration story — `configureThumbnails({ src })` shows up next
  to it, defeating the "just import it" promise.
- No per-instance opt-out — every media pays for every feature.
- Discoverability: feature set is a property of the bundle, not the
  component. Bug triage is harder.
- Testing: test-file registration leakage unless `vi.resetModules()`.
- HMR double-registration unless registry is idempotent by name.
- React SSR / RSC: server-rendered tree may not run the side-effect
  import → hydration mismatch.

**Verdict:** offer as sugar (`@videojs/html/auto`,
`@videojs/html/features/live`) backed by the same primitive, but **not**
as the only path.

---

## Comparison

| Option | Runtime opt-in | Markup | Per-instance | Config | Tree-shakes | Typed | DX cost |
|---|---|---|---|---|---|---|---|
| 0. Mixins (today) | ✗ | ✗ | ✗ | N/A | ✓ | ✓✓ | high (authors) |
| 1. `defineMediaFeature` | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | low |
| 2. Controllers | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | low |
| 3. `.with(...)` | class-time | ✓ (via `define`) | ✗ | ✓ | ✓ | ✓ | low |
| 4. `features:` escape | ✓ | ✗ | partial | ✓ | ✓ | ✓ | minimal |
| 5. `<media-*>` children | ✓ | ✓✓ | ✓ | ✓ (attrs) | ✓ | ✓ | medium |
| 6. `features="…"` attr | ✓ | ✓ | ✓ | ✗ | needs care | ✓ | low |
| 7. Preset tags | class-time | ✓✓ | ✗ | ✗ | ✓ | ✓ | low |
| 8. React hook/comp/prop | ✓ | ✓✓ (JSX) | ✓ | ✓ | ✓ | ✓ | low |
| 9. Global imports | import-time | ✗ | ✗ | awkward | ✗ | ✓ | very low |

---

## Recommended rollout

1. **Primitive** — `defineMediaFeature` next to `definePlayerFeature`
   (`packages/core/src/dom/feature.ts`). Same mental model.
2. **Host registry** — extend `MediaHost` / `HTMLVideoElementHost` with
   `use(feature)` / `addFeature(feature, { signal })`; run in `attach`,
   abort on `detach` / `destroy`.
3. **Preset arrays** — `hlsjsFeatures`, `nativeHlsFeatures`, and matching
   `HlsMedia.with(...)` for default custom-element exports.
4. **Pilot migration** — `live` first (small, two delegates, clean
   lifecycle already in `packages/core/src/dom/media/hls/live.ts` and
   `packages/core/src/dom/media/native-hls/live.ts`). Then `errors`,
   `streamType`. Big ones (`metadata-tracks`, `text-tracks`) last.
5. **Markup** — add `MediaFeatureElement` base + `<media-live>` first.
   Populate `packages/html/src/define/feature/video.ts` (currently a
   TODO stub).
6. **React** — `useMediaFeature` + `MediaFeature` + per-feature
   wrappers. Wire through existing `useMedia()` context.
7. **Optional sugar** — `@videojs/html/auto` side-effect entry calling
   the same `registerMediaFeature` primitive, keyed + idempotent.

Keep mixins internally for anything too intrusive to express as a
feature (e.g. `HTMLVideoElementHost` itself).

---

## Open questions

- Ordering guarantees: should feature order in the array imply
  registration order, and should features declare dependencies
  (`requires: ['streamType']`)?
- Shared helpers: `listenEngine(engine, event, fn, { signal })` so
  engine events get the same `AbortSignal`-scoped cleanup as DOM
  events.
- Type augmentation strategy: per-feature `API` generic (seen by
  `WithFeatures`) vs. `declare module` merging keyed by feature `name`.
  The store side uses the generic route — recommend matching.
- Naming of the primitive: `defineMediaFeature` (parallel with
  `definePlayerFeature`), or something unique like `defineMediaPlugin`
  to avoid conflation?

---

## See Also

- `internal/design/media.md` — Media contract work this builds on.
- `packages/core/src/dom/feature.ts` — `definePlayerFeature` /
  `defineSlice` — the shape to mirror.
- `packages/core/src/dom/store/features/presets.ts` — preset array
  pattern (`videoFeatures`, `liveVideoFeatures`).
