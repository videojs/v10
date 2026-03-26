import Hls from 'hls.js';
import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';
import { HlsMediaTextTracksMixin } from './text-tracks';

export { Hls };

export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];
export type SourceType = (typeof SourceTypes)[keyof typeof SourceTypes];
export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export const PlaybackTypes = {
  MSE: 'mse',
  NATIVE: 'native',
};

export const SourceTypes = {
  M3U8: 'application/vnd.apple.mpegurl',
  MP4: 'video/mp4',
};

const defaultConfig = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
  // Disable auto quality level/fragment loading (preload).
  autoStartLoad: false,
};

export class HlsMediaDelegateBase implements Delegate {
  #target: HTMLMediaElement | null = null;
  #engine: Hls | null = null;
  #loadRequested?: Promise<void> | null;
  #src: string = '';
  #debug: boolean = false;
  #type: SourceType | undefined;
  #preferPlayback: PlaybackType | undefined = 'mse';
  #preloadOnPlayAbort?: AbortController;
  #defaultMaxBufferLength = 0;
  #defaultMaxBufferSize = 0;

  constructor() {
    this.#initialize();
  }

  #initialize(): void {
    this.#preloadOnPlayAbort?.abort();
    this.#engine?.destroy();
    this.#engine = null;

    if (this.type !== SourceTypes.M3U8) return;
    if (this.#preferPlayback === PlaybackTypes.NATIVE) return;
    if (!Hls.isSupported()) return;

    this.#engine = new Hls({
      ...defaultConfig,
      debug: this.#debug,
    });
    this.#defaultMaxBufferLength = this.#engine.config.maxBufferLength;
    this.#defaultMaxBufferSize = this.#engine.config.maxBufferSize;

    if (this.#target) {
      this.#engine.attachMedia(this.#target as HTMLMediaElement);
    }

    if (this.#src) {
      this.#requestLoad();
    }
  }

  /** The target element, or `null` when not attached. */
  get target(): EventTarget | null | undefined {
    return this.#target ?? null;
  }

  /** The underlying hls.js instance, or `null` when using native playback. */
  get engine(): Hls | null {
    return this.#engine;
  }

  get preload(): PreloadType {
    return this.#target?.preload || 'metadata';
  }

  set preload(value: PreloadType) {
    if (!this.#target || this.#target.preload === value) return;
    this.#target.preload = value;
    this.#updatePreload();
  }

  /** Explicit source type. When unset, inferred from the source URL extension. */
  get type(): SourceType | undefined {
    return this.#type ?? inferSourceType(this.#src);
  }

  set type(value: SourceType | undefined) {
    if (this.#type === value) return;
    this.#type = value;
    this.#initialize();
  }

  /** Enable hls.js debug logging. Re-initializes the engine when changed. */
  get debug(): boolean {
    return this.#debug;
  }

  set debug(value: boolean) {
    if (this.#debug === value) return;
    this.#debug = value;
    this.#initialize();
  }

  /**
   * Whether to prefer `'mse'` (hls.js) or `'native'` (browser-built-in) HLS
   * playback. Changing this re-initializes the delegate.
   */
  get preferPlayback(): PlaybackType | undefined {
    return this.#preferPlayback;
  }

  set preferPlayback(value: PlaybackType | undefined) {
    if (this.#preferPlayback === value) return;
    this.#preferPlayback = value;
    this.#initialize();
  }

  /** The HLS source URL to load. */
  set src(src: string) {
    this.#src = src;
    this.#requestLoad();
  }

  get src(): string {
    return this.#src;
  }

  async #requestLoad() {
    if (this.#loadRequested) return;
    await (this.#loadRequested = Promise.resolve());
    this.#loadRequested = null;
    this.load();
  }

  load(): void {
    if (this.#engine) {
      this.#engine.loadSource(this.#src);
      this.#updatePreload();
    } else if (this.#target) {
      (this.#target as HTMLMediaElement).src = this.#src;
    }
  }

  attach(target: HTMLMediaElement): void {
    this.#target = target;
    this.#engine?.attachMedia(target);
    this.#updatePreload();
  }

  detach(): void {
    this.#preloadOnPlayAbort?.abort();
    this.#engine?.detachMedia();
    this.#target = null;
  }

  destroy(): void {
    this.#preloadOnPlayAbort?.abort();
    this.#engine?.destroy();
    this.#engine = null;
    this.#target = null;
  }

  #updatePreload(): void {
    this.#preloadOnPlayAbort?.abort();

    if (!this.#target || !this.#engine) return;

    const preload = (length?: number, size?: number) => {
      if (!this.#engine) return;
      this.#engine.config.maxBufferLength = length ?? this.#defaultMaxBufferLength;
      this.#engine.config.maxBufferSize = size ?? this.#defaultMaxBufferSize;
      this.#engine.startLoad();
    };

    if (this.preload === 'auto' || !this.#target.paused) {
      preload();
      return;
    }

    if (this.preload === 'metadata') {
      preload(1, 1);
    }

    // preload === 'none' or preload === 'metadata' both defer full load until play.
    this.#preloadOnPlayAbort = new AbortController();
    this.#target.addEventListener('play', () => preload(), {
      signal: this.#preloadOnPlayAbort.signal,
      once: true,
    });
  }
}

function inferSourceType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return SourceTypes.MP4;
  return SourceTypes.M3U8;
}

export const HlsMediaDelegate = HlsMediaTextTracksMixin(HlsMediaDelegateBase);

// This is used by the web component because it needs to extend HTMLElement!
export class HlsCustomMedia extends DelegateMixin(CustomVideoElement, HlsMediaDelegate) {}

// This is used by the React component.
export class HlsMedia extends DelegateMixin(VideoProxy, HlsMediaDelegate) {}
