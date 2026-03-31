import Hls, { type HlsConfig } from 'hls.js';
import { HlsMediaErrorsMixin } from './errors';
import { HlsMediaPreloadMixin } from './preload';
import { HlsMediaTextTracksMixin } from './text-tracks';

export const defaultHlsConfig: Partial<HlsConfig> = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
  autoStartLoad: false,
};

class HlsJsMediaDelegateBase extends EventTarget {
  #engine: Hls | null = null;

  constructor(params: { config: Partial<HlsConfig> }) {
    super();
    this.#engine = new Hls({
      ...defaultHlsConfig,
      ...params.config,
    });
  }

  get target() {
    return this.#engine?.media ?? null;
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

  attach(target: HTMLMediaElement) {
    this.#engine?.attachMedia(target);
  }

  detach() {
    this.#engine?.detachMedia();
  }

  destroy() {
    this.#engine?.destroy();
    this.#engine = null;
  }
}

export class HlsJsMediaDelegate extends HlsMediaPreloadMixin(
  HlsMediaTextTracksMixin(HlsMediaErrorsMixin(HlsJsMediaDelegateBase))
) {}
