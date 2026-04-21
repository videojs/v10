import { shallowEqual } from '@videojs/utils/object';
import Hls from 'hls.js';
import { bridgeEvents } from '../../../core/utils/bridge-events';
import { NativeHlsMedia } from '../native-hls';
import { HTMLVideoElementHost } from '../video-host';
import { HlsJsMedia } from './hlsjs';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export { Hls };

export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];
export type SourceType = (typeof SourceTypes)[keyof typeof SourceTypes];
export type StreamType = (typeof StreamTypes)[keyof typeof StreamTypes];

export const PlaybackTypes = {
  MSE: 'mse',
  NATIVE: 'native',
};

export const SourceTypes = {
  M3U8: 'application/vnd.apple.mpegurl',
  MP4: 'video/mp4',
};

export const StreamTypes = {
  ON_DEMAND: 'on-demand',
  LIVE: 'live',
  UNKNOWN: 'unknown',
} as const;

export interface HlsMediaProps {
  src: string;
  type: SourceType | undefined;
  preferPlayback: PlaybackType | undefined;
  config: Record<string, any>;
  debug: boolean;
  preload: PreloadType;
  streamType: StreamType;
}

export const hlsMediaDefaultProps: HlsMediaProps = {
  src: '',
  type: undefined,
  preferPlayback: 'mse',
  config: {},
  debug: false,
  preload: 'metadata',
  streamType: 'unknown',
};

export class HlsMedia extends HTMLVideoElementHost implements HlsMediaProps {
  #delegate: HlsJsMedia | NativeHlsMedia | null = null;
  #src = hlsMediaDefaultProps.src;
  #type = hlsMediaDefaultProps.type;
  #preferPlayback = hlsMediaDefaultProps.preferPlayback;
  #config = { ...hlsMediaDefaultProps.config };
  #debug = hlsMediaDefaultProps.debug;
  #preload = hlsMediaDefaultProps.preload;
  #streamType: StreamType = hlsMediaDefaultProps.streamType;
  #streamTypeUserSet = false;
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

  get config() {
    return this.#config;
  }

  set config(config) {
    this.#config = config;
    this.#requestLoad();
  }

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
    this.#streamTypeUserSet = value !== StreamTypes.UNKNOWN;

    if (this.#delegate) {
      this.#delegate.streamType = value;
      this.#streamType = this.#delegate.streamType;
      return;
    }

    if (this.#streamType === value) return;
    this.#streamType = value;
    this.dispatchEvent(new Event('streamtypechange'));
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
  }

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

      if (this.target) {
        this.#delegate.attach(this.target);
      }

      this.#delegate.preload = this.preload;

      if (this.#streamTypeUserSet && this.#streamType !== StreamTypes.UNKNOWN) {
        this.#delegate.streamType = this.#streamType;
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
  }
}

function inferSourceType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return SourceTypes.MP4;
  return SourceTypes.M3U8;
}
