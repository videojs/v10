# Media Architecture

Abstraction layer for consistent interaction with different media (native video, HLS, DASH, YouTube, Vimeo).

## The Problem

Different media have different APIs:

```ts
// Native video
video.currentTime = 30;

// HLS (via hls.js)
hls.currentLevel = 2;
hls.on(Hls.Events.LEVEL_SWITCHED, callback);

// DASH (via dash.js)
dash.setQualityFor('video', 2);
dash.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, callback);
```

**We need a unified way to:**

1. Read state (current quality level)
2. Subscribe to changes (quality changed)
3. Execute requests (set quality)

## Quick Start

### With Store

```ts
import { createMediaStore, hls, HlsMediaTarget, media } from '@videojs/html';

const store = createMediaStore({ slices: [...media.all, ...hls.all] });

const video = document.querySelector('video')!;
const hlsInstance = new Hls();
hlsInstance.attachMedia(video);

// HLS needs target to expose engine for adapters
store.attach(new HlsMediaTarget(video, hlsInstance));
store.request.loadSource('stream.m3u8');
store.request.selectQuality(2);
```

### Standalone (No Store)

```ts
import { hls } from '@videojs/html';

// Direct adapter access
const quality = hls.quality.from(hlsInstance);

quality.levels;
quality.selectedIndex;
quality.select(2);
quality.subscribe(() => console.log('changed'));
```

---

## Glossary

| Term              | Definition                                                                 |
| ----------------- | -------------------------------------------------------------------------- |
| **Store**         | Central state container. Holds slices, dispatches requests.                |
| **Slice**         | Unit of state (e.g., `qualitySlice`). Reads from target, handles requests. |
| **Target**        | Wraps media. Exposes `media` (Media) and `engine` (hls.js, dash.js, etc.). |
| **Adapter**       | Binds a capability to a specific engine. Has `from()` method.              |
| **Engine**        | The streaming library instance (hls.js `Hls`, dash.js `MediaPlayer`).      |
| **Media**         | Playback contract (like `HTMLMediaElement`). All targets expose this.      |
| **QualityLevels** | Interface returned by quality adapter. Controls quality selection.         |
| **AudioTracks**   | Interface returned by audio adapter. Controls audio track selection.       |
| **TextTracks**    | Interface returned by text track adapter. Controls text track selection.   |

### Availability

| Value           | Meaning                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `'unsupported'` | Target doesn't support this capability (e.g., native video for quality) |
| `'unavailable'` | Target supports it but data isn't ready (e.g., manifest not loaded)     |
| `'available'`   | Ready to use                                                            |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           Store                                  │
│  media: [media.playback, media.volume, media.quality(adapter)] │
└─────────────────────────────────────────────────────────────────┘
                              │
                       store.attach(target)
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    HtmlMediaTarget      │     │     HlsMediaTarget      │
│  media: <video>         │     │  media: <video>         │
│  engine: undefined      │     │  engine: Hls instance   │
│  loadSource: undefined  │     │  loadSource: ✓          │
└─────────────────────────┘     └─────────────────────────┘
                                          │
                                   adapter.from(engine)
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                     hls.quality.from()       hls.audio.from()
                      → quality.levels         → audio.tracks
                      → quality.select()       → audio.select()
```

**Target:** Wraps media, exposes raw engine  
**Adapter:** Creates bound interface via `from(engine)`  
**Slice Factory:** Uses adapter internally, exposes state to store

---

## Design Decision

| Option                       | Tree-shakeable | Easy to use | Verdict                              |
| ---------------------------- | -------------- | ----------- | ------------------------------------ |
| Monolithic Media contract    | ❌             | ✅          | Rejected—bundles everything          |
| Capability objects on Target | ❌             | ✅          | Rejected—capabilities always bundled |
| **Slice Factory + Adapters** | ✅             | ⚠️          | ✅ Chosen—full tree-shaking          |
| **Bundled Presets**          | ⚠️             | ✅          | ✅ Chosen—easy path                  |

**Final choice:** Slice Factory + Adapters for architecture, Bundled Presets for DX.

- Power users import individual adapters for minimal bundles
- Most users import `hls.all` or `dash.all` presets

---

## Design Rationale

> **Note:** This is advanced architecture. Most users will never see it — presets handle common scenarios out of the box:
>
> ```ts
> // Almost _all_ users will at most see something like this:
> createPlayer(presets.backgroundVideo);
> ```

### SPF Integration

SPF (composable streaming engine) is composable at the engine level:

```ts
// Engine: compose what you need
const engine = createEngine([
  audioTracks(),
  renditions(),
  thumbnails({ sprite: true }),
  abr({ strategy: 'bandwidth' }),
]);
```

The adapter model lets player composition mirror engine composition:

```ts
// Player: mirrors the engine — no textTracks composed, no text slice
createPlayer(engine.slices);
```

You don't bundle what you didn't compose. TypeScript enforces the symmetry.

If the player layer exposed a monolithic contract that includes text track APIs, something has to implement it. SPF would include text track code anyway (defeating composition).

### Runtime Performance

Runtime cost isn't just bundle size. Even with monolithic engines like hls.js where all capabilities ship anyway, there's runtime overhead. A monolithic player layer has to:

- Subscribe to all capability events (`LEVEL_SWITCHED`, `AUDIO_TRACK_SWITCHED`, etc.)
- Sync state on every event
- Maintain request handlers and subscriptions for each capability
- Boilerplate for each capability (error handling, cleanup, etc.)

That happens on every `store.attach()`, whether or not the UI uses it. If all you have is a play button and progress bar, you're still paying for quality menu infra.

With adapters, you pay for what you use:

```ts
// Minimal — just playback
createPlayer([slices.playback]);

// Add quality when the UI needs it
createPlayer([slices.playback, slices.quality(engine.quality)]);
```

Composition is explicit — you wire up exactly what you need.

### The Simple Path Stays Simple

For users who want everything:

```ts
createPlayer(presets.from(engine));
```

`presets.from()` inspects the engine for capabilities and creates matching slices. Full capability in one line. Composition is the escape hatch.

```ts
// Sample engine contract which can be dynamically created and exposed
interface MediaEngineCapabilities {
  quality?: QualityAdapter;
  audio?: AudioAdapter;
  text?: TextAdapter;
  // ...
}
```

---

## Core Types

### MediaTarget

Base contract. All targets implement this.

```ts
export const MEDIA_SYMBOL = Symbol('@videojs/media');

export interface MediaTarget<Engine = unknown> {
  readonly [MEDIA_SYMBOL]: true;
  readonly media: Media;
  readonly engine?: Engine;
  loadSource?(source: unknown): void;
}
```

- `media` — The playback surface (video element or adapter)
- `engine` — The streaming library instance (undefined for native video)
- `loadSource` — Optional method to load a source (engines implement this)

### Media

Playback contract. Subset of `HTMLMediaElement` that all targets implement.

```ts
export interface Media extends TypedEventTarget<MediaEventMap> {
  // Readonly state
  readonly paused: boolean;
  readonly duration: number;
  readonly ended: boolean;
  readonly readyState: number;
  readonly currentSrc: unknown; // Varies by target

  // Readable + writable
  currentTime: number;
  volume: number;
  muted: boolean;

  // Methods
  play(): Promise<void>;
  pause(): void;
  load(source: unknown): void;
}
```

`currentSrc` and `load()` are `unknown` because source formats vary:

- Native: string URL
- HLS: string URL or `MediaPlaylist`
- YouTube: video ID or URL

### HlsMediaTarget

```ts
export const HLS_SYMBOL = Symbol('@videojs/hls');

export interface HlsMediaTarget extends MediaTarget<Hls> {
  readonly [HLS_SYMBOL]: true;
  readonly media: HTMLVideoElement;
  readonly engine: Hls;
}

// Type guard for narrowing
export function isHlsMediaTarget(target: MediaTarget): target is HlsMediaTarget {
  return HLS_SYMBOL in target;
}
```

### Adapter (Generic)

Binds a capability to a specific engine via `from()`:

```ts
interface Adapter<Engine, Value> {
  readonly symbol: symbol;
  canHandle(target: MediaTarget): target is MediaTarget<Engine>;
  from(engine: Engine, options?: AdapterOptions): Value;
}

interface AdapterOptions {
  onError?: (error: unknown) => void;
}
```

### QualityLevels

Returned by quality adapters. Controls quality selection.

```ts
interface QualityLevels {
  readonly levels: QualityLevel[];
  readonly selectedIndex: number;
  readonly auto: boolean;
  select(index: number | 'auto'): void;
  subscribe(callback: () => void): () => void;
}

interface QualityLevel {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  readonly bitrate: number;
  readonly label: string;
}
```

### AudioTracks

Returned by audio adapters. Controls audio track selection.

```ts
interface AudioTracks {
  readonly tracks: AudioTrack[];
  readonly selectedIndex: number;
  select(index: number): void;
  subscribe(callback: () => void): () => void;
}

interface AudioTrack {
  readonly id: number;
  readonly label: string;
  readonly language: string;
}
```

### TextTracks

Returned by text track adapters. Controls text track selection.

```ts
interface TextTracks {
  readonly tracks: TextTrack[];
  readonly selectedIndex: number;
  readonly mode: TextTrackMode;
  select(index: number): void;
  setMode(mode: TextTrackMode): void;
  subscribe(callback: () => void): () => void;
}

type TextTrackMode = 'disabled' | 'hidden' | 'showing';
```

### Adapter Type Aliases

```ts
type QualityAdapter<Engine> = Adapter<Engine, QualityLevels>;
type AudioAdapter<Engine> = Adapter<Engine, AudioTracks>;
type TextTrackAdapter<Engine> = Adapter<Engine, TextTracks>;
```

### Example: HLS Quality Adapter

```ts
export const hlsQualityAdapter: QualityAdapter<Hls> = {
  symbol: HLS_SYMBOL,
  canHandle: isHlsMediaTarget,

  from: (hls, options) => ({
    get levels() {
      return hls.levels.map((level, i) => ({
        id: i,
        width: level.width,
        height: level.height,
        bitrate: level.bitrate,
        label: `${level.height}p`,
      }));
    },
    get selectedIndex() {
      return hls.currentLevel;
    },
    get auto() {
      return hls.autoLevelEnabled;
    },

    select(index) {
      hls.currentLevel = index === 'auto' ? -1 : index;
    },

    subscribe(callback) {
      const onError = (_: unknown, data: ErrorData) => {
        if (data.fatal) options?.onError?.(new Error(`HLS: ${data.type}`));
      };

      hls.on(Hls.Events.LEVEL_SWITCHED, callback);
      hls.on(Hls.Events.MANIFEST_PARSED, callback);
      hls.on(Hls.Events.ERROR, onError);

      return () => {
        hls.off(Hls.Events.LEVEL_SWITCHED, callback);
        hls.off(Hls.Events.MANIFEST_PARSED, callback);
        hls.off(Hls.Events.ERROR, onError);
      };
    },
  }),
};
```

---

## Slice Factory

Creates a slice from adapters. Uses `adapter.from()` internally and forwards `onError` from store.

```ts
export function qualitySlice(...adapters: QualityAdapter[]): Slice<MediaTarget, QualityState> {
  let adapter: QualityAdapter | null = null;
  let quality: QualityLevels | null = null;

  return createSlice<MediaTarget>()({
    initialState: {
      qualityAvailability: 'unsupported',
      qualityLevels: [],
      qualitySelectedIndex: -1,
      qualityAuto: true,
    },

    getSnapshot: () => {
      if (!quality) {
        return {
          qualityAvailability: 'unsupported',
          qualityLevels: [],
          qualitySelectedIndex: -1,
          qualityAuto: true,
        };
      }
      return {
        qualityAvailability: 'available',
        qualityLevels: quality.levels,
        qualitySelectedIndex: quality.selectedIndex,
        qualityAuto: quality.auto,
      };
    },

    subscribe: ({ target, update, signal, onError }) => {
      adapter = adapters.find((a) => a.canHandle(target)) ?? null;
      if (!adapter || !target.engine) return;

      quality = adapter.from(target.engine, { onError });
      const unsub = quality.subscribe(update);

      signal.addEventListener('abort', () => {
        unsub();
        adapter = null;
        quality = null;
      });
    },

    request: {
      selectQuality: {
        guard: () => quality !== null,
        handler: (index: number | 'auto') => quality!.select(index),
      },
    },
  });
}
```

---

## Namespace Exports

### media.parts.ts

```ts
// @videojs/core/dom/store/slices/media.parts.ts

export const source = sourceSlice;
export const playback = playbackSlice;
export const volume = volumeSlice;
export const time = timeSlice;

// Slice factories - accept adapters
export function quality(...adapters: QualityAdapter[]) {
  return qualitySlice(...adapters);
}
export function audio(...adapters: AudioAdapter[]) {
  return audioSlice(...adapters);
}
export function textTracks(...adapters: TextTrackAdapter[]) {
  return textTrackSlice(...adapters);
}

export const all = [source, playback, volume, time] as const;
```

### hls.parts.ts

```ts
// @videojs/core/dom/store/slices/hls.parts.ts

import { hlsAudioAdapter, hlsQualityAdapter, hlsTextTrackAdapter } from '../store/targets/hls/adapters';
import { media } from './media.parts';

// Export adapters
export { hlsQualityAdapter as quality };
export { hlsAudioAdapter as audio };
export { hlsTextTrackAdapter as textTracks };

// Pre-bound slices for easy path
export const all = [
  media.quality(hlsQualityAdapter),
  media.audio(hlsAudioAdapter),
  media.textTracks(hlsTextTrackAdapter),
] as const;
```

### Main Exports

```ts
// @videojs/core/dom

export * as media from './slices/media.parts';
export * as hls from './slices/hls.parts';
export * as dash from './slices/dash.parts';

// Targets
export { HlsMediaTarget, isHlsMediaTarget, HLS_SYMBOL } from './store/targets/hls';
export { DashMediaTarget, isDashMediaTarget, DASH_SYMBOL } from './store/targets/dash';
export { HtmlMediaTarget, isHtmlMediaTarget } from './store/targets/html-media';

// Slice factories for power users
export { qualitySlice, audioSlice, textTrackSlice } from './store/slices';
```

---

## Usage Examples

### HTML

#### Simplest

```html
<!-- Just import and use -->
<script type="module" src="@videojs/html/define/vjs-frosted-skin"></script>

<vjs-frosted-skin>
  <video src="video.mp4"></video>
</vjs-frosted-skin>
```

#### Headless (No Skin)

```ts
import { createMediaStore, media } from '@videojs/html';

const video = document.querySelector('video')!;
const store = createMediaStore({ slices: [...media.all] });

// HTMLMediaElement works directly — auto-wrapped as HtmlMediaTarget
store.attach(video);
store.request.play();
```

#### HLS

```ts
import { createMediaStore, hls, HlsMediaTarget, media } from '@videojs/html';

const store = createMediaStore({ slices: [...media.all, ...hls.all] });

// HLS needs target to expose engine for quality/audio adapters
store.attach(new HlsMediaTarget(video, hlsInstance));
store.request.loadSource('stream.m3u8');
store.request.selectQuality(2);
```

#### HLS with Specific Capabilities

```ts
import { createMediaStore, hls, media } from '@videojs/html';

// Pick only the HLS capabilities you need
const store = createMediaStore({
  slices: [...media.all, media.quality(hls.quality), media.audio(hls.audio)],
});
```

#### Multi-Target

```ts
import { createMediaStore, dash, hls, media } from '@videojs/html';

// Same slices handle either target at runtime
const store = createMediaStore({
  slices: [...media.all, media.quality(hls.quality, dash.quality), media.audio(hls.audio, dash.audio)],
});
```

#### Standalone Adapter

```ts
import { hls } from '@videojs/html';

// Direct adapter access without store
const quality = hls.quality.from(hlsInstance);
quality.select(2);
```

#### Extending Skin Store

```ts
import { createMediaStore, extendConfig, FrostedSkinElement, hls } from '@videojs/html/skins/frosted';

// Add HLS capabilities to the skin's store
const { StoreMixin } = createMediaStore(extendConfig({ slices: [...hls.all] }));
FrostedSkinElement.define('vjs-hls-skin', StoreMixin);
```

#### Low-Level Engine Access

The store abstracts target differences, but sometimes you need direct access to low-level engine APIs — custom error handling, ABR tuning, buffer configuration, or engine-specific events. Type guards narrow the target type so TypeScript knows the exact engine available.

```ts
import { createMediaStore, hls, isHlsMediaTarget, media } from '@videojs/html';

const store = createMediaStore({
  slices: [...media.all, ...hls.all],
  onAttach: ({ target }) => {
    if (isHlsMediaTarget(target)) {
      // TypeScript knows: target.engine is Hls
      target.engine.config.maxBufferLength = 60;
      target.engine.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) console.error('HLS fatal error:', data);
      });
    }
  },
});
```

---

### React

#### Basic

```tsx
import { Video } from '@videojs/react';
import { Provider, Skin } from '@videojs/react/skins/frosted';

<Provider>
  <Skin>
    <Video src="video.mp4" />
  </Skin>
</Provider>;
```

#### With Store Hooks

```tsx
import { createMediaStore, media } from '@videojs/react';

const { Provider, useSelector, useRequest } = createMediaStore({ slices: [...media.all] });

function Controls() {
  const paused = useSelector((s) => s.paused);
  const play = useRequest('play');
  const pause = useRequest('pause');

  return <button onClick={paused ? play : pause} />;
}
```

#### HLS Quality Menu

```tsx
import { createMediaStore, hls, media } from '@videojs/react';

const { useSelector, useRequest } = createMediaStore({ slices: [...media.all, ...hls.all] });

function QualityMenu() {
  const levels = useSelector((s) => s.qualityLevels);
  const selectQuality = useRequest('selectQuality');
  // render menu
}
```

#### Standalone Adapter

```tsx
import { hls, useAdapter } from '@videojs/react';

function QualityMenu({ hlsInstance }: { hlsInstance: Hls }) {
  // Direct adapter access without store
  const quality = useAdapter(hlsInstance, hls.quality);
  // quality.levels, quality.select()
}
```

---

## Source Loading

Source loading is a Target concern. The `loadSource` method is optional on `MediaTarget` — engines implement it, native targets use the fallback.

### Target Implementations

#### HtmlMediaTarget (no loadSource)

```ts
export const HTML_MEDIA_SYMBOL = Symbol('@videojs/html-media');

export class HtmlMediaTarget implements MediaTarget {
  readonly [MEDIA_SYMBOL] = true;
  readonly [HTML_MEDIA_SYMBOL] = true;

  constructor(readonly media: HTMLMediaElement) {}

  // No loadSource — uses fallback path
}

export function isHtmlMediaTarget(target: MediaTarget): target is HtmlMediaTarget {
  return HTML_MEDIA_SYMBOL in target;
}
```

#### HlsMediaTarget (with loadSource)

```ts
export class HlsMediaTarget implements MediaTarget<Hls> {
  readonly [MEDIA_SYMBOL] = true;
  readonly [HLS_SYMBOL] = true;

  constructor(
    readonly media: HTMLVideoElement,
    readonly engine: Hls
  ) {}

  loadSource(source: string): void {
    this.engine.loadSource(source);
  }
}
```

### Source Slice

```ts
export const sourceSlice = createSlice<MediaTarget>()({
  initialState: {
    currentSrc: null as unknown,
  },

  getSnapshot: ({ target }) => ({
    currentSrc: target.media.currentSrc,
  }),

  subscribe: ({ target, update }) => {
    target.media.addEventListener('loadedmetadata', update);
    return () => target.media.removeEventListener('loadedmetadata', update);
  },

  request: {
    loadSource: (source: unknown, { target }) => {
      // Try target's loadSource first
      if (target.loadSource) {
        target.loadSource(source);
        return;
      }

      // Fallback for native video
      if (!isString(source)) {
        throw new Error('<video> requires string URL');
      }

      target.media.src = source;
      target.media.load();
    },
  },
});
```

### Usage

```ts
import { createMediaStore, media } from '@videojs/html';

const store = createMediaStore({ slices: [...media.all] });

// Native video — auto-wrapped, uses fallback (video.src + load())
const video = document.querySelector('video')!;
store.attach(video);
store.request.loadSource('video.mp4');
```

```ts
import { createMediaStore, hls, HlsMediaTarget, media } from '@videojs/html';

const store = createMediaStore({ slices: [...media.all, ...hls.all] });

// HLS — uses engine's loadSource
const hlsInstance = new Hls();
hlsInstance.attachMedia(video);
store.attach(new HlsMediaTarget(video, hlsInstance));
store.request.loadSource('stream.m3u8');
```

---

## Framework Helpers

### React: useAdapter

Generic hook for any adapter. Accepts engine instance or ref.

```tsx
import { hls, useAdapter } from '@videojs/react';

function useAdapter<Engine, Value>(
  engineOrRef: Engine | RefObject<Engine | null>,
  adapter: Adapter<Engine, Value>,
  options?: AdapterOptions
): Value | null {
  const engine = engineOrRef && 'current' in engineOrRef ? engineOrRef.current : engineOrRef;

  const value = useMemo(() => (engine ? adapter.from(engine, options) : null), [engine]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!value) return () => {};
      return value.subscribe(onStoreChange);
    },
    [value]
  );

  const getSnapshot = useCallback(() => value, [value]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// Usage with instance
const quality = useAdapter(hlsInstance, hls.quality);

// Usage with ref
const hlsRef = useRef<Hls>(null);
const quality = useAdapter(hlsRef, hls.quality);
```

### Lit: AdapterController

Generic reactive controller for any adapter.

```ts
import { AdapterController, hls } from '@videojs/html';

class AdapterController<Engine, Value> implements ReactiveController {
  #value: Value | null = null;
  #unsub?: () => void;

  constructor(
    private host: ReactiveControllerHost,
    private getEngine: () => Engine | null,
    private adapter: Adapter<Engine, Value>,
    private options?: AdapterOptions
  ) {
    host.addController(this);
  }

  get value() {
    return this.#value;
  }

  hostConnected() {
    const engine = this.getEngine();
    if (!engine) return;

    this.#value = this.adapter.from(engine, this.options);
    this.#unsub = this.#value.subscribe(() => this.host.requestUpdate());
  }

  hostDisconnected() {
    this.#unsub?.();
    this.#value = null;
  }
}

// Usage
class MyPlayer extends LitElement {
  #quality = new AdapterController(this, () => this.hlsInstance, hls.quality);

  render() {
    const levels = this.#quality.value?.levels ?? [];
    return html`...`;
  }
}
```

---

## Bundle Considerations

- Add `sideEffects: false` to `package.json` for reliable tree-shaking
- `hls.all` / `dash.all` bundle all adapters for that target—no internal tree-shaking
- Adapter selection is runtime, not compile-time—all passed adapters are bundled
- Bundlers tree-shake unused exports from `@videojs/core/dom` automatically

---

## Reference

### Package Structure

```
packages/core/src/dom/
└── store/
    ├── targets/
    │   ├── types.ts                # MediaTarget, Media
    │   ├── html-media/
    │   │   └── target.ts           # HtmlMediaTarget
    │   ├── hls/
    │   │   ├── target.ts           # HlsMediaTarget
    │   │   └── adapters/
    │   │       ├── quality.ts      # hlsQualityAdapter
    │   │       ├── audio.ts        # hlsAudioAdapter
    │   │       └── text-tracks.ts  # hlsTextTrackAdapter
    │   └── dash/
    │       └── ...
    │
    └── slices/
        ├── media.parts.ts          # media.playback, media.quality(), media.all
        ├── hls.parts.ts            # hls.quality, hls.audio, hls.all
        ├── dash.parts.ts           # dash.quality, dash.audio, dash.all
        ├── playback.ts             # playbackSlice
        ├── quality/
        │   ├── types.ts            # QualityState, QualityAdapter
        │   └── slice.ts            # qualitySlice factory
        └── ...
```

### TypedEventTarget

Utility for type-safe event handling on `Media` interface:

```ts
// @videojs/utils/events/typed-event-target.ts

export type EventMap = Record<string, Event>;

export interface TypedEventTarget<Events extends EventMap> extends EventTarget {
  addEventListener<K extends keyof Events>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;

  removeEventListener<K extends keyof Events>(
    type: K,
    listener: (event: Events[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;

  dispatchEvent<K extends keyof Events>(event: Events[K]): boolean;
}
```

`Media` extends `TypedEventTarget<MediaEventMap>` for type-safe media events.

---

## Open Questions

### Skin Extensibility

How should skins balance supporting features (quality menu) without knowing which target/slices user will use? Deferred to separate planning.

### Store Error Dispatch

`onError` callback in slice subscribe context requires store support for dispatching errors from slices. To be implemented.

---

## Constraints

- Targets live in `@videojs/core/dom`
- Must work across `@videojs/html` and `@videojs/react`
- `EventTarget` for DOM; React Native needs different impl
- Availability pattern: `'available' | 'unavailable' | 'unsupported'`
