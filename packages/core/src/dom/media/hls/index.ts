import { shallowEqual } from '@videojs/utils/object';
import Hls from 'hls.js';
import { bridgeEvents, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { NativeHlsMediaDelegate } from '../native-hls';
import { VideoProxy } from '../proxy';
import { HlsJsMediaDelegate } from './hlsjs';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

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

export class HlsMediaDelegate extends EventTarget {
  #target: HTMLMediaElement | null = null;
  #delegate: HlsJsMediaDelegate | NativeHlsMediaDelegate | null = null;
  #src: string = '';
  #type: SourceType | undefined;
  #preferPlayback: PlaybackType | undefined = 'mse';
  #config: Record<string, any> = {};
  #debug: boolean = false;
  #preload: PreloadType = 'metadata';
  #loadRequested?: Promise<void> | null;
  #prevEngineProps?: Record<string, any> | null;

  get target() {
    return this.#target;
  }

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
  get type(): SourceType | undefined {
    return this.#type ?? inferSourceType(this.src);
  }

  set type(value: SourceType | undefined) {
    this.#type = value;
    this.#requestLoad();
  }

  /** Whether to prefer `'mse'` (hls.js) or `'native'` (browser-built-in) HLS. */
  get preferPlayback(): PlaybackType | undefined {
    return this.#preferPlayback;
  }

  set preferPlayback(value: PlaybackType | undefined) {
    this.#preferPlayback = value;
    this.#requestLoad();
  }

  get config() {
    return this.#config;
  }

  set config(config: Record<string, any>) {
    this.#config = config;
    this.#requestLoad();
  }

  get debug() {
    return this.#debug;
  }

  set debug(debug: boolean) {
    this.#debug = debug;
    this.#requestLoad();
  }

  get preload() {
    return this.#preload;
  }

  set preload(value: PreloadType) {
    this.#preload = value;
    if (this.#delegate) {
      this.#delegate.preload = value;
    }
  }

  attach(target: HTMLMediaElement) {
    this.#target = target;
    this.#delegate?.attach(target);
  }

  detach() {
    this.#target = null;
    this.#delegate?.detach();
  }

  destroy() {
    this.#engineDestroy();
    this.detach();
  }

  load() {
    this.#loadRequested = null;

    if (this.#shouldEngineUpdate(this.#engineProps())) {
      this.#engineDestroy();
      this.#prevEngineProps = this.#engineProps();

      const useMse =
        Hls.isSupported() && this.type === SourceTypes.M3U8 && this.preferPlayback !== PlaybackTypes.NATIVE;

      this.#delegate = useMse
        ? new HlsJsMediaDelegate({ config: { ...this.config, debug: this.debug } })
        : new NativeHlsMediaDelegate();

      bridgeEvents(this.#delegate, this);

      if (this.target) {
        this.#delegate.attach(this.target);
      }

      this.#delegate.preload = this.preload;
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

  #engineDestroy(): void {
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

export class HlsCustomMedia extends DelegateMixin(CustomVideoElement, HlsMediaDelegate) {}

export class HlsMedia extends DelegateMixin(VideoProxy, HlsMediaDelegate) {}
