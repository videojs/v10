import Hls from 'hls.js';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';
import { HlsMediaTextTracksMixin } from './text-tracks';

export { Hls };

export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];
export type SourceType = (typeof SourceTypes)[keyof typeof SourceTypes];

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
};

export class HlsMediaDelegateBase implements Delegate {
  #target: EventTarget | null = null;
  #engine: Hls | null = null;
  #loadRequested?: Promise<void> | null;
  #src: string = '';
  #debug: boolean = false;
  #type: SourceType | undefined;
  #preferPlayback: PlaybackType | undefined = 'mse';

  constructor() {
    this.#initialize();
  }

  #initialize(): void {
    this.#engine?.destroy();
    this.#engine = null;

    if (this.type !== SourceTypes.M3U8) return;
    if (this.#preferPlayback === PlaybackTypes.NATIVE) return;
    if (!Hls.isSupported()) return;

    this.#engine = new Hls({
      ...defaultConfig,
      debug: this.#debug,
    });

    if (this.#target) {
      this.#engine.attachMedia(this.#target as HTMLMediaElement);
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

  /** Explicit source type. When unset, inferred from the source URL extension. */
  get type(): SourceType | undefined {
    return this.#type ?? inferSourceType(this.#src);
  }

  set type(value: SourceType | undefined) {
    if (this.#type === value) return;
    this.#type = value;
    this.#initialize();
  }

  /** Enable hls.js debug logging. Re-initializes the engine when changed before load. */
  get debug(): boolean {
    return this.#debug;
  }

  set debug(value: boolean) {
    if (this.#debug === value) return;
    this.#debug = value;

    if (this.#loadRequested) {
      this.#initialize();
    }
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
    const prevType = this.type;
    this.#src = src;
    if (this.type !== prevType) {
      this.#initialize();
    }
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
    } else if (this.#target) {
      (this.#target as HTMLMediaElement).src = this.#src;
    }
  }

  attach(target: EventTarget): void {
    this.#target = target;
    this.#engine?.attachMedia(target as HTMLMediaElement);
  }

  detach(): void {
    this.#engine?.detachMedia();
    this.#target = null;
  }

  destroy(): void {
    this.#engine?.destroy();
    this.#engine = null;
    this.#target = null;
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
