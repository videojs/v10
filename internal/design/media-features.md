---
status: draft
date: 2026-05-14
---

# Composable Media

Compose media behavior from media extensions and layers — pre-composed into a
host or added and removed at runtime.

## Problem

Today, behavior on top of the base media classes is layered with class
mixins and mixin-prefixed props:

```ts
export class MuxVideoMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia)) {}

type MuxMediaProps = HlsMediaProps & GoogleCastMediaProps & MuxDataMediaProps;
// e.g. castSrc, castContentType, castReceiverApplicationId, muxEnvKey, …
```

That pattern has costs we want to remove:

1. **Inheritance doesn't scale.** Features (HLS, Cast, Data, …) are
   independent axes, but inheritance forces them into one linear chain — `N`
   freely-combinable features need a class per combination, combinatorial not
   linear.
2. **Features are bound to their base.** A mixin extends a _specific_ class,
   so `GoogleCastMixin` must be re-applied to every media implementation
   (`HlsMedia`, `NativeHlsMedia`, …) instead of authored once and reused.
3. **Mixins can't augment an instance.** A mixin yields a _new subclass_, so a
   component already holding an `HlsMedia` instance can't gain Cast without
   building a different class and a fresh instance — discarding the one it has.
4. **The class is fixed at module load.** Mixins resolve when the class is
   defined, so features can't be code-split or lazy loaded, nor added,
   removed, or swapped at runtime.

## Solution

Two roles, one host:

- **Media Extension** — installs itself on a media host, owns its lifecycle
  and state, and may push one or more layers (or only observe).
- **Media Layer** — anything pushed onto the layer stack via
  `addLayer(media, layer)`.

## Features

- **Pre-composed or runtime.** Bake extensions and layers into a host
  (e.g. MuxVideo = HlsMedia + GoogleCast + MuxData), or install and remove
  them at runtime.
- **Own API and lifecycle.** Each extension owns its state, surface, and
  teardown.
- **Deduplicated.** An extension installs only once per host.
- **Lookup from anywhere.** Extensions can be found and updated from any
  reference to the media.
- **Strict by default.** Extensions can't extend the host's API surface;
  subclass the host when you need to.

## Quick Start

### Imperative

```ts
import { createHlsMedia } from '@videojs/core/dom/media/hls';
import { googleCast } from '@videojs/core/dom/media/google-cast';
import { muxData } from '@videojs/core/dom/media/mux';

const media = createHlsMedia();
media.target = videoElement;

googleCast({ receiverApplicationId: '…' }).install(media);
muxData({ envKey: '…' }).install(media);
```

### Dynamic import

```ts
import { createHlsMedia } from '@videojs/core/dom/media/hls';

const media = createHlsMedia();
media.target = videoElement;

if (userWantsCast) {
  const { googleCast } = await import('@videojs/core/dom/media/google-cast');
  googleCast({ receiverApplicationId: '…' }).install(media);
}
```

### Factory style

```ts
import { createHlsMedia } from '@videojs/core/dom/media/hls';
import { googleCast } from '@videojs/core/dom/media/google-cast';
import { muxData } from '@videojs/core/dom/media/mux';

const media = createHlsMedia([
  googleCast({ receiverApplicationId: '…' }),
  muxData({ envKey: '…' }),
]);

media.target = videoElement;
```

### React

Not needed today, but the door stays open. The `<GoogleCast>` child would be
a one-line `useEffect` that calls `googleCast(props).install(media)` on
mount.

```tsx
import { lazy } from '@videojs/react/utils/lazy';
import { HlsVideo } from '@videojs/react/media/hls-video';

const GoogleCast = lazy(() => import('@videojs/react/media/google-cast'));

export default function HlsVideoWithExtensions() {
  return (
    <HlsVideo src="https://stream.mux.com/BV3YZtogl89mg9VcNBhhnHm02Y34zI1nlMuMQfAbl3dM.m3u8">
      <GoogleCast receiverApplicationId="1234567890" customData={{ foo: 'bar' }} />
    </HlsVideo>
  );
}
```

## API Surface

### Media Extension

An extension is a plain class that implements the `MediaExtension` interface and
is responsible for installing itself on a media host by calling `installExtension`.

Each host gets a `Map` of its extensions keyed by their factory.

(`packages/core/src/core/media/media-extension.ts`: brotli 151 B)

```ts
interface MediaExtension {
  install(media: Media): void;
  destroy(): void;
}
```

```ts
import { getExtensions, installExtension, type MediaExtension } from '@videojs/core/media/media-extension';
import { addLayer } from '@videojs/core/media/media-layer';
import type { GoogleCastMedia } from './google-cast-layer';

class GoogleCast implements GoogleCastProps, MediaExtension {
  #destroy: (() => void) | null = null;

  constructor(props: GoogleCastProps) {
    Object.assign(this, props);
  }

  install(media: GoogleCastMedia) {
    const uninstall = installExtension(googleCast, media, this);
    const removeLayer = addLayer(media, new GoogleCastLayer(this));
    this.#destroy = () => {
      uninstall();
      removeLayer();
    };
  }

  destroy() {
    this.#destroy?.();
    this.#destroy = null;
  }
}

export function googleCast(props: GoogleCastProps = {}) {
  return new GoogleCast(props);
}

const cast = googleCast({ receiverApplicationId: '…' });
cast.install(media);

// lookup + mutate from anywhere with the media reference
getExtensions(media).get(googleCast)!.receiverApplicationId = 'new-id';

// iterate every installed extension
for (const ext of getExtensions(media).values()) console.log(ext);

cast.destroy();
```

`getExtensions(media)` is the host's registry. During `install()`, an
extension registers by factory; `installExtension` returns an uninstall
callback it pairs with its layer cleanup in `destroy()`. Consumers look
extensions up by the same factory, and teardown runs on `extension.destroy()`
or host destruction.

### Media Layer

A layer is a subclass of `MediaLayer` that overrides the media host's methods.

(`packages/core/src/core/media/media-layer.ts`: brotli 543 B)

```ts
interface MediaLayer {
  root: MediaHost;
  next: MediaLayer | HTMLMediaElement | null;
  target: HTMLMediaElement | null;
}
```

```ts
import { addLayer } from '@videojs/core/media/media-layer';

interface MediaHost extends MediaLayer {}

function addLayer(media: MediaHost, layer: MediaLayer): () => void;
```

`addLayer(media, layer)` pushes the layer onto the stack and returns a
destroy that pops it.

#### Chain anatomy

A host and its layers form a singly-linked list. The host sits at the top,
the underlying `HTMLMediaElement` sits at the bottom (the chain's `target`),
and every `addLayer` call inserts the new layer **right below the host** —
newest closest to the host, oldest closest to the target.

```text
HlsMedia          ← host (root)
   │ next
   ▼
MuxDataLayer      ← addLayer(host, muxData)   (added last)
   │ next
   ▼
GoogleCastLayer   ← addLayer(host, cast)      (added first)
   │ next
   ▼
<video>           ← target (tail of the chain)
```

Every `MediaLayer` exposes three navigation properties:

| Property | Points to                                                          |
| -------- | ------------------------------------------------------------------ |
| `root`   | the host at the top — walks parent links until there is no parent. |
| `next`   | the immediate neighbour beneath — a layer, or the `target`.        |
| `target` | the `HTMLMediaElement` at the bottom — shared by every layer.      |

Layers forward via `super`: a subclass's `override play()` calls
`super.play()`, which the base class walks one step down the chain. So
`host.play()` cascades through every layer until it reaches the `target`.
