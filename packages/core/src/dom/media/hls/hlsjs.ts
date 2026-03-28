import Hls, { type HlsConfig } from 'hls.js';
import type { Delegate } from '../../../core/media/delegate';
import { EngineLifecycle } from '../../../core/media/engine-lifecycle';
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

class HlsJsMediaDelegateBase extends EngineLifecycle implements Delegate {
  #target: HTMLMediaElement | null = null;
  #engine: Hls | null = null;

  get target(): HTMLMediaElement | null {
    return this.#target;
  }

  get engine(): Hls | null {
    return this.#engine;
  }

  get engineProps() {
    return { config: this.config };
  }

  engineUpdate(): void {
    this.#engine = new Hls({ ...defaultHlsConfig, ...this.config });
    if (this.#target) this.#engine.attachMedia(this.#target);
  }

  engineDestroy(): void {
    this.#engine?.destroy();
    this.#engine = null;
  }

  load(src?: string): void {
    super.load(src);
    this.#engine?.loadSource(this.src);
  }

  attach(target: HTMLMediaElement): void {
    this.#target = target;
    this.#engine?.attachMedia(target);
  }

  detach(): void {
    this.#engine?.detachMedia();
    this.#target = null;
  }

  destroy(): void {
    this.engineDestroy();
    this.#target = null;
  }
}

export class HlsJsMediaDelegate extends HlsMediaTextTracksMixin(HlsMediaPreloadMixin(HlsJsMediaDelegateBase)) {}
