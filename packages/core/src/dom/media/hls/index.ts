import { shallowEqual } from '@videojs/utils/object';
import Hls, { type HlsConfig as HlsJsConfig } from 'hls.js';
import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { bridgeEvents } from '../../../core/utils/bridge-events';
import { GoogleCastMixin } from '../google-cast';
import { type GoogleCastMediaProps, googleCastMediaDefaultProps } from '../google-cast/types';
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

export interface HlsMediaConfig {
  preferPlayback: PlaybackType | undefined;
  contentType?: SourceType | undefined;
  hlsJs?: Partial<HlsJsConfig>;
}

export interface HlsMediaProps extends GoogleCastMediaProps {
  src: string;
  preload: PreloadType;
  config: HlsMediaConfig;
  streamType: StreamType;
}

export const hlsMediaDefaultProps: HlsMediaProps = {
  src: '',
  preload: 'metadata',
  config: {
    preferPlayback: 'mse',
  },
  streamType: MediaStreamTypes.UNKNOWN,
  ...googleCastMediaDefaultProps,
};

export class HlsMedia extends GoogleCastMixin(HTMLVideoElementHost) implements HlsMediaProps {
  #delegate: HlsJsMedia | NativeHlsMedia | null = null;
  #src = hlsMediaDefaultProps.src;
  #config = { ...hlsMediaDefaultProps.config };
  #preload = hlsMediaDefaultProps.preload;
  #streamType: StreamType = hlsMediaDefaultProps.streamType;
  #isUserStreamType = false;
  #loadRequested?: Promise<void> | null;
  #prevEngineProps?: Record<string, any> | null;

  get engine() {
    return this.#delegate?.engine ?? null;
  }

  get error() {
    return this.#delegate?.error ?? null;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
    this.#requestLoad();
  }

  get config() {
    return this.#config;
  }

  set config(config) {
    this.#config = config;
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
    this.dispatchEvent(new Event('streamtypechange'));
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

  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#delegate?.attach(target);
  }

  detach() {
    this.#delegate?.detach();
    super.detach();
  }

  destroy() {
    this.detach();
    this.#engineDestroy();
    super.destroy();
  }

  load() {
    this.#loadRequested = null;

    if (this.#shouldEngineUpdate(this.#engineProps())) {
      this.#engineDestroy();
      this.#prevEngineProps = this.#engineProps();

      const contentType = this.config.contentType ?? inferContentType(this.#src);
      const useMse =
        Hls.isSupported() && contentType === ContentTypes.M3U8 && this.config.preferPlayback !== PlaybackTypes.NATIVE;

      this.#delegate = useMse ? new HlsJsMedia({ config: { ...this.config } }) : new NativeHlsMedia();

      bridgeEvents(this.#delegate, this);

      // Apply user `streamType` before `attach()` so native delegates do not run
      // synchronous duration-based detection first and emit a transient value.
      if (this.#isUserStreamType) {
        this.#delegate.streamType = this.#streamType;
      }

      this.#delegate.preload = this.preload;

      if (this.target) {
        this.#delegate.attach(this.target);
      }
    }

    if (this.#delegate) {
      this.#delegate.src = this.#src;
    }
  }

  async #requestLoad() {
    if (this.#loadRequested) return;
    await (this.#loadRequested = Promise.resolve());
    this.#loadRequested = null;
    this.load();
  }

  #shouldEngineUpdate(nextEngineProps: Record<string, any>) {
    return !shallowEqual(this.#prevEngineProps, nextEngineProps);
  }

  #engineProps() {
    return {
      config: this.config,
      preferPlayback: this.config.preferPlayback,
      contentType: this.config.contentType,
      debug: this.config.hlsJs?.debug,
    };
  }

  #engineDestroy() {
    this.#delegate?.destroy();
    this.#delegate = null;
    this.#prevEngineProps = null;
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
