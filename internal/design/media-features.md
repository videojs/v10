---
status: draft
date: 2026-05-14
---

# Composable Media

Compose media behavior by registering host extensions and adding media
layers at runtime.

## Problem

Today, behavior on top of the base media classes is layered with class
mixins and mixin-prefixed props:

```ts
export class MuxVideoMedia extends MuxDataMediaMixin(GoogleCastMixin(HlsMedia)) {}

type MuxMediaProps = HlsMediaProps & GoogleCastMediaProps & MuxDataMediaProps;
// e.g. castSrc, castContentType, castReceiverApplicationId, muxEnvKey, …
```

That pattern has costs we want to remove:

1. **Static composition.** The class is baked at module load — Cast can't
   be code-split or lazy loaded, and once mixed in, behavior can't be
   added, removed, or swapped at runtime.
2. **Muddled media API.** Mixin config props leak onto the media surface
   and need prefixing to avoid conflicts.

## Solution

Two roles, one host:

- **Media Extension** — installs itself on a media host, owns its lifecycle
  and state, and may push one or more layers (or only observe). Usually
  produced by a factory like `googleCast({ … })`.
- **Media Layer** — anything pushed onto the layer stack via
  `addLayer(media, layer)`.

## Features

- Extensions and layers can be pre-composed into a single media host.
  e.g. MuxVideo is composed of HlsMedia, GoogleCast, and MuxData.
- Extensions and layers can be installed and removed at runtime.
- Extensions have their own API surface and lifecycle.
- Extensions are deduplicated and only installed once per media host.
- Extensions can be looked up and updated from anywhere with the media reference.
- Extensions can't extend the media host's API surface — strict by default,
  however the host can still be easily extended by subclassing.

## Quick Start

### Imperative

```ts
import { createHlsMedia } from '@videojs/core/dom/media/hls';
import { googleCast } from '@videojs/core/dom/media/google-cast';
import { muxData } from '@videojs/core/dom/media/mux';

const media = createHlsMedia();
media.target = mediaElement;

googleCast({ receiverApplicationId: '…' }).install(media);
muxData({ envKey: '…' }).install(media);
```

### Dynamic import

```ts
import { createHlsMedia } from '@videojs/core/dom/media/hls';

const media = createHlsMedia();
media.target = mediaElement;

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
      <GoogleCast receiverAppId="1234567890" customData={{ foo: 'bar' }} />
    </HlsVideo>
  );
}
```

## API Surface

### Media Extension

```ts
import { defineExtension, getExtensions } from '@videojs/core/media/media-extension';
import { addLayer } from '@videojs/core/media/media-layer';

const googleCast = defineExtension((props: GoogleCastProps) => ({
  install(media, { signal }) {
    // Target-bound state belongs on a layer — override `set target` to react.
    const layer = addLayer(media, new GoogleCastLayer(props));
    // `signal` aborts on destroy — pass it to anything signal-aware.
    return layer;
  },
}));

const cast = googleCast({ receiverApplicationId: '…' });
const destroy = cast.install(media);

// lookup + mutate from anywhere with the media reference
getExtensions(media).get(googleCast)?.receiverApplicationId = 'new-id';

// iterate every installed extension
for (const ext of getExtensions(media)) console.log(ext);

destroy();
```

`getExtensions(media)` returns a `MediaExtensionList` bound to that host —
the single entry point for installing, looking up, and iterating extensions.
`defineExtension` brands each instance so that `ext.install(media)` and
`getExtensions(media).install(ext)` share the same dedup state.

The framework creates one `AbortController` per install and passes its
signal to `install(media, { signal })`. The returned destroy aborts that
signal, then runs any teardown the extension returned — so most extensions
never need to manage their own controller.

### Media Layer

```ts
import { addLayer } from '@videojs/core/media/media-layer';

function addLayer(media: MediaLayer, layer: Layer): () => void;

interface Layer extends MediaLayer {}
```

`addLayer(media, layer)` pushes the layer onto the stack and returns a
destroy that pops it. Most code calls this transitively through an
extension, but it can be called directly when no surrounding extension is
needed.

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

#### Reacting to target changes

`set target` propagates by invoking the next layer's setter, so any layer
can react by overriding it. Each call to `super.target = value` migrates
this layer's forwarders and hands off to the next layer down. When the
layer is removed via `addLayer`'s destroy, the override is invoked one
last time with `null` so target-bound state tears down cleanly.

```ts
class MyLayer extends HTMLMediaElementLayer {
  #abort: AbortController | null = null;

  override set target(value: HTMLMediaElement | null) {
    this.#abort?.abort();
    this.#abort = null;

    if (value) {
      this.#abort = new AbortController();
      value.addEventListener('error', onError, { signal: this.#abort.signal });
    }

    super.target = value;
  }
}
```
