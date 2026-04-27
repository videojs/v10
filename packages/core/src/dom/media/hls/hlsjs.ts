import Hls, { type HlsConfig } from 'hls.js';
import type { MediaEngineHost } from '../../../core/media/types';
import { HTMLVideoElementHost } from '../video-host';
import { HlsJsMediaErrorsMixin } from './errors';
import { HlsJsMediaMetadataTracksMixin } from './metadata-tracks';
import { HlsJsMediaPreloadMixin } from './preload';
import { HlsJsMediaTextTracksMixin } from './text-tracks';

export const defaultHlsConfig: Partial<HlsConfig> = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
  autoStartLoad: false,
};

class HlsJsMediaBase extends HTMLVideoElementHost implements MediaEngineHost<Hls, HTMLVideoElement> {
  #engine: Hls | null = null;

  constructor(params: { config: Partial<HlsConfig> }) {
    super();
    this.#engine = new Hls({
      ...defaultHlsConfig,
      ...params.config,
    });
  }

  get engine() {
    return this.#engine;
  }

  get src() {
    return this.#engine?.url ?? '';
  }

  set src(src: string) {
    this.#engine?.loadSource(src);
  }

  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#engine?.attachMedia(target);
  }

  detach() {
    this.#engine?.detachMedia();
    super.detach();
  }

  destroy() {
    this.detach();
    this.#engine?.destroy();
    this.#engine = null;
  }
}

export class HlsJsMedia extends HlsJsMediaPreloadMixin(
  HlsJsMediaMetadataTracksMixin(HlsJsMediaTextTracksMixin(HlsJsMediaErrorsMixin(HlsJsMediaBase)))
) {}
