import type { Constructor, MixinReturn } from '@videojs/utils/types';

import { CustomAudioElement, CustomVideoElement } from '../custom-media-element';
import { HlsMediaMixin, type HlsMediaProps } from '../hls';
import { AudioProxy, VideoProxy } from '../proxy';
import { MuxDataMediaMixin, type MuxDataMediaProps } from './mux-data';

export { isMuxVideoSrc, toPlaybackIdFromSrc, toVideoId } from './mux-data';

const MUX_VIDEO_DOMAIN = 'mux.com';

export interface MuxMediaProps extends HlsMediaProps, MuxDataMediaProps {
  playbackId: string | null;
  customDomain: string;
}

export function MuxMediaMixin<Base extends Constructor<EventTarget>>(BaseClass: Base) {
  const MuxDataBase = MuxDataMediaMixin(HlsMediaMixin(BaseClass));

  class MuxMediaImpl extends (MuxDataBase as Constructor<HlsMediaProps & MuxDataMediaProps>) {
    static PLAYER_SOFTWARE_NAME = '';

    #playbackId: string | null = null;
    #customDomain = MUX_VIDEO_DOMAIN;

    get playbackId() {
      return this.#playbackId;
    }

    set playbackId(value) {
      if (this.#playbackId === value) return;
      this.#playbackId = value;
      this.#syncSrc();
    }

    get customDomain() {
      return this.#customDomain;
    }

    set customDomain(value) {
      const normalized = value || MUX_VIDEO_DOMAIN;
      if (this.#customDomain === normalized) return;
      this.#customDomain = normalized;
      this.#syncSrc();
    }

    #syncSrc() {
      this.src = this.#playbackId ? toSrc(this.#playbackId, this.#customDomain) : '';
    }
  }

  return MuxMediaImpl as unknown as MixinReturn<Base, MuxMediaProps> & { PLAYER_SOFTWARE_NAME: string };
}

function toSrc(playbackId: string, customDomain: string) {
  return `https://stream.${customDomain}/${playbackId}.m3u8`;
}

// These are used to infer the props from.
export class MuxMediaBase extends MuxMediaMixin(EventTarget) {
  static override PLAYER_SOFTWARE_NAME = '';
}

export class MuxVideoBase extends MuxMediaBase {
  static override PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudioBase extends MuxMediaBase {
  static override PLAYER_SOFTWARE_NAME = 'mux-audio';
}

// These are used by the web components because it needs to extend HTMLElement!
export class MuxCustomMedia extends MuxMediaMixin(CustomVideoElement) {}

export class MuxCustomVideo extends MuxMediaMixin(CustomVideoElement) {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxCustomAudio extends MuxMediaMixin(CustomAudioElement) {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}

// These are used by the React components.
export class MuxMedia extends MuxMediaMixin(VideoProxy) {}

export class MuxVideo extends MuxMediaMixin(VideoProxy) {
  static PLAYER_SOFTWARE_NAME = 'mux-video';
}

export class MuxAudio extends MuxMediaMixin(AudioProxy) {
  static PLAYER_SOFTWARE_NAME = 'mux-audio';
}
