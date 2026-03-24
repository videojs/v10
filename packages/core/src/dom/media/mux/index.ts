import Hls from 'hls.js';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomMediaMixin } from '../custom-media-element';
import { HlsMediaTextTracksMixin } from '../hls/text-tracks';
import { MediaProxyMixin } from '../proxy';
import { MuxCapLevelController } from './cap-level-controller';

const muxHlsConfig = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
  capLevelController: MuxCapLevelController,
};

class MuxHlsMediaDelegateBase implements Delegate {
  #engine = Hls.isSupported() ? new Hls(muxHlsConfig) : null;
  #target: HTMLMediaElement | null = null;

  get engine(): Hls | null {
    return this.#engine;
  }

  attach(target: EventTarget): void {
    this.#target = target as HTMLMediaElement;
    this.#engine?.attachMedia(this.#target);
  }

  detach(): void {
    this.#engine?.detachMedia();
    this.#target = null;
  }

  destroy(): void {
    this.#engine?.destroy();
    this.#engine = null;
  }

  set src(src: string) {
    if (this.#engine) {
      this.#engine.loadSource(src);
    } else if (this.#target) {
      // MSE not available — fall back to native HLS playback.
      this.#target.src = src;
    }
  }

  get src(): string {
    return this.#engine?.url ?? this.#target?.src ?? '';
  }
}

const MuxHlsMediaDelegate = HlsMediaTextTracksMixin(MuxHlsMediaDelegateBase);

// Web component: needs to extend HTMLElement.
export class MuxCustomMedia extends DelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  MuxHlsMediaDelegate
) {}

// React: proxies to an attached EventTarget, no HTMLElement extension needed.
export class MuxMedia extends DelegateMixin(MediaProxyMixin, MuxHlsMediaDelegate) {}
