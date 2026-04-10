---
status: draft
date: 2026-04-08
---

# Media Contracts

A capability-based contract system for media. Custom media authors implement
plain getters/setters against typed interfaces — no mixins, no proxy magic,
no DOM recreation.

## Problem

The core media contract is tangled up with platform-specific machinery.
Mixins, proxies, prototype-walking, and event monkey-patching all live at
the contract level — so integrators who want to build their own media
element can't separate "what the API is" from "how the DOM wiring works."
They look at our HLS implementation as a reference and find four
interlocking abstractions baked into core that are tough to reason through.
We want a gold standard like HLS that people can read, understand, and
replicate without absorbing the full DOM stack.

Proxying isn't inherently a problem — but proxying the entire
`HTMLMediaElement` API at the core contract level is. Types like
`HTMLMediaElement`, `TextTrackList`, `Event`, and `EventTarget` make it very difficult to
build implementations for platforms with DOM limitations or no DOM at all
(React Native, SSR). We don't need to mirror the DOM 1:1 — just a specific
subset covering what our player actually uses. Right now there isn't really
a clear contract; it's an all-or-nothing `HTMLMediaElement` type that ends
up nudging our own store features into reaching deeper into the DOM than
they should. And because media creation is fully DOM-coupled in core, we
wind up needing separate class hierarchies for different platforms (one for
custom elements, one for React/SSR) — which is the kind of leaky
architecture that the mixin system was trying to solve but ended up
compounding. Forwarding a well-defined set of contract properties at the
HTML element level is fine — the issue is doing it for a platform-specific
extensive API at the core contract level.

A few things we'd like to address:

1. **Dynamic contract in core** — `defineClassPropHooks` dynamically adds
   properties by walking prototype chains at runtime, and this happens at
   the core contract level. The API surface ends up being unpredictable:
   `in` checks behave inconsistently, `Object.keys()` returns different
   results depending on which delegate is composed, enumerability varies.
   It's hard to know the media object's shape from reading any single class.

2. **Inherited complexity** — Media implementors inherit four abstractions
   (`ProxyMixin`, `DelegateMixin`, `defineClassPropHooks`, `bridgeEvents`)
   that they don't really need to understand but have to work within. When
   something breaks, tracing where a property value comes from is tricky —
   `get(prop)` bounces through delegate → proxy → native element via
   prototype forwarding that doesn't really show up in the debugger. It's
   hard to follow, harder to debug, and tough to walk new contributors
   through.

3. **Misleading store type** — `PlayerTarget.media` is typed as
   `HTMLMediaElement`, so store features naturally treat it as a full DOM
   element — calling `querySelectorAll`, accessing `shadowRoot`, referencing
   `HTMLMediaElement.HAVE_FUTURE_DATA`. The type kind of invites this, and
   new features tend to reach deeper into the DOM because it looks like
   they can.

4. **No clear capabilities** — Today it's all-or-nothing. There's no good
   way to express that a media implementation supports play/pause but not
   text tracks, or volume but not fullscreen. Engine-specific properties
   (config, debug, preferPlayback) also end up leaking onto the media
   object via `defineClassPropHooks`, which muddies what "the media API"
   actually is.

5. **No async lifecycle** — Engine teardown is synchronous. When switching
   sources, the old engine's MSE cleanup may not have finished before the
   new engine starts, which can lead to race conditions.

## Solution

Replace the mixin architecture with:

- **No dynamic contracts or proxies in core** — the core contract is
  static, typed interfaces. Forwarding a well-defined set of properties
  happens at the HTML element level, not in core
- **Capability contracts** — small interfaces that each carry their own
  typed events
- **Explicit getters/setters** — no prototype walking or `get`/`set`/`call`
  indirection
- **`.engine` property** — engine access through `MediaEngineHost`, not
  top-level props
- **Async engine lifecycle** — with hooks for configuration, creation,
  source loading, and destruction
- **No DOM in contracts** — `EventLike` instead of `Event`,
  `TextTrackListLike` instead of `TextTrackList`

---

## Contracts

Everything starts with two primitives: a minimal event and a typed event
target. No DOM dependency.

### EventLike

```ts
interface EventLike<Detail = void> {
  readonly type: string;
  readonly timeStamp: number;
  readonly detail?: Detail;
}
```

DOM `Event` satisfies this shape. The `detail` bag allows typed payloads
without needing a second event system — useful for engine-specific events
(e.g., level switching with data) or any event that carries more than just
a type.

### EventTargetLike

```ts
interface EventTargetLike<Events extends Record<string, EventLike>> {
  addEventListener<K extends keyof Events & string>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: { signal?: AbortSignal },
  ): void;
  removeEventListener<K extends keyof Events & string>(
    type: K,
    listener: (event: Events[K]) => void,
  ): void;
  dispatchEvent(event: EventLike): boolean;
}
```

Only option is `{ signal }` for cleanup. DOM `EventTarget` satisfies this
contract — it accepts more params, the contract doesn't require them.

Helper to create a typed `EventTarget` base class for a given event map:

```ts
function TypedEventTarget<Events extends Record<string, EventLike>>() {
  return EventTarget as unknown as { new (): EventTargetLike<Events> };
}
```

Usage: `extends TypedEventTarget<VideoEvents>()` gives you a native
`EventTarget` with typed `addEventListener`.

---

## Capabilities

Each capability is a small interface with its own typed events. Capabilities
are independent — a media implementation picks the ones it supports.

### MediaPlaybackCapability

The base contract. If it can play, it's media.

```ts
interface MediaPlaybackEvents {
  play: EventLike;
  playing: EventLike;
  waiting: EventLike;
}

interface MediaPlaybackCapability {
  play(): Promise<void>;
  readonly readyState: MediaReadyStateValue;
}

const MediaReadyState = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
} as const;

type MediaReadyStateValue = typeof MediaReadyState[keyof typeof MediaReadyState];
```

### MediaPauseCapability

Not all media can pause — some live streams don't support it. Separate
from playback so implementations can express this.

```ts
interface MediaPauseEvents {
  pause: EventLike;
  ended: EventLike;
}

interface MediaPauseCapability {
  pause(): void;
  readonly paused: boolean;
  readonly ended: boolean;
}
```

Note: capabilities declare their events but don't extend
`EventTargetLike`. The composite interfaces (`Video`, `Audio`) extend
`EventTargetLike` once with the merged event map. This avoids ten
overlapping `addEventListener` signatures.

### MediaSeekCapability

```ts
interface MediaSeekEvents {
  timeupdate: EventLike;
  durationchange: EventLike;
  seeking: EventLike;
  seeked: EventLike;
  loadedmetadata: EventLike;
}

interface MediaSeekCapability {
  currentTime: number;
  readonly duration: number;
  readonly seeking: boolean;
}
```

### MediaSourceCapability

```ts
interface MediaSourceEvents {
  loadstart: EventLike;
  emptied: EventLike;
  canplay: EventLike;
  canplaythrough: EventLike;
  loadeddata: EventLike;
}

interface MediaSourceCapability {
  src: string;
  readonly currentSrc: string;
  load(): void;
}
```

### MediaVolumeCapability

```ts
interface MediaVolumeEvents { volumechange: EventLike; }

interface MediaVolumeCapability {
  volume: number;
  muted: boolean;
  getVolumeAvailability?(): Promise<MediaFeatureAvailability>;
}
```

### MediaPlaybackRateCapability

```ts
interface MediaPlaybackRateEvents { ratechange: EventLike; }

interface MediaPlaybackRateCapability {
  playbackRate: number;
}
```

### MediaBufferCapability

```ts
interface MediaBufferEvents { progress: EventLike; }

interface TimeRangeLike {
  readonly length: number;
  start(index: number): number;
  end(index: number): number;
}

interface MediaBufferCapability {
  readonly buffered: TimeRangeLike;
  readonly seekable: TimeRangeLike;
}
```

### MediaErrorCapability

```ts
interface MediaErrorEvents { error: EventLike; }

interface ErrorLike {
  readonly code: number;
  readonly message: string;
}

interface MediaErrorCapability {
  readonly error: ErrorLike | null;
}
```

### MediaTextTrackCapability

Non-DOM text track contract. Compatible with native `TextTrackList` but
doesn't require DOM types.

```ts
interface TextCueLike {
  readonly startTime: number;
  readonly endTime: number;
  readonly text: string;
}

interface TextCueListLike {
  readonly length: number;
  [Symbol.iterator](): Iterator<TextCueLike>;
  getCueById?(id: string): TextCueLike | null;
}

interface TextTrackLike {
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly id: string;
  readonly src?: string;
  mode: 'showing' | 'disabled' | 'hidden';
  readonly cues: TextCueListLike | null;
  addCue?(cue: TextCueLike): void;
}

interface TextTrackListEvents {
  addtrack: EventLike;
  removetrack: EventLike;
  changetrack: EventLike;
  trackmodechange: EventLike;
}

interface TextTrackListLike {
  readonly length: number;
  [Symbol.iterator](): Iterator<TextTrackLike>;
  getTrackById?(id: string): TextTrackLike | null;
}

interface MediaTextTrackCapability extends EventTargetLike<TextTrackListEvents> {
  readonly textTracks: TextTrackListLike;
}
```

### MediaFullscreenCapability

```ts
interface MediaFullscreenCapability {
  requestFullscreen(): Promise<void>;
  exitFullscreen?(): Promise<void>;
  readonly fullscreen?: boolean;
  getFullscreenAvailability?(): Promise<MediaFeatureAvailability>;
}
```

### MediaPictureInPictureCapability

```ts
interface MediaPictureInPictureCapability {
  requestPictureInPicture(): Promise<void>;
  exitPictureInPicture?(): Promise<void>;
  readonly pip?: boolean;
  getPictureInPictureAvailability?(): Promise<MediaFeatureAvailability>;
}
```

Availability methods (`get*Availability`) return
`Promise<MediaFeatureAvailability>` — `'available'`, `'unavailable'`, or
`'unsupported'`. They're optional on the capability (not all implementations
need them) and async so they can probe the platform without blocking. Store
features call them once at attach time and cache the result.

---

## Media — the full contract

The minimum viable media is `MediaPlaybackCapability`:

```ts
type MediaEvents = MediaPlaybackEvents;

interface Media extends
  MediaPlaybackCapability,
  EventTargetLike<MediaEvents> {
  readonly engine?: unknown;
  readonly nativeElement?: unknown;
}
```

That's it — `play()`, `readyState`, and optional untyped references to
engine and native element. A native `HTMLVideoElement` satisfies this.
So does a bare-bones custom implementation.

Everything else is opt-in via capabilities. `Video` and `Audio` are the
standard full contracts — each extends `EventTargetLike` once with a
merged event map:

```ts
type VideoEvents =
  MediaPlaybackEvents & MediaPauseEvents & MediaSeekEvents & MediaSourceEvents &
  MediaVolumeEvents & MediaPlaybackRateEvents & MediaBufferEvents &
  MediaErrorEvents & TextTrackListEvents;

interface Video extends
  Media,
  MediaPauseCapability,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaVolumeCapability,
  MediaPlaybackRateCapability,
  MediaBufferCapability,
  MediaErrorCapability,
  MediaTextTrackCapability,
  MediaFullscreenCapability,
  MediaPictureInPictureCapability,
  EventTargetLike<VideoEvents> {}

type AudioEvents =
  MediaPlaybackEvents & MediaPauseEvents & MediaSeekEvents & MediaSourceEvents &
  MediaVolumeEvents & MediaPlaybackRateEvents & MediaBufferEvents &
  MediaErrorEvents;

interface Audio extends
  Media,
  MediaPauseCapability,
  MediaSeekCapability,
  MediaSourceCapability,
  MediaVolumeCapability,
  MediaPlaybackRateCapability,
  MediaBufferCapability,
  MediaErrorCapability,
  EventTargetLike<AudioEvents> {}
```

`Audio` doesn't include fullscreen, PiP, or text tracks. Each composite
extends `EventTargetLike` once — one `addEventListener` signature, one
emitter, clean composition.

### In the store

`PlayerTarget.media` is typed as `Media` — the minimal contract. Store
features can only access playback state and `engine?` by default.
Everything else requires a type guard.

```ts
interface PlayerTarget {
  media: Media;
  container: MediaContainer | null;
}
```

Features that need optional capabilities use type guards:

```ts
attach({ target, signal, set }) {
  const { media } = target;

  // readyState is on MediaPlayCapability — always available
  const waiting = media.readyState < MediaReadyState.HAVE_FUTURE_DATA && !media.paused;

  // Volume is optional — guard first
  if (isMediaVolumeCapable(media)) {
    set({ volume: media.volume, muted: media.muted });
    listen(media, 'volumechange', () => {
      set({ volume: media.volume, muted: media.muted });
    }, { signal });
  }
}
```

---

## Package split

### Core DOM (`@videojs/core/dom`)

Element host classes forward the contract to a native element. The base
is generic over both the element type and the event map, extending
`EventTargetLike` through the type parameter.

```ts
// Base — receives a native element, forwards Media contract to it
class HTMLMediaElementHost<
  T extends HTMLMediaElement,
  Events extends Record<string, EventLike>
> extends TypedEventTarget<Events>() {

  readonly nativeElement: T | null;
  attachElement(nativeElement: T): void;

  // Shared forwarding (Media contract)
  get paused() { return this.nativeElement?.paused ?? true; }
  play() { return this.nativeElement?.play() ?? Promise.reject(); }
  get readyState() { return this.nativeElement?.readyState ?? 0; }
  // ...
}

// Implements Video — events extensible by subclasses
class HTMLVideoElementHost<Events extends VideoEvents = VideoEvents>
  extends HTMLMediaElementHost<HTMLVideoElement, Events>
  implements Video {

  get video(): HTMLVideoElement | null { return this.nativeElement; }
  // Video-specific: fullscreen, PiP, text tracks forwarded
}

// Implements Audio — events extensible by subclasses
class HTMLAudioElementHost<Events extends AudioEvents = AudioEvents>
  extends HTMLMediaElementHost<HTMLAudioElement, Events>
  implements Audio {

  get audio(): HTMLAudioElement | null { return this.nativeElement; }
  // No fullscreen, PiP, or text tracks
}
```

Media implementations extend these and add engine support:

```ts
type HlsVideoEvents = VideoEvents & {
  hlserror: EventLike<{ fatal: boolean; details: string }>;
};

class HlsVideo extends HTMLVideoElementHost<HlsVideoEvents>
  implements MediaEngineHost<Hls, HTMLVideoElement> {

  readonly engine: Hls | null;
  attachEngine(target: HTMLVideoElement) { /* ... */ }
  detachEngine() { /* ... */ }
  destroyEngine(): Promise<void> { /* ... */ }

  override get src() { return this.#src; }
  override set src(src: string) { this.#requestLoad(); }
  // ...
}
```

### HTML (`@videojs/html`)

```ts
abstract class CustomVideoElement extends MediaElementMixin(HTMLElement) {
  abstract readonly media: Video;
  // shadow DOM, <video> template, slots, attribute forwarding, events
}

abstract class CustomAudioElement extends MediaElementMixin(HTMLElement) {
  abstract readonly media: Audio;
  // shadow DOM, <audio> template, slots, attribute forwarding, events
}
```

Forwarding the `Media` contract from the host to the custom element is
based on a well-defined, static set of properties — not dynamic prototype
walking.

Subclasses provide the core media host:

```ts
export class HlsVideoElement extends CustomVideoElement {
  static readonly tagName = 'hls-video';
  readonly media = new HlsVideo();
}
```

### What custom media authors implement

- Extend `HTMLVideoElementHost` or `HTMLAudioElementHost` in core
- Implement `MediaEngineHost` for engine lifecycle
- Override `attachEngine()`, `detachEngine()`, `destroyEngine()`
- Override `src` and any getters that route through their engine
- Extend `CustomVideoElement` or `CustomAudioElement` in HTML package, provide the host instance

---

## Engine

### MediaEngineHost

```ts
interface MediaEngineHost<Engine = unknown, Target = unknown> {
  readonly engine: Engine | null;
  attachEngine?(target: Target): void;
  detachEngine?(): void;
  destroyEngine(): Promise<void>;
  setEngineCallbacks?(callbacks: Partial<MediaEngineCallbacks<Engine, Target>>): void;
}
```

`attachEngine()` wires the engine to its target. Internally calls
`attachElement()` on the host — so the host gets the native element
and the engine gets attached in one step.

`destroyEngine()` is async — MSE cleanup, network abort, SourceBuffer
removal. Must complete before a new engine is created.

### MediaEngineCallbacks

Lifecycle hooks the media class calls *out* to during transitions.
Set externally via `setEngineCallbacks()`.

```ts
interface MediaEngineCallbacks<Engine = unknown, Target = unknown> {
  onEngineConfig(config: Record<string, unknown>): void;
  onEngineCreate(engine: Engine): void;
  onEngineAttach(engine: Engine, target: Target): void;
  onSourceChange(engine: Engine, src: string): void;
  onEngineDetach(engine: Engine): void;
  onEngineDestroy(engine: Engine): Promise<void>;
}
```

### Engine lifecycle

```
┌─────────────────────────────────────────────────────────┐
│  1. Configure       onEngineConfig(config)              │
│  2. Create          onEngineCreate(engine)              │
│  3. Attach          onEngineAttach(engine, target)      │
│  4. Source          onSourceChange(engine, src)         │
│  5. Detach          onEngineDetach(engine)              │
│  6. Destroy         onEngineDestroy(engine) → Promise   │
└─────────────────────────────────────────────────────────┘
```

Methods (`attachEngine`, `detachEngine`, `destroyEngine`) perform the
work. Callbacks fire at each step for external hooks.

Source change flow:

```
src = "new.m3u8"
  → microtask coalesce
  → await destroyEngine() (if pending)
  → engine config changed?
    ├─ yes → detachEngine() → destroyEngine() → await
    │        onEngineConfig → onEngineCreate → attachEngine
    └─ no  → reuse engine
  → onSourceChange(engine, src)
```

---

## Type guards and helpers

### Capability type guards

Duck-typing — `isObject(value) && 'propName' in value`.

```ts
isMediaPauseCapable(value)             // → value is MediaPauseCapability
isMediaSeekCapable(value)              // → value is MediaSeekCapability
isMediaVolumeCapable(value)            // → value is MediaVolumeCapability
isMediaBufferCapable(value)            // → value is MediaBufferCapability
isMediaFullscreenCapable(value)        // → value is MediaFullscreenCapability
isMediaPictureInPictureCapable(value)  // → value is MediaPictureInPictureCapability
isMediaTextTrackCapable(value)         // → value is MediaTextTrackCapability
isMediaEngineHost(value)               // → value is MediaEngineHost
```

### Media type guards

Narrow to a specific implementation or host type:

```ts
// Core host
isHTMLVideoElementHost(media)          // → media is HTMLVideoElementHost
isHTMLAudioElementHost(media)          // → media is HTMLAudioElementHost

// HTML custom elements
isCustomVideoElement(media)            // → media is CustomVideoElement
isCustomAudioElement(media)            // → media is CustomAudioElement

// Specific implementations
isHlsVideo(media)                      // → media is HlsVideo
isDashVideo(media)                     // → media is DashVideo
```

### Helpers

```ts
resolveHTMLVideoElement(media): HTMLVideoElement | null
resolveHTMLAudioElement(media): HTMLAudioElement | null
```

### Examples

```ts
attach({ target, signal, set }) {
  const { media } = target;

  if (isHlsVideo(media)) {
    media.engine?.on(Hls.Events.LEVEL_SWITCHING, (_, data) => {
      set({ currentLevel: data.level });
    });
  }

  const video = resolveHTMLVideoElement(media);
  if (video) {
    const stream = video.captureStream();
  }
}
```

---

## HLS — The Reference Implementation

The HLS media is the primary example. It's a plain class in core — no
`HTMLElement`, no shadow DOM.

### Core class

```ts
class HlsVideo extends HTMLVideoElementHost<HlsVideoEvents>
  implements MediaEngineHost<Hls, HTMLVideoElement> {

  override attachEngine(target: HTMLVideoElement) {
    this.engine?.attachMedia(target);
  }

  override detachEngine() {
    this.engine?.detachMedia();
  }

  override async destroyEngine() {
    const engine = this.engine;
    if (!engine) return;
    engine.detachMedia();
    engine.destroy();
    // TODO: await actual MSE SourceBuffer cleanup, not just a microtask
  }

  // src routes through engine
  get src() { return this.#src; }
  set src(src: string) {
    this.#src = src;
    this.#requestLoad();
  }
}
```

### Usage

```html
<!-- Standard: shadow DOM creates the <video> -->
<video-player>
  <hls-video src="stream.m3u8" playsinline></hls-video>
</video-player>

<script>
  const el = document.querySelector('hls-video');
  el.engine;       // → Hls instance
  el.nativeElement; // → inner <video> element (HTMLVideoElement | null)
  el.play();       // → media contract
  el.paused;       // → media contract
</script>
```

`CustomVideoElement` forwards native video attributes (`playsinline`,
`poster`, `crossorigin`, `loop`, `autoplay`, `muted`, `preload`) to
the inner `<video>`. These are element configuration, not media
capabilities.

### Slotting your own video element

```html
<hls-video src="stream.m3u8">
  <video slot="media" playsinline></video>
</hls-video>
```

The slotted `<video>` replaces the default shadow DOM `<video>`.
`CustomMediaElement` detects it via the `media` slot and uses it as
the engine target. The media contract still works.

### Store integration — unchanged

```ts
const playbackFeature = definePlayerFeature({
  name: 'playback',
  state: ({ target }): MediaPlaybackState => ({
    paused: true,
    play() { return target().media.play(); },
    pause() { target().media.pause(); },
  }),
  attach({ target, signal, set }) {
    const { media } = target;
    const sync = () => set({ paused: media.paused, ended: media.ended });
    listen(media, 'play', sync, { signal });
    listen(media, 'pause', sync, { signal });
  },
});
```

---

## HlsVideoElement — HTML package registration

`HlsVideo` is a plain class in `@videojs/core`. The HTML package wraps
it as a custom element:

```ts
// packages/html/src/media/hls-video/index.ts
export class HlsVideoElement extends CustomVideoElement {
  static readonly tagName = 'hls-video';
  readonly media = new HlsVideo();
}

safeDefine(HlsVideoElement);
```

`CustomVideoElement` creates the shadow DOM with a `<video>` template,
resolves the video target (default or slotted), calls `attachElement(video)`
on the media host, forwards contract events and attributes, and handles
store context registration.

```html
<video-player>
  <hls-video src="stream.m3u8" playsinline></hls-video>
</video-player>
```

The split:

| Package | Class | Responsibility |
|---------|-------|----------------|
| `@videojs/core/dom` | `HTMLMediaElementHost` (base scaffold) | Shared element forwarding |
| `@videojs/core/dom` | `HTMLVideoElementHost implements Video` | Full `Video` contract + typed `VideoEventTarget` |
| `@videojs/core/dom` | `HTMLAudioElementHost implements Audio` | Full `Audio` contract + typed `AudioEventTarget` |
| `@videojs/core/dom` | `HlsVideo extends HTMLVideoElementHost` | HLS engine + contract overrides |
| `@videojs/html` | `MediaElementMixin` | Store context registration |
| `@videojs/html` | `CustomVideoElement` (abstract) | Shadow DOM, video template, slots, attributes, events, store context |
| `@videojs/html` | `CustomAudioElement` (abstract) | Shadow DOM, audio template, slots, attributes, events, store context |
| `@videojs/html` | `HlsVideoElement extends CustomVideoElement` | Provides `HlsVideo` host, registered as `<hls-video>` |
