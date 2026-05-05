---
status: draft
date: 2026-04-22
---

# Composable Media Features

## Summary

The store layer already lets app authors compose behaviour from a flat
list of features:

```ts
createPlayer({ features: [playbackFeature, volumeFeature, /* … */] });
```

We want the same shape on the media layer. Each media class binds an
**engine** — a function that takes a config and returns a variant —
to a flat list of features:

```ts
import { createVideo } from '@videojs/core/dom/media';
import { hlsJs, live, streamType, errors, googleCast, muxData } from '@videojs/core/dom/media/hls';

const HlsJsMedia = createVideo(
  hlsJs({ features: [live, streamType, errors, googleCast, muxData] }),
);
```

Multi-engine playback (hls.js with native-HLS fallback) is the same
function called with multiple variants:

```ts
import { hlsJs, live, streamType, googleCast, muxData } from '@videojs/core/dom/media/hls';
import {
  nativeHls,
  live as nativeLive,
  streamType as nativeStreamType,
  googleCast as nativeCast,
  muxData as nativeMuxData,
} from '@videojs/core/dom/media/native-hls';

const HlsMedia = createVideo(
  hlsJs    ({ features: [live,       streamType,       googleCast, muxData] }),
  nativeHls({ features: [nativeLive, nativeStreamType, nativeCast, nativeMuxData] }),
);
```

`createVideo` is variadic: one variant = single-engine class, two or
more = a class that picks an engine at runtime based on the source.

Every feature — engine plumbing (`hlsJs`), capability (`live`,
`streamType`), or cross-cutting facade-only (`googleCast`, `muxData`) —
ships from the engine-specific subpath. **One engine = one import
path.**

Internally each feature is a class mixin — exactly what we have today.

---

## Today: Static Mixins

Mixins are composed at module load:

```ts
export class HlsJsMedia extends HlsJsMediaPreloadMixin(
  HlsJsMediaStreamTypeMixin(
    HlsJsMediaTextTracksMixin(HlsJsMediaErrorsMixin(HlsJsMediaBase))
  )
) {}

export class MuxVideoMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia)) {}
```

Great for library authors, closed for everyone else. There's no way to
opt out of a built-in mixin or layer in a new one without subclassing
the whole stack. Engine selection (hls.js vs native HLS) is hand-coded
inside `HlsMedia` (`packages/core/src/dom/media/hls/index.ts`).

---

## The API

Two factory functions, one per media kind. Both are variadic:

```ts
const HlsJsMedia = createVideo(hlsJs({ features: […] }));
const HlsMedia   = createVideo(
  hlsJs    ({ features: […] }),
  nativeHls({ features: […] }),
);

const HlsJsAudio = createAudio(hlsJs({ features: […] }));
const HlsAudio   = createAudio(
  hlsJs    ({ features: […] }),
  nativeHls({ features: […] }),
);
```

`createVideo` returns a class that extends `HTMLVideoElementHost`;
`createAudio` extends `HTMLAudioElementHost`. Both return a
constructable class typed end-to-end with the union of every feature's
added members.

Each engine call (`hlsJs(...)`, `nativeHls(...)`) describes one engine
variant. With multiple variants, the resulting class:

- Asks each variant's `supports({ src, type, preferPlayback })` in
  order.
- Instantiates the first match's composed inner class as the active
  delegate.
- Forwards facade-side calls to it.
- Re-evaluates on `src` / `type` change. Aborts the old delegate,
  builds the new one.

With one variant, there's no selection — the class is just the
composed mixin chain.

### Engine config

Engines accept their own configuration alongside the features array:

```ts
const HlsJsMedia = createVideo(
  hlsJs({
    config: { backBufferLength: 30 },
    debug: true,
    features: [live, streamType, errors, googleCast({ receiver: 'CC1AD845' })],
  }),
);
```

`config`, `debug`, etc. are engine-specific options. `features` is
universal across engines.

### Configurable features

Features may take options. Call the factory to get a configured
variant — same convention as store features:

```ts
hlsJs({
  features: [
    live,
    streamType,
    googleCast({ receiver: 'CC1AD845' }),
    muxData({ envKey: '…' }),
  ],
});
```

The bare symbol (`live`, `googleCast`) is shorthand for the default
config; calling it (`googleCast({…})`) returns a configured variant.

### Composing presets

Each engine ships preset feature arrays — the media-side twins of
`videoFeatures` / `liveVideoFeatures`:

```ts
import { hlsJs, hlsJsFeatures, googleCast } from '@videojs/core/dom/media/hls';

const Player = createVideo(
  hlsJs({ features: [...hlsJsFeatures, googleCast({ receiver: 'CC1AD845' })] }),
);
```

### Audio mirror

```ts
const HlsAudio = createAudio(
  hlsJs    ({ features: [live,       googleCast] }),
  nativeHls({ features: [nativeLive, nativeCast] }),
);
```

Same pattern, audio base class.

---

## Engines

An engine is a function: it takes an options object (`config`,
`features`, engine-specific knobs) and returns a variant descriptor
that `createVideo` understands.

```ts
// packages/core/src/dom/media/hls/index.ts → @videojs/core/dom/media/hls
import Hls, { type HlsConfig } from 'hls.js';
import { HlsJsMediaBaseMixin } from './base';

interface HlsJsOptions {
  config?: Partial<HlsConfig>;
  debug?: boolean;
  features: AnyHlsJsFeature[];
}

export function hlsJs(options: HlsJsOptions) {
  return {
    name: 'hlsJs' as const,
    // Adds `engine`, `src`, `attach`, `detach`, `destroy` plumbing —
    // closes over `options.config` / `options.debug`.
    mixin: HlsJsMediaBaseMixin(options),
    features: options.features,
    supports: ({ type, preferPlayback }) =>
      Hls.isSupported() &&
      type === 'application/vnd.apple.mpegurl' &&
      preferPlayback !== 'native',
  };
}
```

`HlsJsMediaBaseMixin` is exactly today's
`packages/core/src/dom/media/hls/hlsjs.ts:19-57` body, lifted to a
mixin (it currently extends `HTMLVideoElementHost` directly). The
mixin chain on lines 59-63 disappears: those mixins become engine-
specific feature descriptors.

`nativeHls` ships from `@videojs/core/dom/media/native-hls` with the
same shape over `NativeHlsMediaBaseMixin`. Future engines (`dash`,
`shaka`) drop in under their own subpath. An app that imports only
`hlsJs` never reaches native-HLS code, and vice versa.

---

## Features

Every feature is a tiny descriptor wrapping a class mixin, exported
from an engine's subpath. Two flavours, distinguished by what code
they wrap:

### Engine-specific features

The mixin uses engine internals (e.g. `this.engine` for hls.js).
Lives next to the engine's source:

```ts
// packages/core/src/dom/media/hls/features/live.ts
import { HlsJsMediaLiveMixin } from '../live';

export const live = {
  name: 'live',
  mixin: HlsJsMediaLiveMixin,
};
```

Examples: `live`, `streamType`, `errors`, `preload`, `textTracks`.

`live` from `@videojs/core/dom/media/hls` only fits in a `hlsJs(...)`
variant. `live` from `@videojs/core/dom/media/native-hls` is a
different descriptor that wraps `NativeHlsMediaLiveMixin`. Same name,
different import path, different mixin.

### Engine-agnostic features

The mixin only uses public media APIs (`play`, `pause`, `currentTime`).
Implementation lives in a shared location — typically wrapping the
existing engine-agnostic mixin like `GoogleCastMixin` — and gets
**re-exported from each engine subpath**:

```ts
// packages/core/src/dom/media/google-cast/index.ts (implementation)
export const googleCast = (config: GoogleCastConfig = {}) => ({
  name: 'googleCast',
  mixin: GoogleCastMixin(config),
});

// packages/core/src/dom/media/hls/index.ts
export { googleCast, muxData, airPlay } from '../google-cast';

// packages/core/src/dom/media/native-hls/index.ts
export { googleCast, muxData, airPlay } from '../google-cast';
```

Examples: `googleCast`, `muxData`, `airPlay`. Each engine path
re-exports them so users have one curated import location per engine.

The implementation isn't duplicated — each subpath re-exports the same
module, so the bundler still sees one copy.

When using multi-engine `createVideo(...)`, engine-agnostic features
go into each variant's `features` array. Cast and analytics attach
per-delegate; only the active delegate runs them at any moment, so
the cost is the same as today's single mixin chain.

---

## Internals

`createVideo` builds an inner class per variant and (when there's more
than one) wraps them in a thin selection facade:

```ts
// packages/core/src/dom/media/create-video.ts (sketch)
export function createVideo<Variants extends [MediaVariant, ...MediaVariant[]]>(
  ...variants: Variants
): VideoMediaResult<Variants> {
  const composed = variants.map((variant) => {
    let cls: Constructor = HTMLVideoElementHost;
    cls = variant.mixin(cls);
    for (const feature of variant.features) cls = feature.mixin(cls);
    return { variant, cls };
  });

  if (composed.length === 1) return composed[0].cls as VideoMediaResult<Variants>;

  // Selection facade: holds an active delegate, asks each variant's
  // `supports()` at load(), instantiates the first match.
  return withVariantSelection(HTMLVideoElementHost, composed) as VideoMediaResult<Variants>;
}
```

`createAudio` is identical except it starts from `HTMLAudioElementHost`.

No new lifecycle, no new primitive, no runtime registry. Each variant
is a declarative description of which mixins to compose, in which
order, on which base.

---

## Bundle cost

Tree-shake follows import paths.

**Engine-specific code is never cross-referenced.**
`@videojs/core/dom/media/hls` exports `hlsJs`, `live`, `streamType`,
`errors`, `hlsJsFeatures`, plus re-exports of engine-agnostic features
(`googleCast`, `muxData`).
`@videojs/core/dom/media/native-hls` exports its own variants of the
same names. Neither path imports the other.

**A single-engine app pays for one engine.** A `createVideo(hlsJs({…}))`
call only references hls.js code plus whatever engine-agnostic features
were imported. A native-only build never touches `Hls` or any
`HlsJs*Mixin`.

**Multi-engine apps pay for both engines.** `createVideo(hlsJs({…}),
nativeHls({…}))` necessarily references both engine bases and both
feature sets. That's the user opting in to multi-engine playback —
same trade-off they make today by importing `HlsMedia`.

**Engine-agnostic features pay for themselves only.** The
implementation module (`google-cast/`) is a single module re-exported
from each engine path; the bundler dedupes it. Importing
`googleCast` from `hls` and `googleCast` from `native-hls` in the same
build resolves to one copy of `GoogleCastMixin`.

---

## Why

- **Parity with the store.** Both layers read the same way:
  `{ features: [...] }`, plus the engine function call.
- **One function for one or many engines.** No separate router
  primitive. Pass one variant or many — the API surface is the same.
- **One import path per engine.** Everything you need for hls.js
  comes from `@videojs/core/dom/media/hls`. The next-most-common
  question — "which `googleCast` do I import?" — answers itself.
- **Tree-shake by intent.** Pick one engine path and that's all you
  pay for. Pass a second variant to opt in to fallback.
- **No churn underneath.** Mixins keep their `#private` fields,
  precise types, and zero runtime overhead. We're only changing the
  composition surface.
- **One concept to learn.** Library authors still write mixins.
  App authors see one variadic factory per media kind.
- **Audio is real.** `createAudio` extends `HTMLAudioElementHost`
  properly, fixing the `packages/core/src/dom/media/mux/index.ts:20-21`
  TODO.

---

## Migration sketch

| Today | Tomorrow |
| --- | --- |
| `HlsJsMediaBase` (lines 19-57 of `hls/hlsjs.ts`) | `hlsJs(...).mixin` (engine function) |
| `class HlsJsMedia extends HlsJsMediaPreloadMixin(...)` | `createVideo(hlsJs({ features: [live, streamType, errors, preload] }))` |
| `class NativeHlsMedia` | `createVideo(nativeHls({ features: [live, streamType, errors] }))` |
| `class HlsMedia { … delegate selection … }` | `createVideo(hlsJs({ features: [...] }), nativeHls({ features: [...] }))` |
| `GoogleCastMixin` | `googleCast.mixin` (re-exported from each engine path) |
| `MuxDataMediaMixin` | `muxData.mixin` (re-exported from each engine path) |
| `class MuxVideoMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia))` | `createVideo(hlsJs({ features: [..., muxData, googleCast] }), nativeHls({ features: [..., muxData, googleCast] }))` |
| `class MuxAudioMedia` (TODO: should extend audio) | `createAudio(...)` mirroring the video version |

Engine classes shrink to bare bases. Mixins keep their bodies and just
get exposed as feature descriptors under their engine's subpath. The
hand-coded selection logic in `HlsMedia` moves into `createVideo`'s
multi-variant branch.

---

## Open Questions

- **Variant type surface.** When multiple variants are passed, is the
  resulting class's public type the *intersection* of the variants
  (only members on every variant — simplest contract) or the *union*
  (everything any variant exposes, narrowed via `instanceof` on
  `delegate`)? Today's `HlsMedia` hand-picks forwarders; the new
  multi-variant branch needs a principled answer.
- **`supports` contract.** Engines contribute it; what signature?
  Today's `HlsMedia` reads `src`, `type`, `preferPlayback`,
  `config`, `debug`. A canonical `MediaSupportContext` type lives in
  `@videojs/core/dom/media`.
- **Variant ordering.** First match wins, with `preferPlayback` as a
  tiebreaker (matching today's logic). Do we expose
  `preferPlayback` as a special-cased prop, or generalise to a
  per-variant `priority`?
- **Feature ordering.** Array order is registration order. Mixin
  order matters today (preload wraps stream-type wraps errors, …) —
  encode the recommended order in each engine's preset (`hlsJsFeatures`).
- **Override conflicts.** Two features wrapping the same method
  (e.g. cast and AirPlay both wrapping `play`) compose in array
  order. Same as today's mixin chain — likely fine, worth confirming.
- **Naming.** `createVideo` / `createAudio` parallel `createPlayer`.
  Alternatives: `defineVideo` / `defineAudio` to mirror
  `defineSlice` / `definePlayerFeature`.
- **Repeated cross-cutting features.** Putting `googleCast`, `muxData`
  in every variant is verbose. Worth a sugar like
  `createVideo(variant1, variant2, { features: sharedFeatures })`
  (trailing options apply to all variants)? Or leave it to user-side
  helpers?
- **Re-exports vs duplicate descriptors.** `googleCast` re-exported
  from each engine path — does TypeScript's instance type stay
  identical across import paths? (Should — re-export preserves
  identity.) Worth a sanity test.
- **Custom engines / features.** Type-ergonomic helpers
  (`defineFeature`, `defineEngine`) for third-party authors? Or is
  the descriptor shape simple enough to write by hand?

---

## See Also

- `packages/core/src/dom/store/features/presets.ts` — preset arrays
  on the store side. The shape we're mirroring.
- `packages/core/src/dom/media/hls/hlsjs.ts` — the current static
  mixin chain `createVideo` replaces; lines 19-57 become the body of
  the `hlsJs` engine function's mixin.
- `packages/core/src/dom/media/hls/index.ts` — today's `HlsMedia`
  facade with hand-coded delegate selection; replaced by
  `createVideo`'s multi-variant branch.
- `packages/core/src/dom/media/google-cast/index.ts` — the heaviest
  engine-agnostic mixin, becomes `googleCast.mixin` re-exported from
  each engine path.
- `packages/core/src/dom/media/mux/index.ts` — `MuxVideoMedia` /
  `MuxAudioMedia`, the canonical multi-layer composition. The audio
  TODO on line 20-21 resolves naturally with `createAudio`.
