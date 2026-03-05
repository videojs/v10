import Hls from 'hls.js';

import { type MediaDelegate, MediaDelegateMixin } from '../../core/media/delegate';
import { MediaProxyMixin } from '../../core/media/proxy';
import { CustomMediaMixin } from './custom-media-element';

export class HlsMediaDelegate implements MediaDelegate {
  #engine = new Hls();

  attach(target: EventTarget): void {
    this.#engine.attachMedia(target as HTMLMediaElement);
  }

  detach(): void {
    this.#engine.detachMedia();
  }

  set src(src: string) {
    this.#engine.loadSource(src);
  }

  get src(): string {
    return this.#engine.url ?? '';
  }
}

// This is used by the web component because it needs to extend HTMLElement!
export class HlsCustomMedia extends MediaDelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  HlsMediaDelegate
) {}

// This is used by the React component.
export class HlsMedia extends MediaDelegateMixin(
  MediaProxyMixin(
    globalThis.HTMLVideoElement ?? class {},
    globalThis.HTMLMediaElement ?? class {},
    globalThis.EventTarget ?? class {}
  ),
  HlsMediaDelegate
) {}
