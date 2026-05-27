import HlsJs, { type HlsConfig as HlsJsConfig } from 'hls.js';
import { MediaTracksMixin } from '../../../core/media/media-tracks';
import { HTMLVideoElementHost } from '../html-video-element-host';
import { hlsJsErrors } from './errors';
import { hlsJsLive } from './live';
import { hlsJsMediaTracks } from './media-tracks';
import { hlsJsMetadataTracks } from './metadata-tracks';
import { hlsJsPreload } from './preload';
import { hlsJsStreamType } from './stream-type';
import { hlsJsTextTracks } from './text-tracks';

export { HlsJs };
export type { HlsJsConfig };

export const defaultHlsJsConfig: Partial<HlsJsConfig> = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
  autoStartLoad: false,
};

export interface HlsJsMediaParams {
  config?: Partial<HlsJsConfig>;
}

const HlsJsMediaBase = MediaTracksMixin(HTMLVideoElementHost<HlsJs>);
export class HlsJsMedia extends HlsJsMediaBase {
  #engine: HlsJs | null;

  constructor(params: HlsJsMediaParams = {}) {
    super();
    this.#engine = new HlsJs({ ...defaultHlsJsConfig, ...params.config });

    hlsJsErrors().install(this);
    hlsJsStreamType().install(this);
    hlsJsLive().install(this);
    hlsJsPreload().install(this);
    hlsJsMetadataTracks().install(this);
    hlsJsTextTracks().install(this);
    hlsJsMediaTracks().install(this);
  }

  override get engine(): HlsJs | null {
    return this.#engine;
  }

  override get src() {
    return this.#engine?.url ?? '';
  }

  override set src(value: string) {
    this.#engine?.loadSource(value);
  }

  override get target() {
    return super.target;
  }

  override set target(value: HTMLVideoElement | null) {
    if (super.target) this.#engine?.detachMedia();
    super.target = value;
    if (value) this.#engine?.attachMedia(value);
  }

  destroy() {
    super.destroy();
    this.#engine?.destroy();
    this.#engine = null;
  }
}
