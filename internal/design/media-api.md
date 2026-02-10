# RFC: Unified Media API

## Summary

This RFC proposes a **unified media API** that extends the [HTMLMediaElement](https://html.spec.whatwg.org/multipage/media.html#htmlmediaelement) to support different media types (video, HLS, DASH, YouTube, etc.) in a consistent way. The API is designed to:

- **Extend** the existing HTMLMediaElement surface rather than replace it. Implementations may expose the **full** HTMLMediaElement surface or a **subset** of it; the unified contract is "HTMLMediaElement-like" where the subset is sufficient for the integration (e.g. play/pause, currentTime, seekable).
- **Support multiple integration points:** for HTML, web components that implement this API; for React and other frameworks, an API that extends `EventTarget` and exposes the same surface (full or subset).
- **Add custom extensions** for behavior not covered by HTMLMediaElement, specifically:
  - **Stream type** — distinguish live vs. on-demand content.
  - **Live edge** — model the “live edge” of live streams (window, seekable end, seek-to-live).
  - **Renditions list** — discover and select video/audio quality levels (renditions) for HTTP Adaptive Streaming (HAS).

## Motivation

## Unified control across media types

Players today deal with many sources: native `<video>`, HLS, DASH, YouTube, etc. Each often has its own API and event model. A unified media API allows:

- One control surface for play/pause, seeking, volume, and **stream type**, **live edge**, and **renditions**, regardless of backend.
- Consistent behavior for web components and frameworks (e.g. React) that sit on top of a single abstraction.

### Gaps in the platform

Current HTMLMediaElement does not address:

1. **Stream type** — UIs need to know if content is live or on-demand (e.g. show/hide seek bar, live badge, DVR controls). Today this is inferred from `duration` or format-specific logic, which is brittle (e.g. ended live vs. VOD).
2. **Live edge** — For live/HAS, “live” is a window, not a single time. UIs need a clear notion of “at live” and “seek to live” that respects HOLD-BACK, target duration, and segment boundaries.
3. **Renditions** — Users and UIs need to see available quality levels and select a rendition; today this is player-specific and not standardized.

By extending the media element (or an EventTarget-based equivalent) with **stream type**, **live edge**, and **renditions list** APIs, we give UIs a single, predictable way to implement live indicators, seek-to-live, quality selectors, and stream-type–aware chrome.

## Design principles

- **Extension of HTMLMediaElement** — New behavior is added via partial interfaces and constraints on existing attributes (e.g. `seekable`), not by replacing the element.
- **Subset of HTMLMediaElement allowed** — A conforming implementation may expose the full HTMLMediaElement surface or a **subset** of it. The contract is "HTMLMediaElement-like": consumers can rely on the subset that is documented as required for a given use case (e.g. `play`, `pause`, `currentTime`, `seekable` for basic playback). Backends that cannot support certain attributes (e.g. `audioTracks` for some HAS) may omit them or expose them as no-ops/empty where specified.
- **Web components and frameworks** — For HTML, the API can be implemented by custom elements that wrap or emulate a media element. For React and others, the same contract can be implemented by an object that extends `EventTarget` and exposes the same properties and events (full or subset).
- **Custom extensions only where needed** — Use native media APIs where they suffice; add **stream type**, **live edge**, and **renditions list** only where the platform does not already define the behavior.

## API overview

The unified media API adds the following to a media element (or EventTarget-based equivalent). The base surface is **HTMLMediaElement** (or a subset thereof); implementations may expose the full HTMLMediaElement API or only the subset needed for their backend and use case.

| Area        | Addition                                      | Purpose                                                                         |
| ----------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| Stream type | `streamType`, `streamtypechange`              | Know if content is live or on-demand and adapt UI (seek bar, live badge, etc.). |
| Live edge   | `liveEdgeStart`, constrained `seekable.end()` | “At live” detection and “seek to live” for live/HAS.                            |
| Renditions  | `videoRenditions`, `audioRenditions`          | List and select quality levels for HAS.                                         |

- **HTMLMediaElement subset** — A conforming implementation may implement only a subset of HTMLMediaElement (e.g. core playback: `play`, `pause`, `currentTime`, `duration`, `seekable`, `paused`, `ended`). The type system and documentation will define which subset is required for which integration.
- **Custom extensions** — Implementations may expose the custom extensions only when applicable (e.g. `liveEdgeStart` for live; renditions for HAS).

```ts
declare class Media extends EventTarget {
  // Custom extensions (unified media API)
  streamType: 'live' | 'on-demand';
  liveEdgeStart: number;
  videoRenditions: VideoRenditionList;
  audioRenditions: AudioRenditionList;

  // Properties
  src: string;
  srcObject: MediaStream | MediaSource | Blob | null;
  currentSrc: string; // read only
  crossOrigin: string | null;
  preload: 'none' | 'metadata' | 'auto';
  autoplay: boolean;
  loop: boolean;
  controls: boolean;
  controlsList: DOMTokenList; // read only
  volume: number; // 0.0 to 1.0
  muted: boolean;
  defaultMuted: boolean;
  currentTime: number;
  defaultPlaybackRate: number;
  playbackRate: number;
  duration: number; // read only, NaN if unknown, Infinity for live
  paused: boolean; // read only
  ended: boolean; // read only
  seeking: boolean; // read only
  seekable: TimeRanges; // read only
  buffered: TimeRanges; // read only
  played: TimeRanges; // read only
  networkState: number; // read only (NETWORK_EMPTY, LOADING, LOADED, NO_SOURCE)
  readyState: number; // read only (HAVE_NOTHING, HAVE_METADATA, HAVE_CURRENT_DATA, HAVE_FUTURE_DATA, HAVE_ENOUGH_DATA)
  error: MediaError | null; // read only
  disableRemotePlayback: boolean;
  remote: RemotePlayback; // read only
  mediaKeys: MediaKeys | null; // read only, secure context
  audioTracks: AudioTrackList; // read only
  videoTracks: VideoTrackList; // read only
  textTracks: TextTrackList; // read only

  // Custom: requires polyfill in some browsers
  addVideoTrack(track: VideoTrack): void;
  addAudioTrack(track: AudioTrack): void;
  removeVideoTrack(track: VideoTrack): void;
  removeAudioTrack(track: AudioTrack): void;

  // Methods
  play(): Promise<void>;
  pause(): void;
  load(): void;
  canPlayType(type: string): 'probably' | 'maybe' | '';
  addTextTrack(kind: TextTrackKind, label?: string, language?: string): TextTrack;
  setMediaKeys(mediaKeys: MediaKeys | null): Promise<void>; // secure context

  // Attach media element to the media instance
  element: HTMLMediaElement;
  attach(element: HTMLMediaElement): void;
  detach(): void;

  // Proxy handlers
  get(prop: keyof HTMLMediaElement): any;
  set(prop: keyof HTMLMediaElement, val: any): void;
  call(prop: keyof HTMLMediaElement, ...args: any[]): any;
}

// Implemented as a mixin
export const MediaMixin = <T extends EventTarget, E extends MediaElementConstructor>(
  Super: Constructor<T>,
  MediaElement: E
) => class Media extends (Super as Constructor<EventTarget>) {
  // Logic that proxies media API to the media element
  // ...

  // Attach media element to the media instance
  element: HTMLMediaElement;
  attach(element: HTMLMediaElement): void;
  detach(): void;

  // Proxy handlers
  get(prop: keyof HTMLMediaElement): any;
  set(prop: keyof HTMLMediaElement, val: any): void;
  call(prop: keyof HTMLMediaElement, ...args: any[]): any;
}

export class Media extends MediaMixin(EventTarget, HTMLMediaElement) {}
export class Video extends MediaMixin(EventTarget, HTMLVideoElement) {}
export class Audio extends MediaMixin(EventTarget, HTMLAudioElement) {}
```

### Example of using the media API

```ts
import Hls from 'hls.js';
import { type MediaElementInstance, Video } from './media';

type Constructor<T = object> = new (...args: unknown[]) => T;

interface HlsMediaBase {
  attach?(element: MediaElementInstance): void;
  detach?(): void;
}

// The mixin is used by the web component because it needs to extend HTMLElement!
export const HlsMediaMixin = <T extends Constructor>(Super: T) => {
  class HlsMedia extends (Super as Constructor<HlsMediaBase>) {
    engine = new Hls();

    attach(element: MediaElementInstance): void {
      super.attach?.(element);
      this.engine.attachMedia(element);
    }

    detach(): void {
      super.detach?.();
      this.engine.detachMedia();
    }

    set src(value: string) {
      this.engine.loadSource(value);
    }

    get src(): string {
      return this.engine.url ?? '';
    }
  }
  return HlsMedia as T & typeof HlsMedia;
};

// This class is used by the React component.
export class HlsMedia extends HlsMediaMixin(Video) {}
```
