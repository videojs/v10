import { shallowEqual } from '@videojs/utils/object';
import Hls, { type HlsConfig as HlsJsConfig } from 'hls.js';
import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { bridgeEvents } from '../../../core/utils/bridge-events';
import type { MediaConfig } from '../media-host';
import { NativeHlsMedia } from '../native-hls';
import { HTMLVideoElementHost } from '../video-host';
import { HlsJsMedia } from './hlsjs';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export { Hls };

export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];
export type SourceType = (typeof ContentTypes)[keyof typeof ContentTypes];
export type StreamType = MediaStreamType;

export const PlaybackTypes = {
  MSE: 'mse',
  NATIVE: 'native',
};

export const ContentTypes = {
  M3U8: 'application/vnd.apple.mpegurl',
  MP4: 'video/mp4',
};

export const StreamTypes = MediaStreamTypes;

export interface HlsMediaProps {
  src: string;
  preload: PreloadType;
  streamType: StreamType;
  config?: HlsMediaConfig;
}

export interface HlsMediaConfig extends MediaConfig {
  preferPlayback?: PlaybackType | undefined;
  contentType?: SourceType | undefined;
  hlsJs?: Partial<HlsJsConfig>;
}

export const hlsMediaDefaultProps: HlsMediaProps = {
  src: '',
  preload: 'metadata',
  streamType: MediaStreamTypes.UNKNOWN,
  config: {},
};

class HlsMediaEvent extends Event {}

export class HlsMedia extends HTMLVideoElementHost implements HlsMediaProps {
  #delegate: HlsJsMedia | NativeHlsMedia | null = null;
  #mediaElement: HTMLVideoElement | null = null;
  #src = hlsMediaDefaultProps.src;
  #preload = hlsMediaDefaultProps.preload;
  #streamType: StreamType = hlsMediaDefaultProps.streamType;
  #isUserStreamType = false;
  #loadRequested?: Promise<void> | null;
  #prevEngineConfigKey?: Record<string, any> | null;

  constructor() {
    super();
    // Cancel the native loadstart event, it's handled in the load method.
    this.addEventListener('loadstart', this.#stopTargetLoadStartEvent);
  }

  attach(target: HTMLVideoElement) {
    this.#mediaElement = target;
    super.attach(target);
    this.#delegate?.attach(target);
  }

  detach() {
    this.#delegate?.detach();
    super.detach();
    this.#mediaElement = null;
  }

  destroy() {
    this.detach();
    this.#engineDestroy();
    super.destroy();
    this.removeEventListener('loadstart', this.#stopTargetLoadStartEvent);
  }

  get engine() {
    return this.#delegate?.engine ?? null;
  }

  get config(): HlsMediaConfig {
    return super.config;
  }

  set config(config: HlsMediaConfig) {
    super.config = config;
    if (this.#shouldEngineUpdate(this.#engineConfigKey())) this.#requestLoad();
  }

  get error() {
    return this.#delegate?.error ?? null;
  }

  get videoTracks() {
    return this.#delegate instanceof HlsJsMedia ? this.#delegate.videoTracks : undefined;
  }

  get audioTracks() {
    return this.#delegate instanceof HlsJsMedia ? this.#delegate.audioTracks : undefined;
  }

  get videoRenditions() {
    return this.#delegate instanceof HlsJsMedia ? this.#delegate.videoRenditions : undefined;
  }

  get audioRenditions() {
    return this.#delegate instanceof HlsJsMedia ? this.#delegate.audioRenditions : undefined;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
    this.#requestLoad();
  }

  /** Preload type (`'none'` / `'metadata'` / `'auto'`). */
  get preload() {
    return this.#preload;
  }

  set preload(value) {
    this.#preload = value;
    if (this.#delegate) {
      this.#delegate.preload = value;
    }
  }

  /** Current stream type (`'on-demand'` / `'live'` / `'unknown'`). */
  get streamType(): StreamType {
    return this.#delegate?.streamType ?? this.#streamType;
  }

  set streamType(value: StreamType) {
    this.#isUserStreamType = value !== StreamTypes.UNKNOWN;

    if (this.#delegate) {
      this.#delegate.streamType = value;
      this.#streamType = this.#delegate.streamType;
      return;
    }

    if (this.#streamType === value) return;
    this.#streamType = value;
    this.dispatchEvent(new HlsMediaEvent('streamtypechange'));
  }

  /**
   * Presentation time marking the start of the Live Edge Window.
   *
   * Derived from the delegate on every read; `NaN` when no delegate is
   * attached or the stream is not live.
   */
  get liveEdgeStart() {
    return this.#delegate?.liveEdgeStart ?? Number.NaN;
  }

  /**
   * Seekable range size for live content. `0` for standard live, `Infinity`
   * for DVR, `NaN` for on-demand or unknown. Fires `targetlivewindowchange`
   * when the value changes (bridged from the delegate).
   */
  get targetLiveWindow() {
    return this.#delegate?.targetLiveWindow ?? Number.NaN;
  }

  async load() {
    this.#loadRequested = null;

    if (this.remote.state === 'connected') {
      this.dispatchEvent(new HlsMediaEvent('loadstart'));
      return super.load();
    }

    if (this.#shouldEngineUpdate(this.#engineConfigKey())) {
      this.#engineDestroy();
      this.#prevEngineConfigKey = this.#engineConfigKey();

      const contentType = this.config.contentType ?? inferContentType(this.#src);
      const useMse =
        Hls.isSupported() && contentType === ContentTypes.M3U8 && this.config.preferPlayback !== PlaybackTypes.NATIVE;

      this.#delegate = useMse ? new HlsJsMedia({ config: { ...this.config?.hlsJs } }) : new NativeHlsMedia();

      bridgeEvents(this.#delegate, this);

      // Apply user `streamType` before `attach()` so native delegates do not run
      // synchronous duration-based detection first and emit a transient value.
      if (this.#isUserStreamType) {
        this.#delegate.streamType = this.#streamType;
      }

      this.#delegate.preload = this.preload;

      if (this.#mediaElement) {
        this.#delegate.attach(this.#mediaElement);
      }
    }

    if (this.#delegate) {
      this.dispatchEvent(new HlsMediaEvent('loadstart'));
      this.#delegate.src = this.#src;
    }
  }

  #stopTargetLoadStartEvent = (event: Event) => {
    if (!(event instanceof HlsMediaEvent)) event.stopImmediatePropagation();
  };

  async #requestLoad() {
    if (this.#loadRequested) return;
    await (this.#loadRequested = Promise.resolve());
    this.#loadRequested = null;
    this.load();
  }

  #shouldEngineUpdate(nextEngineConfigKey: Record<string, any>) {
    return !shallowEqual(this.#prevEngineConfigKey, nextEngineConfigKey);
  }

  #engineConfigKey() {
    return {
      ...this.config.hlsJs,
      preferPlayback: this.config.preferPlayback,
      contentType: this.config.contentType,
    };
  }

  #engineDestroy() {
    this.#delegate?.destroy();
    this.#delegate = null;
    this.#prevEngineConfigKey = null;
    this.#loadRequested = null;
    // Delegate teardown already emits `streamtypechange` (bridged); only sync cache.
    if (!this.#isUserStreamType) this.#streamType = StreamTypes.UNKNOWN;
  }
}

function inferContentType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return ContentTypes.MP4;
  return ContentTypes.M3U8;
}
