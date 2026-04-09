import { shallowEqual } from '@videojs/utils/object';
import type { Mixin } from '@videojs/utils/types';
import Hls from 'hls.js';
import { bridgeEvents } from '../../../core/utils/bridge-events';
import { CustomVideoElement } from '../custom-media-element';
import { NativeHlsMediaBase } from '../native-hls';
import { VideoProxy } from '../proxy';
import { HlsJsMediaBase } from './hlsjs';

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

export interface HlsMediaProps {
  readonly target: HTMLMediaElement | null;
  readonly engine: Hls | null;
  readonly error: MediaError | null;
  src: string;
  type: SourceType | undefined;
  preferPlayback: PlaybackType | undefined;
  config: Record<string, any>;
  debug: boolean;
  preload: PreloadType;
  attach(target: HTMLMediaElement): void;
  detach(): void;
  load(): void;
  destroy(): void;
}

interface HlsMediaHost extends EventTarget {
  readonly target?: EventTarget | null;
  attach?(target: EventTarget): void;
  detach?(): void;
}

export const HlsMediaMixin: Mixin<HlsMediaHost, HlsMediaProps> = (BaseClass) => {
  class HlsMediaImpl extends BaseClass {
    #delegate: HlsJsMediaBase | NativeHlsMediaBase | null = null;
    #src = '';
    #type: SourceType | undefined;
    #preferPlayback: PlaybackType | undefined = 'mse';
    #config: Record<string, any> = {};
    #debug = false;
    #preload: PreloadType = 'metadata';
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

    get preload() {
      return this.#preload;
    }

    set preload(value) {
      this.#preload = value;
      if (this.#delegate) {
        this.#delegate.preload = value;
      }
    }

    attach(target: HTMLMediaElement) {
      this.#delegate?.attach(target);
      super.attach?.(target);
    }

    detach() {
      this.#delegate?.detach();
      super.detach?.();
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
          ? new HlsJsMediaBase({ config: { ...this.config, debug: this.debug } })
          : new NativeHlsMediaBase();

        bridgeEvents(this.#delegate, this);

        if (this.target) {
          this.#delegate.attach(this.target as HTMLMediaElement);
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

    #engineDestroy() {
      this.#delegate?.destroy();
      this.#delegate = null;
      this.#prevEngineProps = null;
      this.#loadRequested = null;
    }
  }

  return HlsMediaImpl as any;
};

function inferSourceType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return SourceTypes.MP4;
  return SourceTypes.M3U8;
}

export class HlsMediaBase extends HlsMediaMixin(EventTarget) {}

export class HlsCustomMedia extends HlsMediaMixin(CustomVideoElement) {}

export class HlsMedia extends HlsMediaMixin(VideoProxy) {}
