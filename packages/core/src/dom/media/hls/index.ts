import { shallowEqual } from '@videojs/utils/object';
import HlsJs from 'hls.js';
import { type MediaPreloadType, type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { bridgeEvents } from '../../../core/utils/bridge-events';
import { type HlsJsConfig, HlsJsMedia } from '../hls-js';
import { HTMLVideoElementHost } from '../html-video-element-host';
import { NativeHlsMedia } from '../native-hls';

interface EngineKey {
  engine: 'mse' | 'native';
  hlsJs: Partial<HlsJsConfig> | undefined;
}

export interface HlsMediaConfig {
  preferPlayback: 'mse' | 'native';
  contentType?: string;
  hlsJs?: Partial<HlsJsConfig>;
  // Keeps the typed config assignable to the base `config: Record<string, unknown>`.
  [key: string]: unknown;
}

export interface HlsMediaProps {
  src: string;
  preload: MediaPreloadType;
  config: HlsMediaConfig;
}

export const hlsMediaDefaultProps: HlsMediaProps = {
  src: '',
  preload: 'metadata',
  config: { preferPlayback: 'mse' },
};

const M3U8_CONTENT_TYPE = 'application/vnd.apple.mpegurl';
const MP4_CONTENT_TYPE = 'video/mp4';

export class HlsMedia extends HTMLVideoElementHost implements HlsMediaProps {
  #delegate: HlsJsMedia | NativeHlsMedia | null = null;
  #pendingLoad: Promise<void> | null = null;
  #prevEngineKey: EngineKey | null = null;

  #config = { ...hlsMediaDefaultProps.config };
  #userStreamType: MediaStreamType | null = null;
  #src = hlsMediaDefaultProps.src;
  #preload = hlsMediaDefaultProps.preload;

  override get target() {
    return super.target;
  }

  override set target(value: HTMLVideoElement | null) {
    super.target = value;
    if (this.#delegate) this.#delegate.target = value;
    if (value) this.#requestLoad();
  }

  override get engine() {
    return this.#delegate?.engine ?? null;
  }

  get config() {
    return this.#config;
  }

  set config(value: HlsMediaConfig) {
    this.#config = { ...value };
    this.#requestLoad();
  }

  override get streamType() {
    return this.#delegate?.streamType ?? this.#userStreamType ?? MediaStreamTypes.UNKNOWN;
  }

  override set streamType(value: MediaStreamType) {
    this.#userStreamType = value === MediaStreamTypes.UNKNOWN ? null : value;

    if (this.#delegate) {
      this.#delegate.streamType = value;
      return;
    }

    // No delegate to bridge `streamtypechange` — dispatch manually.
    this.dispatchEvent(new Event('streamtypechange'));
  }

  override get liveEdgeStart() {
    return this.#delegate?.liveEdgeStart ?? Number.NaN;
  }

  override get targetLiveWindow() {
    return this.#delegate?.targetLiveWindow ?? Number.NaN;
  }

  override get src() {
    return this.#src;
  }

  override set src(value: string) {
    this.#src = value;
    this.#requestLoad();
  }

  override get preload() {
    return this.#preload;
  }

  override set preload(value: MediaPreloadType) {
    this.#preload = value;
    if (this.#delegate) this.#delegate.preload = value;
  }

  override get error() {
    return this.#delegate?.error ?? null;
  }

  load() {
    this.#pendingLoad = null;

    const nextKey = this.#engineKey();
    if (!shallowEqual(this.#prevEngineKey, nextKey)) {
      this.#destroyDelegate();
      this.#prevEngineKey = nextKey;
      this.#delegate =
        nextKey.engine === 'mse'
          ? new HlsJsMedia(this.#config.hlsJs ? { config: this.#config.hlsJs } : {})
          : new NativeHlsMedia();

      bridgeEvents(this.#delegate, this);

      // Apply the user override before attaching so the delegate's stream-type
      // extension does not emit a transient detected value first.
      if (this.#userStreamType) this.#delegate.streamType = this.#userStreamType;

      this.#delegate.preload = this.#preload;
      if (this.target) this.#delegate.target = this.target;
    }

    if (this.#delegate) this.#delegate.src = this.#src;
  }

  destroy() {
    super.destroy();
    this.#destroyDelegate();
  }

  async #requestLoad() {
    if (this.#pendingLoad) return;
    this.#pendingLoad = Promise.resolve();
    await this.#pendingLoad;
    if (this.#pendingLoad === null) return;
    // Start from the root so layers above (e.g. MuxDataLayer) run their load() too.
    this.root.load();
  }

  #engineKey(): EngineKey {
    const contentType = this.#config.contentType ?? inferContentType(this.#src);
    const useMse = this.#config.preferPlayback !== 'native' && contentType === M3U8_CONTENT_TYPE && HlsJs.isSupported();
    return {
      engine: useMse ? 'mse' : 'native',
      hlsJs: useMse ? this.#config.hlsJs : undefined,
    };
  }

  #destroyDelegate() {
    if (!this.#delegate) return;
    this.#delegate.destroy();
    this.#delegate = null;
    this.#prevEngineKey = null;
  }
}

function inferContentType(src: string) {
  const path = src.split(/[?#]/)[0] ?? '';
  return path.endsWith('.mp4') ? MP4_CONTENT_TYPE : M3U8_CONTENT_TYPE;
}
