import Hls from 'hls.js';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';
import { HlsMediaTextTracksMixin } from './text-tracks';

const defaultConfig = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
};

export class HlsMediaDelegateBase implements Delegate {
  #engine = Hls.isSupported() ? new Hls(defaultConfig) : null;

  get engine(): Hls | null {
    return this.#engine;
  }

  attach(target: EventTarget): void {
    this.#engine?.attachMedia(target as HTMLMediaElement);
  }

  detach(): void {
    this.#engine?.detachMedia();
  }

  destroy(): void {
    this.#engine?.destroy();
  }

  set src(src: string) {
    this.#engine?.loadSource(src);
  }

  get src(): string {
    return this.#engine?.url ?? '';
  }
}

const HlsMediaDelegate = HlsMediaTextTracksMixin(HlsMediaDelegateBase);

// This is used by the web component because it needs to extend HTMLElement!
export class HlsCustomMedia extends DelegateMixin(CustomVideoElement, HlsMediaDelegate) {}

// This is used by the React component.
export class HlsMedia extends DelegateMixin(VideoProxy, HlsMediaDelegate) {}
