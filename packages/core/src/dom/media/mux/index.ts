import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { HlsMedia } from '../hls';
import { VideoProxy } from '../proxy';

const MUX_VIDEO_DOMAIN = 'mux.com';

function toSrc(playbackId: string, customDomain: string): string {
  return `https://stream.${customDomain}/${playbackId}.m3u8`;
}

export class MuxMediaDelegate extends HlsMedia implements Delegate {
  #playbackId: string | null = null;
  #customDomain: string = MUX_VIDEO_DOMAIN;

  get playbackId() {
    return this.#playbackId;
  }

  set playbackId(value: string | null) {
    if (this.#playbackId === value) return;
    this.#playbackId = value;
    this.#syncSrc();
  }

  get customDomain(): string {
    return this.#customDomain;
  }

  set customDomain(value: string) {
    if (this.#customDomain === value) return;
    this.#customDomain = value || MUX_VIDEO_DOMAIN;
    this.#syncSrc();
  }

  #syncSrc(): void {
    this.src = this.#playbackId ? toSrc(this.#playbackId, this.#customDomain) : '';
  }
}

export class MuxCustomMedia extends DelegateMixin(CustomVideoElement, MuxMediaDelegate) {}

export class MuxMedia extends DelegateMixin(VideoProxy, MuxMediaDelegate) {}
