import { shallowEqual } from '@videojs/utils/object';
import Hls from 'hls.js';
import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { bridgeEvents } from '../../../core/utils/bridge-events';
import { NativeHlsMedia } from '../native-hls';
import { HTMLVideoElementHost } from '../video-host';
import { HlsJsMedia } from './hlsjs';

/** Allowed `preload` attribute values. */
export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export { Hls };

/** Playback engine choice (`mse` for hls.js, `native` for the browser). */
export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];
/** MIME type of the source. */
export type SourceType = (typeof SourceTypes)[keyof typeof SourceTypes];
/** Stream delivery type. */
export type StreamType = MediaStreamType;

/** Constants for {@link PlaybackType} values. */
export const PlaybackTypes = {
  MSE: 'mse',
  NATIVE: 'native',
};

/** Constants for {@link SourceType} MIME values. */
export const SourceTypes = {
  M3U8: 'application/vnd.apple.mpegurl',
  MP4: 'video/mp4',
};

/** Re-export of {@link MediaStreamTypes} for HLS consumers. */
export const StreamTypes = MediaStreamTypes;

/** Configuration props for {@link HlsMedia}. */
export interface HlsMediaProps {
  /** Source URL. */
  src: string;
  /** Explicit source MIME type; inferred from extension when omitted. */
  type: SourceType | undefined;
  /** Preferred playback engine. */
  preferPlayback: PlaybackType | undefined;
  /** hls.js config object. */
  config: Record<string, any>;
  /** Enable hls.js debug logging. */
  debug: boolean;
  /** Preload behavior. */
  preload: PreloadType;
  /** Initial stream type before the engine confirms it. */
  streamType: StreamType;
}

/** Defaults for {@link HlsMediaProps}. */
export const hlsMediaDefaultProps: HlsMediaProps = {
  src: '',
  type: undefined,
  preferPlayback: 'mse',
  config: {},
  debug: false,
  preload: 'metadata',
  streamType: MediaStreamTypes.UNKNOWN,
};

/** Media adapter that loads HLS via hls.js (MSE) or falls back to native HLS. */
export class HlsMedia extends HTMLVideoElementHost implements HlsMediaProps {
  #delegate: HlsJsMedia | NativeHlsMedia | null = null;
  #src = hlsMediaDefaultProps.src;
  #type = hlsMediaDefaultProps.type;
  #preferPlayback = hlsMediaDefaultProps.preferPlayback;
  #config = { ...hlsMediaDefaultProps.config };
  #debug = hlsMediaDefaultProps.debug;
  #preload = hlsMediaDefaultProps.preload;
  #streamType: StreamType = hlsMediaDefaultProps.streamType;
  #isUserStreamType = false;
  #loadRequested?: Promise<void> | null;
  #prevEngineProps?: Record<string, any> | null;

  /** Current playback engine instance (hls.js when MSE-backed, `null` otherwise). */
  get engine() {
    return this.#delegate?.engine ?? null;
  }

  /** Current delegate's media error, or `null`. */
  get error() {
    return this.#delegate?.error ?? null;
  }

  /** Source URL. Assignment triggers a reload. */
  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
    this.#requestLoad();
  }

  /** Explicit source type. When unset, inferred from the source URL extension. */
  get type() {
    return this.#type ?? inferSourceType(this.src);
  }

  set type(value: SourceType | undefined) {
    this.#type = value;
    this.#requestLoad();
  }

  /** Whether to prefer `'mse'` (hls.js) or `'native'` (browser-built-in) HLS. */
  get preferPlayback() {
    return this.#preferPlayback;
  }

  set preferPlayback(value) {
    this.#preferPlayback = value;
    this.#requestLoad();
  }

  /** hls.js config object. Assignment triggers a reload. */
  get config() {
    return this.#config;
  }

  set config(config) {
    this.#config = config;
    this.#requestLoad();
  }

  /** hls.js debug flag. Assignment triggers a reload. */
  get debug() {
    return this.#debug;
  }

  set debug(debug) {
    this.#debug = debug;
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

  /** Attach the active delegate to a `<video>` element. */
  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#delegate?.attach(target);
  }

  /** Detach from the current `<video>` element. */
  detach() {
    this.#delegate?.detach();
    super.detach();
  }

  /** Detach and destroy the active delegate. */
  destroy() {
    this.detach();
    this.#engineDestroy();
  }

  /** Re-evaluate engine selection and load the current source. */
  load() {
    this.#loadRequested = null;

    if (this.#shouldEngineUpdate(this.#engineProps())) {
      this.#engineDestroy();
      this.#prevEngineProps = this.#engineProps();

      const useMse =
        Hls.isSupported() && this.type === SourceTypes.M3U8 && this.preferPlayback !== PlaybackTypes.NATIVE;

      this.#delegate = useMse
        ? new HlsJsMedia({ config: { ...this.config, debug: this.debug } })
        : new NativeHlsMedia();

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
      debug: this.debug,
      preferPlayback: this.preferPlayback,
      type: this.type,
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

function inferSourceType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return SourceTypes.MP4;
  return SourceTypes.M3U8;
}
