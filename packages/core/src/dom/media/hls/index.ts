import Hls from 'hls.js';
import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { EngineLifecycle } from '../../../core/media/engine-lifecycle';
import { CustomVideoElement } from '../custom-media-element';
import { NativeHlsMediaDelegate } from '../native-hls';
import { VideoProxy } from '../proxy';
import { HlsJsMediaDelegate } from './hlsjs';

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

// ---------------------------------------------------------------------------
// Orchestrator — picks hls.js or native based on config
// ---------------------------------------------------------------------------

export class HlsMediaDelegate extends EngineLifecycle implements Delegate {
  #target: HTMLMediaElement | null = null;
  #delegate: HlsJsMediaDelegate | NativeHlsMediaDelegate | null = null;
  #debug: boolean = false;
  #type: SourceType | undefined;
  #preferPlayback: PlaybackType | undefined = 'mse';

  /** The target element, or `null` when not attached. */
  get target(): EventTarget | null | undefined {
    return this.#target ?? null;
  }

  /** The underlying hls.js instance, or `null` when using native playback. */
  get engine(): Hls | null {
    return this.#delegate?.engine ?? null;
  }

  /** Explicit source type. When unset, inferred from the source URL extension. */
  get type(): SourceType | undefined {
    return this.#type ?? inferSourceType(this.src);
  }

  set type(value: SourceType | undefined) {
    this.#type = value;
    this.requestLoad();
  }

  /** Enable hls.js debug logging. Re-initializes the engine when changed. */
  get debug(): boolean {
    return this.#debug;
  }

  set debug(value: boolean) {
    this.#debug = value;
    this.requestLoad();
  }

  /**
   * Whether to prefer `'mse'` (hls.js) or `'native'` (browser-built-in) HLS
   * playback. Changing this re-initializes the engine.
   */
  get preferPlayback(): PlaybackType | undefined {
    return this.#preferPlayback;
  }

  set preferPlayback(value: PlaybackType | undefined) {
    this.#preferPlayback = value;
    this.requestLoad();
  }

  get engineProps() {
    return {
      config: this.config,
      type: this.type,
      debug: this.debug,
      preferPlayback: this.preferPlayback,
    };
  }

  load(src?: string): void {
    super.load(src);
    this.#delegate?.load(this.src);
  }

  engineDestroy(): void {
    super.engineDestroy();
    this.#delegate?.destroy();
    this.#delegate = null;
  }

  engineUpdate(): void {
    const useMse = Hls.isSupported() && this.type === SourceTypes.M3U8 && this.preferPlayback !== PlaybackTypes.NATIVE;

    this.#delegate = useMse ? new HlsJsMediaDelegate() : new NativeHlsMediaDelegate();
    this.#delegate.config = { ...this.config, debug: this.debug };

    if (this.#target) this.#delegate.attach(this.#target);
  }

  attach(target: HTMLMediaElement): void {
    this.#target = target;
    this.#delegate?.attach(target);
  }

  detach(): void {
    this.#delegate?.detach();
    this.#target = null;
  }

  destroy(): void {
    this.engineDestroy();
    this.#target = null;
  }
}

function inferSourceType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return SourceTypes.MP4;
  return SourceTypes.M3U8;
}

export class HlsCustomMedia extends DelegateMixin(CustomVideoElement, HlsMediaDelegate) {}

export class HlsMedia extends DelegateMixin(VideoProxy, HlsMediaDelegate) {}
